import { describe, it, expect } from 'vitest'
import { createRng } from '../core/rng'
import { pickEvent, pickAffix } from './events'
import { GAME_EVENT_ORDER } from './eventDefs'
import { ELITE_AFFIX_ORDER } from './eliteDefs'

describe('events 純函式', () => {
  it('pickEvent 回傳合法事件且確定性（同 seed 同序列）', () => {
    const a = createRng(7), b = createRng(7)
    const seqA = [pickEvent(a), pickEvent(a), pickEvent(a)]
    const seqB = [pickEvent(b), pickEvent(b), pickEvent(b)]
    expect(seqA).toEqual(seqB)
    expect(seqA.every((k) => GAME_EVENT_ORDER.includes(k))).toBe(true)
  })
  it('pickAffix 回傳合法詞綴且確定性', () => {
    const a = createRng(3), b = createRng(3)
    expect(pickAffix(a)).toBe(pickAffix(b))
    expect(ELITE_AFFIX_ORDER.includes(pickAffix(createRng(9)))).toBe(true)
  })
})
