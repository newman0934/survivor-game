/**
 * 程式化美術繪製函式（呈現層）。
 *
 * 每個函式把某種 entity 的造型用 PixiJS Graphics 畫出（畫一次靜態幾何）；動畫（旋轉/脈動/
 * 閃白）由 PixiRenderer 以 transform 每幀套用。純繪製、不修改模擬狀態。
 */
import { Graphics } from 'pixi.js'
import type { Entity, MapKind, CharacterKind } from '../types'
import { ENEMY_DEFS } from '../systems/enemyDefs'
import { PICKUP_DEFS } from '../systems/pickupDefs'
import { ELITE_AFFIX_DEFS } from '../systems/eliteDefs'

/** 把顏色各通道乘上係數 f（<1 變暗），用來產生描邊/陰影色。 */
function dim(color: number, f: number): number {
  const r = (color >> 16) & 0xff
  const g = (color >> 8) & 0xff
  const b = color & 0xff
  return (Math.round(r * f) << 16) | (Math.round(g * f) << 8) | Math.round(b * f)
}

/** 把顏色各通道朝白色混合 f（0..1，越大越亮），用來產生高光色。 */
function lighten(color: number, f: number): number {
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
function shaded(g: Graphics, cx: number, cy: number, rad: number, color: number): void {
  g.circle(cx, cy + rad * 0.12, rad).fill(dim(color, 0.55))
  g.circle(cx, cy, rad).fill(color)
  g.circle(cx, cy, rad).stroke({ width: 2, color: dim(color, 0.45) })
  g.circle(cx - rad * 0.32, cy - rad * 0.34, rad * 0.42).fill({ color: lighten(color, 0.5), alpha: 0.6 })
}

/** 固定光源方向（左上，單位向量）；高光朝光源、陰影背光源。供材質 helper 共用。 */
const LIGHT = { x: -0.5, y: -0.6 }
/** 免疫細胞核冷光色（青）。 */
const CELL_CORE = 0x9be8ff

/** 膜透光：外圈一層極淡同色暈（半透明膜感）。 */
function membrane(g: Graphics, r: number, color: number): void {
  g.circle(0, 0, r * 1.18).fill({ color: lighten(color, 0.25), alpha: 0.08 })
}

/** 形體陰影：背光側（右下）柔暗，增立體。 */
function innerShade(g: Graphics, r: number, color: number): void {
  g.circle(-LIGHT.x * r * 0.42, -LIGHT.y * r * 0.42, r * 0.92).fill({ color: dim(color, 0.25), alpha: 0.26 })
}

/** 邊光：受光側（左上）緣一道柔和邊緣光（克制、往內收、用本色避免被 bloom 暈成發亮鉤）。 */
function rimLight(g: Graphics, r: number, color: number): void {
  const a = Math.atan2(LIGHT.y, LIGHT.x)
  g.arc(0, 0, r * 0.9, a - 0.8, a + 0.8).stroke({ width: r * 0.09, color: lighten(color, 0.35), alpha: 0.3 })
}

/** 高光點：受光側小亮斑（濕潤反光）。 */
function specular(g: Graphics, r: number): void {
  g.circle(LIGHT.x * r * 0.45, LIGHT.y * r * 0.45, r * 0.18).fill({ color: 0xffffff, alpha: 0.5 })
}

/** 發光核：柔光暈 + 亮核 + 亮心（亮到被 bloom 暈染）。 */
function emissiveCore(g: Graphics, x: number, y: number, r: number, color: number): void {
  g.circle(x, y, r * 1.9).fill({ color, alpha: 0.22 })
  g.circle(x, y, r).fill(lighten(color, 0.35))
  g.circle(x, y, r * 0.5).fill(lighten(color, 0.75))
}

/**
 * 玩家：四種免疫細胞各有獨特輪廓（依玩法定位 + 生物特徵），顏色為角色色。
 * 由 renderer 依 lastMoveDir 旋轉朝 +x。
 */
export function drawPlayer(g: Graphics, e: Entity, color: number, character: CharacterKind): void {
  const r = e.radius
  const stroke = dim(color, 0.5)
  switch (character) {
    case 'neutrophil': {
      // 嗜中性球（遊俠）：流線細胞 + 前導偽足（+x 衝刺方向）+ 多分葉核 + 顆粒
      g.poly([r * 1.35, 0, r * 0.2, -r * 0.5, r * 0.2, r * 0.5]).fill({ color: lighten(color, 0.15), alpha: 0.9 })
      g.ellipse(0, 0, r * 0.95, r * 0.82).fill({ color, alpha: 0.85 })
      g.ellipse(0, 0, r * 0.95, r * 0.82).stroke({ width: 2, color: stroke })
      g.circle(-r * 0.3, -r * 0.26, r * 0.32).fill({ color: lighten(color, 0.5), alpha: 0.3 })
      // 多分葉核（3 葉相連，嗜中性球特徵）
      for (const [lx, ly] of [[-r * 0.2, 0], [r * 0.1, -r * 0.18], [r * 0.1, r * 0.18]] as const) {
        g.circle(lx, ly, r * 0.2).fill(dim(color, 0.4))
      }
      // 細胞顆粒
      for (const [px, py] of [[-r * 0.42, r * 0.28], [r * 0.3, r * 0.34], [-r * 0.46, -r * 0.22]] as const) {
        g.circle(px, py, r * 0.08).fill({ color: lighten(color, 0.6), alpha: 0.75 })
      }
      innerShade(g, r * 0.9, color)
      rimLight(g, r * 0.9, color)
      specular(g, r * 0.9)
      emissiveCore(g, 0, 0, r * 0.2, CELL_CORE)
      membrane(g, r * 0.9, color)
      break
    }
    case 'nkcell': {
      // NK 細胞（法師）：圓潤膜身 + 偏側大核 + 一叢明亮細胞毒顆粒（殺傷裝載感）
      g.circle(0, 0, r).fill({ color, alpha: 0.85 })
      g.circle(0, 0, r).stroke({ width: 2, color: stroke })
      g.circle(-r * 0.28, -r * 0.28, r * 0.34).fill({ color: lighten(color, 0.5), alpha: 0.3 })
      g.circle(-r * 0.25, r * 0.08, r * 0.4).fill(dim(color, 0.4))
      for (const [px, py] of [[r * 0.3, -r * 0.15], [r * 0.48, r * 0.08], [r * 0.26, r * 0.26], [r * 0.5, -r * 0.28]] as const) {
        g.circle(px, py, r * 0.12).fill({ color: lighten(color, 0.7), alpha: 0.85 })
      }
      innerShade(g, r, color)
      rimLight(g, r, color)
      specular(g, r)
      emissiveCore(g, -r * 0.25, r * 0.08, r * 0.26, CELL_CORE)
      membrane(g, r, color)
      break
    }
    case 'dendritic': {
      // 樹突細胞（豐收者）：多條長樹突向外放射（採集/呈現抗原）+ 小膜身 + 核
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2
        g.moveTo(Math.cos(a) * r * 0.6, Math.sin(a) * r * 0.6)
          .lineTo(Math.cos(a) * r * 1.5, Math.sin(a) * r * 1.5)
      }
      g.stroke({ width: 2, color: dim(color, 0.35) })
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2
        g.circle(Math.cos(a) * r * 1.5, Math.sin(a) * r * 1.5, r * 0.12).fill({ color: lighten(color, 0.3), alpha: 0.85 })
      }
      g.circle(0, 0, r * 0.72).fill({ color, alpha: 0.88 })
      g.circle(0, 0, r * 0.72).stroke({ width: 2, color: stroke })
      g.circle(0, 0, r * 0.32).fill(dim(color, 0.4))
      innerShade(g, r * 0.72, color)
      rimLight(g, r * 0.72, color)
      specular(g, r * 0.72)
      emissiveCore(g, 0, 0, r * 0.22, CELL_CORE)
      membrane(g, r * 0.72, color)
      break
    }
    case 'mastcell': {
      // 肥大細胞（範圍清場）：圓潤膜身 + 一圈短鈍偽足 + 密布組織胺顆粒
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2
        g.circle(Math.cos(a) * r * 1.02, Math.sin(a) * r * 1.02, r * 0.16).fill({ color, alpha: 0.8 })
      }
      g.circle(0, 0, r).fill({ color, alpha: 0.85 })
      g.circle(0, 0, r).stroke({ width: 2, color: stroke })
      g.circle(-r * 0.28, -r * 0.28, r * 0.34).fill({ color: lighten(color, 0.5), alpha: 0.3 })
      g.circle(0, 0, r * 0.34).fill(dim(color, 0.4)) // 核
      for (const [px, py] of [[r * 0.3, -r * 0.2], [-r * 0.34, r * 0.26], [r * 0.12, r * 0.4], [-r * 0.1, -r * 0.42], [r * 0.44, r * 0.12], [-r * 0.44, -r * 0.06]] as const) {
        g.circle(px, py, r * 0.1).fill({ color: lighten(color, 0.6), alpha: 0.8 })
      }
      innerShade(g, r, color)
      rimLight(g, r, color)
      specular(g, r)
      emissiveCore(g, 0, 0, r * 0.22, CELL_CORE)
      membrane(g, r, color)
      break
    }
    default: {
      // macrophage 巨噬細胞（戰士）：大型變形蟲，周身一圈短偽足（吞噬）+ 大核
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2
        g.circle(Math.cos(a) * r * 1.0, Math.sin(a) * r * 1.0, r * 0.3).fill({ color, alpha: 0.85 })
      }
      g.circle(0, 0, r * 1.04).fill({ color, alpha: 0.85 })
      g.circle(0, 0, r * 1.04).stroke({ width: 2, color: stroke })
      g.circle(-r * 0.3, -r * 0.3, r * 0.4).fill({ color: lighten(color, 0.5), alpha: 0.3 })
      g.circle(r * 0.08, 0, r * 0.46).fill(dim(color, 0.4))
      g.circle(r * 0.03, -r * 0.1, r * 0.15).fill({ color: lighten(color, 0.55), alpha: 0.7 })
      innerShade(g, r * 1.04, color)
      rimLight(g, r * 1.04, color)
      specular(g, r * 1.04)
      emissiveCore(g, r * 0.08, 0, r * 0.26, CELL_CORE)
      membrane(g, r * 1.04, color)
    }
  }
}

/** 敵人：依 enemyKind 畫多部件立體造型，顏色取自 ENEMY_DEFS。 */
export function drawEnemy(g: Graphics, e: Entity): void {
  const r = e.radius
  const color = e.enemyKind ? ENEMY_DEFS[e.enemyKind].color : 0xff5252
  // 精英光環（若敵人帶詞綴則在造型之前先畫）
  if (e.affix) {
    const aura = ELITE_AFFIX_DEFS[e.affix].auraColor
    g.circle(0, 0, r * 1.45).fill({ color: aura, alpha: 0.18 })
    g.circle(0, 0, r * 1.2).stroke({ width: 3, color: aura, alpha: 0.9 })
  }
  switch (e.enemyKind) {
    case 'bacteria': {
      // 桿菌：膠囊身（兩圓覆蓋橢圓）+ 鞭毛尾曲線 + 細胞壁描邊 + 微高光
      const bw = r * 1.6  // 膠囊半長
      g.ellipse(0, 0, bw, r * 0.75).fill(dim(color, 0.55))     // 暗部底
      g.ellipse(0, 0, bw, r * 0.7).fill(color)                  // 主體
      g.ellipse(0, 0, bw, r * 0.7).stroke({ width: 1.5, color: dim(color, 0.4) }) // 細胞壁
      g.circle(-bw * 0.6, 0, r * 0.68).fill(dim(color, 0.55))  // 後端半球暗
      g.circle(-bw * 0.6, 0, r * 0.65).fill(color)             // 後端半球
      g.circle(bw * 0.6, 0, r * 0.68).fill(dim(color, 0.55))   // 前端半球暗
      g.circle(bw * 0.6, 0, r * 0.65).fill(color)              // 前端半球
      // 鞭毛：從後端延伸的 S 形曲線（兩條）
      g.moveTo(-bw - r * 0.3, 0)
        .quadraticCurveTo(-bw - r * 1.1, -r * 0.7, -bw - r * 1.8, r * 0.2)
      g.stroke({ width: 1.5, color: dim(color, 0.5) })
      g.moveTo(-bw - r * 0.3, r * 0.2)
        .quadraticCurveTo(-bw - r * 0.9, r * 0.9, -bw - r * 1.6, -r * 0.15)
      g.stroke({ width: 1.2, color: dim(color, 0.45) })
      // 高光：左上亮斑
      g.circle(bw * 0.2, -r * 0.25, r * 0.22).fill({ color: lighten(color, 0.5), alpha: 0.55 })
      specular(g, r)
      membrane(g, r, color)
      break
    }
    case 'spore': {
      // 真菌孢子：厚外壁環 + 內體 + 內含顆粒小點
      g.circle(0, 0, r).fill(dim(color, 0.35))                              // 外壁底色
      g.circle(0, 0, r).stroke({ width: r * 0.28, color: dim(color, 0.5) }) // 厚外壁描邊
      g.circle(0, 0, r * 0.72).fill(color)                                  // 內體
      g.circle(0, 0, r * 0.72).stroke({ width: 1.5, color: dim(color, 0.45) })
      // 內含顆粒：5 個小暗點散布於內部
      const pts = [[0.3, -0.25], [-0.25, -0.3], [0.1, 0.35], [-0.35, 0.15], [0.38, 0.28]]
      for (const [px, py] of pts) {
        g.circle(px * r, py * r, r * 0.1).fill(dim(color, 0.4))
      }
      // 高光：右上亮斑
      g.circle(-r * 0.28, -r * 0.3, r * 0.28).fill({ color: lighten(color, 0.45), alpha: 0.5 })
      innerShade(g, r, color)
      rimLight(g, r, color)
      specular(g, r)
      emissiveCore(g, 0, 0, r * 0.34, lighten(color, 0.1))
      break
    }
    case 'spiral': {
      // 螺旋體：沿 +x 軸的正弦波粗體（前端略大），renderer 依 vel 方向旋轉
      const SEGS = 14
      const len = r * 2.2
      // 先畫陰影粗線
      for (let i = 0; i < SEGS; i++) {
        const t0 = i / SEGS, t1 = (i + 1) / SEGS
        const x0 = -len * 0.5 + t0 * len, x1 = -len * 0.5 + t1 * len
        const y0 = Math.sin(t0 * Math.PI * 2.5) * r * 0.55
        const y1 = Math.sin(t1 * Math.PI * 2.5) * r * 0.55
        const sw = r * 0.28 + t0 * r * 0.18   // 前端（+x）較粗
        g.moveTo(x0, y0).lineTo(x1, y1)
        g.stroke({ width: sw + 2, color: dim(color, 0.4) })
      }
      // 主色粗線
      for (let i = 0; i < SEGS; i++) {
        const t0 = i / SEGS, t1 = (i + 1) / SEGS
        const x0 = -len * 0.5 + t0 * len, x1 = -len * 0.5 + t1 * len
        const y0 = Math.sin(t0 * Math.PI * 2.5) * r * 0.55
        const y1 = Math.sin(t1 * Math.PI * 2.5) * r * 0.55
        const sw = r * 0.28 + t0 * r * 0.18
        g.moveTo(x0, y0).lineTo(x1, y1)
        g.stroke({ width: sw, color })
      }
      // 前端頭部小圓（+x 一側）
      g.circle(len * 0.45, 0, r * 0.28).fill(lighten(color, 0.25))
      g.circle(len * 0.45, 0, r * 0.28).stroke({ width: 1.5, color: dim(color, 0.4) })
      emissiveCore(g, len * 0.45, 0, r * 0.2, lighten(color, 0.2))
      break
    }
    case 'spitter': {
      // 噴吐病原：囊狀體 + 朝 +x 噴口短管 + 毒斑
      shaded(g, 0, 0, r, color)
      g.roundRect(r * 0.6, -r * 0.28, r * 0.7, r * 0.56, 3).fill(dim(color, 0.5)) // 噴口
      g.circle(r * 1.15, 0, r * 0.18).fill(dim(color, 0.3))
      for (const [px, py] of [[-r * 0.3, -r * 0.2], [r * 0.1, r * 0.3], [-r * 0.1, r * 0.05]] as const) {
        g.circle(px, py, r * 0.12).fill(dim(color, 0.35))
      }
      innerShade(g, r, color)
      rimLight(g, r, color)
      specular(g, r)
      emissiveCore(g, 0, 0, r * 0.3, lighten(color, 0.15))
      break
    }
    case 'splitter': {
      // 分裂菌：分裂中雙葉（兩交疊圓 + 中央縊縮）
      shaded(g, -r * 0.45, 0, r * 0.7, color)
      shaded(g, r * 0.45, 0, r * 0.7, color)
      g.ellipse(0, 0, r * 0.18, r * 0.62).fill(dim(color, 0.4)) // 中央縊縮
      g.circle(-r * 0.45, -r * 0.15, r * 0.16).fill(lighten(color, 0.3))
      g.circle(r * 0.45, -r * 0.15, r * 0.16).fill(lighten(color, 0.3))
      emissiveCore(g, -r * 0.45, 0, r * 0.2, lighten(color, 0.15))
      emissiveCore(g, r * 0.45, 0, r * 0.2, lighten(color, 0.15))
      membrane(g, r, color)
      break
    }
    case 'exploder': {
      // 膿疱自爆體：鼓脹膿包 + 外凸瘤 + 緊繃描邊
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2
        g.circle(Math.cos(a) * r * 0.85, Math.sin(a) * r * 0.85, r * 0.32).fill(dim(color, 0.7))
      }
      shaded(g, 0, 0, r, color)
      g.circle(0, 0, r).stroke({ width: 2, color: lighten(color, 0.3) })
      g.circle(-r * 0.2, -r * 0.2, r * 0.22).fill({ color: lighten(color, 0.6), alpha: 0.7 })
      innerShade(g, r, color)
      rimLight(g, r, color)
      emissiveCore(g, 0, 0, r * 0.42, lighten(color, 0.25)) // 蓄爆核（更大更亮）
      membrane(g, r, color)
      break
    }
    case 'superbug': {
      // 超級病原：不規則團塊（5 個交疊圓 lobes）+ 暗核 + 兩發光亮點
      const lobes = [
        [0, 0, 1.0],          // 中央主體
        [r * 0.55, -r * 0.4, 0.75],
        [-r * 0.5, -r * 0.38, 0.72],
        [r * 0.45, r * 0.5, 0.68],
        [-r * 0.38, r * 0.52, 0.65],
      ] as const
      // 暗部底：每個 lobe 略下偏
      for (const [lx, ly, lf] of lobes) {
        g.circle(lx, ly + r * 0.1, r * lf).fill(dim(color, 0.5))
      }
      // 主色 lobes
      for (const [lx, ly, lf] of lobes) {
        g.circle(lx, ly, r * lf).fill(color)
      }
      // 外輪廓描邊
      g.circle(0, 0, r * 1.05).stroke({ width: 2, color: dim(color, 0.4) })
      // 暗核
      g.circle(0, 0, r * 0.45).fill(dim(color, 0.3))
      // 發光亮點（模擬眼睛/內核高光，保留脈動縮放空間）
      g.circle(-r * 0.28, -r * 0.12, r * 0.17).fill(0xce93d8)
      g.circle(-r * 0.28, -r * 0.12, r * 0.17).stroke({ width: 1.5, color: 0xffffff })
      g.circle(r * 0.28, -r * 0.12, r * 0.17).fill(0xce93d8)
      g.circle(r * 0.28, -r * 0.12, r * 0.17).stroke({ width: 1.5, color: 0xffffff })
      emissiveCore(g, -r * 0.28, -r * 0.12, r * 0.17, 0xe1a8ff)
      emissiveCore(g, r * 0.28, -r * 0.12, r * 0.17, 0xe1a8ff)
      membrane(g, r, color)
      break
    }
    case 'finalboss': {
      // 終局 Boss：超大體型 + 雙重發光光環 + 核（最終頭目威壓感）
      g.circle(0, 0, r * 1.35).fill({ color, alpha: 0.16 })
      g.circle(0, 0, r * 1.18).stroke({ width: 4, color, alpha: 0.85 })
      g.circle(0, 0, r).fill({ color, alpha: 0.9 })
      g.circle(0, 0, r).stroke({ width: 3, color: dim(color, 0.4) })
      g.circle(-r * 0.3, -r * 0.3, r * 0.4).fill({ color: lighten(color, 0.5), alpha: 0.3 })
      g.circle(0, 0, r * 0.42).fill(dim(color, 0.45))
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2
        g.circle(Math.cos(a) * r * 0.7, Math.sin(a) * r * 0.7, r * 0.1).fill({ color: lighten(color, 0.6), alpha: 0.8 })
      }
      break
    }
    default: {
      // virus（多刺二十面體殼）：立體圓身 + 一圈三角棘突 + 衣殼核心
      shaded(g, 0, 0, r, color)
      // 12 枚棘突（三角形，從表面向外輻射）
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2
        const ax = Math.cos(a), ay = Math.sin(a)
        const bx = Math.cos(a - 0.22), by = Math.sin(a - 0.22)
        const cx2 = Math.cos(a + 0.22), cy2 = Math.sin(a + 0.22)
        g.poly([
          ax * (r + r * 0.35), ay * (r + r * 0.35),   // 尖端
          bx * r * 0.92,       by * r * 0.92,           // 基底左
          cx2 * r * 0.92,      cy2 * r * 0.92,          // 基底右
        ]).fill(dim(color, 0.6))
      }
      // 衣殼核心（深色小圓）
      g.circle(0, 0, r * 0.45).fill(dim(color, 0.3))
      innerShade(g, r, color)
      rimLight(g, r, color)
      specular(g, r)
      emissiveCore(g, 0, 0, r * 0.3, lighten(color, 0.1))
    }
  }
}

/** 抗原碎片：結晶菱形（四切面明暗）+ 外發光暈 + 亮核。 */
export function drawGem(g: Graphics, e: Entity): void {
  const r = e.radius
  const base = 0xffd54a
  // 外發光暈
  g.circle(0, 0, r * 1.5).fill({ color: base, alpha: 0.18 })
  // 四切面分明暗（上亮下暗）
  g.poly([0, -r, r, 0, 0, 0]).fill(lighten(base, 0.4))   // 右上 亮
  g.poly([0, -r, -r, 0, 0, 0]).fill(lighten(base, 0.15)) // 左上
  g.poly([0, r, r, 0, 0, 0]).fill(dim(base, 0.75))       // 右下 暗
  g.poly([0, r, -r, 0, 0, 0]).fill(dim(base, 0.55))      // 左下
  // 描邊 + 亮核
  g.poly([0, -r, r, 0, 0, r, -r, 0]).stroke({ width: 1.2, color: 0xfff3c4 })
  g.circle(0, 0, r * 0.22).fill(0xffffff)
}

/** 中和彈：依 projShape 區分抗體（Y 形）與穿孔素（尖刺）與毒液彈；方向由 PixiRenderer 依 vel 旋轉（指向 +x）。 */
export function drawProjectile(g: Graphics, e: Entity): void {
  const r = e.radius
  if (e.projShape === 'toxin') {
    // 敵方毒液彈：放大 + 暗綠描邊（高對比）+ 亮毒核 + 毒滴，明顯易辨
    g.circle(0, 0, r * 2.6).fill({ color: 0x7cb342, alpha: 0.28 }) // 外毒暈
    g.circle(0, 0, r * 1.5).fill(0xaeea00)                          // 主體（亮毒黃綠）
    g.circle(0, 0, r * 1.5).stroke({ width: 2, color: 0x33691e })   // 暗綠描邊（對比）
    g.circle(0, 0, r * 0.7).fill(0xf0f4c3)                          // 亮核
    g.circle(r * 0.95, -r * 0.45, r * 0.4).fill(0xaeea00)           // 毒滴點綴
    g.circle(r * 0.95, -r * 0.45, r * 0.4).stroke({ width: 1.2, color: 0x33691e })
    emissiveCore(g, 0, 0, r * 0.55, 0xd6ff6e)                       // 毒核發光（接 bloom）
    return
  }
  // 進化投射物：抗原黃光暈（畫在造型底層）
  if (e.evolved) g.circle(0, 0, r * 3.0).fill({ color: 0xffd54a, alpha: 0.25 })
  if (e.projShape === 'perforin') {
    // 穿孔素飛鏢：細長琥珀色尖針（前尖 +x）+ 後方拖尾（明顯比抗體長）
    g.poly([-r * 2.6, 0, -r * 0.4, -r * 0.18, -r * 0.4, r * 0.18]).fill({ color: 0xffcc55, alpha: 0.5 })
    g.poly([r * 2.7, 0, -r * 0.3, -r * 0.42, -r * 0.95, 0, -r * 0.3, r * 0.42]).fill(0xffa000)
    g.poly([r * 2.7, 0, -r * 0.1, -r * 0.2, -r * 0.1, r * 0.2]).fill(0xfff3c4)
    emissiveCore(g, r * 2.2, 0, r * 0.32, 0xffe08a)                 // 針尖發光（接 bloom）
  } else {
    // 抗體：青色 Y 形（雙叉朝 +x、叉端亮球）+ 冷光暈（緊湊、與尖針對比）
    g.circle(0, 0, r * 2.0).fill({ color: 0x4ad6ff, alpha: 0.22 })
    g.moveTo(-r * 1.2, 0).lineTo(0, 0)
    g.moveTo(0, 0).lineTo(r * 1.2, -r * 1.05)
    g.moveTo(0, 0).lineTo(r * 1.2, r * 1.05)
    g.stroke({ width: 3, color: 0x8be9ff })
    g.circle(r * 1.2, -r * 1.05, r * 0.3).fill(0xeaffff)
    g.circle(r * 1.2, r * 1.05, r * 0.3).fill(0xeaffff)
    g.circle(0, 0, r * 0.42).fill(0x4ad6ff)
    emissiveCore(g, 0, 0, r * 0.42, 0x8be9ff)                      // 核發光（接 bloom）
  }
}

/** 補體複合體：外柔光暈 + 主球 + 數個小亞基瓣 + 亮核（旋轉由 PixiRenderer 套用）。 */
export function drawOrbit(g: Graphics, e: Entity): void {
  const r = e.radius
  const base = 0xbfeaff
  // 外柔光暈
  g.circle(0, 0, r * 1.6).fill({ color: base, alpha: 0.2 })
  // 5 個小亞基瓣（環繞主球）
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2
    g.circle(Math.cos(a) * r * 0.72, Math.sin(a) * r * 0.72, r * 0.4).fill({ color: base, alpha: 0.85 })
  }
  // 主球 + 描邊
  g.circle(0, 0, r * 0.85).fill(lighten(base, 0.15))
  g.circle(0, 0, r * 0.85).stroke({ width: 1.5, color: dim(base, 0.55) })
  // 亮核
  g.circle(0, 0, r * 0.34).fill(0xffffff)
}

/** 寶箱 → 補給囊泡：半透明金膜 + 內部金色發光核 + 高光點。 */
export function drawChest(g: Graphics, e: Entity): void {
  const r = e.radius
  // 金色外暈（獎勵感）
  g.circle(0, 0, r * 1.25).fill({ color: 0xffd54a, alpha: 0.18 })
  // 半透明金膜囊泡
  g.circle(0, 0, r).fill({ color: 0xffe9a8, alpha: 0.55 })
  g.circle(0, 0, r).stroke({ width: 2, color: dim(0xffd54a, 0.7) })
  // 內部金色發光核
  g.circle(0, 0, r * 0.5).fill(0xffd54a)
  g.circle(0, 0, r * 0.28).fill({ color: 0xfff3c4, alpha: 0.95 })
  // 膜面高光點
  g.circle(-r * 0.35, -r * 0.4, r * 0.18).fill({ color: 0xffffff, alpha: 0.5 })
}

/** 撿取物：heal（綠＋白十字）/ vacuum（紫＋漩渦弧）；色取自 PICKUP_DEFS、略大於寶石、外發光暈。 */
export function drawPickup(g: Graphics, e: Entity): void {
  const r = e.radius
  const base = e.pickupKind ? PICKUP_DEFS[e.pickupKind].color : 0xffffff
  g.circle(0, 0, r * 1.5).fill({ color: base, alpha: 0.2 }) // 光暈
  g.circle(0, 0, r).fill(base)
  g.circle(0, 0, r).stroke({ width: 1.2, color: lighten(base, 0.5) })
  if (e.pickupKind === 'heal') {
    const t = r * 0.3
    g.rect(-t, -r * 0.62, t * 2, r * 1.24).fill(0xffffff)
    g.rect(-r * 0.62, -t, r * 1.24, t * 2).fill(0xffffff)
  } else {
    g.arc(0, 0, r * 0.55, 0, Math.PI * 1.5).stroke({ width: 2, color: 0xffffff })
  }
}

/** 背景網格：在世界座標、玩家可視範圍內畫間距 64 的細線（無限捲動）；顏色/透明度由地圖決定。 */
export function drawBackgroundGrid(
  g: Graphics, cx: number, cy: number, viewW: number, viewH: number, color: number, alpha: number,
): void {
  const step = 64
  const left = cx - viewW / 2 - step
  const right = cx + viewW / 2 + step
  const top = cy - viewH / 2 - step
  const bottom = cy + viewH / 2 + step
  const x0 = Math.floor(left / step) * step
  const y0 = Math.floor(top / step) * step
  for (let x = x0; x <= right; x += step) {
    g.moveTo(x, top).lineTo(x, bottom)
  }
  for (let y = y0; y <= bottom; y += step) {
    g.moveTo(left, y).lineTo(right, y)
  }
  g.stroke({ width: 1, color, alpha })
}

/** 地面特徵層：依 kind 在可視範圍格點散布專屬地貌（世界座標、隨鏡頭捲動）。 */
function drawTerrain(
  g: Graphics, kind: MapKind, cx: number, cy: number, viewW: number, viewH: number, clock: number,
): void {
  const TILE = 128
  const gx0 = Math.floor((cx - viewW / 2 - TILE) / TILE)
  const gy0 = Math.floor((cy - viewH / 2 - TILE) / TILE)
  const gx1 = Math.ceil((cx + viewW / 2 + TILE) / TILE)
  const gy1 = Math.ceil((cy + viewH / 2 + TILE) / TILE)
  for (let gx = gx0; gx <= gx1; gx++) {
    for (let gy = gy0; gy <= gy1; gy++) {
      if (bgHash(gx, gy) > 0.5) continue // ~50% 格子有特徵
      const px = gx * TILE + bgHash(gx + 31, gy + 17) * TILE
      const py = gy * TILE + bgHash(gx + 53, gy + 97) * TILE
      const v = bgHash(gx + 7, gy + 13)
      if (kind === 'stomach') {
        if (v < 0.6) {
          // 胃黏膜皺褶：暖褐曲線雙線（陰影底 + 亮線）
          const ox = (bgHash(gx + 71, gy + 83) - 0.5) * 12
          const path = (): void => {
            g.moveTo(px - 13, py + ox)
              .quadraticCurveTo(px, py + ox - 7, px + 13, py + ox + 4)
          }
          path(); g.stroke({ width: 3.2, color: 0x1a0900, alpha: 0.55 })
          path(); g.stroke({ width: 1.4, color: 0xc07838, alpha: 0.55 })
        } else if (v < 0.8) {
          // 酸泡：外發光暈（暖橙）+ 亮核（脈動，沿用 clock）
          const a = 0.4 + 0.35 * Math.sin(clock * 3 + v * 6.28)
          g.circle(px, py, 6).fill({ color: 0xffb74d, alpha: a * 0.22 })
          g.circle(px, py, 3).fill({ color: 0xffb74d, alpha: a })
          g.circle(px, py, 1.4).fill({ color: 0xfff0c4, alpha: a })
        } else {
          // 胃小凹：暗點凹陷（暗圓 + 內更暗）
          g.circle(px, py, 3.5).fill({ color: 0x2a1206, alpha: 0.5 })
          g.circle(px, py, 1.6).fill({ color: 0x140702, alpha: 0.6 })
        }
      } else if (kind === 'lung') {
        if (v < 0.6) {
          // 肺泡氣囊：淡藍柔化圓 + 內陰影（兩層圓環製造立體感）
          const rad = 9 + v * 7
          g.circle(px, py, rad).fill({ color: 0x4a9fbf, alpha: 0.12 })
          g.circle(px, py, rad).stroke({ width: 1.5, color: 0x8fcfe0, alpha: 0.35 })
          g.circle(px + rad * 0.22, py + rad * 0.22, rad * 0.6).fill({ color: 0x0a1a28, alpha: 0.1 })
        } else if (v < 0.8) {
          // 氣孔小點
          g.circle(px, py, 2).fill({ color: 0x9fd4e8, alpha: 0.4 })
          g.circle(px, py, 1).fill({ color: 0xcdeaff, alpha: 0.55 })
        } else {
          // 微血管網：兩條交織淡紅細線
          const a2 = bgHash(gx + 9, gy + 4) * Math.PI
          g.moveTo(px - 8, py).lineTo(px + 8, py + Math.sin(a2) * 4)
          g.moveTo(px, py - 8).lineTo(px + Math.cos(a2) * 4, py + 8)
          g.stroke({ width: 0.8, color: 0xb05a5a, alpha: 0.22 })
        }
      } else {
        // vessel
        if (v < 0.55) {
          // 漂浮紅血球：雙色凹環橢圓（外紅環 + 暗中心凹）
          const rw = 9 + v * 5
          const rh = rw * 0.55
          g.ellipse(px, py, rw, rh).fill({ color: 0xc62828, alpha: 0.55 })
          g.ellipse(px, py, rw * 0.6, rh * 0.6).fill({ color: 0x7b1010, alpha: 0.6 })
          g.ellipse(px, py, rw, rh).stroke({ width: 1, color: 0xe57373, alpha: 0.35 })
        } else if (v < 0.8) {
          // 纖維蛋白絲：細淡網絲（兩段折線）
          const a = bgHash(gx + 3, gy + 5) * Math.PI
          const len = 10 + v * 8
          const mx = px + Math.cos(a) * len, my = py + Math.sin(a) * len
          g.moveTo(px, py).lineTo(mx, my)
            .lineTo(mx + Math.cos(a + 1) * len * 0.6, my + Math.sin(a + 1) * len * 0.6)
          g.stroke({ width: 1, color: 0xd98a8a, alpha: 0.28 })
        } else {
          // 血小板：不規則小點
          g.circle(px, py, 2.5).fill({ color: 0xef9a9a, alpha: 0.5 })
          g.circle(px - 1, py - 0.8, 1).fill({ color: 0xffcdd2, alpha: 0.5 })
        }
      }
    }
  }
}

/** 氛圍粒子層：依 kind 畫相對螢幕的飄動粒子（固定上限、靠 clock 動，不累積）。 */
function drawAmbient(
  g: Graphics, kind: MapKind, cx: number, cy: number, viewW: number, viewH: number, clock: number,
): void {
  const N = 50
  const L = cx - viewW / 2
  const T = cy - viewH / 2
  const wrap = (val: number, max: number): number => ((val % max) + max) % max
  for (let i = 0; i < N; i++) {
    const fx = bgHash(i, 101)
    const fy = bgHash(i, 202)
    if (kind === 'lung') {
      // 緩慢上飄淡藍氣流粒
      const sx = L + wrap(fx * viewW + Math.sin(clock * 0.8 + i) * 14, viewW)
      const sy = T + wrap(fy * viewH - clock * (18 + fx * 22), viewH)
      g.circle(sx, sy, 1.4 + fx * 1.6).fill({ color: 0xbfdcef, alpha: 0.55 })
    } else if (kind === 'stomach') {
      // 上升酸泡粒（沿用上升模式，暖黃色）
      const sx = L + wrap(fx * viewW + Math.sin(clock + i) * 8, viewW)
      const sy = T + wrap(fy * viewH - clock * (20 + fx * 25), viewH)
      g.circle(sx, sy, 1 + fx * 1.4).fill({ color: 0xffd180, alpha: 0.5 })
    } else {
      // vessel：隨血流漂移的微紅粒（低 alpha）
      const sx = L + wrap(fx * viewW + Math.sin(clock * 0.5 + i) * 20, viewW)
      const sy = T + wrap(fy * viewH + clock * (6 + fx * 8), viewH)
      g.circle(sx, sy, 1 + fx).fill({ color: 0xff8a80, alpha: 0.28 })
    }
  }
}

/** 地圖背景：地面特徵 + 氛圍粒子（有機調性底改由 NoiseBackground 提供）。 */
export function drawMapBackground(
  g: Graphics, kind: MapKind, cx: number, cy: number, viewW: number, viewH: number, clock: number,
): void {
  drawTerrain(g, kind, cx, cy, viewW, viewH, clock)
  drawAmbient(g, kind, cx, cy, viewW, viewH, clock)
}

/** 發炎場（ROS）：多層徑向暈染 + 有機抖動邊界 + 漂動 ROS 熱點；呼吸脈動隨 t，無 Math.random。 */
export function drawGarlicAura(g: Graphics, cx: number, cy: number, radius: number, t: number): void {
  const R = radius * (1 + 0.04 * Math.sin(t * 3))
  // 多層徑向暈染（由外而內 alpha 漸增的熱核感；外橙紅、內琥珀）
  const layers = 5
  for (let i = 0; i < layers; i++) {
    const lr = R * (1 - i / (layers + 1))
    const a = (0.05 + 0.03 * i) * (0.85 + 0.15 * Math.sin(t * 3))
    g.circle(cx, cy, lr).fill({ color: i < 2 ? 0xff6e40 : 0xffa040, alpha: a })
  }
  // 有機抖動邊界（半徑以 t 驅動的正弦擾動）
  const seg = 28
  for (let i = 0; i <= seg; i++) {
    const a = (i / seg) * Math.PI * 2
    const wob = 1 + 0.06 * Math.sin(a * 4 + t * 2) + 0.04 * Math.sin(a * 7 - t * 1.3)
    const px = cx + Math.cos(a) * R * wob
    const py = cy + Math.sin(a) * R * wob
    if (i === 0) g.moveTo(px, py)
    else g.lineTo(px, py)
  }
  g.stroke({ width: 2, color: 0xff7a3c, alpha: 0.5 })
  // 漂動 ROS 熱點（角度 + t 決定位置，確定性）
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + t * 0.6
    const rr = R * (0.55 + 0.3 * Math.sin(t * 2 + i))
    g.circle(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, 2 + Math.sin(t * 4 + i)).fill({ color: 0xffd180, alpha: 0.5 })
  }
}
