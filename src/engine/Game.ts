import { World } from './World'
import { PixiRenderer } from './PixiRenderer'
import { KeyboardInput } from './core/input'
import { rollUpgrades } from './systems/leveling'
import { createRng } from './core/rng'
import { useGameStore } from '../stores/game'

const STEP = 1 / 60

export class Game {
  private world: World
  private renderer: PixiRenderer
  private input = new KeyboardInput()
  private store = useGameStore()
  private rafId = 0
  private lastTime = 0
  private accumulator = 0
  private paused = false
  private upgradeRng = createRng(99)

  private constructor(world: World, renderer: PixiRenderer) {
    this.world = world
    this.renderer = renderer
  }

  static async start(canvasParent: HTMLElement, seed: number): Promise<Game> {
    const world = new World(seed)
    const renderer = await PixiRenderer.create(canvasParent)
    const game = new Game(world, renderer)
    game.input.attach()
    game.store.onUpgradePicked = (id: string) => {
      world.applyUpgrade(id)
      game.paused = false
    }
    game.loop(0)
    return game
  }

  pause(): void {
    this.paused = true
  }
  resume(): void {
    this.paused = false
  }

  private loop = (time: number): void => {
    this.rafId = requestAnimationFrame(this.loop)
    if (this.lastTime === 0) this.lastTime = time
    const frameTime = Math.min(0.25, (time - this.lastTime) / 1000)
    this.lastTime = time

    if (!this.paused) {
      this.world.moveInput = this.input.direction()
      this.accumulator += frameTime
      while (this.accumulator >= STEP) {
        this.world.step(STEP)
        this.accumulator -= STEP

        if (this.world.consumeLevelUp()) {
          const opts = rollUpgrades(this.upgradeRng, 3)
          this.store.offerUpgrades(opts.map((o) => ({ id: o.id, label: o.label })))
          this.store.onUpgradePicked = (id: string) => {
            this.world.applyUpgrade(id)
            this.paused = false
          }
          this.paused = true
          break
        }
        if (this.world.isPlayerDead()) {
          this.store.updateSummary(this.world.summary())
          this.store.gameOver()
          this.stop()
          return
        }
      }
      this.store.updateSummary(this.world.summary())
    }

    this.renderer.render(this.world)
  }

  stop(): void {
    cancelAnimationFrame(this.rafId)
    this.input.detach()
    this.renderer.destroy()
  }
}
