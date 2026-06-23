/**
 * PixiJS 渲染器。
 *
 * 把 `World` 的 entity 狀態畫到畫面：為每個 entity 維護一個對應的 PixiJS `Graphics`，
 * 每格更新位置，並透過移動容器實作「跟隨玩家的鏡頭」。
 * 純呈現層——不修改模擬狀態，只讀取 `World`。
 */
import { Application, Container, Graphics } from 'pixi.js'
import type { World } from './World'
import type { Entity } from './types'

/** 各 entity 種類對應的填色。新增種類時記得在此補上顏色。 */
const COLORS: Record<Entity['kind'], number> = {
  player: 0x4aa3ff,
  enemy: 0xff5252,
  projectile: 0xffe27a,
  gem: 0x6bff6b,
}

export class PixiRenderer {
  /** 底層 PixiJS 應用程式實例（含 canvas 與 renderer）。 */
  readonly app: Application
  /** 鏡頭容器：所有 entity 畫在此容器內，靠平移它實作鏡頭跟隨。 */
  private world: Container
  /** entity → 對應 Graphics 的對照表（重用同一物件以避免每格重建）。 */
  private sprites = new Map<Entity, Graphics>()
  /** 是否已銷毀，用來讓 `destroy()` 冪等。 */
  private destroyed = false

  /** 私有建構子；請改用靜態的 `create()`（PixiJS 初始化為非同步）。 */
  private constructor(app: Application) {
    this.app = app
    this.world = new Container()
    app.stage.addChild(this.world)
  }

  /**
   * 建立並初始化渲染器（非同步，因 PixiJS `Application.init` 為 async）。
   * @param canvasParent 掛載 canvas 的 DOM 容器；renderer 會自動隨其尺寸縮放。
   * @returns 就緒的 `PixiRenderer`。
   */
  static async create(canvasParent: HTMLElement): Promise<PixiRenderer> {
    const app = new Application()
    await app.init({
      resizeTo: canvasParent,
      background: 0x101018,
      antialias: true,
    })
    canvasParent.appendChild(app.canvas)
    return new PixiRenderer(app)
  }

  /** 取得（必要時建立）某 entity 的 Graphics；首次建立時依其半徑與種類顏色畫圓。 */
  private graphicFor(e: Entity): Graphics {
    let g = this.sprites.get(e)
    if (!g) {
      g = new Graphics()
      g.circle(0, 0, e.radius).fill(COLORS[e.kind])
      this.world.addChild(g)
      this.sprites.set(e, g)
    }
    return g
  }

  /**
   * 將目前的 `World` 狀態畫出一格畫面。
   * @param world 要讀取的模擬狀態（不會被修改）。
   */
  render(world: World): void {
    // 收集這一格要顯示的所有 entity。
    const all: Entity[] = [
      ...world.gems(),
      ...world.activeEnemies(),
      ...world.projectiles.filter((p) => p.active),
      world.player,
    ]
    // 同步每個 entity 的 Graphics 位置，並記錄本格出現過哪些。
    const seen = new Set<Entity>()
    for (const e of all) {
      const g = this.graphicFor(e)
      g.position.set(e.pos.x, e.pos.y)
      g.visible = true
      seen.add(e)
    }
    // 回收：本格沒出現的 entity（已被 World 篩除）銷毀其 Graphics 並移出對照表，避免洩漏。
    for (const [e, g] of this.sprites) {
      if (!seen.has(e)) {
        g.destroy()
        this.sprites.delete(e)
      }
    }
    // 鏡頭跟隨：平移容器，使玩家恆在畫面正中央。
    this.world.position.set(
      this.app.renderer.width / 2 - world.player.pos.x,
      this.app.renderer.height / 2 - world.player.pos.y,
    )
  }

  /** 釋放 PixiJS 資源並清空 sprite 對照表。冪等：重複呼叫安全（遊戲結束與重啟都可能呼叫）。 */
  destroy(): void {
    if (this.destroyed) return
    this.destroyed = true
    this.app.destroy(true, { children: true })
    this.sprites.clear()
  }
}
