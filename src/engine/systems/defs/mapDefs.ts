/**
 * 地圖定義表（純資料）。每張地圖的背景視覺與難度修正。
 * World 建構時依此套用。新增地圖或調數值都從這裡下手。
 */
import type { MapDef, MapKind } from '../../types'

/** 選單呈現順序（預設選第一張）。 */
export const MAP_ORDER: MapKind[] = ['vessel', 'stomach', 'lung', 'gut', 'brain']

/** 全部地圖的定義表。 */
export const MAP_DEFS: Record<MapKind, MapDef> = {
  vessel: {
    kind: 'vessel', name: '血管', description: '普通難度，標準節奏', bgColor: 0x0c0c12,
    gridColor: 0xffffff, gridAlpha: 0.04, spawnIntervalMult: 1.0, enemyHpMult: 1.0,
  },
  stomach: {
    kind: 'stomach', name: '胃', description: '困難：生怪更快、敵人更硬', bgColor: 0x1a0a0a,
    gridColor: 0xff7043, gridAlpha: 0.06, spawnIntervalMult: 0.8, enemyHpMult: 1.25,
  },
  lung: {
    kind: 'lung', name: '肺泡', description: '簡單：生怪較慢、敵人較脆', bgColor: 0x0a1420,
    gridColor: 0x80d8ff, gridAlpha: 0.05, spawnIntervalMult: 1.15, enemyHpMult: 0.9,
  },
  gut: {
    kind: 'gut', name: '腸道', description: '蟲潮：生怪極快、敵人脆', bgColor: 0x140e08,
    gridColor: 0xffb74d, gridAlpha: 0.05, spawnIntervalMult: 0.7, enemyHpMult: 0.8,
  },
  brain: {
    kind: 'brain', name: '腦', description: '精英試煉：生怪偏慢、敵人硬', bgColor: 0x0a0a18,
    gridColor: 0x9fa8ff, gridAlpha: 0.05, spawnIntervalMult: 1.2, enemyHpMult: 1.4,
  },
}
