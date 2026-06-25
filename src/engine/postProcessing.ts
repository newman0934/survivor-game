/**
 * 全域後製（PostProcessing）。
 *
 * 把泛光（AdvancedBloom）+ 色彩分級（ColorMatrix）+ 暈影（vignette 覆蓋物）套在 PixiJS
 * app.stage，一次拉升整體畫面質感。純呈現層——不碰模擬/確定性/store。
 *
 * bloom 由 constructor 收 bloomEnabled 決定、可 setBloom 運行時切換（grade + vignette 始終保留）；
 * 濾鏡建立以 try/catch 包住，任何失敗退回無濾鏡正常渲染，不影響可玩性。
 */
import { Application, ColorMatrixFilter, Sprite, Texture, type Filter } from 'pixi.js'
import { AdvancedBloomFilter } from 'pixi-filters'

/** 泛光參數（克制：高 threshold 只讓亮部發散）。 */
const BLOOM = { threshold: 0.55, bloomScale: 0.85, brightness: 1.0, blur: 6, quality: 4 }
/** 色彩分級（輕微對比 + 飽和 + 一抹免疫藍綠冷調 tint）。 */
const GRADE = { contrast: 0.12, saturate: 0.1, tint: 0xe8fffb }
/**
 * 暈影（螢幕四角柔和壓暗）：用 canvas 徑向漸層紋理貼成全螢幕 Sprite。
 * 連續漸層、零帶狀；拉伸到寬螢幕自然成橢圓暈影。
 */
const VIGNETTE = {
  /** 邊緣最深處的 alpha。 */
  edgeAlpha: 0.5,
  /** 中央透明區佔半徑比例（內此比例完全透明、之後才開始漸暗）。 */
  innerStop: 0.5,
  /** 漸層外半徑佔紋理半邊比例（>0.7 讓四角最深）。 */
  outerR: 0.72,
}

/** 產生徑向漸層暈影紋理（中央透明 → 邊緣暗）；連續、無帶狀。 */
function makeVignetteTexture(): Texture {
  const size = 256
  const cv = document.createElement('canvas')
  cv.width = cv.height = size
  const ctx = cv.getContext('2d')!
  const grad = ctx.createRadialGradient(
    size / 2, size / 2, size * 0.18,
    size / 2, size / 2, size * VIGNETTE.outerR,
  )
  grad.addColorStop(0, 'rgba(0,0,16,0)')
  grad.addColorStop(VIGNETTE.innerStop, 'rgba(0,0,16,0)')
  grad.addColorStop(1, `rgba(0,0,16,${VIGNETTE.edgeAlpha})`)
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, size, size)
  return Texture.from(cv)
}

/** 後製管理：建立濾鏡 + 維護螢幕空間的 vignette 覆蓋物（徑向漸層 Sprite）。 */
export class PostProcessing {
  /** 螢幕空間暈影覆蓋物（直接掛在 stage、不隨鏡頭平移）。 */
  private vignette: Sprite

  private bloomEnabled: boolean

  constructor(private app: Application, bloomEnabled: boolean) {
    this.bloomEnabled = bloomEnabled
    this.buildFilters()
    // vignette 疊在最上層（stage 子節點 = 螢幕空間，不隨 world 平移）。
    this.vignette = new Sprite(makeVignetteTexture())
    app.stage.addChild(this.vignette)
    this.resize()
  }

  /** 依目前 bloomEnabled 重建濾鏡鏈（bloom?+grade）；grade 始終保留；失敗退回無濾鏡。 */
  private buildFilters(): void {
    try {
      const filters: Filter[] = []
      if (this.bloomEnabled) {
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
      this.app.stage.filters = filters
      // stage 被鏡頭平移，須固定濾鏡作用區為螢幕，否則 FilterSystem 取錯 bounds → 全黑。
      this.app.stage.filterArea = this.app.screen
    } catch {
      // 濾鏡建立失敗 → 退回無濾鏡正常渲染。
    }
  }

  /** 運行時切換 bloom：重建濾鏡鏈（grade/vignette 不受影響）。 */
  setBloom(enabled: boolean): void {
    if (this.bloomEnabled === enabled) return
    this.bloomEnabled = enabled
    this.buildFilters()
  }

  /** resize 時把暈影 Sprite 拉滿螢幕（紋理連續、不需重繪）。 */
  resize(): void {
    this.vignette.width = this.app.renderer.width
    this.vignette.height = this.app.renderer.height
  }

  /** 釋放生成的暈影紋理（sprite 本身由 app.destroy 連同 stage 子節點清除）。 */
  destroy(): void {
    this.vignette.texture?.destroy(true)
  }
}
