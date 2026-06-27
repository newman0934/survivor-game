/**
 * 道具/投射物造型繪製（呈現層）：經驗寶石、中和彈、補體環、寶箱囊泡、撿取物。
 * 純繪製、不修改模擬狀態；方向由 PixiRenderer 依 vel 旋轉。
 */
import { Graphics } from 'pixi.js'
import type { Entity } from '../types'
import { PICKUP_DEFS } from '../systems/pickupDefs'
import { dim, lighten, emissiveCore } from './spriteHelpers'

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
