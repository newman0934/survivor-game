import { describe, it, expect } from 'vitest'
import { World } from './World'
import type { CharacterKind } from './types'

/** 固定輸入腳本：每幀為各玩家設定確定性移動方向，跑 N 幀後回 checksum。 */
function runScript(seed: number, chars: CharacterKind[], frames = 600): number {
  const w = new World(seed, chars)
  for (let f = 0; f < frames; f++) {
    w.setMoveInput(0, { x: f % 120 < 60 ? 1 : -1, y: f % 80 < 40 ? 1 : -1 })
    if (chars.length > 1) w.setMoveInput(1, { x: f % 100 < 50 ? -1 : 1, y: f % 60 < 30 ? 1 : -1 })
    w.step(1 / 60)
  }
  return w.checksum()
}

describe('確定性回放（SP2）', () => {
  it('同 seed + 同輸入：兩個全新 World 結果完全相同', () => {
    const a = runScript(42, ['macrophage', 'neutrophil'])
    const b = runScript(42, ['macrophage', 'neutrophil'])
    expect(a).toBe(b)
  })
  it('不同 seed 結果不同（checksum 非定值）', () => {
    expect(runScript(42, ['macrophage', 'neutrophil'])).not.toBe(runScript(99, ['macrophage', 'neutrophil']))
  })
  it('單人也確定（同 seed+輸入兩 run 相同）', () => {
    expect(runScript(7, ['macrophage'])).toBe(runScript(7, ['macrophage']))
  })
})

describe('原始碼守護：模擬路徑無非確定性 global（SP2）', () => {
  // Vite 原生：以 ?raw 讀入所有 engine .ts 原始碼。
  const all = import.meta.glob('./**/*.ts', { query: '?raw', import: 'default', eager: true }) as Record<string, string>
  /**
   * 白名單：非模擬路徑、可合法使用 Math.random/時間者。
   * 驅動層：Game.ts（rAF 迴圈、真實時間）。
   * 呈現層：render/{PixiRenderer,sprites,postProcessing,noiseBackground,effects}（PixiJS 視覺）。
   * 音訊/輸入：audio/soundManager、input/{input,touchInput}；計時/雜訊：core/{hitStop,noise}。
   * 此清單外的 src/engine 檔一律視為模擬路徑、自動受守護（fail-safe）。
   */
  const EXCLUDE = new Set([
    './Game.ts',
    './render/PixiRenderer.ts', './render/postProcessing.ts',
    './render/noiseBackground.ts', './render/effects.ts',
    './render/sprites/index.ts', './render/sprites/helpers.ts', './render/sprites/cast.ts',
    './render/sprites/entities.ts', './render/sprites/background.ts',
    './audio/soundManager.ts', './input/input.ts', './input/touchInput.ts',
    './core/hitStop.ts', './core/noise.ts',
  ])
  const FORBIDDEN = ['Math.random(', 'Date.now(', 'performance.now(']
  /** 去除 // 行註解與 / * * / 區塊註解（避免註解中提及而誤判）。 */
  const stripComments = (src: string): string =>
    src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')

  const simFiles = Object.entries(all).filter(
    ([p]) => !p.includes('.test.') && !EXCLUDE.has(p),
  )

  it('掃描範圍非空且涵蓋 World 與 systems', () => {
    expect(simFiles.length).toBeGreaterThan(0)
    expect(simFiles.some(([p]) => p === './World.ts')).toBe(true)
    expect(simFiles.some(([p]) => p.startsWith('./systems/'))).toBe(true)
  })

  for (const [path, src] of simFiles) {
    it(`${path} 不含非確定性 global`, () => {
      const code = stripComments(src)
      for (const token of FORBIDDEN) {
        expect(code.includes(token), `${path} 含 ${token}`).toBe(false)
      }
    })
  }
})
