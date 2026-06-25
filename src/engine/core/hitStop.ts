/**
 * 頓挫計時器（純邏輯、無 DOM/Pixi 依賴）。
 * trigger 設定凍結時間（受全域冷卻節流），advance 每幀遞減，stopped 查詢是否凍結中。
 */
const COOLDOWN = 0.35

export class HitStop {
  private remaining = 0
  private cooldown = 0

  /** 觸發頓挫凍結 seconds 秒；若冷卻未過則忽略（避免連發卡頓）。 */
  trigger(seconds: number): void {
    if (this.cooldown > 0) return
    this.remaining = Math.max(this.remaining, seconds)
    this.cooldown = COOLDOWN
  }

  /** 推進計時（每幀 dt 秒）。 */
  advance(dt: number): void {
    this.remaining = Math.max(0, this.remaining - dt)
    this.cooldown = Math.max(0, this.cooldown - dt)
  }

  /** 是否處於頓挫凍結中。 */
  get stopped(): boolean {
    return this.remaining > 0
  }
}
