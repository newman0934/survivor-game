/**
 * 全域後製（PostProcessing）。
 *
 * 把泛光（AdvancedBloom）+ 色彩分級（ColorMatrix）+ 暈影（vignette 覆蓋物）套在 PixiJS
 * app.stage，一次拉升整體畫面質感。純呈現層——不碰模擬/確定性/store。
 *
 * 行動裝置（coarse pointer）自動關閉 bloom（保留 grade + vignette，兩者極輕）；
 * 濾鏡建立以 try/catch 包住，任何失敗退回無濾鏡正常渲染，不影響可玩性。
 */
import { Application, ColorMatrixFilter, Graphics, type Filter } from 'pixi.js'
import { AdvancedBloomFilter } from 'pixi-filters'

/** 泛光參數（克制：高 threshold 只讓亮部發散）。 */
const BLOOM = { threshold: 0.55, bloomScale: 0.85, brightness: 1.0, blur: 6, quality: 4 }
/** 色彩分級（輕微對比 + 飽和 + 一抹免疫藍綠冷調 tint）。 */
const GRADE = { contrast: 0.12, saturate: 0.1, tint: 0xe8fffb }
/** 暈影（螢幕四角柔和壓暗）：圓角 + 多層平滑漸層，避免硬方框。 */
const VIGNETTE = { color: 0x000010, alpha: 0.42, layers: 18 }

/**
 * 是否走輕量路徑（行動/觸控裝置）→ 不建立 bloom。
 * 無 matchMedia 的環境視為非 coarse（桌機路徑）。
 */
export function prefersLightweight(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches
}

/** 後製管理：建立濾鏡 + 維護螢幕空間的 vignette 覆蓋物。 */
export class PostProcessing {
  /** 螢幕空間暈影覆蓋物（直接掛在 stage、不隨鏡頭平移）。 */
  private vignette = new Graphics()

  constructor(private app: Application) {
    try {
      const filters: Filter[] = []
      // 行動裝置略過 bloom（GPU 較弱）；桌機才加。
      if (!prefersLightweight()) {
        filters.push(new AdvancedBloomFilter({
          threshold: BLOOM.threshold, bloomScale: BLOOM.bloomScale,
          brightness: BLOOM.brightness, blur: BLOOM.blur, quality: BLOOM.quality,
        }))
      }
      const grade = new ColorMatrixFilter()
      grade.contrast(GRADE.contrast, true)
      grade.saturate(GRADE.saturate, true)
      grade.tint(GRADE.tint, true)
      filters.push(grade)
      app.stage.filters = filters
      // stage 被鏡頭平移，須固定濾鏡作用區為螢幕，否則 FilterSystem 取錯 bounds → 全黑。
      app.stage.filterArea = app.screen
    } catch {
      // 濾鏡建立失敗 → 退回無濾鏡正常渲染。
    }
    // vignette 疊在最上層（stage 子節點 = 螢幕空間，不隨 world 平移）。
    app.stage.addChild(this.vignette)
    this.drawVignette()
  }

  /** resize 時重繪 vignette 以貼合新尺寸。 */
  resize(): void {
    this.drawVignette()
  }

  /**
   * 內部：圓角同心矩形描邊畫螢幕邊緣柔和壓暗。
   * 多層、低 alpha、往中心平滑延伸、大圓角——避免硬方框與內緣線。
   */
  private drawVignette(): void {
    const w = this.app.renderer.width
    const h = this.app.renderer.height
    this.vignette.clear()
    const reach = Math.min(w, h) * 0.5   // 由邊緣往中心漸暗的深度（達中央）
    const radius = Math.min(w, h) * 0.3  // 大圓角，柔化四角、不成硬方框
    const step = reach / VIGNETTE.layers
    for (let i = 0; i < VIGNETTE.layers; i++) {
      const inset = i * step
      // 每層極低 alpha、靠重疊累加；越外圈越暗（i 小 = 外圈）
      const a = (VIGNETTE.alpha / VIGNETTE.layers) * (VIGNETTE.layers - i) / VIGNETTE.layers * 2
      const rw = w - 2 * inset
      const rh = h - 2 * inset
      if (rw <= 0 || rh <= 0) break
      this.vignette
        .roundRect(inset, inset, rw, rh, Math.max(0, radius - inset))
        .stroke({ width: step * 2.2, color: VIGNETTE.color, alpha: a })
    }
  }
}
