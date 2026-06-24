import { describe, it, expect } from 'vitest'
import { loadSave, recordRun, type RunRecord, type StorageLike } from './saveStore'

/** 記憶體假 storage（不依賴 jsdom / 真 localStorage）。 */
function memStorage(initial?: string): StorageLike & { value: string | null } {
  return {
    value: initial ?? null,
    getItem() { return this.value },
    setItem(_k, v) { this.value = v },
  }
}

/** 會在 setItem 丟例外的假 storage（模擬無痕/配額滿）。 */
function throwingStorage(): StorageLike {
  return {
    getItem() { return null },
    setItem() { throw new Error('quota exceeded') },
  }
}

function makeRun(over: Partial<RunRecord> = {}): RunRecord {
  return { time: 75, kills: 40, level: 6, character: 'macrophage', map: 'vessel', date: 1000, ...over }
}

describe('saveStore', () => {
  it('loadSave 在空 storage 回空白存檔', () => {
    const s = loadSave(memStorage())
    expect(s.version).toBe(1)
    expect(s.runs).toEqual([])
    expect(s.stats).toEqual({ totalKills: 0, totalRuns: 0, bestTime: 0, bestKills: 0, maxLevel: 0 })
  })

  it('loadSave storage 為 null 回空白存檔（非瀏覽器/無 localStorage）', () => {
    const s = loadSave(null)
    expect(s.version).toBe(1)
    expect(s.runs).toEqual([])
    expect(s.stats.totalRuns).toBe(0)
  })

  it('loadSave 壞 JSON 回空白存檔且不丟例外', () => {
    const s = loadSave(memStorage('{not valid json'))
    expect(s.runs).toEqual([])
    expect(s.stats.totalRuns).toBe(0)
  })

  it('loadSave 版號不符回空白存檔', () => {
    const s = loadSave(memStorage(JSON.stringify({ version: 999, runs: [], stats: {} })))
    expect(s.runs).toEqual([])
    expect(s.stats.totalRuns).toBe(0)
  })

  it('recordRun 首場破紀錄旗標皆 true 且初始化 stats', () => {
    const st = memStorage()
    const r = recordRun(makeRun(), st)
    expect(r.isNewBestTime).toBe(true)
    expect(r.isNewBestKills).toBe(true)
    expect(r.save.runs).toHaveLength(1)
    expect(r.save.stats).toEqual({ totalKills: 40, totalRuns: 1, bestTime: 75, bestKills: 40, maxLevel: 6 })
  })

  it('recordRun 寫回後 loadSave 可還原', () => {
    const st = memStorage()
    recordRun(makeRun(), st)
    const s = loadSave(st)
    expect(s.stats.bestTime).toBe(75)
    expect(s.runs).toHaveLength(1)
  })

  it('recordRun 更佳成績更新最佳並累加總計', () => {
    const st = memStorage()
    recordRun(makeRun(), st)
    const r = recordRun(makeRun({ time: 120, kills: 90, level: 9, date: 2000 }), st)
    expect(r.isNewBestTime).toBe(true)
    expect(r.save.stats).toEqual({ totalKills: 130, totalRuns: 2, bestTime: 120, bestKills: 90, maxLevel: 9 })
  })

  it('recordRun 存活時間平手不算破紀錄', () => {
    const st = memStorage()
    recordRun(makeRun({ time: 120 }), st)
    const r = recordRun(makeRun({ time: 120, date: 2000 }), st)
    expect(r.isNewBestTime).toBe(false)
  })

  it('recordRun 較差成績不更新最佳但仍累加總計', () => {
    const st = memStorage()
    recordRun(makeRun({ time: 120, kills: 90 }), st)
    const r = recordRun(makeRun({ time: 30, kills: 10, date: 2000 }), st)
    expect(r.isNewBestTime).toBe(false)
    expect(r.save.stats.bestTime).toBe(120)
    expect(r.save.stats.totalKills).toBe(100)
    expect(r.save.stats.totalRuns).toBe(2)
  })

  it('recordRun runs 依 time 降冪截前 10，被擠出者仍計入總計', () => {
    const st = memStorage()
    // 先放 10 筆 time = 100..109（kills 各 1）
    for (let i = 0; i < 10; i++) recordRun(makeRun({ time: 100 + i, kills: 1, date: i }), st)
    // 第 11 筆 time = 50（低於全部），kills = 7
    const r = recordRun(makeRun({ time: 50, kills: 7, date: 99 }), st)
    expect(r.save.runs).toHaveLength(10)
    expect(r.save.runs.some((x) => x.time === 50)).toBe(false)
    expect(r.save.runs[0].time).toBe(109) // 降冪：最佳在前
    expect(r.save.stats.totalRuns).toBe(11)
    expect(r.save.stats.totalKills).toBe(17) // 10*1 + 7
  })

  it('recordRun 在 setItem 丟例外時不 crash 且回傳記憶體內 save 正確', () => {
    const r = recordRun(makeRun(), throwingStorage())
    expect(r.isNewBestTime).toBe(true)
    expect(r.save.stats.bestTime).toBe(75)
    expect(r.save.runs).toHaveLength(1)
  })
})
