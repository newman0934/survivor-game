import type { Vec2 } from './vector'

export class KeyboardInput {
  private keys = new Set<string>()
  private onKeyDown = (e: KeyboardEvent) => this.keys.add(e.key.toLowerCase())
  private onKeyUp = (e: KeyboardEvent) => this.keys.delete(e.key.toLowerCase())

  attach(): void {
    window.addEventListener('keydown', this.onKeyDown)
    window.addEventListener('keyup', this.onKeyUp)
  }
  detach(): void {
    window.removeEventListener('keydown', this.onKeyDown)
    window.removeEventListener('keyup', this.onKeyUp)
    this.keys.clear()
  }
  direction(): Vec2 {
    let x = 0
    let y = 0
    if (this.keys.has('a') || this.keys.has('arrowleft')) x -= 1
    if (this.keys.has('d') || this.keys.has('arrowright')) x += 1
    if (this.keys.has('w') || this.keys.has('arrowup')) y -= 1
    if (this.keys.has('s') || this.keys.has('arrowdown')) y += 1
    const len = Math.hypot(x, y)
    if (len === 0) return { x: 0, y: 0 }
    return { x: x / len, y: y / len }
  }
}
