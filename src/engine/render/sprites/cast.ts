/**
 * 角色與敵人造型繪製（呈現層）：玩家四種免疫細胞、各敵種多部件立體造型與精英光環。
 * 純繪製、不修改模擬狀態；動畫由 PixiRenderer 以 transform 每幀套用。
 */
import { Graphics } from 'pixi.js'
import type { Entity, CharacterKind } from '../../types'
import { ENEMY_DEFS } from '../../systems/defs/enemyDefs'
import { ELITE_AFFIX_DEFS } from '../../systems/defs/eliteDefs'
import { dim, lighten, shaded, membrane, innerShade, rimLight, specular, emissiveCore, CELL_CORE } from './helpers'

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
