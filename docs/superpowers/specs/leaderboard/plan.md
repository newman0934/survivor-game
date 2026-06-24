# 排行榜（leaderboard）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新增獨立「排行榜」彈窗，於主選單顯示歷史戰績前 N 名（依存活時間），重用既有 save-progress 的 `runs` 資料。

**Architecture:** 新增純呈現元件 `src/ui/Leaderboard.vue`（props 驅動）；`MainMenu.vue` 加「排行榜」按鈕發事件；`App.vue` 保留 `loadSave()` 的 `runs` 並以 `showLeaderboard` 開關控制彈窗。不動 saveStore / 引擎 / store。

**Tech Stack:** Vue 3 `<script setup lang="ts">`、既有 `RunRecord` 型別、`CHARACTER_DEFS`/`MAP_DEFS`。

## Global Constraints

- 繁體中文（zh-TW）：所有註解、UI 文案；程式碼/型別名稱維持英文。
- 不修改 `src/persistence/saveStore.ts`、`src/engine/**`、`src/stores/game.ts`。
- 既有 154 單元測試維持全綠（本功能不新增/不破壞單元測試；屬呈現/膠水層，以 typecheck+build+實機驗證）。
- 排名依存活時間：直接用 `runs` 既有順序（saveStore 已依 `time` 降冪、最多 10 筆），元件**不再排序**。
- 列欄位：名次 / 存活時間(M:SS) / 擊殺 / 等級 / 角色名 / 地圖名 / 日期(YYYY/MM/DD)。
- 空狀態文案：「尚無紀錄，快去存活看看！」。壞 `date`（非有限數）該列日期顯示「—」。
- 套免疫主題 CSS 變數（--immune-accent / --immune-accent-strong）、`prefers-reduced-motion`、窄螢幕不破版。
- Commit 格式：`[mvp][type][scope] 描述` + `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`。

---

### Task 1: Leaderboard.vue 元件（純呈現）

**Files:**
- Create: `src/ui/Leaderboard.vue`

**Interfaces:**
- Consumes: `RunRecord`（型別自 `../persistence/saveStore`）、`CHARACTER_DEFS`（`../engine/systems/characterDefs`）、`MAP_DEFS`（`../engine/systems/mapDefs`）、`CharacterKind`/`MapKind`（`../engine/types`）。
- Produces: 元件 `Leaderboard`，props `{ runs: RunRecord[] }`，emit `close`（供 Task 2 的 App 使用）。

- [ ] **Step 1: 建立 `src/ui/Leaderboard.vue`**

```vue
<script setup lang="ts">
/**
 * Leaderboard.vue — 排行榜彈窗（純呈現）。
 * 由 App.vue 以 props 傳入 runs（已依存活時間降冪、最多 10 筆）；顯示前 N 名戰績。
 * 「關閉」發出 close 事件由 App 收起。不讀 store、不碰引擎/存檔。
 */
import type { RunRecord } from '../persistence/saveStore'
import { CHARACTER_DEFS } from '../engine/systems/characterDefs'
import { MAP_DEFS } from '../engine/systems/mapDefs'
import type { CharacterKind, MapKind } from '../engine/types'

defineProps<{ runs: RunRecord[] }>()
const emit = defineEmits<{ close: [] }>()

/** 秒數 → M:SS（與 Hud/GameOver 一致）。 */
function fmtTime(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}
/** 毫秒時間戳 → YYYY/MM/DD；非有限數回「—」。 */
function fmtDate(ts: number): string {
  if (!Number.isFinite(ts)) return '—'
  const d = new Date(ts)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}/${mm}/${dd}`
}
/** 角色 kind → 顯示名；未知 kind 退回原字串。 */
function charName(kind: CharacterKind): string {
  return CHARACTER_DEFS[kind]?.name ?? kind
}
/** 角色 kind → 顏色 CSS hex；未知退回白色。 */
function charColor(kind: CharacterKind): string {
  const c = CHARACTER_DEFS[kind]?.color
  return c === undefined ? '#fff' : '#' + c.toString(16).padStart(6, '0')
}
/** 地圖 kind → 顯示名；未知 kind 退回原字串。 */
function mapName(kind: MapKind): string {
  return MAP_DEFS[kind]?.name ?? kind
}
</script>

<template>
  <div class="overlay">
    <div class="panel">
      <h1>排行榜</h1>
      <p v-if="runs.length === 0" class="empty">尚無紀錄，快去存活看看！</p>
      <div v-else class="table-wrap">
        <table class="board">
          <thead>
            <tr><th>#</th><th>存活</th><th>擊殺</th><th>等級</th><th>角色</th><th>地圖</th><th>日期</th></tr>
          </thead>
          <tbody>
            <tr v-for="(r, i) in runs" :key="i">
              <td class="rank">{{ i + 1 }}</td>
              <td>{{ fmtTime(r.time) }}</td>
              <td>{{ r.kills }}</td>
              <td>{{ r.level }}</td>
              <td :style="{ color: charColor(r.character) }">{{ charName(r.character) }}</td>
              <td>{{ mapName(r.map) }}</td>
              <td class="date">{{ fmtDate(r.date) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <button @click="emit('close')">關閉</button>
    </div>
  </div>
</template>

<style scoped>
.overlay { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
  background: rgba(18, 10, 14, 0.9); color: #fff; font-family: sans-serif; padding: 1rem; }
.panel { display: flex; flex-direction: column; align-items: center; gap: 1rem; max-width: 92vw;
  animation: lbpop 0.3s ease-out both; }
@keyframes lbpop { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: none; } }
h1 { margin: 0; letter-spacing: 0.08em; }
.empty { opacity: 0.8; }
.table-wrap { max-width: 92vw; overflow-x: auto; }
.board { border-collapse: collapse; font-size: 0.95rem; }
.board th, .board td { padding: 0.35rem 0.7rem; text-align: center; white-space: nowrap; }
.board thead th { color: var(--immune-accent-strong); border-bottom: 1px solid rgba(255, 255, 255, 0.25); }
.board tbody tr:nth-child(odd) { background: rgba(255, 255, 255, 0.05); }
.board .rank { color: var(--immune-accent-strong); font-weight: bold; }
.board .date { opacity: 0.75; }
button { font-size: 1.2rem; padding: 0.5rem 1.6rem; cursor: pointer; border: none;
  border-radius: 8px; background: var(--immune-accent); color: #06231f; font-weight: bold; }
@media (prefers-reduced-motion: reduce) { .panel { animation: none; } }
@media (max-width: 600px) {
  .board { font-size: 0.82rem; }
  .board th, .board td { padding: 0.3rem 0.45rem; }
}
</style>
```

- [ ] **Step 2: 型別檢查**

Run: `npm run typecheck`
Expected: 乾淨（Leaderboard.vue 尚未被任何檔 import，vue-tsc 仍會單獨檢查其型別；本身應無誤）

- [ ] **Step 3: Commit**

```bash
git add src/ui/Leaderboard.vue
git commit -m "[mvp][feat][ui] 新增 Leaderboard 排行榜彈窗元件（純呈現，props 驅動）

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: MainMenu 按鈕 + App 串接 + 驗證 + 進度更新

**Files:**
- Modify: `src/ui/MainMenu.vue`
- Modify: `src/App.vue`
- Modify: `progress.md`
- Modify: `docs/superpowers/specs/leaderboard/acceptance.md`

**Interfaces:**
- Consumes: `Leaderboard` 元件（props `{ runs }`、emit `close`）；`RunRecord` 型別；既有 `loadSave`/`recordRun`。
- Produces: 無下游（最終串接任務）。

- [ ] **Step 1: 改 `src/ui/MainMenu.vue` — 新增「排行榜」按鈕與事件**

把既有 emit 宣告：

```ts
const emit = defineEmits<{ start: [opts: { character: CharacterKind; map: MapKind }] }>()
```

改為（新增 `open-leaderboard`）：

```ts
const emit = defineEmits<{
  start: [opts: { character: CharacterKind; map: MapKind }]
  'open-leaderboard': []
}>()
```

在 template 既有「開始遊戲」按鈕之後新增「排行榜」按鈕：

```vue
    <button class="start" @click="emit('start', { character, map })">開始遊戲</button>
    <button class="ranking" @click="emit('open-leaderboard')">排行榜</button>
```

在 `<style scoped>` 既有 `.start` 規則後新增：

```css
.ranking { font-size: 1.05rem; padding: 0.4rem 1.4rem; cursor: pointer;
  border: 2px solid var(--immune-accent); border-radius: 8px;
  background: transparent; color: #fff; font-weight: bold; }
```

並在既有 `@media (max-width: 600px)` 區塊內補上窄螢幕字級（加在該區塊內既有規則之後）：

```css
  .ranking { font-size: 0.95rem; padding: 0.4rem 1.1rem; }
```

- [ ] **Step 2: 改 `src/App.vue` — 保留 runs、新增排行榜開關**

把 import 行：

```ts
import { loadSave, recordRun, type CumulativeStats } from './persistence/saveStore'
```

改為（加入 `RunRecord` 型別）：

```ts
import { loadSave, recordRun, type CumulativeStats, type RunRecord } from './persistence/saveStore'
```

新增 Leaderboard 元件 import（接在 `import GameOver` 等之後）：

```ts
import Leaderboard from './ui/Leaderboard.vue'
```

把既有的存檔狀態初始化：

```ts
// 跨場累積統計（開機讀取，記錄後刷新）；傳給主選單顯示。
const stats = ref<CumulativeStats>(loadSave().stats)
```

改為（一次 loadSave、同時保留 runs，新增排行榜開關）：

```ts
// 開機讀取存檔：累積統計（主選單用）+ 戰績列表（排行榜用）；記錄一場後一併刷新。
const initialSave = loadSave()
const stats = ref<CumulativeStats>(initialSave.stats)
const runs = ref<RunRecord[]>(initialSave.runs)
// 排行榜彈窗開關。
const showLeaderboard = ref(false)
```

在 watch 的 over 分支，把：

```ts
      stats.value = res.save.stats
      lastRun.value = {
```

改為（多刷新 runs）：

```ts
      stats.value = res.save.stats
      runs.value = res.save.runs
      lastRun.value = {
```

在 template，把 MainMenu 那行加上 `@open-leaderboard`，並在其後新增 Leaderboard overlay：

```vue
    <Transition name="fade"><MainMenu v-if="store.phase === 'menu'" :stats="stats" @start="startGame" @open-leaderboard="showLeaderboard = true" /></Transition>
    <Transition name="fade"><Leaderboard v-if="showLeaderboard && store.phase === 'menu'" :runs="runs" @close="showLeaderboard = false" /></Transition>
```

- [ ] **Step 3: 型別檢查 + 既有測試 + build**

Run: `npm run typecheck`
Expected: 乾淨

Run: `npm test`
Expected: PASS（154，不變）

Run: `npm run build`
Expected: 乾淨

- [ ] **Step 4: 實機驗證**

Run: `npm run dev`，於瀏覽器：
1. 主選單點「排行榜」→ 彈窗開啟。無存檔時顯示「尚無紀錄，快去存活看看！」。
2. 玩一場到死亡（進前 10）→ 回主選單再開排行榜 → 該場出現在列表，欄位（時間/擊殺/等級/角色/地圖/日期）正確。
3. 開排行榜前先選好角色/地圖 → 關閉後選擇仍在。
4. 窄螢幕（縮視窗）→ 表格不破版（可橫向捲動）。
5. console 無功能相關錯誤（既有 favicon 404 可忽略）。

- [ ] **Step 5: 更新 acceptance.md 與 progress.md**

勾選 `docs/superpowers/specs/leaderboard/acceptance.md` 所有項目並填驗證日期 2026-06-24（「實機驗證」項保持未勾並標註「待玩家 npm run dev 確認」）；
在 `progress.md` 階段 4「計分 / 排行榜」改為 `[x]` 並補一行說明（排行榜彈窗、用既有 runs、引擎/store/saveStore 不動、SDD 五件套見 docs/superpowers/specs/leaderboard/）。

- [ ] **Step 6: Commit**

```bash
git add src/ui/MainMenu.vue src/App.vue progress.md docs/superpowers/specs/leaderboard/acceptance.md
git commit -m "[mvp][feat][ui] 主選單串接排行榜：MainMenu 按鈕 + App runs/開關；驗收/進度更新

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-Review（plan 對 spec 的覆蓋檢查）

- **FR-1 資料來源**：Task 1 元件用 `RunRecord`、不排序；Task 2 App 從 loadSave 保留 runs。✅
- **FR-2 App 串接**：Task 2 一次 loadSave 保留 runs、over 後刷新 runs、showLeaderboard 開關、僅 menu 可開。✅
- **FR-3 Leaderboard 元件**：Task 1 表格七欄、空狀態、壞 date「—」、角色色、關閉鍵。✅
- **FR-4 MainMenu**：Task 2 新增按鈕 + emit，既有不變。✅
- **Edge Cases**：空 runs（空狀態）、不滿 10（v-for 實際筆數）、壞 date（fmtDate 防護）、未知 kind（`?? kind` 退回）、關閉保留選擇（背景 MainMenu 狀態不被卸載清掉，showLeaderboard 為疊加 overlay）。✅
- **不變項**：saveStore/engine/store 不在任何 task 修改清單；既有 154 測試於 Task 2 Step 3 驗證。✅
- **型別一致性**：`RunRecord`/`runs`/`showLeaderboard`/`open-leaderboard`/`close` 命名跨 task 一致。✅
- **Placeholder 掃描**：無 TBD/TODO；每個程式步驟皆含完整程式碼。✅
