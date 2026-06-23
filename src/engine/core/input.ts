import type { Vec2 } from './vector'

/**
 * 鍵盤輸入狀態。
 *
 * 監聽瀏覽器的 keydown/keyup 事件，維護「目前按住的按鍵集合」，並把 WASD／方向鍵
 * 轉換成正規化的移動方向向量供遊戲迴圈讀取。這是引擎內少數會碰到瀏覽器 DOM API
 * （`window`、`KeyboardEvent`）的純 TS 模組，但仍不依賴 Vue/Pinia。
 *
 * 採輪詢（polling）而非事件回呼：迴圈每幀呼叫 {@link KeyboardInput.direction} 讀取當前狀態，
 * 讓輸入與固定步長模擬解耦。
 */
export class KeyboardInput {
  /** 目前按住的按鍵（皆轉小寫，避免大小寫不一致）。 */
  private keys = new Set<string>()
  // 以箭頭函式作為穩定的事件處理器參照，確保 attach/detach 能正確新增與移除同一個 listener
  private onKeyDown = (e: KeyboardEvent) => this.keys.add(e.key.toLowerCase())
  private onKeyUp = (e: KeyboardEvent) => this.keys.delete(e.key.toLowerCase())

  /** 開始監聽鍵盤事件。 */
  attach(): void {
    window.addEventListener('keydown', this.onKeyDown)
    window.addEventListener('keyup', this.onKeyUp)
  }

  /** 停止監聽並清空已按下的按鍵狀態（避免殘留方向）。 */
  detach(): void {
    window.removeEventListener('keydown', this.onKeyDown)
    window.removeEventListener('keyup', this.onKeyUp)
    this.keys.clear()
  }

  /**
   * 依目前按住的按鍵計算移動方向。
   *
   * 支援 WASD 與方向鍵；同時按住相反方向會互相抵銷。回傳前會正規化為單位向量，
   * 確保斜向移動不會比正交移動更快。
   *
   * @returns 單位方向向量；無輸入時回傳 `{ 0, 0 }`
   */
  direction(): Vec2 {
    let x = 0
    let y = 0
    // 螢幕座標 Y 軸向下為正，故「上」為 -1、「下」為 +1
    if (this.keys.has('a') || this.keys.has('arrowleft')) x -= 1
    if (this.keys.has('d') || this.keys.has('arrowright')) x += 1
    if (this.keys.has('w') || this.keys.has('arrowup')) y -= 1
    if (this.keys.has('s') || this.keys.has('arrowdown')) y += 1
    const len = Math.hypot(x, y)
    if (len === 0) return { x: 0, y: 0 }
    return { x: x / len, y: y / len } // 正規化，避免斜向移動加速
  }
}
