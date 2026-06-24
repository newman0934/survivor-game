# Spec — 排行榜

## Overview

新增「排行榜」彈窗：在主選單以一顆按鈕開啟，顯示歷史戰績前 N 名（依存活時間排名），
每列含名次/存活時間/擊殺/等級/角色/地圖/日期。資料來自既有 save-progress 的 `runs`，
為純呈現功能，**不動 saveStore / 引擎 / store**。

依專案分層：persistence 存取集中於 `App.vue`，新增 `Leaderboard.vue` 為純呈現元件（props 驅動）。

## Business Requirements

- 讓玩家回顧自己的最佳戰績，提供炫耀與自我挑戰的動機。
- 重用 save-progress 已存的 `runs` 資料，零資料層改動。

## Functional Requirements

### FR-1 資料來源
- `saveStore.loadSave()` 已回傳 `runs: RunRecord[]`（依 `time` 降冪、最多 10 筆，
  含 `time`/`kills`/`level`/`character`/`map`/`date`）。排行榜直接使用，不再排序。
- `RunRecord` 型別沿用 `src/persistence/saveStore.ts`，不新增欄位。

### FR-2 App.vue 串接
- App 開機 `loadSave()` 時保留 `runs`（現有只取 `stats`），新增 `runs` 反應式狀態。
- 進入 `over` 後（既有 `recordRun` 串接處）以回傳的 `save.runs` 一併刷新 `runs`。
- 新增 `showLeaderboard` 反應式開關：MainMenu 發 `open-leaderboard` → 設 true；
  Leaderboard 發 `close` → 設 false。
- 排行榜 overlay 疊在主選單之上（僅 `phase === 'menu'` 時可開）。

### FR-3 Leaderboard.vue（純呈現）
```ts
defineProps<{ runs: RunRecord[] }>()
defineEmits<{ close: [] }>()
```
- 標題「排行榜」+ 表格，逐列顯示：名次（1..N，依陣列順序）、存活時間（M:SS）、擊殺、
  等級、角色（`CHARACTER_DEFS[kind].name`）、地圖（`MAP_DEFS[kind].name`）、日期（`YYYY/MM/DD`）。
- 角色名以該角色顏色點綴（沿用 MainMenu 的 `css(color)` 慣例）。
- 「關閉」按鈕發 `close`。
- 空狀態：`runs` 為空時顯示「尚無紀錄，快去存活看看！」（不顯示空表格）。

### FR-4 MainMenu 變更
- 在統計概覽區附近新增「排行榜」按鈕，`emit('open-leaderboard')`。
- 既有 `start` emit、`stats` prop、統計概覽不變。

## Acceptance Criteria

詳見 acceptance.md（唯一驗收來源）。

## Edge Cases

- `runs` 為空（無存檔）：顯示空狀態文案，不渲染表格列。
- 不滿 10 筆：顯示實際筆數（名次 1..n）。
- `date` 為非有限數（壞 timestamp）：該列日期顯示「—」，不 crash。
- `character`/`map` 為未知 kind（理論上不會發生）：退回顯示原始 kind 字串，不 crash。
- 排行榜開啟時不影響背景主選單的角色/地圖選擇狀態（關閉後選擇仍在）。

## API Contracts

無後端 API。元件介面如 FR-3。

## Data Model Changes

無。沿用 `RunRecord`；不修改 saveStore、引擎 types、store。

## State Changes

- `App.vue` 新增區域反應式狀態：`runs: RunRecord[]`、`showLeaderboard: boolean`。
- 既有狀態機 `menu/playing/upgrading/over` 不變；排行榜是疊加 overlay，不是新 phase。

## UI Behaviour

- 排行榜為置中彈窗 overlay，套免疫主題配色、`prefers-reduced-motion`。
- 時間以 M:SS、日期以 `YYYY/MM/DD` 顯示。
- 窄螢幕（≤600px）：表格可橫向捲動或縮字級，不破版。
- 「關閉」回到主選單，選擇狀態保留。

## Non-Functional Requirements

- 不動 saveStore / 引擎 / store；既有 154 單元測試維持全綠。
- 純前端、單機；資料容錯由既有 saveStore 保證（讀壞 → `runs: []` → 空狀態）。
- 元件職責單一、props 驅動、可獨立理解。
