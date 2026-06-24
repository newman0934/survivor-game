# 進度存檔（save-progress）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 加入 localStorage 進度存檔——每場記錄戰績、跨場累積統計，結算顯示破紀錄、主選單顯示統計概覽。

**Architecture:** 存檔邏輯集中於獨立純模組 `src/persistence/saveStore.ts`（注入 `StorageLike` 以利 TDD），由 `App.vue` 串接：開機 `loadSave()`、進入 `over` 時 `recordRun()`，資料以 props 傳給 `MainMenu` / `GameOver`。引擎、`stores/game.ts`、`Game` 迴圈零改動。

**Tech Stack:** TypeScript、Vue 3 `<script setup>`、Pinia（既有 store 不改）、Vitest、localStorage。

## Global Constraints

- 繁體中文（zh-TW）：所有註解、文件、UI 文案；程式碼/型別名稱維持英文。
- 引擎純度：`src/engine/**` 不得引入 Vue/Pinia 執行期依賴；本功能完全不碰 `engine/**` 與 `stores/game.ts`。
- 確定性：`saveStore` 無 `Math.random()`、無內部讀時鐘（`date` 由呼叫端傳入）。
- 韌性：任何存檔層異常都不得影響遊玩（讀錯回空白存檔、寫錯靜默略過、皆不丟例外給呼叫端）。
- 既有 142 單元測試必須維持全綠。
- localStorage key：`survivor-save-v1`（版號內嵌）。
- 破紀錄判定須**嚴格大於**（平手不算）。
- `runs` 依 `time` 降冪排序，最多保留前 10 筆。
- Commit 格式：`[mvp][type][scope] 描述` + `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`。

---

### Task 1: saveStore 純模組（型別 + loadSave + recordRun）

**Files:**
- Create: `src/persistence/saveStore.ts`
- Test: `src/persistence/saveStore.test.ts`

**Interfaces:**
- Consumes: `CharacterKind` / `MapKind`（型別匯入自 `../engine/types`）。
- Produces:
  - `interface StorageLike { getItem(key: string): string | null; setItem(key: string, value: string): void }`
  - `interface RunRecord { time: number; kills: number; level: number; character: CharacterKind; map: MapKind; date: number }`
  - `interface CumulativeStats { totalKills: number; totalRuns: number; bestTime: number; bestKills: number; maxLevel: number }`
  - `interface SaveData { version: 1; runs: RunRecord[]; stats: CumulativeStats }`
  - `function loadSave(storage?: StorageLike): SaveData`
  - `function recordRun(run: RunRecord, storage?: StorageLike): { save: SaveData; isNewBestTime: boolean; isNewBestKills: boolean }`

- [ ] **Step 1: 寫失敗測試**（`src/persistence/saveStore.test.ts`）

```ts
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
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `npx vitest run src/persistence/saveStore.test.ts`
Expected: FAIL（`Cannot find module './saveStore'`）

- [ ] **Step 3: 實作 saveStore**（`src/persistence/saveStore.ts`）

```ts
/**
 * 進度存檔模組（純邏輯）。
 *
 * 集中所有 localStorage 讀寫與序列化／合併邏輯；以注入式 `StorageLike` 解耦，
 * 既可用於正式（window.localStorage）也可在單元測試注入記憶體假物件。
 * 不碰引擎、不依賴 Vue/Pinia；無 Math.random()、不讀內部時鐘（date 由呼叫端提供）。
 *
 * 韌性原則：讀取任何異常回空白存檔、寫入任何異常靜默略過——絕不讓存檔問題影響遊玩。
 */
import type { CharacterKind, MapKind } from '../engine/types'

/** localStorage key（版號內嵌，方便日後遷移）。 */
const SAVE_KEY = 'survivor-save-v1'
/** runs 最多保留筆數（依存活時間取前 N）。 */
const MAX_RUNS = 10

/** 注入式儲存介面；正式為 window.localStorage，測試為記憶體假物件。 */
export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

/** 單場戰績紀錄。 */
export interface RunRecord {
  /** 存活秒數（整數）。 */
  time: number
  kills: number
  level: number
  character: CharacterKind
  map: MapKind
  /** Date.now() 毫秒時間戳（由呼叫端提供，保持本模組無時間相依）。 */
  date: number
}

/** 跨場累積統計。 */
export interface CumulativeStats {
  /** 跨場累加總擊殺（含被擠出前 10 的場次）。 */
  totalKills: number
  totalRuns: number
  bestTime: number
  bestKills: number
  maxLevel: number
}

/** 完整存檔結構。 */
export interface SaveData {
  version: 1
  /** 依 time 降冪、最多 MAX_RUNS 筆。 */
  runs: RunRecord[]
  stats: CumulativeStats
}

/** 全新空白存檔。 */
function emptySave(): SaveData {
  return {
    version: 1,
    runs: [],
    stats: { totalKills: 0, totalRuns: 0, bestTime: 0, bestKills: 0, maxLevel: 0 },
  }
}

/** 預設儲存來源；無 window（非瀏覽器環境）時回 null 觸發空白存檔。 */
function defaultStorage(): StorageLike | null {
  return typeof window !== 'undefined' && window.localStorage ? window.localStorage : null
}

/**
 * 讀取存檔。無資料／壞 JSON／版號不符／結構缺漏一律回空白存檔，永不丟例外。
 * @param storage 注入式儲存；省略時用 window.localStorage。
 */
export function loadSave(storage: StorageLike | null = defaultStorage()): SaveData {
  if (!storage) return emptySave()
  try {
    const raw = storage.getItem(SAVE_KEY)
    if (!raw) return emptySave()
    const parsed = JSON.parse(raw) as Partial<SaveData>
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.runs) || !parsed.stats) {
      return emptySave()
    }
    const base = emptySave()
    return {
      version: 1,
      runs: parsed.runs as RunRecord[],
      stats: { ...base.stats, ...parsed.stats },
    }
  } catch {
    return emptySave()
  }
}

/**
 * 記錄一場戰績：先以舊 stats 判定破紀錄旗標，再併入 runs（降冪截前 N）、更新 stats、寫回。
 * 寫入失敗（無痕/配額滿）靜默略過，但回傳的記憶體內 save 仍正確。
 * @param run     本場戰績。
 * @param storage 注入式儲存；省略時用 window.localStorage。
 */
export function recordRun(
  run: RunRecord,
  storage: StorageLike | null = defaultStorage(),
): { save: SaveData; isNewBestTime: boolean; isNewBestKills: boolean } {
  const save = loadSave(storage)
  const isNewBestTime = run.time > save.stats.bestTime
  const isNewBestKills = run.kills > save.stats.bestKills

  save.runs.push(run)
  save.runs.sort((a, b) => b.time - a.time)
  if (save.runs.length > MAX_RUNS) save.runs.length = MAX_RUNS

  save.stats = {
    totalKills: save.stats.totalKills + run.kills,
    totalRuns: save.stats.totalRuns + 1,
    bestTime: Math.max(save.stats.bestTime, run.time),
    bestKills: Math.max(save.stats.bestKills, run.kills),
    maxLevel: Math.max(save.stats.maxLevel, run.level),
  }

  if (storage) {
    try {
      storage.setItem(SAVE_KEY, JSON.stringify(save))
    } catch {
      // 寫入失敗靜默略過——不影響遊玩，本次 save 仍在記憶體供結算畫面使用。
    }
  }
  return { save, isNewBestTime, isNewBestKills }
}
```

- [ ] **Step 4: 執行測試確認通過**

Run: `npx vitest run src/persistence/saveStore.test.ts`
Expected: PASS（11 tests）

- [ ] **Step 5: 確認既有測試與型別不受影響**

Run: `npm run typecheck`
Expected: 乾淨無錯

- [ ] **Step 6: Commit**

```bash
git add src/persistence/saveStore.ts src/persistence/saveStore.test.ts
git commit -m "[mvp][feat][meta] saveStore 進度存檔純模組：loadSave/recordRun + 容錯（TDD）

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: GameOver 破紀錄 + MainMenu 統計概覽（純呈現）

**Files:**
- Modify: `src/ui/GameOver.vue`
- Modify: `src/ui/MainMenu.vue`

**Interfaces:**
- Consumes: `CumulativeStats`（型別匯入自 `../persistence/saveStore`）。
- Produces:
  - `GameOver` 新增 props：`{ bestTime: number; isNewBestTime: boolean; isNewBestKills: boolean }`
  - `MainMenu` 新增 prop：`{ stats: CumulativeStats }`（既有 `start` emit 不變）

> 註：本任務為呈現層（無單元測試），以 `npm run typecheck` 驗證；視覺於 Task 3 連同 App 串接一併實機驗證。

- [ ] **Step 1: 改 `src/ui/GameOver.vue`**

把 `<script setup>` 改為接收 props（仍從 store 讀本場 time/kills/level）：

```vue
<script setup lang="ts">
/**
 * GameOver.vue — 結束畫面 overlay（phase === 'over' 時顯示）。
 * 從 store 讀本場戰績；最佳存活與破紀錄旗標由 App.vue 以 props 傳入。
 * 按「再玩一次」向 App.vue 發出 restart 事件。
 */
import { computed } from 'vue'
import { useGameStore } from '../stores/game'

const props = defineProps<{
  /** 歷史最佳存活秒數（已含本場）。0 代表尚無紀錄。 */
  bestTime: number
  /** 本場是否刷新存活紀錄。 */
  isNewBestTime: boolean
  /** 本場是否刷新擊殺紀錄。 */
  isNewBestKills: boolean
}>()
const store = useGameStore()
// 把秒數格式化為 m:ss（與 Hud 一致）。
function fmt(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}
const mmss = computed(() => fmt(store.time))
const bestText = computed(() => (props.bestTime > 0 ? fmt(props.bestTime) : '—'))
</script>

<template>
  <div class="overlay">
    <div class="panel">
      <h1>你倒下了</h1>
      <p>存活時間 {{ mmss }}</p>
      <p>擊殺 {{ store.kills }} · 等級 {{ store.level }}</p>
      <p v-if="isNewBestTime" class="record">🏆 存活新紀錄！</p>
      <p v-if="isNewBestKills" class="record">🏆 擊殺新紀錄！</p>
      <p class="best">最佳存活：{{ bestText }}</p>
      <button @click="emit('restart')">再玩一次</button>
    </div>
  </div>
</template>
```

並把 emit 宣告保留在 `<script setup>` 內（緊接 props 之後）：

```ts
// 重新開始事件，無 payload；由 App.vue 監聽以重啟引擎。
const emit = defineEmits<{ restart: [] }>()
```

在 `<style scoped>` 既有規則後加上：

```css
.record { color: var(--antigen); font-weight: bold; margin: 0; animation: gopop 0.35s ease-out both; }
.best { opacity: 0.85; margin: 0; }
@media (prefers-reduced-motion: reduce) { .record { animation: none; } }
```

- [ ] **Step 2: 改 `src/ui/MainMenu.vue`**

在 `<script setup>` import 區後新增 props：

```ts
import type { CumulativeStats } from '../persistence/saveStore'

defineProps<{
  /** 跨場累積統計（由 App.vue loadSave 後傳入）。 */
  stats: CumulativeStats
}>()

/** 把秒數格式化為 m:ss；0 顯示「—」。 */
function fmtBest(sec: number): string {
  if (sec <= 0) return '—'
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}
```

在 template 的 `<h1>Survivor</h1>` 之後、`角色` section 之前插入統計概覽：

```vue
    <div class="stats" v-if="stats.totalRuns > 0">
      <span>總擊殺 <b>{{ stats.totalKills }}</b></span>
      <span>場數 <b>{{ stats.totalRuns }}</b></span>
      <span>最佳存活 <b>{{ fmtBest(stats.bestTime) }}</b></span>
      <span>最高等級 <b>{{ stats.maxLevel }}</b></span>
    </div>
```

在 `<style scoped>` 既有規則後加上：

```css
.stats { display: flex; gap: 1rem; flex-wrap: wrap; justify-content: center;
  font-size: 0.85rem; opacity: 0.85; margin-bottom: 0.4rem; }
.stats b { color: var(--immune-accent-strong); }
@media (max-width: 600px) { .stats { gap: 0.6rem; font-size: 0.78rem; } }
```

- [ ] **Step 3: 型別檢查**

Run: `npm run typecheck`
Expected: 乾淨（注意：此時 App.vue 尚未傳 props，vue-tsc 可能對缺漏 props 報錯——若報錯屬預期，於 Task 3 串接後消失。為避免中途紅燈，本步驟僅確認兩個元件本身語法/型別無誤；App.vue 的 props 綁定於 Task 3 補上。）

> 若 typecheck 因 App.vue 缺 props 報錯，繼續 Task 3；Task 3 完成後 typecheck 必須乾淨。

- [ ] **Step 4: Commit**

```bash
git add src/ui/GameOver.vue src/ui/MainMenu.vue
git commit -m "[mvp][feat][ui] GameOver 破紀錄提示 + MainMenu 統計概覽（props 驅動）

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: App.vue 串接 + 驗證 + 進度更新

**Files:**
- Modify: `src/App.vue`
- Modify: `progress.md`
- Modify: `docs/superpowers/specs/save-progress/acceptance.md`

**Interfaces:**
- Consumes: `loadSave` / `recordRun` / `CumulativeStats`（自 `./persistence/saveStore`）；
  `GameOver` props `{ bestTime, isNewBestTime, isNewBestKills }`；`MainMenu` prop `{ stats }`。
- Produces: 無下游（最終串接任務）。

- [ ] **Step 1: 改 `src/App.vue` `<script setup>`**

在 import 區加入：

```ts
import { loadSave, recordRun, type CumulativeStats } from './persistence/saveStore'
```

在 `const store = useGameStore()` 之後加入存檔狀態：

```ts
// 跨場累積統計（開機讀取，記錄後刷新）；傳給主選單顯示。
const stats = ref<CumulativeStats>(loadSave().stats)
// 最近一場的破紀錄資訊；傳給結算畫面顯示。
const lastRun = ref<{ bestTime: number; isNewBestTime: boolean; isNewBestKills: boolean }>({
  bestTime: stats.value.bestTime,
  isNewBestTime: false,
  isNewBestKills: false,
})
```

把既有 `watch(() => store.phase, ...)` 擴充為同時處理「進入 over 時記錄戰績」（合併進同一個 watch，避免兩個 watcher）：

```ts
// 監聽 phase：升級暫停握手 + 進入 over 時記錄本場戰績。
watch(
  () => store.phase,
  (phase, prev) => {
    if (game) {
      if (phase === 'upgrading') game.pause()
      else if (phase === 'playing') game.resume()
    }
    // 進入結束畫面（上升沿）：以最終 summary + 當局角色/地圖記錄一場，並刷新統計與破紀錄旗標。
    if (phase === 'over' && prev !== 'over') {
      const res = recordRun({
        time: store.time,
        kills: store.kills,
        level: store.level,
        character: selected.character,
        map: selected.map,
        date: Date.now(),
      })
      stats.value = res.save.stats
      lastRun.value = {
        bestTime: res.save.stats.bestTime,
        isNewBestTime: res.isNewBestTime,
        isNewBestKills: res.isNewBestKills,
      }
    }
  },
)
```

- [ ] **Step 2: 改 `src/App.vue` template 綁定 props**

把 MainMenu 與 GameOver 兩行改為傳入 props：

```vue
    <Transition name="fade"><MainMenu v-if="store.phase === 'menu'" :stats="stats" @start="startGame" /></Transition>
    <Transition name="fade"><UpgradeModal v-if="store.phase === 'upgrading'" /></Transition>
    <Transition name="fade"><GameOver v-if="store.phase === 'over'" :best-time="lastRun.bestTime" :is-new-best-time="lastRun.isNewBestTime" :is-new-best-kills="lastRun.isNewBestKills" @restart="restart" /></Transition>
```

- [ ] **Step 3: 型別檢查 + 既有測試 + build**

Run: `npm run typecheck`
Expected: 乾淨

Run: `npm test`
Expected: PASS（既有 142 + saveStore 11 = 153）

Run: `npm run build`
Expected: 乾淨

- [ ] **Step 4: 實機驗證**

Run: `npm run dev`，於瀏覽器：
1. 主選單：首次無存檔時統計區不顯示（totalRuns=0）。
2. 玩一場到死亡 → 結算顯示「存活時間」「最佳存活」與（首場必有）「🏆 存活新紀錄！/🏆 擊殺新紀錄！」。
3. 按「再玩一次」再玩第二場：若成績更佳則再次出現破紀錄提示，否則僅顯示最佳存活。
4. 重整瀏覽器（F5）→ 回主選單應顯示統計概覽（總擊殺/場數/最佳存活/最高等級），數字延續。
5. 確認 console 無功能相關錯誤（既有 favicon 404 可忽略）。

- [ ] **Step 5: 更新 acceptance.md 與 progress.md**

勾選 `docs/superpowers/specs/save-progress/acceptance.md` 全部項目並填驗證日期；
在 `progress.md` 階段 4「進度存檔（localStorage）」改為 `[x]` 並補一行說明 + 更新測試數（142→153）。

- [ ] **Step 6: Commit**

```bash
git add src/App.vue progress.md docs/superpowers/specs/save-progress/acceptance.md
git commit -m "[mvp][feat][meta] App 串接進度存檔：結束記錄戰績 + 主選單統計；驗收/進度更新

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-Review（plan 對 spec 的覆蓋檢查）

- **FR-1 資料模型**：Task 1 完整定義 4 個型別與 `SAVE_KEY`/`MAX_RUNS`。✅
- **FR-2 saveStore API**：Task 1 `loadSave`/`recordRun` 簽章與容錯如 spec；11 個測試覆蓋空/壞/版號/首場/更佳/平手/較差/截前10/寫例外。✅
- **FR-3 App 串接**：Task 3 開機 loadSave、over 上升沿 recordRun、props 下傳。✅
- **FR-4 UI**：Task 2 GameOver 最佳存活+破紀錄、MainMenu 概覽。✅
- **Edge Cases**：首場（bestTime=0）、平手不破、第 11 筆、寫例外、壞 JSON/版號 → 皆有對應測試或處理。✅
- **不變項**：引擎/game.ts/Game 不在任何 task 的修改清單；既有測試於 Task 1 Step 5、Task 3 Step 3 驗證。✅
- **型別一致性**：`StorageLike`/`RunRecord`/`CumulativeStats`/`SaveData`/`loadSave`/`recordRun` 命名於 Task 1 定義、Task 2/3 沿用一致。✅
- **Placeholder 掃描**：無 TBD/TODO；每個程式步驟皆含完整程式碼。✅
