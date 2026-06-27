/**
 * 觸控輸入（浮動虛擬搖桿）。
 *
 * 用 Pointer Events（touch + 滑鼠通用）：按下記錄原點，拖曳方向即移動方向，放開停止。
 * 與 KeyboardInput 同層的純 TS 輸入源；不依賴 Vue/Pinia。採輪詢式：迴圈每幀讀 direction()。
 */
import type { Vec2 } from '../core/vector'

/**
 * 由搖桿原點與當前點算出移動方向。
 * @param ox/oy    原點座標。
 * @param cx/cy    當前點座標。
 * @param deadzone 死區半徑（px）。
 * @returns 距離 ≤ deadzone 時回 {0,0}；否則回正規化單位向量（方向 = cur − origin）。
 */
export function joystickVector(ox: number, oy: number, cx: number, cy: number, deadzone: number): Vec2 {
  const dx = cx - ox
  const dy = cy - oy
  const len = Math.hypot(dx, dy)
  if (len <= deadzone) return { x: 0, y: 0 }
  return { x: dx / len, y: dy / len }
}

/** 搖桿死區（px）。 */
const DEADZONE = 12

/**
 * 觸控輸入狀態機。只追蹤第一個按下的 pointer（多指忽略其餘）。
 * down 綁在元素上、move/up 綁 window 以接住拖出元素的情況。
 */
export class TouchInput {
  /** 搖桿視覺/計算狀態（元素內座標）；供 renderer 讀取。 */
  readonly joystick = { active: false, ox: 0, oy: 0, cx: 0, cy: 0 }
  private el: HTMLElement | null = null
  private pointerId: number | null = null

  /** 由 pointer 事件換算成元素內座標。 */
  private localXY(e: PointerEvent): { x: number; y: number } {
    const r = this.el!.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }

  private onDown = (e: PointerEvent): void => {
    if (this.pointerId !== null) return // 已有第一指，忽略其餘
    this.pointerId = e.pointerId
    const p = this.localXY(e)
    this.joystick.active = true
    this.joystick.ox = this.joystick.cx = p.x
    this.joystick.oy = this.joystick.cy = p.y
  }
  private onMove = (e: PointerEvent): void => {
    if (e.pointerId !== this.pointerId) return
    const p = this.localXY(e)
    this.joystick.cx = p.x
    this.joystick.cy = p.y
  }
  private onUp = (e: PointerEvent): void => {
    if (e.pointerId !== this.pointerId) return
    this.pointerId = null
    this.joystick.active = false
  }

  /** 開始監聽。 */
  attach(el: HTMLElement): void {
    this.el = el
    el.addEventListener('pointerdown', this.onDown)
    window.addEventListener('pointermove', this.onMove)
    window.addEventListener('pointerup', this.onUp)
    window.addEventListener('pointercancel', this.onUp)
  }

  /** 停止監聽並清空狀態。 */
  detach(): void {
    if (this.el) this.el.removeEventListener('pointerdown', this.onDown)
    window.removeEventListener('pointermove', this.onMove)
    window.removeEventListener('pointerup', this.onUp)
    window.removeEventListener('pointercancel', this.onUp)
    this.el = null
    this.pointerId = null
    this.joystick.active = false
  }

  /** @returns 目前搖桿方向（active 時的正規化向量，否則 {0,0}）。 */
  direction(): Vec2 {
    if (!this.joystick.active) return { x: 0, y: 0 }
    return joystickVector(this.joystick.ox, this.joystick.oy, this.joystick.cx, this.joystick.cy, DEADZONE)
  }
}
