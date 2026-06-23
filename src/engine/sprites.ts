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

/** 玩家：機尾雙鰭 + 立體圓身 + 駕駛艙 + 朝 +x 槍口（顏色為角色色；由 renderer 依 lastMoveDir 旋轉）。 */
export function drawPlayer(g: Graphics, e: Entity, color: number): void {
  const r = e.radius
  groundShadow(g, r)
  // 機尾雙鰭（後方 -x）
  g.poly([-r * 0.6, -r * 0.7, -r * 1.15, 0, -r * 0.6, r * 0.7]).fill(dim(color, 0.5))
  // 立體圓身
  shaded(g, 0, 0, r, color)
  // 駕駛艙（前偏）
  g.circle(r * 0.15, 0, r * 0.4).fill(dim(color, 0.4))
  g.circle(r * 0.05, -r * 0.12, r * 0.18).fill({ color: lighten(color, 0.6), alpha: 0.85 })
  // 前方槍口
  g.poly([r - 1, -5, r + 8, 0, r - 1, 5]).fill(0xffffff)
}

/** 敵人：依 enemyKind 畫多部件立體造型，顏色取自 ENEMY_DEFS。 */
export function drawEnemy(g: Graphics, e: Entity): void {
  const r = e.radius
  const color = e.enemyKind ? ENEMY_DEFS[e.enemyKind].color : 0xff5252
  const dark = dim(color, 0.5)
  groundShadow(g, r)
  switch (e.enemyKind) {
    case 'swarm': {
      // 蜘蛛：6 條腿 + 立體小身 + 兩眼
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2
        g.moveTo(0, 0).lineTo(Math.cos(a) * (r + 6), Math.sin(a) * (r + 6))
      }
      g.stroke({ width: 2, color: dark })
      shaded(g, 0, 0, r, color)
      g.circle(-r * 0.3, -r * 0.1, r * 0.18).fill(0xffffff)
      g.circle(r * 0.3, -r * 0.1, r * 0.18).fill(0xffffff)
      break
    }
    case 'tank': {
      // 重甲：立體身 + 厚裝甲環 + 4 鉚釘 + 深核心
      shaded(g, 0, 0, r, color)
      g.circle(0, 0, r).stroke({ width: 5, color: dim(color, 0.4) })
      for (let i = 0; i < 4; i++) {
        const a = i * (Math.PI / 2) + Math.PI / 4
        g.circle(Math.cos(a) * r * 0.82, Math.sin(a) * r * 0.82, r * 0.1).fill(lighten(color, 0.3))
      }
      g.circle(0, 0, r * 0.42).fill(dim(color, 0.3))
      g.circle(0, 0, r * 0.42).stroke({ width: 2, color: lighten(color, 0.2) })
      break
    }
    case 'charger': {
      // 尖角衝刺：水滴身（前尖 +x）+ 雙角 + 單眼（renderer 依 vel 旋轉）
      g.poly([r * 1.1, 0, 0, r * 0.8, -r * 0.8, 0, 0, -r * 0.8]).fill(dim(color, 0.55))
      g.poly([r * 1.0, 0, 0, r * 0.7, -r * 0.7, 0, 0, -r * 0.7]).fill(color)
      g.poly([r * 1.1, 0, 0, r * 0.8, -r * 0.8, 0, 0, -r * 0.8]).stroke({ width: 2, color: dim(color, 0.4) })
      g.circle(-r * 0.1, -r * 0.2, r * 0.3).fill({ color: lighten(color, 0.5), alpha: 0.4 })
      g.poly([r * 0.5, -r * 0.45, r * 1.1, -r * 0.7, r * 0.7, -r * 0.15]).fill(dim(color, 0.4))
      g.poly([r * 0.5, r * 0.45, r * 1.1, r * 0.7, r * 0.7, r * 0.15]).fill(dim(color, 0.4))
      g.circle(r * 0.25, 0, r * 0.16).fill(0xffffff)
      g.circle(r * 0.32, 0, r * 0.08).fill(0x222222)
      break
    }
    case 'boss': {
      // 巨獸：鋸齒尖冠 + 立體身 + 內核 + 兩發光眼
      for (let i = 0; i < 10; i++) {
        const a = (i * Math.PI) / 5
        g.poly([
          Math.cos(a) * r, Math.sin(a) * r,
          Math.cos(a + 0.15) * (r + 12), Math.sin(a + 0.15) * (r + 12),
          Math.cos(a + 0.3) * r, Math.sin(a + 0.3) * r,
        ]).fill(dim(color, 0.5))
      }
      shaded(g, 0, 0, r, color)
      g.circle(0, 0, r * 0.5).fill(dim(color, 0.35))
      g.circle(-r * 0.3, -r * 0.1, r * 0.16).fill(0xfff176)
      g.circle(r * 0.3, -r * 0.1, r * 0.16).fill(0xfff176)
      break
    }
    default: {
      // basic（黏液）：立體身 + 兩眼（含瞳）+ 嘴/獠牙
      shaded(g, 0, 0, r, color)
      g.circle(-r * 0.3, -r * 0.15, r * 0.2).fill(0xffffff)
      g.circle(-r * 0.26, -r * 0.1, r * 0.1).fill(0x222222)
      g.circle(r * 0.3, -r * 0.15, r * 0.2).fill(0xffffff)
      g.circle(r * 0.34, -r * 0.1, r * 0.1).fill(0x222222)
      g.poly([-r * 0.22, r * 0.32, 0, r * 0.55, r * 0.22, r * 0.32]).fill(dim(color, 0.4))
    }
  }
}

/** 經驗寶石：旋轉菱形 + 亮心（旋轉由 PixiRenderer 套用）。 */
export function drawGem(g: Graphics, e: Entity): void {
  const r = e.radius
  g.poly([0, -r, r, 0, 0, r, -r, 0]).fill(0x6bff6b)
  g.poly([0, -r, r, 0, 0, r, -r, 0]).stroke({ width: 1.5, color: 0xd6ffd6 })
  g.circle(0, 0, r * 0.35).fill(0xffffff)
}

/** 投射物：亮核 + 柔光暈（拉長方向由 PixiRenderer 依 vel 旋轉）。 */
export function drawProjectile(g: Graphics, e: Entity): void {
  const r = e.radius
  g.circle(0, 0, r * 2.2).fill({ color: 0xffe27a, alpha: 0.25 })
  g.ellipse(0, 0, r * 1.8, r * 0.8).fill(0xfff3b0)
}

/** 聖經環繞物：書本造型（旋轉由 PixiRenderer 套用）。 */
export function drawOrbit(g: Graphics, e: Entity): void {
  const r = e.radius
  g.roundRect(-r, -r * 0.8, r * 2, r * 1.6, 2).fill(0x8d6e63)
  g.rect(-r * 0.85, -r * 0.65, r * 1.7, r * 1.3).fill(0xfff8e1)
  g.moveTo(0, -r * 0.65).lineTo(0, r * 0.65).stroke({ width: 1.5, color: 0x8d6e63 })
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
      if (bgHash(gx, gy) > 0.55) continue // ~45% 格子有特徵
      const px = gx * TILE + bgHash(gx + 31, gy + 17) * TILE
      const py = gy * TILE + bgHash(gx + 53, gy + 97) * TILE
      const v = bgHash(gx + 7, gy + 13)
      if (kind === 'lava') {
        if (v < 0.6) {
          g.moveTo(px - 10, py).lineTo(px - 2, py - 4).lineTo(px + 4, py + 3).lineTo(px + 12, py - 2)
          g.stroke({ width: 2, color: 0x4a1f1a, alpha: 0.7 })
        } else {
          const a = 0.4 + 0.35 * Math.sin(clock * 3 + v * 6.28)
          g.circle(px, py, 3).fill({ color: 0xff7043, alpha: a })
          g.circle(px, py, 1.5).fill({ color: 0xffd180, alpha: a })
        }
      } else if (kind === 'tundra') {
        if (v < 0.5) {
          g.moveTo(px - 10, py - 3).lineTo(px, py).lineTo(px + 3, py - 6).lineTo(px + 11, py + 2)
          g.stroke({ width: 2, color: 0x9fd8ff, alpha: 0.5 })
        } else {
          g.ellipse(px, py, 9, 4).fill({ color: 0xffffff, alpha: 0.18 })
        }
      } else {
        // plains
        if (v < 0.7) {
          for (let k = -1; k <= 1; k++) {
            const lean = (bgHash(gx + k, gy + 5) - 0.5) * 8
            g.moveTo(px + k * 4, py + 6).lineTo(px + k * 4 + lean, py - 9)
          }
          g.stroke({ width: 2, color: 0x3a7d4a, alpha: 0.5 })
        } else {
          g.circle(px, py, 4).fill({ color: 0x555555, alpha: 0.45 })
          g.circle(px - 1, py - 1, 2).fill({ color: 0x777777, alpha: 0.4 })
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
    if (kind === 'tundra') {
      const sx = L + wrap(fx * viewW + Math.sin(clock * 0.8 + i) * 14, viewW)
      const sy = T + wrap(fy * viewH + clock * (18 + fx * 22), viewH)
      g.circle(sx, sy, 1.4 + fx * 1.6).fill({ color: 0xffffff, alpha: 0.55 })
    } else if (kind === 'lava') {
      const sx = L + wrap(fx * viewW + Math.sin(clock + i) * 8, viewW)
      const sy = T + wrap(fy * viewH - clock * (20 + fx * 25), viewH) // 火星上升
      g.circle(sx, sy, 1 + fx * 1.4).fill({ color: 0xffab40, alpha: 0.5 })
    } else {
      // plains 草屑/光點
      const sx = L + wrap(fx * viewW + Math.sin(clock * 0.5 + i) * 20, viewW)
      const sy = T + wrap(fy * viewH + clock * (6 + fx * 8), viewH)
      g.circle(sx, sy, 1 + fx).fill({ color: 0xaed581, alpha: 0.35 })
    }
  }
}

/** 地圖背景：淡網格 + 地面特徵 + 氛圍粒子。取代 renderer 對 drawBackgroundGrid 的直接呼叫。 */
export function drawMapBackground(
  g: Graphics, kind: MapKind, cx: number, cy: number, viewW: number, viewH: number,
  clock: number, gridColor: number, gridAlpha: number,
): void {
  drawBackgroundGrid(g, cx, cy, viewW, viewH, gridColor, gridAlpha)
  drawTerrain(g, kind, cx, cy, viewW, viewH, clock)
  drawAmbient(g, kind, cx, cy, viewW, viewH, clock)
}

/** 大蒜光環：環形（描邊 + 極淡填充），半徑/alpha 隨時鐘 t 呼吸。 */
export function drawGarlicAura(g: Graphics, cx: number, cy: number, radius: number, t: number): void {
  const pr = radius * (1 + 0.04 * Math.sin(t * 3))
  const a = 0.12 + 0.05 * Math.sin(t * 3)
  g.circle(cx, cy, pr).fill({ color: 0x9b59b6, alpha: a })
  g.circle(cx, cy, pr).stroke({ width: 2, color: 0x9b59b6, alpha: 0.4 })
}
