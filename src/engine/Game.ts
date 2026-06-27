/**
 * 遊戲驅動層：Game。
 *
 * 串接所有部件並驅動主迴圈——以 requestAnimationFrame 推動固定步長模擬，把鍵盤輸入餵給
 * `World`、用 `PixiRenderer` 渲染、並在必要時把 summary 推給 Pinia store。
 *
 * 固定步長：用累積器（accumulator）將不定的 frame delta 切成數個 1/60 秒的 `step()`，
 * 讓模擬與 FPS 解耦、保持確定性。
 *
 * 升級握手：偵測到升級時暫停迴圈、向 store 提供選項並掛上 `onUpgradePicked` callback；
 * 玩家選擇後 callback 套用升級並解除暫停。
 *
 * 注意：此檔直接呼叫 `useGameStore()`，故必須在 Pinia context 內執行。
 */
import { World } from './World'
import { PixiRenderer } from './PixiRenderer'
import { KeyboardInput } from './core/input'
import { TouchInput } from './core/touchInput'
import { soundManager } from './core/soundManager'
import { rollUpgrades } from './systems/leveling'
import { createRng } from './core/rng'
import { useGameStore } from '../stores/game'
import type { CharacterKind, MapKind } from './types'
import { LockstepRunner } from './net/lockstep'
import type { NetTransport } from './net/types'

/** 固定步長：每格模擬代表 1/60 秒。 */
const STEP = 1 / 60

export class Game {
  private world: World
  private renderer: PixiRenderer
  private input = new KeyboardInput()
  private touch = new TouchInput()
  private store = useGameStore()
  /** requestAnimationFrame 的 handle，用於 `stop()` 時取消。 */
  private rafId = 0
  /** 上一格的時間戳（ms）；為 0 代表尚未起算。 */
  private lastTime = 0
  /** 固定步長累積器：尚未消化的真實經過時間（秒）。 */
  private accumulator = 0
  /** 是否暫停（升級彈窗或外部呼叫）；暫停時不推進模擬但仍持續渲染。 */
  private paused = false
  /** 是否已停止，用來讓 `stop()` 冪等。 */
  private stopped = false
  /** 升級抽選專用的亂數來源（與模擬 rng 分離）。 */
  private upgradeRng: ReturnType<typeof createRng>
  /** 多人 lockstep 協調器；單人為 null（決定 loop 走哪一支）。 */
  private runner: LockstepRunner | null = null
  /** 本地玩家這幀待送的升級選擇（多人 pick）；送出後清空。 */
  private pendingPick: string | null = null

  /** 本地玩家索引（單人＝0；SP4 連線時為自己的位置）。 */
  private localPlayerIndex: number

  /** 私有建構子；請改用靜態的 `start()`（renderer 初始化為非同步）。 */
  private constructor(world: World, renderer: PixiRenderer, seed: number, localPlayerIndex = 0) {
    this.world = world
    this.renderer = renderer
    this.localPlayerIndex = localPlayerIndex
    // Derive the upgrade RNG from the run seed so each run offers a different
    // upgrade sequence (rather than an identical one every game).
    this.upgradeRng = createRng(seed ^ 0xdead)
  }

  /**
   * 建立並啟動一場新遊戲：建好 World/renderer、掛上輸入與升級 callback，並開跑主迴圈。
   * @param canvasParent 掛載 canvas 的 DOM 容器。
   * @param seed 本場亂數種子。
   * @returns 已啟動的 `Game` 實例。
   */
  static async start(canvasParent: HTMLElement, seed: number, character: CharacterKind, map: MapKind, bloomEnabled = true, localPlayerIndex = 0): Promise<Game> {
    const world = new World(seed, character, map)
    const renderer = await PixiRenderer.create(canvasParent, bloomEnabled)
    const game = new Game(world, renderer, seed, localPlayerIndex)
    game.store.setLoadout(world.loadoutSnapshot(localPlayerIndex)) // 開賽即把起始武器推進持有快照，供 HUD 持有列顯示
    game.store.localPlayerIndex = localPlayerIndex
    game.input.attach()
    game.touch.attach(canvasParent)
    soundManager.resume()
    soundManager.startMusic(map)
    game.store.onUpgradePicked = (id: string) => {
      world.applyUpgrade(id)
      game.store.setLoadout(world.loadoutSnapshot(localPlayerIndex)) // 套用後立即刷新持有快照，讓新武器/被動馬上出現在 HUD 持有列
      game.paused = false
    }
    game.store.onMultiUpgradePicked = (id: string) => {
      world.chooseUpgrade(localPlayerIndex, id)
      game.store.setLoadout(world.loadoutSnapshot(localPlayerIndex))
    }
    game.loop(0)
    return game
  }

  /**
   * 建立並啟動一場多人局（lockstep）。
   * @param characters 各玩家角色（依玩家 index）。
   * @param transport in-game 逐幀輸入傳輸（由 NetSession.toTransport 提供）。
   * @param localIndex 本地玩家索引。
   */
  static async startMultiplayer(
    canvasParent: HTMLElement, seed: number, characters: CharacterKind[], map: MapKind,
    transport: NetTransport, localIndex: number, bloomEnabled = true,
  ): Promise<Game> {
    const world = new World(seed, characters, map)
    const renderer = await PixiRenderer.create(canvasParent, bloomEnabled)
    const game = new Game(world, renderer, seed, localIndex)
    game.runner = new LockstepRunner(world, transport)
    game.store.setLoadout(world.loadoutSnapshot(localIndex))
    game.input.attach()
    game.touch.attach(canvasParent)
    soundManager.resume()
    soundManager.startMusic(map)
    // M-1：多人升級走 pick；本地選定 → 下次 submitLocalInput 帶上。
    game.store.onMultiUpgradePicked = (id: string) => { game.pendingPick = id }
    game.loop(0)
    return game
  }

  /** 運行時切換 bloom（委派 renderer）。 */
  setBloom(enabled: boolean): void {
    this.renderer.setBloom(enabled)
  }

  /** 暫停模擬推進（渲染仍持續）。 */
  pause(): void {
    this.paused = true
  }
  /** 解除暫停。 */
  resume(): void {
    this.paused = false
  }

  /**
   * 主迴圈（rAF callback，箭頭函式以綁定 `this`）。
   * @param time rAF 提供的高解析度時間戳（ms）。
   */
  private loop = (time: number): void => {
    this.rafId = requestAnimationFrame(this.loop)
    if (this.lastTime === 0) this.lastTime = time
    // 取真實 frame 經過秒數；夾上限 0.25s，避免分頁切回／卡頓後一次累積過多步數（spiral of death）。
    const frameTime = Math.min(0.25, (time - this.lastTime) / 1000)
    this.lastTime = time

    if (!this.paused && !this.renderer.isHitStopped()) {
      const tdir = this.touch.direction()
      const dir = (tdir.x !== 0 || tdir.y !== 0) ? tdir : this.input.direction()
      this.accumulator += frameTime

      if (this.runner) {
        // 多人：每 STEP 送一筆本地輸入（含 pick），再把到齊的 tick 推到底。
        while (this.accumulator >= STEP) {
          this.runner.submitLocalInput({ move: dir, pick: this.pendingPick })
          this.pendingPick = null
          this.accumulator -= STEP
        }
        while (this.runner.tryAdvance()) { /* drain ready ticks */ }
        if (this.world.hasWon()) {
          this.store.updateSummary(this.world.summary(this.localPlayerIndex))
          soundManager.play('chest'); this.store.victory(); this.stop(); return
        }
        if (this.world.hasLost()) {
          this.store.updateSummary(this.world.summary(this.localPlayerIndex))
          soundManager.play('gameover'); this.store.gameOver(); this.stop(); return
        }
      } else {
        // 單人：既有邏輯（設輸入 + 固定步長消化 + 升級暫停握手 + 勝利/死亡）。
        this.world.setMoveInput(this.localPlayerIndex, dir)
        while (this.accumulator >= STEP) {
          this.world.step(STEP)
          this.accumulator -= STEP

          // 升級握手：偵測到本步升級即提供 3 選 1、設定選後 callback、暫停迴圈並中斷消化。
          if (this.world.consumeLevelUp()) {
            const opts = rollUpgrades(this.upgradeRng, 3, this.world.upgradeContext())
            this.store.setLoadout(this.world.loadoutSnapshot(this.localPlayerIndex))
            this.store.offerUpgrades(opts.map((o) => ({ id: o.id, label: o.label })))
            this.store.onUpgradePicked = (id: string) => {
              this.world.applyUpgrade(id)
              this.store.setLoadout(this.world.loadoutSnapshot(this.localPlayerIndex)) // 套用後立即刷新持有快照，讓新武器/被動馬上出現在 HUD 持有列
              this.paused = false // 玩家選定後恢復
            }
            this.paused = true
            break // 暫停期間停止繼續消化累積器
          }
          // 通關（擊敗終局 Boss）：勝利優先於死亡；推送最終 summary、播勝利音效、切勝利畫面並停迴圈。
          if (this.world.hasWon()) {
            this.store.updateSummary(this.world.summary(this.localPlayerIndex))
            soundManager.play('chest')
            this.store.victory()
            this.stop()
            return
          }
          // 死亡即推送最終 summary、通知 store 遊戲結束並停掉迴圈。
          if (this.world.isPlayerDead()) {
            this.store.updateSummary(this.world.summary(this.localPlayerIndex))
            soundManager.play('gameover')
            this.store.gameOver()
            this.stop()
            return
          }
        }
      }

      // 共用尾段：推 summary + 多人 offer + 排空音效/fx（playerCount 1 不推 multiOffer）。
      this.store.updateSummary(this.world.summary(this.localPlayerIndex))
      // 多人非阻塞升級：推送本地玩家待選（單人 playerCount 1 不進此分支，multiOffer 保持 null）。
      if (this.world.playerCount > 1) {
        this.store.setMultiOffer(
          this.world.pendingOfferFor(this.localPlayerIndex),
          this.world.upgradeTimeRemaining(this.localPlayerIndex),
        )
      }
      // 排空本幀累積的語意音效事件交由音訊層播放。
      for (const ev of this.world.consumeSoundEvents()) soundManager.play(ev)
      // 排空本幀武器視覺事件交特效層繪製。
      this.renderer.applyFxEvents(this.world.consumeFxEvents())
    }

    this.renderer.render(this.world, this.localPlayerIndex)
    this.renderer.drawJoystick(this.touch.joystick)
  }

  /** 停止遊戲並釋放資源（取消 rAF、卸載輸入、銷毀 renderer）。冪等：重複呼叫安全。 */
  stop(): void {
    if (this.stopped) return
    this.stopped = true
    cancelAnimationFrame(this.rafId)
    this.input.detach()
    this.touch.detach()
    soundManager.stopMusic()
    this.renderer.destroy()
  }
}
