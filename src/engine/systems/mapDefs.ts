/**
 * 地圖定義表（純資料）。每張地圖的背景視覺與難度修正。
 * World 建構時依此套用。新增地圖或調數值都從這裡下手。
 */
import type { MapDef, MapKind } from '../types'

/** 選單呈現順序（預設選第一張）。 */
export const MAP_ORDER: MapKind[] = ['plains', 'lava', 'tundra']

/** 全部地圖的定義表。 */
export const MAP_DEFS: Record<MapKind, MapDef> = {
  plains: {
    kind: 'plains', name: '平原', description: '普通難度，標準節奏', bgColor: 0x0c0c12,
    gridColor: 0xffffff, gridAlpha: 0.04, spawnIntervalMult: 1.0, enemyHpMult: 1.0,
  },
  lava: {
    kind: 'lava', name: '熔岩', description: '困難：生怪更快、敵人更硬', bgColor: 0x1a0a0a,
    gridColor: 0xff7043, gridAlpha: 0.06, spawnIntervalMult: 0.8, enemyHpMult: 1.25,
  },
  tundra: {
    kind: 'tundra', name: '冰原', description: '簡單：生怪較慢、敵人較脆', bgColor: 0x0a1420,
    gridColor: 0x80d8ff, gridAlpha: 0.05, spawnIntervalMult: 1.15, enemyHpMult: 0.9,
  },
}
