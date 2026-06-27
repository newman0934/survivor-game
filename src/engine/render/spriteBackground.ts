/**
 * 地圖背景與場域繪製（呈現層）：背景網格、地面特徵、氛圍粒子、發炎場。
 * 純繪製、不修改模擬狀態；地貌以 bgHash 確定性散布，動畫靠傳入的 clock/t。
 */
import { Graphics } from 'pixi.js'
import type { MapKind } from '../types'
import { bgHash } from './spriteHelpers'

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
