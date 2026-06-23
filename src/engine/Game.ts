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
import { rollUpgrades } from './systems/leveling'
import { createRng } from './core/rng'
import { useGameStore } from '../stores/game'

/** 固定步長：每格模擬代表 1/60 秒。 */
const STEP = 1 / 60

export class Game {
  private world: World
  private renderer: PixiRenderer
  private input = new KeyboardInput()
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

  /** 私有建構子；請改用靜態的 `start()`（renderer 初始化為非同步）。 */
  private constructor(world: World, renderer: PixiRenderer, seed: number) {
    this.world = world
    this.renderer = renderer
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
  static async start(canvasParent: HTMLElement, seed: number): Promise<Game> {
    const world = new World(seed)
    const renderer = await PixiRenderer.create(canvasParent)
    const game = new Game(world, renderer, seed)
    game.input.attach()
    game.store.onUpgradePicked = (id: string) => {
      world.applyUpgrade(id)
      game.paused = false
    }
    game.loop(0)
    return game
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

    if (!this.paused) {
      this.world.moveInput = this.input.direction()
      // 固定步長累積器：把真實時間存進累積器，再以整數倍的 STEP 消化，確保每步皆為 1/60 秒。
      this.accumulator += frameTime
      while (this.accumulator >= STEP) {
        this.world.step(STEP)
        this.accumulator -= STEP

        // 升級握手：偵測到本步升級即提供 3 選 1、設定選後 callback、暫停迴圈並中斷消化。
        if (this.world.consumeLevelUp()) {
          const opts = rollUpgrades(this.upgradeRng, 3, this.world.upgradeContext())
          this.store.offerUpgrades(opts.map((o) => ({ id: o.id, label: o.label })))
          this.store.onUpgradePicked = (id: string) => {
            this.world.applyUpgrade(id)
            this.paused = false // 玩家選定後恢復
          }
          this.paused = true
          break // 暫停期間停止繼續消化累積器
        }
        // 死亡即推送最終 summary、通知 store 遊戲結束並停掉迴圈。
        if (this.world.isPlayerDead()) {
          this.store.updateSummary(this.world.summary())
          this.store.gameOver()
          this.stop()
          return
        }
      }
      // 每幀（消化完該幀步數後）推送一次 summary 給 store 更新 HUD。
      this.store.updateSummary(this.world.summary())
    }

    this.renderer.render(this.world)
  }

  /** 停止遊戲並釋放資源（取消 rAF、卸載輸入、銷毀 renderer）。冪等：重複呼叫安全。 */
  stop(): void {
    if (this.stopped) return
    this.stopped = true
    cancelAnimationFrame(this.rafId)
    this.input.detach()
    this.renderer.destroy()
  }
}
