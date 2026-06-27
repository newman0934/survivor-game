/**
 * 地圖事件定義表（純資料）。每個事件的名稱與預警字串。
 */
import type { GameEventKind, GameEventDef } from '../../types'

/** 確定性迭代/抽選用的固定順序。 */
export const GAME_EVENT_ORDER: GameEventKind[] = ['swarm-rush', 'elite-pack', 'encircle']

/** 全部事件定義表。 */
export const GAME_EVENT_DEFS: Record<GameEventKind, GameEventDef> = {
  'swarm-rush': { kind: 'swarm-rush', name: '怪潮', warning: '警告：怪潮來襲' },
  'elite-pack': { kind: 'elite-pack', name: '精英來襲', warning: '警告：精英來襲' },
  'encircle': { kind: 'encircle', name: '包圍', warning: '警告：四面包圍' },
}
