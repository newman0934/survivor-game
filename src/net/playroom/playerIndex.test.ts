import { describe, it, expect } from 'vitest'
import { sortPlayerIds, indexOfPlayer } from './playerIndex'

describe('playerIndex — 跨機 index 共識', () => {
  it('sortPlayerIds 以字典序排序且不改入參', () => {
    const ids = ['c', 'a', 'b']
    expect(sortPlayerIds(ids)).toEqual(['a', 'b', 'c'])
    expect(ids).toEqual(['c', 'a', 'b']) // 入參不變
  })

  it('不同加入順序 → 相同排序結果（各機一致）', () => {
    expect(sortPlayerIds(['p2', 'p1', 'p3'])).toEqual(sortPlayerIds(['p3', 'p2', 'p1']))
  })

  it('indexOfPlayer 回傳排序位置；不存在回 -1', () => {
    const s = sortPlayerIds(['x', 'a', 'm'])
    expect(indexOfPlayer(s, 'a')).toBe(0)
    expect(indexOfPlayer(s, 'm')).toBe(1)
    expect(indexOfPlayer(s, 'x')).toBe(2)
    expect(indexOfPlayer(s, 'zzz')).toBe(-1)
  })
})
