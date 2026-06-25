/**
 * PixiJS 渲染器。
 *
 * 把 World 的 entity 狀態畫到畫面：每個 entity 對應一個 Container（body 造型 + flash 白色覆蓋層），
 * 每格更新位置與動畫 transform；背景網格每格依可視範圍重畫；相機平移實作跟隨玩家。
 * 純呈現層——不修改模擬狀態，只讀取 World。造型繪製委派給 sprites.ts。
 */
import { Application, Container, Graphics } from 'pixi.js'
import type { World } from './World'
import type { Entity, CharacterKind, FxEvent } from './types'
import {
  drawPlayer, drawEnemy, drawGem, drawProjectile, drawOrbit, drawChest,
  drawMapBackground, drawGarlicAura,
} from './sprites'
import { EffectsLayer } from './effects'
import { PostProcessing } from './postProcessing'
import { NoiseBackground } from './noiseBackground'
import { ENEMY_DEFS } from './systems/enemyDefs'

/** 每個 entity 的顯示物件：body（造型）+ flash（命中閃白用的白色覆蓋圓）。 */
interface Sprite {
  root: Container
  flash: Graphics
  /** 最後被處理的 frame 序號；render 結尾據此回收本幀未出現者（免每幀配置 Set）。 */
  lastSeen: number
  /** 待機動畫相位（建立時隨機，使各單位脈動/搖擺錯開、不同步）。 */
  phase: number
}

export class PixiRenderer {
  readonly app: Application
  /** 鏡頭容器：所有東西畫在此容器內，靠平移它實作鏡頭跟隨。 */
  private world: Container
  /** 背景網格（世界座標，每格重畫）。 */
  private grid: Graphics
  /** 大蒜場域光環。 */
  private garlicAura: Graphics
  /** 螢幕固定 UI 層（觸控搖桿）。 */
  private ui: Container
  /** 觸控搖桿繪製。 */
  private joystickGfx: Graphics
  /** entity → 顯示物件對照表。 */
  private sprites = new Map<Entity, Sprite>()
  /** 上一幀各 entity 的 hp，用來偵測命中以觸發閃白。 */
  private lastHp = new Map<Entity, number>()
  /** 動畫時鐘（每幀累加約 1/60；純視覺）。 */
  private clock = 0
  /** render 幀序號（每次 render 遞增）；用於戳記本幀出現的 sprite 以回收消失者。 */
  private frameId = 0
  /** 視覺特效層（擊殺/收集/升級/傷害數字/受傷紅暈/鏡頭震動）。 */
  private effects!: EffectsLayer
  /** 全域後製（泛光/色調/暈影）。 */
  private post!: PostProcessing
  /** 噪聲視差背景（懶初始化，需 world.mapKind）。 */
  private noise?: NoiseBackground
  /** 上一幀玩家等級，用來偵測升級上升沿。 */
  private lastLevel = 1
  /** 上一幀畫面尺寸，用來偵測 resize 重畫紅暈。 */
  private lastW = 0
  private lastH = 0
  /** 是否已銷毀，用來讓 destroy() 冪等。 */
  private destroyed = false

  private constructor(app: Application) {
    this.app = app
    this.world = new Container()
    app.stage.addChild(this.world)
    // 底層：網格 → 大蒜光環 → （之後）各 entity
    this.grid = new Graphics()
    this.world.addChild(this.grid)
    this.garlicAura = new Graphics()
    this.world.addChild(this.garlicAura)
    // UI 層：固定於螢幕（加在 stage、不在會平移的 world 容器），畫觸控搖桿。
    this.ui = new Container()
    app.stage.addChild(this.ui)
    this.joystickGfx = new Graphics()
    this.ui.addChild(this.joystickGfx)
    this.effects = new EffectsLayer(this.world, app.stage, app.renderer.width, app.renderer.height)
    this.lastW = app.renderer.width
    this.lastH = app.renderer.height
    this.post = new PostProcessing(app)
  }

  static async create(canvasParent: HTMLElement): Promise<PixiRenderer> {
    const app = new Application()
    await app.init({ resizeTo: canvasParent, background: 0x0c0c12, antialias: true })
    canvasParent.appendChild(app.canvas)
    return new PixiRenderer(app)
  }

  /** 取得（必要時建立）某 entity 的顯示物件；首次建立時依種類畫一次靜態造型。 */
  private spriteFor(e: Entity, playerColor: number, playerCharacter: CharacterKind): Sprite {
    let s = this.sprites.get(e)
    if (!s) {
      const root = new Container()
      const body = new Graphics()
      switch (e.kind) {
        case 'player': drawPlayer(body, e, playerColor, playerCharacter); break
        case 'enemy': drawEnemy(body, e); break
        case 'gem': drawGem(body, e); break
        case 'projectile': drawProjectile(body, e); break
        case 'orbit': drawOrbit(body, e); break
        case 'chest': drawChest(body, e); break
      }
      // 命中閃白用的白色覆蓋圓（平時透明）
      const flash = new Graphics()
      flash.circle(0, 0, e.radius).fill(0xffffff)
      flash.alpha = 0
      root.addChild(body, flash)
      this.world.addChild(root)
      s = { root, flash, lastSeen: this.frameId, phase: Math.random() * Math.PI * 2 }
      this.sprites.set(e, s)
      this.lastHp.set(e, e.hp)
    }
    return s
  }

  /** 處理單一 entity：取得/建立 sprite、更新位置與動畫、戳記本幀。 */
  private syncSprite(e: Entity, world: World): void {
    const s = this.spriteFor(e, world.playerColor, world.playerCharacter)
    s.root.position.set(e.pos.x, e.pos.y)
    s.root.visible = true
    s.lastSeen = this.frameId
    this.animate(e, s, world)
    this.applyHitFlash(e, s)
  }

  render(world: World): void {
    this.clock += 1 / 60
    this.frameId += 1

    // 噪聲視差背景：懶初始化（需 world.mapKind），每幀更新視差捲動。
    if (!this.noise) this.noise = new NoiseBackground(this.app, world.mapKind)
    this.noise.update(world.player.pos.x, world.player.pos.y)

    // 升級上升沿：玩家身上爆發光環。
    if (world.currentLevel > this.lastLevel) {
      this.effects.spawnLevelUp(world.player.pos.x, world.player.pos.y)
    }
    this.lastLevel = world.currentLevel

    // 背景網格：依玩家可視範圍重畫（世界座標，隨容器平移捲動）。
    this.app.renderer.background.color = world.mapBgColor
    this.grid.clear()
    drawMapBackground(
      this.grid, world.mapKind, world.player.pos.x, world.player.pos.y,
      this.app.renderer.width, this.app.renderer.height, this.clock,
    )

    // 大蒜光環：持有時呼吸脈動。
    this.garlicAura.clear()
    const gr = world.garlicRadius()
    if (gr > 0) drawGarlicAura(this.garlicAura, world.player.pos.x, world.player.pos.y, gr, this.clock)

    // 依序處理各來源並就地戳記本幀（免每幀配置合併陣列與 seen Set）。
    // 順序即首次建立時的 z-order：gems → enemies → projectiles → enemyProjectiles
    // → orbits → chests → player（玩家最後建立，畫在最上層）。
    for (const g of world.gems()) if (g.active) this.syncSprite(g, world)
    for (const e of world.enemies) if (e.active) this.syncSprite(e, world)
    for (const p of world.projectiles) if (p.active) this.syncSprite(p, world)
    for (const p of world.enemyProjectiles) if (p.active) this.syncSprite(p, world)
    for (const o of world.orbits()) if (o.active) this.syncSprite(o, world)
    for (const c of world.chests()) if (c.active) this.syncSprite(c, world)
    this.syncSprite(world.player, world)
    // 回收：本幀未戳記者（已消失）銷毀並移出對照表，避免洩漏。
    for (const [e, s] of this.sprites) {
      if (s.lastSeen !== this.frameId) {
        if (e.kind === 'enemy') {
          const color = e.enemyKind ? ENEMY_DEFS[e.enemyKind].color : 0xff5252
          this.effects.spawnKill(e.pos.x, e.pos.y, color, e.enemyKind)
          // 分級震屏 + 死亡頓挫（收斂：只在死亡瞬間、時長偏短）：superbug(Boss) 最大、exploder 大型死亡、其餘微震
          if (e.enemyKind === 'superbug') { this.effects.shake(10); this.effects.hitStop(0.06) }
          else if (e.enemyKind === 'exploder') { this.effects.shake(6); this.effects.hitStop(0.04) }
          else this.effects.shake(2)
        } else if (e.kind === 'gem') {
          this.effects.spawnPickup(e.pos.x, e.pos.y)
        }
        s.root.destroy({ children: true })
        this.sprites.delete(e)
        this.lastHp.delete(e)
      }
    }

    // resize 偵測：重畫螢幕固定的紅暈。
    if (this.app.renderer.width !== this.lastW || this.app.renderer.height !== this.lastH) {
      this.lastW = this.app.renderer.width
      this.lastH = this.app.renderer.height
      this.effects.resize(this.lastW, this.lastH)
      this.post.resize()
      this.noise?.resize()
    }
    // 推進特效並取得鏡頭震動偏移。
    const shake = this.effects.update()
    // 鏡頭跟隨：玩家恆在畫面中央（加上震動偏移）。
    this.world.position.set(
      this.app.renderer.width / 2 - world.player.pos.x + shake.shakeX,
      this.app.renderer.height / 2 - world.player.pos.y + shake.shakeY,
    )
  }

  /** 是否處於頓挫凍結（供 Game 迴圈決定是否暫停推進）。 */
  isHitStopped(): boolean {
    return this.effects.isHitStopped()
  }

  /** 把本幀武器視覺事件交給特效層繪製。 */
  applyFxEvents(events: FxEvent[]): void {
    for (const ev of events) {
      if (ev.kind === 'sweep') this.effects.spawnSweep(ev.x, ev.y, ev.angle, ev.radius, ev.halfAngle)
      else if (ev.kind === 'chain') this.effects.spawnChain(ev.points)
      else { this.effects.spawnNova(ev.x, ev.y, ev.radius); this.effects.shake(4) }
    }
  }

  /** 依 entity 種類套用每幀動畫 transform（純視覺；待機脈動/搖擺以 clock + sprite phase 驅動）。 */
  private animate(e: Entity, s: Sprite, world: World): void {
    const t = this.clock, ph = s.phase
    switch (e.kind) {
      case 'gem':
        s.root.rotation = t * 1.5
        s.root.scale.set(1 + 0.08 * Math.sin(t * 4))
        break
      case 'orbit':
        s.root.rotation = t * 3
        break
      case 'projectile':
        s.root.rotation = Math.atan2(e.vel.y, e.vel.x)
        break
      case 'player': {
        // 細胞：朝向 + 微搖擺；緩慢呼吸擠壓拉伸（果凍感）
        s.root.rotation = Math.atan2(world.lastMoveDir.y, world.lastMoveDir.x) + 0.06 * Math.sin(t * 2 + ph)
        const b = 0.05 * Math.sin(t * 1.8 + ph)
        s.root.scale.set(1 + b, 1 - b)
        break
      }
      case 'enemy': {
        switch (e.enemyKind) {
          case 'superbug': {
            const p = 0.05 * Math.sin(t * 3 + ph) // 沉重大脈動
            s.root.scale.set(1 + p, 1 + p)
            s.root.rotation = 0.04 * Math.sin(t * 1.2 + ph)
            break
          }
          case 'spiral': {
            s.root.rotation = Math.atan2(e.vel.y, e.vel.x)
            const w = 0.06 * Math.sin(t * 6 + ph) // 沿身蠕動
            s.root.scale.set(1 + w, 1 - w)
            break
          }
          case 'bacteria':
            // 游動式抖擺：朝速度 + 較快旋轉震盪（鞭毛擺游）
            s.root.rotation = Math.atan2(e.vel.y, e.vel.x) + 0.18 * Math.sin(t * 9 + ph)
            break
          case 'spore': {
            const p = 0.03 * Math.sin(t * 1.2 + ph) // 極緩呼吸（休眠）
            s.root.scale.set(1 + p, 1 + p)
            break
          }
          case 'spitter': {
            const p = Math.max(0, Math.sin(t * 1.5 + ph)) * 0.08 // 偏鼓脹蓄勢
            s.root.scale.set(1 + p * 1.4, 1 + p)
            break
          }
          case 'splitter': {
            const p = 0.07 * Math.sin(t * 4 + ph) // 將分裂的鼓動
            s.root.scale.set(1 + p, 1 + p)
            break
          }
          case 'exploder': {
            const p = 0.05 * Math.sin(t * 11 + ph) // 緊張快脈動
            s.root.scale.set(1 + p, 1 + p)
            s.root.rotation = 0.05 * Math.sin(t * 23 + ph) // 抖動
            break
          }
          default: {
            // virus（及其他）：呼吸脈動 + 緩慢 wobble 旋轉（懸浮）
            const p = 0.045 * Math.sin(t * 2.4 + ph)
            s.root.scale.set(1 + p, 1 + p)
            s.root.rotation = 0.08 * Math.sin(t * 1.5 + ph)
          }
        }
        break
      }
    }
  }

  /**
   * 畫觸控搖桿（螢幕座標）。active 時於原點畫底座圈 + 旋鈕（夾在半徑內）；否則清空。
   * @param js 觸控搖桿狀態（元素內座標）。
   */
  drawJoystick(js: { active: boolean; ox: number; oy: number; cx: number; cy: number }): void {
    this.joystickGfx.clear()
    if (!js.active) return
    const max = 48
    const dx = js.cx - js.ox
    const dy = js.cy - js.oy
    const len = Math.hypot(dx, dy) || 1
    const k = Math.min(1, max / len)
    const kx = js.ox + dx * k
    const ky = js.oy + dy * k
    this.joystickGfx.circle(js.ox, js.oy, max).fill({ color: 0xffffff, alpha: 0.12 })
    this.joystickGfx.circle(js.ox, js.oy, max).stroke({ width: 2, color: 0xffffff, alpha: 0.25 })
    this.joystickGfx.circle(kx, ky, 22).fill({ color: 0xffffff, alpha: 0.3 })
  }

  /** 偵測 hp 下降觸發白色覆蓋層，並每幀衰減回透明。 */
  private applyHitFlash(e: Entity, s: Sprite): void {
    const prev = this.lastHp.get(e)
    if (prev !== undefined && e.hp < prev) {
      s.flash.alpha = 0.8
      if (e.kind === 'enemy') {
        this.effects.spawnDamage(e.pos.x, e.pos.y, prev - e.hp)
        const col = e.enemyKind ? ENEMY_DEFS[e.enemyKind].color : 0xff5252
        this.effects.spawnHit(e.pos.x, e.pos.y, col)
      } else if (e.kind === 'player') {
        this.effects.hurt(Math.min(1, (prev - e.hp) / 15))
      }
    } else {
      s.flash.alpha = Math.max(0, s.flash.alpha - 0.16)
    }
    this.lastHp.set(e, e.hp)
  }

  destroy(): void {
    if (this.destroyed) return
    this.destroyed = true
    this.effects.destroy()
    this.post.destroy() // 釋放暈影漸層紋理（避免重開累積）
    this.noise?.destroy() // 釋放噪聲背景紋理
    this.app.destroy(true, { children: true })
    this.sprites.clear()
    this.lastHp.clear()
  }
}
