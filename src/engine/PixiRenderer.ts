import { Application, Container, Graphics } from 'pixi.js'
import type { World } from './World'
import type { Entity } from './types'

const COLORS: Record<Entity['kind'], number> = {
  player: 0x4aa3ff,
  enemy: 0xff5252,
  projectile: 0xffe27a,
  gem: 0x6bff6b,
}

export class PixiRenderer {
  readonly app: Application
  private world: Container
  private sprites = new Map<Entity, Graphics>()
  private destroyed = false

  private constructor(app: Application) {
    this.app = app
    this.world = new Container()
    app.stage.addChild(this.world)
  }

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

  render(world: World): void {
    const all: Entity[] = [
      ...world.gems(),
      ...world.activeEnemies(),
      ...world.projectiles.filter((p) => p.active),
      world.player,
    ]
    const seen = new Set<Entity>()
    for (const e of all) {
      const g = this.graphicFor(e)
      g.position.set(e.pos.x, e.pos.y)
      g.visible = true
      seen.add(e)
    }
    for (const [e, g] of this.sprites) {
      if (!seen.has(e)) {
        g.destroy()
        this.sprites.delete(e)
      }
    }
    this.world.position.set(
      this.app.renderer.width / 2 - world.player.pos.x,
      this.app.renderer.height / 2 - world.player.pos.y,
    )
  }

  destroy(): void {
    if (this.destroyed) return
    this.destroyed = true
    this.app.destroy(true, { children: true })
    this.sprites.clear()
  }
}
