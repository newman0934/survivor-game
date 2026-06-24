/**
 * 程式化美術繪製函式（呈現層）。
 *
 * 每個函式把某種 entity 的造型用 PixiJS Graphics 畫出（畫一次靜態幾何）；動畫（旋轉/脈動/
 * 閃白）由 PixiRenderer 以 transform 每幀套用。純繪製、不修改模擬狀態。
 */
import { Graphics } from 'pixi.js'
import type { Entity, MapKind, CharacterKind } from './types'
import { ENEMY_DEFS } from './systems/enemyDefs'

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

/** 落地陰影：壓扁的半透明深色橢圓，墊在造型最底，讓單位「站」在地上。 */
function groundShadow(g: Graphics, rad: number): void {
  g.ellipse(0, rad * 0.85, rad * 0.9, rad * 0.4).fill({ color: 0x000000, alpha: 0.25 })
}

/** 立體圓身：暗部底（略下偏）+ 主色 + 描邊 + 左上高光。 */
function shaded(g: Graphics, cx: number, cy: number, rad: number, color: number): void {
  g.circle(cx, cy + rad * 0.12, rad).fill(dim(color, 0.55))
  g.circle(cx, cy, rad).fill(color)
  g.circle(cx, cy, rad).stroke({ width: 2, color: dim(color, 0.45) })
  g.circle(cx - rad * 0.32, cy - rad * 0.34, rad * 0.42).fill({ color: lighten(color, 0.5), alpha: 0.6 })
}

/**
 * 玩家：四種免疫細胞各有獨特輪廓（依玩法定位 + 生物特徵），顏色為角色色。
 * 由 renderer 依 lastMoveDir 旋轉朝 +x。
 */
export function drawPlayer(g: Graphics, e: Entity, color: number, character: CharacterKind): void {
  const r = e.radius
  groundShadow(g, r)
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
    }
  }
}

/** 敵人：依 enemyKind 畫多部件立體造型，顏色取自 ENEMY_DEFS。 */
export function drawEnemy(g: Graphics, e: Entity): void {
  const r = e.radius
  const color = e.enemyKind ? ENEMY_DEFS[e.enemyKind].color : 0xff5252
  groundShadow(g, r)
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
      break
    }
    case 'splitter': {
      // 分裂菌：分裂中雙葉（兩交疊圓 + 中央縊縮）
      shaded(g, -r * 0.45, 0, r * 0.7, color)
      shaded(g, r * 0.45, 0, r * 0.7, color)
      g.ellipse(0, 0, r * 0.18, r * 0.62).fill(dim(color, 0.4)) // 中央縊縮
      g.circle(-r * 0.45, -r * 0.15, r * 0.16).fill(lighten(color, 0.3))
      g.circle(r * 0.45, -r * 0.15, r * 0.16).fill(lighten(color, 0.3))
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
    return
  }
  // 進化投射物：抗原黃光暈（畫在造型底層）
  if (e.evolved) g.circle(0, 0, r * 3.0).fill({ color: 0xffd54a, alpha: 0.25 })
  if (e.projShape === 'perforin') {
    // 穿孔素飛鏢：細長琥珀色尖針（前尖 +x）+ 後方拖尾（明顯比抗體長）
    g.poly([-r * 2.6, 0, -r * 0.4, -r * 0.18, -r * 0.4, r * 0.18]).fill({ color: 0xffcc55, alpha: 0.5 })
    g.poly([r * 2.7, 0, -r * 0.3, -r * 0.42, -r * 0.95, 0, -r * 0.3, r * 0.42]).fill(0xffa000)
    g.poly([r * 2.7, 0, -r * 0.1, -r * 0.2, -r * 0.1, r * 0.2]).fill(0xfff3c4)
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
  groundShadow(g, r)
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

/** 每張地圖的地表色斑色系（兩色交替，疊在底色上製造起伏）。 */
const PATCH_COLORS: Record<MapKind, readonly [number, number, number]> = {
  vessel:  [0x3a0d12, 0x2a0a0e, 0x4a1118],   // 暗紅血漿（含中間色階）
  stomach: [0x3a1c0a, 0x2c1408, 0x4a2410],   // 胃黏膜暖褐
  lung:    [0x16303f, 0x102330, 0x1c3e52],   // 藍灰肺泡
}

/** 結構深度層色（大尺度、低 alpha）。 */
const STRUCT_COLORS: Record<MapKind, number> = {
  vessel: 0x5a1620, stomach: 0x5a3010, lung: 0x1e4a5e,
}
/** 暖核漸層色（視野中心略亮略暖）。 */
const CORE_COLORS: Record<MapKind, number> = {
  vessel: 0x6e1822, stomach: 0x6e3c12, lung: 0x1d5066,
}

/** 地表色斑層：大格點疊柔和半透明大色斑（三層同心 falloff），取代網格提供地表質感。 */
function groundPatches(
  g: Graphics, kind: MapKind, cx: number, cy: number, viewW: number, viewH: number,
): void {
  const CELL = 220
  const gx0 = Math.floor((cx - viewW / 2 - CELL) / CELL)
  const gy0 = Math.floor((cy - viewH / 2 - CELL) / CELL)
  const gx1 = Math.ceil((cx + viewW / 2 + CELL) / CELL)
  const gy1 = Math.ceil((cy + viewH / 2 + CELL) / CELL)
  const colors = PATCH_COLORS[kind]
  for (let gx = gx0; gx <= gx1; gx++) {
    for (let gy = gy0; gy <= gy1; gy++) {
      const h = bgHash(gx * 3 + 1, gy * 3 + 1)
      const px = gx * CELL + bgHash(gx + 11, gy + 23) * CELL
      const py = gy * CELL + bgHash(gx + 29, gy + 41) * CELL
      const rad = 70 + h * 95
      const col = colors[h < 0.34 ? 0 : h < 0.67 ? 1 : 2]
      g.circle(px, py, rad).fill({ color: col, alpha: 0.06 })
      g.circle(px, py, rad * 0.66).fill({ color: col, alpha: 0.06 })
      g.circle(px, py, rad * 0.33).fill({ color: col, alpha: 0.06 })
    }
  }
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

/** 暖核漸層：以視野中心為核，大圓由外而內疊加，中央略亮略暖、減死黑。 */
function warmCore(g: Graphics, kind: MapKind, cx: number, cy: number, viewW: number, viewH: number): void {
  const col = CORE_COLORS[kind]
  const maxR = Math.hypot(viewW, viewH) * 0.6
  for (let i = 0; i < 5; i++) {
    const r = maxR * (1 - i / 5)
    g.circle(cx, cy, r).fill({ color: col, alpha: 0.028 })
  }
}

/** 結構深度層：大尺度地貌（血管流紋/壁、胃皺褶脊、肺泡囊+支氣管），含 clock 緩動。 */
function drawMapStructure(
  g: Graphics, kind: MapKind, cx: number, cy: number, viewW: number, viewH: number, clock: number,
): void {
  const col = STRUCT_COLORS[kind]
  if (kind === 'vessel') {
    // 有機血漿流紋寬帶（沿斜向 + 柔和正弦波動成曲線，隨血流緩慢漂移）
    const BAND = 320
    const drift = (clock * 14) % BAND
    const k0 = Math.floor((cx - viewW) / BAND) - 1
    const k1 = Math.ceil((cx + viewW) / BAND) + 1
    const top = cy - viewH, bot = cy + viewH
    for (let k = k0; k <= k1; k++) {
      const base = k * BAND + drift
      const amp = 42 + 30 * bgHash(k, 7)        // 波幅
      const phase = bgHash(k, 19) * 6.283
      for (let s = 0; s <= 10; s++) {
        const t = s / 10
        const y = top + (bot - top) * t
        // 斜向前進（×0.7 斜率）+ 沿長度疊加柔和正弦 → 有機曲線而非直紋
        const x = base + (y - cy) * 0.7 + Math.sin(t * 3.1 + phase + clock * 0.4) * amp
        if (s === 0) g.moveTo(x, y)
        else g.lineTo(x, y)
      }
      g.stroke({ width: 54 + 28 * bgHash(k, 7), color: col, alpha: 0.04 })
    }
  } else if (kind === 'stomach') {
    // 大尺度黏膜皺褶脊（橫向粗皺脊 + 蠕動波）
    const RIDGE = 160
    const r0 = Math.floor((cy - viewH / 2 - RIDGE) / RIDGE)
    const r1 = Math.ceil((cy + viewH / 2 + RIDGE) / RIDGE)
    const L = cx - viewW / 2 - 80, R = cx + viewW / 2 + 80
    for (let r = r0; r <= r1; r++) {
      const yb = r * RIDGE + Math.sin(clock * 0.8 + r) * 12 // 蠕動
      for (let s = 0; s <= 10; s++) {
        const x = L + (R - L) * (s / 10)
        const y = yb + Math.sin(x * 0.009 + r * 1.7) * 24
        if (s === 0) g.moveTo(x, y)
        else g.lineTo(x, y)
      }
      g.stroke({ width: 28, color: col, alpha: 0.07 })
    }
  } else {
    // 肺泡：大肺泡囊輪廓（呼吸縮放）
    const SAC = 280
    const breath = 1 + 0.05 * Math.sin(clock * 0.9)
    const gx0 = Math.floor((cx - viewW / 2 - SAC) / SAC), gx1 = Math.ceil((cx + viewW / 2 + SAC) / SAC)
    const gy0 = Math.floor((cy - viewH / 2 - SAC) / SAC), gy1 = Math.ceil((cy + viewH / 2 + SAC) / SAC)
    for (let gx = gx0; gx <= gx1; gx++) {
      for (let gy = gy0; gy <= gy1; gy++) {
        const px = gx * SAC + bgHash(gx + 5, gy + 9) * SAC * 0.5
        const py = gy * SAC + bgHash(gx + 13, gy + 21) * SAC * 0.5
        const rad = (74 + bgHash(gx, gy) * 52) * breath
        g.circle(px, py, rad).fill({ color: col, alpha: 0.05 })
        g.circle(px, py, rad).stroke({ width: 2, color: 0x3a7c92, alpha: 0.1 })
      }
    }
  }
}

/** 地圖背景：結構深度層 → 暖核 → 色斑 → 地面特徵 → 氛圍粒子（由底而上）。取代 renderer 直接呼叫。 */
export function drawMapBackground(
  g: Graphics, kind: MapKind, cx: number, cy: number, viewW: number, viewH: number, clock: number,
): void {
  drawMapStructure(g, kind, cx, cy, viewW, viewH, clock)
  warmCore(g, kind, cx, cy, viewW, viewH)
  groundPatches(g, kind, cx, cy, viewW, viewH)
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
