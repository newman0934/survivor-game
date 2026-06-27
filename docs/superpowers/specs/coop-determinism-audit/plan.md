# coop-determinism-audit (SP2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 為 lockstep 提供確定性護欄：`core/checksum.ts` 雜湊工具、`World.checksum()`、回放雜湊測試（同 seed+輸入→同結果）、原始碼守護測試（模擬路徑無 `Math.random`/`Date.now`/`performance.now`）。

**Architecture:** 新增純函式 `Checksum`（FNV-1a over float64 位元組）；`World.checksum()` 以固定順序雜湊規範化模擬狀態（供回放測試 + 未來 SP4 desync）；新增 `determinism.test.ts` 做回放兩-run 比對與原始碼守護掃描。不改遊戲行為。

**Tech Stack:** TypeScript、Vitest、Vite（`import.meta.glob` 讀原始碼）。

## Global Constraints

- 文件繁中；程式碼/型別/commit 英文。
- 引擎 `src/engine/**` 純 TS、不得 import Vue/Pinia 執行期；`Checksum`/`World.checksum()` 不呼叫時間/亂數。
- 不改任何既有方法簽章、不改遊戲行為；既有單元測試全綠。
- checksum 列舉以既有固定序 index 對映：`WEAPON_ORDER`/`PASSIVE_ORDER`/`ENEMY_ORDER`/`ELITE_AFFIX_ORDER`（`.indexOf`）。
- 守護掃描 `src/engine/**/*.ts`，排除 `*.test.ts` 與：`Game.ts`、`PixiRenderer.ts`、`sprites.ts`、`postProcessing.ts`、`noiseBackground.ts`、`effects.ts`、`core/soundManager.ts`、`core/input.ts`、`core/touchInput.ts`、`core/hitStop.ts`、`core/noise.ts`。
- 已知限制：跨瀏覽器超越函式（sin/cos/sqrt…）極小差異本期不定點化（A 案）。
- commit 格式 `[mvp][type][scope] 描述` + 結尾 `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`。

---

## 檔案結構（本案異動）

| 檔案 | 異動 | 責任 |
|------|------|------|
| `src/engine/core/checksum.ts` | Create | `Checksum`（FNV-1a 雜湊累加器） |
| `src/engine/core/checksum.test.ts` | Create | Checksum 工具測試 |
| `src/engine/World.ts` | Modify | import ORDER + Checksum；新增 `checksum()` |
| `src/engine/World.test.ts` | Modify | World.checksum 測試 |
| `src/engine/determinism.test.ts` | Create | 回放兩-run 比對 + 原始碼守護掃描 |

三個 task：T1 checksum 工具 → T2 World.checksum → T3 回放 + 守護測試。

---

### Task 1: core/checksum.ts（確定性雜湊工具）

**Files:**
- Create: `src/engine/core/checksum.ts`
- Test: `src/engine/core/checksum.test.ts`

**Interfaces:**
- Produces：`class Checksum { add(n: number): this; addInt(n: number): this; value(): number }`。

- [ ] **Step 1: 寫失敗測試**

`src/engine/core/checksum.test.ts`：

```ts
import { describe, it, expect } from 'vitest'
import { Checksum } from './checksum'

describe('Checksum', () => {
  it('相同序列產生相同 value', () => {
    const a = new Checksum().add(1.5).addInt(3).add(-2.25)
    const b = new Checksum().add(1.5).addInt(3).add(-2.25)
    expect(a.value()).toBe(b.value())
  })
  it('順序敏感（交換兩數 value 不同）', () => {
    const a = new Checksum().add(1).add(2).value()
    const b = new Checksum().add(2).add(1).value()
    expect(a).not.toBe(b)
  })
  it('value 為 32-bit 無號整數', () => {
    const v = new Checksum().add(123.456).addInt(-7).value()
    expect(Number.isInteger(v)).toBe(true)
    expect(v).toBeGreaterThanOrEqual(0)
    expect(v).toBeLessThanOrEqual(0xffffffff)
  })
  it('不同輸入多半得不同 value（健全性）', () => {
    expect(new Checksum().add(1).value()).not.toBe(new Checksum().add(1.0000001).value())
  })
})
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `npx vitest run src/engine/core/checksum.test.ts`
Expected: FAIL — 模組不存在。

- [ ] **Step 3: 實作 checksum.ts**

`src/engine/core/checksum.ts`：

```ts
/**
 * 確定性雜湊累加器（FNV-1a，順序敏感）。
 * 對一串 number 做 32-bit 無號雜湊；浮點以 float64 的 8 個位元組（little-endian）逐一混入，
 * 確保相同數值序列 → 相同結果（供回放確定性測試與未來連線 desync 偵測）。
 * 純函式、不依賴時間/亂數。
 */
const FNV_OFFSET = 0x811c9dc5
const FNV_PRIME = 0x01000193

export class Checksum {
  private h = FNV_OFFSET >>> 0
  private readonly view = new DataView(new ArrayBuffer(8))

  /** 混入一個浮點數（以 float64 八位元組）。 */
  add(n: number): this {
    this.view.setFloat64(0, n, true) // little-endian，跨平台位元組序一致
    for (let i = 0; i < 8; i++) this.mix(this.view.getUint8(i))
    return this
  }

  /** 混入一個 32-bit 整數（四位元組）。 */
  addInt(n: number): this {
    const v = n | 0
    this.mix(v & 0xff)
    this.mix((v >>> 8) & 0xff)
    this.mix((v >>> 16) & 0xff)
    this.mix((v >>> 24) & 0xff)
    return this
  }

  /** 目前雜湊值（32-bit 無號）。 */
  value(): number {
    return this.h >>> 0
  }

  private mix(byte: number): void {
    this.h ^= byte
    this.h = Math.imul(this.h, FNV_PRIME) >>> 0
  }
}
```

- [ ] **Step 4: 跑測試確認通過**

Run: `npx vitest run src/engine/core/checksum.test.ts`
Expected: PASS（4 筆）。

- [ ] **Step 5: 型別檢查**

Run: `npm run typecheck`
Expected: 乾淨。

- [ ] **Step 6: Commit**

```bash
git add src/engine/core/checksum.ts src/engine/core/checksum.test.ts
git commit -m "$(printf '%s\n\n%s' '[mvp][feat][engine] 新增 Checksum 確定性雜湊工具（FNV-1a over float64）' 'Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

### Task 2: World.checksum()

**Files:**
- Modify: `src/engine/World.ts`（imports；新增 `checksum()`）
- Test: `src/engine/World.test.ts`

**Interfaces:**
- Consumes：T1 的 `Checksum`；`WEAPON_ORDER`/`PASSIVE_ORDER`/`ENEMY_ORDER`/`ELITE_AFFIX_ORDER`；`World.players`/`enemies`/`projectiles`/`enemyProjectiles`/`chestEntities`/`pickupEntities`/`gemEntities` 與私有 `elapsed`/`spawnTimer`/`bossTimer`/`eventTimer`/`bossCount`/`finalBossSpawned`/`won`。
- Produces：`World.checksum(): number`。

- [ ] **Step 1: 寫失敗測試**

在 `src/engine/World.test.ts` 新增：

```ts
  describe('World.checksum（SP2）', () => {
    it('相同 seed/角色、未 step 的兩 World checksum 相同', () => {
      const a = new World(1, ['macrophage', 'neutrophil'])
      const b = new World(1, ['macrophage', 'neutrophil'])
      expect(a.checksum()).toBe(b.checksum())
    })
    it('step 推進後 checksum 改變', () => {
      const w = new World(1)
      const before = w.checksum()
      for (let i = 0; i < 120; i++) w.step(1 / 60)
      expect(w.checksum()).not.toBe(before)
    })
    it('checksum 為 32-bit 無號整數', () => {
      const v = new World(5).checksum()
      expect(Number.isInteger(v)).toBe(true)
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThanOrEqual(0xffffffff)
    })
  })
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `npx vitest run src/engine/World.test.ts -t "World.checksum"`
Expected: FAIL — `checksum` 不存在。

- [ ] **Step 3: imports（World.ts）**

確認/補上：
- `import { Checksum } from './core/checksum'`
- `ENEMY_ORDER` 已 import（既有 `import { ENEMY_DEFS, ENEMY_ORDER } from './systems/enemyDefs'`）。
- `ELITE_AFFIX_ORDER`：把既有 eliteDefs import 補成 `import { ELITE_AFFIX_DEFS, ELITE_AFFIX_ORDER } from './systems/eliteDefs'`。
- `WEAPON_ORDER`：把既有 `import { WEAPON_DEFS } from './systems/weaponDefs'` 補成 `import { WEAPON_DEFS, WEAPON_ORDER } from './systems/weaponDefs'`。
- `PASSIVE_ORDER`：把既有 `import { PASSIVE_DEFS } from './systems/passiveDefs'` 補成 `import { PASSIVE_DEFS, PASSIVE_ORDER } from './systems/passiveDefs'`。

> 若某 ORDER 在實作後未被其他處使用而觸發 noUnusedLocals，確認它確實用於 `checksum()`（會用到）。

- [ ] **Step 4: 實作 checksum()（World.ts）**

新增方法（放在 `summary()` 附近）：

```ts
  /**
   * 規範化模擬狀態的確定性雜湊（供回放確定性測試與未來連線 desync 偵測）。
   * 以固定順序餵入標量、各玩家、各敵人與各類實體計數；唯讀、不改狀態。
   */
  checksum(): number {
    const c = new Checksum()
    c.add(this.elapsed)
    c.addInt(this.playerCount)
    c.addInt(this.bossCount)
    c.addInt(this.finalBossSpawned ? 1 : 0)
    c.addInt(this.won ? 1 : 0)
    c.add(this.spawnTimer); c.add(this.bossTimer); c.add(this.eventTimer)
    for (const p of this.players) {
      c.add(p.entity.pos.x); c.add(p.entity.pos.y)
      c.add(p.entity.hp); c.add(p.entity.maxHp)
      c.addInt(p.level); c.add(p.xp); c.addInt(p.pendingLevelUps); c.addInt(p.alive ? 1 : 0)
      c.addInt(p.weapons.length)
      for (const w of p.weapons) {
        c.addInt(WEAPON_ORDER.indexOf(w.kind)); c.addInt(w.level); c.addInt(w.evolved ? 1 : 0)
      }
      c.addInt(p.passives.length)
      for (const ps of p.passives) {
        c.addInt(PASSIVE_ORDER.indexOf(ps.kind)); c.addInt(ps.level)
      }
    }
    c.addInt(this.enemies.length)
    for (const e of this.enemies) {
      c.add(e.pos.x); c.add(e.pos.y); c.add(e.hp)
      c.addInt(e.enemyKind ? ENEMY_ORDER.indexOf(e.enemyKind) : -1)
      c.addInt(e.affix ? ELITE_AFFIX_ORDER.indexOf(e.affix) : -1)
    }
    c.addInt(this.projectiles.length)
    c.addInt(this.enemyProjectiles.length)
    c.addInt(this.chestEntities.length)
    c.addInt(this.pickupEntities.length)
    c.addInt(this.gemEntities.length)
    let gemXp = 0
    for (const g of this.gemEntities) gemXp += g.xp
    c.add(gemXp)
    return c.value()
  }
```

- [ ] **Step 5: 跑測試 + 型別 + 全測試**

Run: `npx vitest run src/engine/World.test.ts -t "World.checksum" && npm run typecheck && npm test`
Expected: 新 3 筆 PASS；既有全綠；typecheck 乾淨。

- [ ] **Step 6: Commit**

```bash
git add src/engine/World.ts src/engine/World.test.ts
git commit -m "$(printf '%s\n\n%s' '[mvp][feat][engine] 新增 World.checksum()（規範化模擬狀態確定性雜湊）' 'Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

### Task 3: 回放雜湊測試 + 原始碼守護測試

**Files:**
- Create: `src/engine/determinism.test.ts`

**Interfaces:**
- Consumes：T2 的 `World.checksum()`；`World` 建構子與 `setMoveInput`/`step`。

- [ ] **Step 1: 寫測試（回放 + 守護）**

`src/engine/determinism.test.ts`：

```ts
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
  /** 呈現/IO/驅動層白名單（可合法使用 Math.random/時間）。 */
  const EXCLUDE = new Set([
    './Game.ts', './PixiRenderer.ts', './sprites.ts', './postProcessing.ts',
    './noiseBackground.ts', './effects.ts',
    './core/soundManager.ts', './core/input.ts', './core/touchInput.ts',
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
```

- [ ] **Step 2: 跑測試確認通過**

Run: `npx vitest run src/engine/determinism.test.ts`
Expected: PASS（回放 3 筆 + 守護掃描範圍 1 筆 + 每個 sim 檔各 1 筆，全綠＝模擬路徑現況乾淨）。

> 若某守護案例失敗，表示該 sim 檔含禁用 global——回報並檢視（不應發生；現況應乾淨）。

- [ ] **Step 3: 型別 + 全測試 + build**

Run: `npm run typecheck && npm test && npm run build`
Expected: 全綠、乾淨。

- [ ] **Step 4: Commit**

```bash
git add src/engine/determinism.test.ts
git commit -m "$(printf '%s\n\n%s' '[mvp][test][engine] 確定性回放雜湊測試 + 模擬路徑非確定性 global 守護' 'Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

## 完成後
- [ ] `npm test` 全綠、`npm run build` 乾淨；更新 `acceptance.md` + `progress.md`（記錄已知限制：跨瀏覽器超越函式不定點化）。

---

## Self-Review（plan 對照 spec）
- **Spec coverage：** FR-1 Checksum→T1；FR-2 World.checksum→T2；FR-3 回放→T3；FR-4 守護→T3；FR-5 已知限制→spec/acceptance + 完成後 progress 註記。Edge：空狀態（T2 未 step checksum）、順序敏感（T1）、守護去註解（T3 stripComments）皆涵蓋。
- **Placeholder scan：** 無 TBD；所有檔含完整程式碼與指令。
- **Type consistency：** `Checksum.add/addInt/value`、`World.checksum()`、ORDER `.indexOf`、`import.meta.glob` 守護全程一致；欄位名與 World 既有私有/公開欄位一致。
