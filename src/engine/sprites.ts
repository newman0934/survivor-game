/**
 * 程式化美術繪製函式（呈現層）。
 *
 * 每個函式把某種 entity 的造型用 PixiJS Graphics 畫出（畫一次靜態幾何）；動畫（旋轉/脈動/
 * 閃白）由 PixiRenderer 以 transform 每幀套用。純繪製、不修改模擬狀態。
 */
import { Graphics } from 'pixi.js'
import type { Entity } from './types'
import { ENEMY_DEFS } from './systems/enemyDefs'

/** 把顏色各通道乘上係數 f（<1 變暗），用來產生描邊/陰影色。 */
function dim(color: number, f: number): number {
  const r = (color >> 16) & 0xff
  const g = (color >> 8) & 0xff
  const b = color & 0xff
  return (Math.round(r * f) << 16) | (Math.round(g * f) << 8) | Math.round(b * f)
}

/** 玩家：柔光圈 + 圓身 + 描邊 + 朝 +x 的槍口三角（顏色為所選角色色）。 */
export function drawPlayer(g: Graphics, e: Entity, color: number): void {
  const r = e.radius
  g.circle(0, 0, r * 1.8).fill({ color, alpha: 0.15 })
  g.circle(0, 0, r).fill(color)
  g.circle(0, 0, r).stroke({ width: 2, color: 0xffffff })
  g.poly([r - 1, -5, r + 7, 0, r - 1, 5]).fill(0xffffff)
}

/** 敵人：依 enemyKind 畫不同造型，顏色取自 ENEMY_DEFS。 */
export function drawEnemy(g: Graphics, e: Entity): void {
  const r = e.radius
  const color = e.enemyKind ? ENEMY_DEFS[e.enemyKind].color : 0xff5252
  const dark = dim(color, 0.6)
  switch (e.enemyKind) {
    case 'swarm': {
      g.circle(0, 0, r).fill(color)
      for (let i = 0; i < 4; i++) {
        const a = (i * Math.PI) / 2
        g.poly([
          Math.cos(a) * r, Math.sin(a) * r,
          Math.cos(a) * (r + 5), Math.sin(a) * (r + 5),
          Math.cos(a + 0.4) * r, Math.sin(a + 0.4) * r,
        ]).fill(dark)
      }
      break
    }
    case 'tank': {
      g.circle(0, 0, r).fill(dark)
      g.circle(0, 0, r).stroke({ width: 4, color })
      g.circle(0, 0, r * 0.4).fill(color)
      break
    }
    case 'charger': {
      g.poly([r, 0, 0, r * 0.8, -r * 0.7, 0, 0, -r * 0.8]).fill(color)
      g.poly([r, 0, 0, r * 0.8, -r * 0.7, 0, 0, -r * 0.8]).stroke({ width: 2, color: dark })
      break
    }
    case 'boss': {
      g.circle(0, 0, r).fill(color)
      for (let i = 0; i < 10; i++) {
        const a = (i * Math.PI) / 5
        g.poly([
          Math.cos(a) * r, Math.sin(a) * r,
          Math.cos(a + 0.15) * (r + 10), Math.sin(a + 0.15) * (r + 10),
          Math.cos(a + 0.3) * r, Math.sin(a + 0.3) * r,
        ]).fill(dark)
      }
      g.circle(0, 0, r * 0.5).fill(dark)
      break
    }
    default: {
      // basic
      g.circle(0, 0, r).fill(color)
      g.circle(0, 0, r).stroke({ width: 2, color: dark })
      g.circle(-r * 0.3, -r * 0.2, r * 0.18).fill(0xffffff)
      g.circle(r * 0.3, -r * 0.2, r * 0.18).fill(0xffffff)
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

/** 大蒜光環：環形（描邊 + 極淡填充），半徑/alpha 隨時鐘 t 呼吸。 */
export function drawGarlicAura(g: Graphics, cx: number, cy: number, radius: number, t: number): void {
  const pr = radius * (1 + 0.04 * Math.sin(t * 3))
  const a = 0.12 + 0.05 * Math.sin(t * 3)
  g.circle(cx, cy, pr).fill({ color: 0x9b59b6, alpha: a })
  g.circle(cx, cy, pr).stroke({ width: 2, color: 0x9b59b6, alpha: 0.4 })
}
