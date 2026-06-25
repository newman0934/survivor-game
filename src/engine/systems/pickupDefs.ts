/** 撿取物登錄表（資料驅動）：每種撿取物的主題色等 metadata。新增撿取物只加一筆 + World 效果分支。 */
import type { PickupKind } from '../types'

export interface PickupDef {
  /** 主題色（造型與光暈用）。 */
  color: number
}

export const PICKUP_DEFS: Record<PickupKind, PickupDef> = {
  heal: { color: 0x66ff8c },   // 綠：回血
  vacuum: { color: 0xb388ff }, // 紫：受體吸取
}
