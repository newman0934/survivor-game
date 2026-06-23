/**
 * PixiJS 渲染器。
 *
 * 把 World 的 entity 狀態畫到畫面：每個 entity 對應一個 Container（body 造型 + flash 白色覆蓋層），
 * 每格更新位置與動畫 transform；背景網格每格依可視範圍重畫；相機平移實作跟隨玩家。
 * 純呈現層——不修改模擬狀態，只讀取 World。造型繪製委派給 sprites.ts。
 */
import { Application, Container, Graphics } from 'pixi.js'
import type { World } from './World'
import type { Entity } from './types'
import {
  drawPlayer, drawEnemy, drawGem, drawProjectile, drawOrbit, drawChest,
  drawMapBackground, drawGarlicAura,
} from './sprites'

/** 每個 entity 的顯示物件：body（造型）+ flash（命中閃白用的白色覆蓋圓）。 */
interface Sprite {
  root: Container
  flash: Graphics
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
  }

  static async create(canvasParent: HTMLElement): Promise<PixiRenderer> {
    const app = new Application()
    await app.init({ resizeTo: canvasParent, background: 0x0c0c12, antialias: true })
    canvasParent.appendChild(app.canvas)
    return new PixiRenderer(app)
  }

  /** 取得（必要時建立）某 entity 的顯示物件；首次建立時依種類畫一次靜態造型。 */
  private spriteFor(e: Entity, playerColor: number): Sprite {
    let s = this.sprites.get(e)
    if (!s) {
      const root = new Container()
      const body = new Graphics()
      switch (e.kind) {
        case 'player': drawPlayer(body, e, playerColor); break
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
      s = { root, flash }
      this.sprites.set(e, s)
      this.lastHp.set(e, e.hp)
    }
    return s
  }

  render(world: World): void {
    this.clock += 1 / 60

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

    const all: Entity[] = [
      ...world.gems(),
      ...world.activeEnemies(),
      ...world.projectiles.filter((p) => p.active),
      ...world.orbits(),
      ...world.chests(),
      world.player,
    ]
    const seen = new Set<Entity>()
    for (const e of all) {
      const s = this.spriteFor(e, world.playerColor)
      s.root.position.set(e.pos.x, e.pos.y)
      s.root.visible = true
      this.animate(e, s, world)
      this.applyHitFlash(e, s)
      seen.add(e)
    }
    // 回收：本格未出現者銷毀並移出對照表，避免洩漏。
    for (const [e, s] of this.sprites) {
      if (!seen.has(e)) {
        s.root.destroy({ children: true })
        this.sprites.delete(e)
        this.lastHp.delete(e)
      }
    }

    // 鏡頭跟隨：玩家恆在畫面中央。
    this.world.position.set(
      this.app.renderer.width / 2 - world.player.pos.x,
      this.app.renderer.height / 2 - world.player.pos.y,
    )
  }

  /** 依 entity 種類套用每幀動畫 transform（純視覺）。 */
  private animate(e: Entity, s: Sprite, world: World): void {
    switch (e.kind) {
      case 'gem':
        s.root.rotation = this.clock * 1.5
        s.root.scale.set(1 + 0.08 * Math.sin(this.clock * 4))
        break
      case 'orbit':
        s.root.rotation = this.clock * 3
        break
      case 'projectile':
        s.root.rotation = Math.atan2(e.vel.y, e.vel.x)
        break
      case 'player':
        s.root.rotation = Math.atan2(world.lastMoveDir.y, world.lastMoveDir.x)
        break
      case 'enemy':
        if (e.enemyKind === 'boss') s.root.scale.set(1 + 0.04 * Math.sin(this.clock * 4))
        else if (e.enemyKind === 'charger') s.root.rotation = Math.atan2(e.vel.y, e.vel.x)
        break
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
    if (prev !== undefined && e.hp < prev) s.flash.alpha = 0.8
    else s.flash.alpha = Math.max(0, s.flash.alpha - 0.16)
    this.lastHp.set(e, e.hp)
  }

  destroy(): void {
    if (this.destroyed) return
    this.destroyed = true
    this.app.destroy(true, { children: true })
    this.sprites.clear()
    this.lastHp.clear()
  }
}
