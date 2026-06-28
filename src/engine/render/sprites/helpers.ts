/**
 * 繪製共用材質 helper（呈現層）：顏色運算與立體/發光/膜質等小元件。
 * 純繪製、不修改模擬狀態；供 spriteCast / spriteEntities / spriteBackground 共用。
 */
import { Graphics } from 'pixi.js'

/** 把顏色各通道乘上係數 f（<1 變暗），用來產生描邊/陰影色。 */
export function dim(color: number, f: number): number {
  const r = (color >> 16) & 0xff
  const g = (color >> 8) & 0xff
  const b = color & 0xff
  return (Math.round(r * f) << 16) | (Math.round(g * f) << 8) | Math.round(b * f)
}

/** 把顏色各通道朝白色混合 f（0..1，越大越亮），用來產生高光色。 */
export function lighten(color: number, f: number): number {
  const r = (color >> 16) & 0xff
  const g = (color >> 8) & 0xff
  const b = color & 0xff
  const lr = Math.round(r + (255 - r) * f)
  const lg = Math.round(g + (255 - g) * f)
  const lb = Math.round(b + (255 - b) * f)
  return (lr << 16) | (lg << 8) | lb
}

/**
 * 確定性座標雜湊：整數格座標 → [0,1) 偽隨機值（純函式、無副作用）。
 * 供背景地貌決定每格是否有特徵與其外觀；同格永遠相同 → 無限捲動穩定重現。
 * 不使用 Math.random() 或模擬 rng（背景純呈現、與模擬解耦）。
 */
export function bgHash(gx: number, gy: number): number {
  let h = (Math.trunc(gx) * 374761393 + Math.trunc(gy) * 668265263) | 0
  h = (h ^ (h >>> 13)) | 0
  h = Math.imul(h, 1274126177) | 0
  h = (h ^ (h >>> 16)) >>> 0
  return (h % 100000) / 100000
}

/** 立體圓身：暗部底（略下偏）+ 主色 + 描邊 + 左上高光。 */
export function shaded(g: Graphics, cx: number, cy: number, rad: number, color: number): void {
  g.circle(cx, cy + rad * 0.12, rad).fill(dim(color, 0.55))
  g.circle(cx, cy, rad).fill(color)
  g.circle(cx, cy, rad).stroke({ width: 2, color: dim(color, 0.45) })
  g.circle(cx - rad * 0.32, cy - rad * 0.34, rad * 0.42).fill({ color: lighten(color, 0.5), alpha: 0.6 })
}

/** 固定光源方向（左上，單位向量）；高光朝光源、陰影背光源。供材質 helper 共用。 */
const LIGHT = { x: -0.5, y: -0.6 }
/** 免疫細胞核冷光色（青）。 */
export const CELL_CORE = 0x9be8ff

/** 膜透光：外圈一層極淡同色暈（半透明膜感）。 */
export function membrane(g: Graphics, r: number, color: number): void {
  g.circle(0, 0, r * 1.18).fill({ color: lighten(color, 0.25), alpha: 0.08 })
}

/** 形體陰影：背光側（右下）柔暗，增立體。 */
export function innerShade(g: Graphics, r: number, color: number): void {
  g.circle(-LIGHT.x * r * 0.42, -LIGHT.y * r * 0.42, r * 0.92).fill({ color: dim(color, 0.25), alpha: 0.26 })
}

/** 邊光：受光側（左上）緣一道柔和邊緣光（克制、往內收、用本色避免被 bloom 暈成發亮鉤）。 */
export function rimLight(g: Graphics, r: number, color: number): void {
  const a = Math.atan2(LIGHT.y, LIGHT.x)
  g.arc(0, 0, r * 0.9, a - 0.8, a + 0.8).stroke({ width: r * 0.09, color: lighten(color, 0.35), alpha: 0.3 })
}

/** 高光點：受光側小亮斑（濕潤反光）。 */
export function specular(g: Graphics, r: number): void {
  g.circle(LIGHT.x * r * 0.45, LIGHT.y * r * 0.45, r * 0.18).fill({ color: 0xffffff, alpha: 0.5 })
}

/** 發光核：柔光暈 + 亮核 + 亮心（亮到被 bloom 暈染）。 */
export function emissiveCore(g: Graphics, x: number, y: number, r: number, color: number): void {
  g.circle(x, y, r * 1.9).fill({ color, alpha: 0.22 })
  g.circle(x, y, r).fill(lighten(color, 0.35))
  g.circle(x, y, r * 0.5).fill(lighten(color, 0.75))
}
