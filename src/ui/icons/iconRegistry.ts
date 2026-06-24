/** 圖示系統 registry：單色主題色描邊 SVG 圖示資料 + 升級選項 id 解析器。
   武器/被動定義皆無 color 欄位，故色彩由本檔每個 IconDef 自帶。 */
import type { WeaponKind, PassiveKind } from '../../engine/types'

/** 單個圖示：viewBox（預設 0 0 24 24）+ 描邊 path（stroke currentColor）+ 選填實心 path + 主題色。 */
export interface IconDef {
  viewBox?: string
  paths: string[]        // 描邊輪廓（fill none）
  fills?: string[]       // 選填：實心 path（fill currentColor）— 核心點等
  color: string          // 主題色 hex（#rrggbb）
}

/** 升級選項 id 前綴 → 圖示分類與 kind；無對應（如 heal、未知、缺 kind）回 null。 */
export function resolveOptionIcon(id: string): { category: 'weapon' | 'passive'; kind: string } | null {
  const i = id.indexOf(':')
  if (i < 0) return null
  const prefix = id.slice(0, i)
  const kind = id.slice(i + 1)
  if (!kind) return null
  switch (prefix) {
    case 'unlock':
    case 'levelup':
    case 'evolve':
      return { category: 'weapon', kind }
    case 'passunlock':
    case 'passlvl':
      return { category: 'passive', kind }
    default:
      return null
  }
}

/** 武器圖示（7）。描邊輪廓 + 主題色；意象見註解。 */
export const WEAPON_ICONS: Record<WeaponKind, IconDef> = {
  // 抗體：Y 形免疫球蛋白
  antibody: { color: '#7fd8ff', paths: ['M12 12 V20', 'M12 12 L6 5', 'M12 12 L18 5'] },
  // 穿孔素：細胞膜穿孔環
  perforin: { color: '#ff8a65', paths: ['M12 4 a8 8 0 1 0 0.01 0', 'M12 9 a3 3 0 1 0 0.01 0'] },
  // 補體：級聯雙箭頭
  complement: { color: '#a5d6a7', paths: ['M5 8 L12 12 L19 8', 'M5 13 L12 17 L19 13'] },
  // 發炎：放射爆裂
  inflammation: { color: '#ff7043',
    paths: ['M12 3 V7', 'M12 17 V21', 'M3 12 H7', 'M17 12 H21', 'M6 6 L9 9', 'M18 6 L15 9', 'M6 18 L9 15', 'M18 18 L15 15'],
    fills: ['M12 10 a2 2 0 1 0 0.01 0'] },
  // 吞噬：吞噬空泡（缺口吞小點）
  phagocyte: { color: '#ffca6b', paths: ['M17 6 a8 8 0 1 0 0 12'], fills: ['M9 12 a2 2 0 1 0 0.01 0'] },
  // 級聯：分叉鏈
  cascade: { color: '#80deea', paths: ['M6 6 L12 12', 'M18 6 L12 12', 'M12 12 V19'],
    fills: ['M6 6 a1.6 1.6 0 1 0 0.01 0', 'M18 6 a1.6 1.6 0 1 0 0.01 0', 'M12 19 a1.6 1.6 0 1 0 0.01 0'] },
  // 新星：爆發星芒
  nova: { color: '#fff176', paths: [], fills: ['M12 2 L14 10 L22 12 L14 14 L12 22 L10 14 L2 12 L10 10 Z'] },
}

/** 被動圖示（10）。色彩語意對齊功能。 */
export const PASSIVE_ICONS: Record<PassiveKind, IconDef> = {
  // 細胞激素（傷害）：利刃
  spinach: { color: '#ff5252', paths: ['M6 18 L16 8', 'M14 6 L18 10', 'M5 19 L8 16'] },
  // 干擾素（攻速）：閃電
  tome: { color: '#4dd0c0', paths: [], fills: ['M13 2 L4 14 H11 L9 22 L20 9 H13 Z'] },
  // 趨化因子（彈速）：箭簇
  bracer: { color: '#80d8ff', paths: ['M4 12 H18', 'M13 7 L18 12 L13 17'] },
  // 偽足（移速）：翼
  wings: { color: '#69f0ae', paths: ['M4 16 C8 8 14 8 20 6', 'M4 16 C9 14 14 13 18 12'] },
  // 受體（吸取）：磁吸
  magnet: { color: '#ce93d8', paths: ['M7 5 V12 a5 5 0 0 0 10 0 V5', 'M5 5 H9', 'M15 5 H19'] },
  // 組織胺（範圍）：擴散圈
  candle: { color: '#ffb74d', paths: ['M12 12 m-3 0 a3 3 0 1 0 6 0 a3 3 0 1 0 -6 0', 'M12 12 m-7 0 a7 7 0 1 0 14 0 a7 7 0 1 0 -14 0'],
    fills: ['M12 12 a1.4 1.4 0 1 0 0.01 0'] },
  // 幹細胞（最大血）：心
  heart: { color: '#ff8a80', paths: [], fills: ['M12 21 C5 15 3 11 5 8 C7 5 11 6 12 9 C13 6 17 5 19 8 C21 11 19 15 12 21 Z'] },
  // 生長因子（回復）：十字
  tomato: { color: '#a5d6a7', paths: ['M12 5 V19', 'M5 12 H19'] },
  // 細胞膜（減傷）：盾
  armor: { color: '#90caf9', paths: ['M12 3 L5 6 V12 C5 17 12 21 12 21 C12 21 19 17 19 12 V6 Z'] },
  // 記憶細胞（經驗）：冠
  crown: { color: '#ffd54a', paths: ['M4 18 H20', 'M4 18 L6 8 L10 13 L12 6 L14 13 L18 8 L20 18'] },
}
