/**
 * 噪聲紋理視差背景（呈現層）。
 *
 * 開機程序生成無縫平鋪灰階噪聲紋理，做成 2 層視差 TilingSprite（深層慢/中層快）
 * 疊出有機組織底，加在 stage 最底；外加中央暖核提亮維持縱深。per-map tint。
 * 純呈現——不碰模擬/確定性。生成/建立 try/catch 退回，destroy 釋放紋理。
 */
import { Application, Container, Sprite, Texture, TilingSprite } from 'pixi.js'
import type { MapKind } from './types'
import { fbm, ridgedFbm, cellular } from './core/noise'

/** 各場景兩層 tint（深層底色 / 中層提色）與暖核色。 */
const MAP_TINT: Record<MapKind, { deep: number; mid: number; core: number }> = {
  vessel:  { deep: 0x4a1119, mid: 0x8a2230, core: 0x6e1822 },
  stomach: { deep: 0x3a2208, mid: 0x7a4416, core: 0x6e3c12 },
  lung:    { deep: 0x123440, mid: 0x276079, core: 0x1d5066 },
}

/**
 * 生成無縫平鋪灰階噪聲紋理（period 週期環繞），依場景採不同性格的噪聲：
 * 血管＝domain-warp fBm（血漿流動渦流）、胃＝ridged（黏膜皺褶折痕）、肺＝cellular（肺泡蜂窩）。
 */
function makeNoiseTexture(kind: MapKind, seed: number): Texture {
  const T = 256, P = 8
  const cv = document.createElement('canvas')
  cv.width = cv.height = T
  const ctx = cv.getContext('2d')!
  const img = ctx.createImageData(T, T)
  for (let py = 0; py < T; py++) {
    for (let px = 0; px < T; px++) {
      const wx = (px / T) * P, wy = (py / T) * P
      let v: number
      if (kind === 'vessel') {
        // domain warp → 流動渦流/大理石流紋
        const wu = wx + 1.4 * fbm(wx, wy, seed + 11, 3, P)
        const wv = wy + 1.4 * fbm(wx + 3.3, wy + 1.7, seed + 23, 3, P)
        v = fbm(wu, wv, seed, 4, P)
      } else if (kind === 'stomach') {
        // ridged → 黏膜皺褶折痕
        v = ridgedFbm(wx, wy, seed, 4, P)
      } else {
        // cellular → 肺泡蜂窩（反相：細胞中心亮、邊界暗）
        v = 1 - cellular(wx, wy, seed, P)
      }
      const g = Math.round(40 + v * 200) // 灰階（避免純黑，留 tint 空間）
      const i = (py * T + px) * 4
      img.data[i] = g; img.data[i + 1] = g; img.data[i + 2] = g; img.data[i + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  return Texture.from(cv)
}

/** 生成中央暖核提亮紋理（中央暖→外透明）。 */
function makeCoreTexture(color: number): Texture {
  const S = 256
  const cv = document.createElement('canvas')
  cv.width = cv.height = S
  const ctx = cv.getContext('2d')!
  const r = (color >> 16) & 255, gg = (color >> 8) & 255, b = color & 255
  const grad = ctx.createRadialGradient(S / 2, S / 2, S * 0.05, S / 2, S / 2, S * 0.6)
  grad.addColorStop(0, `rgba(${r},${gg},${b},0.16)`)
  grad.addColorStop(1, `rgba(${r},${gg},${b},0)`)
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, S, S)
  return Texture.from(cv)
}

/** 視差背景管理。 */
export class NoiseBackground {
  private container = new Container()
  private deep?: TilingSprite
  private mid?: TilingSprite
  private core?: Sprite
  private noiseTex?: Texture
  private coreTex?: Texture

  constructor(private app: Application, kind: MapKind) {
    try {
      const tint = MAP_TINT[kind]
      this.noiseTex = makeNoiseTexture(kind, Math.floor(Math.random() * 1e6))
      const w = app.renderer.width, h = app.renderer.height
      // 深層：大尺度、慢視差、底色
      this.deep = new TilingSprite({ texture: this.noiseTex, width: w, height: h })
      this.deep.tileScale.set(2.4)
      this.deep.tint = tint.deep
      // 中層：細尺度、快視差、提色（加亮）
      this.mid = new TilingSprite({ texture: this.noiseTex, width: w, height: h })
      this.mid.tileScale.set(1.1)
      this.mid.tint = tint.mid
      this.mid.alpha = 0.5
      this.mid.blendMode = 'add'
      // 中央暖核
      this.coreTex = makeCoreTexture(tint.core)
      this.core = new Sprite(this.coreTex)
      this.container.addChild(this.deep, this.mid, this.core)
      this.resize()
      app.stage.addChildAt(this.container, 0) // 最底（world 之下）
    } catch {
      // 生成/建立失敗 → 退回（不影響可玩性）
    }
  }

  /** 每幀更新視差捲動（依玩家座標 × 不同係數）。 */
  update(px: number, py: number): void {
    if (this.deep) this.deep.tilePosition.set(-px * 0.06, -py * 0.06)
    if (this.mid) this.mid.tilePosition.set(-px * 0.16, -py * 0.16)
  }

  /** resize：層尺寸貼合螢幕；暖核置中拉滿。 */
  resize(): void {
    const w = this.app.renderer.width, h = this.app.renderer.height
    if (this.deep) { this.deep.width = w; this.deep.height = h }
    if (this.mid) { this.mid.width = w; this.mid.height = h }
    if (this.core) { this.core.width = w; this.core.height = h }
  }

  /** 釋放生成的紋理（container/精靈由 app.destroy 清）。 */
  destroy(): void {
    this.noiseTex?.destroy(true)
    this.coreTex?.destroy(true)
  }
}
