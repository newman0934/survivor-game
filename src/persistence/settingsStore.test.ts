import { describe, it, expect } from 'vitest'
import { loadSettings, saveSettings } from './settingsStore'
import type { StorageLike } from './saveStore'

function mem(): StorageLike & { data: Record<string, string> } {
  const data: Record<string, string> = {}
  return { data, getItem: (k) => data[k] ?? null, setItem: (k, v) => { data[k] = v } }
}

describe('settingsStore', () => {
  it('無資料回預設 bloom:true', () => {
    expect(loadSettings(mem()).bloom).toBe(true)
  })
  it('save→load 往返一致', () => {
    const s = mem()
    saveSettings({ bloom: false }, s)
    expect(loadSettings(s).bloom).toBe(false)
  })
  it('壞資料/非布林回預設', () => {
    const s = mem()
    s.setItem('survivor-settings-v1', '{bad json')
    expect(loadSettings(s).bloom).toBe(true)
    s.setItem('survivor-settings-v1', '{"bloom":"yes"}')
    expect(loadSettings(s).bloom).toBe(true)
  })
})
