/**
 * 地圖事件與精英詞綴的挑選（純函式，比照 spawn.ts）。
 * 為維持確定性，亂數一律走傳入的 seeded rng，不可使用 Math.random。
 */
import type { Rng } from '../core/rng'
import type { GameEventKind, EliteAffix } from '../types'
import { GAME_EVENT_ORDER } from './eventDefs'
import { ELITE_AFFIX_ORDER } from './eliteDefs'

/** 等機率挑一個地圖事件。 */
export function pickEvent(rng: Rng): GameEventKind {
  const i = Math.floor(rng.next() * GAME_EVENT_ORDER.length)
  return GAME_EVENT_ORDER[Math.min(i, GAME_EVENT_ORDER.length - 1)]
}

/** 等機率挑一個精英詞綴。 */
export function pickAffix(rng: Rng): EliteAffix {
  const i = Math.floor(rng.next() * ELITE_AFFIX_ORDER.length)
  return ELITE_AFFIX_ORDER[Math.min(i, ELITE_AFFIX_ORDER.length - 1)]
}
