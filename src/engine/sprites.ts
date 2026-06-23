/**
 * 程式化美術繪製函式（呈現層）。
 *
 * 每個函式把某種 entity 的造型用 PixiJS Graphics 畫出（畫一次靜態幾何）；動畫（旋轉/脈動/
 * 閃白）由 PixiRenderer 以 transform 每幀套用。純繪製、不修改模擬狀態。
 */
import { Graphics } from 'pixi.js'
import type { Entity, MapKind } from './types'
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

/** 玩家：免疫細胞（吞噬細胞/T細胞造型；由 renderer 依 lastMoveDir 旋轉，朝 +x）。 */
export function drawPlayer(g: Graphics, e: Entity, color: number): void {
  const r = e.radius
  // 落地陰影
  groundShadow(g, r)
  // 偽足：前方 +x 兩個小突起（顯示朝向）
  g.circle(r * 0.9, -r * 0.3, r * 0.25).fill({ color: lighten(color, 0.15), alpha: 0.9 })
  g.circle(r * 0.9, r * 0.3, r * 0.25).fill({ color: lighten(color, 0.15), alpha: 0.9 })
  // 半透明細胞膜身
  g.circle(0, 0, r).fill({ color, alpha: 0.85 })
  g.circle(0, 0, r).stroke({ width: 2, color: dim(color, 0.5) })
  // 細胞質高光（左上）
  g.circle(-r * 0.28, -r * 0.28, r * 0.38).fill({ color: lighten(color, 0.5), alpha: 0.32 })
  // 細胞核
  g.circle(r * 0.1, 0, r * 0.42).fill(dim(color, 0.4))
  // 核仁亮點
  g.circle(r * 0.05, -r * 0.1, r * 0.14).fill({ color: lighten(color, 0.55), alpha: 0.7 })
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

/** 抗原碎片：偏黃菱形 + 亮心（旋轉由 PixiRenderer 套用）。 */
export function drawGem(g: Graphics, e: Entity): void {
  const r = e.radius
  g.poly([0, -r, r, 0, 0, r, -r, 0]).fill(0xffd54a)
  g.poly([0, -r, r, 0, 0, r, -r, 0]).stroke({ width: 1.5, color: 0xfff3c4 })
  g.circle(0, 0, r * 0.35).fill(0xffffff)
}

/** 中和彈：依 projShape 區分抗體（Y 形）與穿孔素（尖刺）；方向由 PixiRenderer 依 vel 旋轉（指向 +x）。 */
export function drawProjectile(g: Graphics, e: Entity): void {
  const r = e.radius
  if (e.projShape === 'perforin') {
    // 穿孔素飛鏢：細長尖刺微粒（前尖 +x）+ 暖白光暈
    g.circle(0, 0, r * 1.8).fill({ color: 0xfff0d0, alpha: 0.22 })
    g.poly([r * 1.9, 0, -r * 0.7, -r * 0.55, -r * 0.4, 0, -r * 0.7, r * 0.55]).fill(0xfff3c4)
    g.poly([r * 1.9, 0, -r * 0.4, -r * 0.28, -r * 0.4, r * 0.28]).fill(0xffffff)
  } else {
    // 抗體：冰藍柔光暈 + Y 形輪廓（雙臂朝 +x 開口）+ 亮心
    g.circle(0, 0, r * 2.2).fill({ color: 0xbfefff, alpha: 0.25 })
    g.moveTo(-r * 1.1, 0).lineTo(0, 0)
    g.moveTo(0, 0).lineTo(r * 1.1, -r * 0.9)
    g.moveTo(0, 0).lineTo(r * 1.1, r * 0.9)
    g.stroke({ width: 2.2, color: 0xeaffff })
    g.circle(0, 0, r * 0.55).fill(0xffffff)
  }
}

/** 補體蛋白球：發光蛋白球體（旋轉由 PixiRenderer 套用）。 */
export function drawOrbit(g: Graphics, e: Entity): void {
  const r = e.radius
  // 蛋白球主體
  g.circle(0, 0, r).fill(0xbfeaff)
  g.circle(0, 0, r).stroke({ width: 1.5, color: dim(0xbfeaff, 0.55) })
  // 亮心點（發光感）
  g.circle(0, 0, r * 0.38).fill(0xffffff)
}

/** 寶箱：金棕箱身 + 蓋線金條 + 中央鎖扣。 */
export function drawChest(g: Graphics, e: Entity): void {
  const r = e.radius
  g.roundRect(-r, -r * 0.75, r * 2, r * 1.5, 3).fill(0x8d6e63)
  g.roundRect(-r, -r * 0.75, r * 2, r * 1.5, 3).stroke({ width: 2, color: 0x5d4037 })
  g.rect(-r, -r * 0.2, r * 2, r * 0.14).fill(0xffd54a) // 蓋線金條
  g.rect(-r * 0.22, -r * 0.18, r * 0.44, r * 0.5).fill(0xffd54a) // 中央鎖扣
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
const PATCH_COLORS: Record<MapKind, readonly [number, number]> = {
  vessel:  [0x3a0d12, 0x2a0a0e],   // 暗紅血漿
  stomach: [0x3a1c0a, 0x2c1408],   // 胃黏膜暖褐
  lung:    [0x16303f, 0x102330],   // 藍灰肺泡
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
      const col = colors[h < 0.5 ? 0 : 1]
      g.circle(px, py, rad).fill({ color: col, alpha: 0.05 })
      g.circle(px, py, rad * 0.66).fill({ color: col, alpha: 0.05 })
      g.circle(px, py, rad * 0.33).fill({ color: col, alpha: 0.05 })
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
        } else {
          // 酸泡：外發光暈（暖橙）+ 亮核（脈動，沿用 clock）
          const a = 0.4 + 0.35 * Math.sin(clock * 3 + v * 6.28)
          g.circle(px, py, 6).fill({ color: 0xffb74d, alpha: a * 0.22 })
          g.circle(px, py, 3).fill({ color: 0xffb74d, alpha: a })
          g.circle(px, py, 1.4).fill({ color: 0xfff0c4, alpha: a })
        }
      } else if (kind === 'lung') {
        if (v < 0.6) {
          // 肺泡氣囊：淡藍柔化圓 + 內陰影（兩層圓環製造立體感）
          const rad = 9 + v * 7
          g.circle(px, py, rad).fill({ color: 0x4a9fbf, alpha: 0.12 })
          g.circle(px, py, rad).stroke({ width: 1.5, color: 0x8fcfe0, alpha: 0.35 })
          g.circle(px + rad * 0.22, py + rad * 0.22, rad * 0.6).fill({ color: 0x0a1a28, alpha: 0.1 })
        } else {
          // 氣孔小點
          g.circle(px, py, 2).fill({ color: 0x9fd4e8, alpha: 0.4 })
          g.circle(px, py, 1).fill({ color: 0xcdeaff, alpha: 0.55 })
        }
      } else {
        // vessel
        if (v < 0.68) {
          // 漂浮紅血球：雙色凹環橢圓（外紅環 + 暗中心凹）
          const rw = 9 + v * 5
          const rh = rw * 0.55
          g.ellipse(px, py, rw, rh).fill({ color: 0xc62828, alpha: 0.55 })
          g.ellipse(px, py, rw * 0.6, rh * 0.6).fill({ color: 0x7b1010, alpha: 0.6 })
          g.ellipse(px, py, rw, rh).stroke({ width: 1, color: 0xe57373, alpha: 0.35 })
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

/** 地圖背景：柔和地表色斑 + 地面特徵 + 氛圍粒子（無網格）。取代 renderer 直接呼叫。 */
export function drawMapBackground(
  g: Graphics, kind: MapKind, cx: number, cy: number, viewW: number, viewH: number, clock: number,
): void {
  groundPatches(g, kind, cx, cy, viewW, viewH)
  drawTerrain(g, kind, cx, cy, viewW, viewH, clock)
  drawAmbient(g, kind, cx, cy, viewW, viewH, clock)
}

/** 發炎場/ROS 光環：環形（描邊 + 極淡填充），半徑/alpha 隨時鐘 t 呼吸。 */
export function drawGarlicAura(g: Graphics, cx: number, cy: number, radius: number, t: number): void {
  const pr = radius * (1 + 0.04 * Math.sin(t * 3))
  const a = 0.12 + 0.05 * Math.sin(t * 3)
  g.circle(cx, cy, pr).fill({ color: 0xff6e40, alpha: a })
  g.circle(cx, cy, pr).stroke({ width: 2, color: 0xff6e40, alpha: 0.4 })
}
