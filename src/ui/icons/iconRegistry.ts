/** 圖示系統 registry：單色主題色描邊 SVG 圖示資料 + 升級選項 id 解析器。
   武器/被動定義皆無 color 欄位，故色彩由本檔每個 IconDef 自帶。 */

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

// WEAPON_ICONS / PASSIVE_ICONS 於 Task 2 補上（Record<Kind, IconDef> 強制完整）。
