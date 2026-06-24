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
/** 暈影（螢幕四角柔和壓暗）。 */
const VIGNETTE = { color: 0x000010, alpha: 0.4, layers: 8, band: 26 }

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

  /** 內部：以同心暗框 stroke 畫螢幕邊緣柔和壓暗（alpha 由內而外遞增）。 */
  private drawVignette(): void {
    const w = this.app.renderer.width
    const h = this.app.renderer.height
    this.vignette.clear()
    for (let i = 0; i < VIGNETTE.layers; i++) {
      const inset = i * VIGNETTE.band
      const a = (VIGNETTE.alpha * (VIGNETTE.layers - i)) / VIGNETTE.layers
      this.vignette
        .rect(inset, inset, w - 2 * inset, h - 2 * inset)
        .stroke({ width: VIGNETTE.band, color: VIGNETTE.color, alpha: a })
    }
  }
}
