# Spec — 進度存檔（localStorage）

## Overview

為遊戲加入 localStorage 進度存檔：每場結束記錄一筆戰績、跨場累加統計，並在結算畫面顯示
最佳紀錄與破紀錄提示、在主選單顯示累積統計概覽。本功能是後續「解鎖」與「排行榜」子專案的
資料地基。

依專案架構（純 TS 引擎、game.ts 只放 summary、元件純呈現），存檔邏輯集中於獨立純模組
`src/persistence/saveStore.ts`，由 `App.vue` 串接，**不動引擎、不動 game.ts、不動既有 142 測試**。

## Business Requirements

- 玩家重開瀏覽器後仍能看到自己的歷史最佳成績與累積統計，產生重玩動機。
- 為解鎖／排行榜提供穩定、可擴充的持久化資料來源。
- 存檔失敗（無痕模式、配額滿等）絕不可影響遊玩。

## Functional Requirements

### FR-1 資料模型
單一 localStorage key `survivor-save-v1`，值為 JSON，結構：

```ts
interface SaveData {
  version: 1
  runs: RunRecord[]      // 依 time 降冪排序，最多保留前 10 筆
  stats: CumulativeStats
}
interface RunRecord {
  time: number           // 存活秒數（整數）
  kills: number
  level: number
  character: CharacterKind
  map: MapKind
  date: number           // Date.now() 毫秒時間戳
}
interface CumulativeStats {
  totalKills: number     // 跨場累加（含被擠出前 10 的場次）
  totalRuns: number
  bestTime: number
  bestKills: number
  maxLevel: number
}
```

### FR-2 saveStore 模組 API
```ts
interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}
function loadSave(storage?: StorageLike): SaveData
function recordRun(run: RunRecord, storage?: StorageLike): {
  save: SaveData
  isNewBestTime: boolean
  isNewBestKills: boolean
}
```
- `storage` 預設 `window.localStorage`；測試注入記憶體假物件。
- `loadSave`：讀取並驗證；無資料／壞 JSON／版號不符／欄位缺漏 → 回傳空白 `SaveData`（不丟例外）。
- `recordRun`：
  1. 在「併入前」以舊 `stats` 判定 `isNewBestTime = run.time > stats.bestTime`、
     `isNewBestKills = run.kills > stats.bestKills`。
  2. 將 `run` 插入 `runs`，依 `time` 降冪排序，截取前 10。
  3. 更新 `stats`：`totalKills += run.kills`、`totalRuns += 1`、
     `bestTime = max(bestTime, run.time)`、`bestKills = max(bestKills, run.kills)`、
     `maxLevel = max(maxLevel, run.level)`。
  4. 寫回 localStorage（包 try/catch，失敗靜默略過）。
  5. 回傳更新後的 `save` 與兩個破紀錄旗標。

### FR-3 資料流串接（App.vue）
- 開機與每次回到 `menu` 狀態：呼叫 `loadSave()`，將 `stats` 以 props 傳給 `MainMenu`。
- 狀態轉為 `over` 時：以 store 的最終 summary（`time`/`kills`/`level`）+ 當局 `character`/`map`
  組出 `RunRecord`，呼叫 `recordRun()`，將回傳的破紀錄旗標與 `stats` 以 props 傳給 `GameOver`。

### FR-4 UI 呈現
- `GameOver.vue`：結算下方顯示「最佳存活：M:SS」；本場破存活紀錄顯示「🏆 新紀錄！」，
  破擊殺紀錄獨立顯示對應提示。
- `MainMenu.vue`：新增統計概覽區——總擊殺、遊玩場數、最佳存活、最高等級；無存檔顯示 0／「—」。

## Acceptance Criteria

詳見 acceptance.md（唯一驗收來源）。

## Edge Cases

- 首場遊戲（空白存檔）：`bestTime=0`，故存活 > 0 秒即判為破紀錄；統計從 0 起算。
- 存活時間平手（`run.time == stats.bestTime`）：**不**算破紀錄（須嚴格大於）。
- 第 11 筆以後且不進前 10：不出現在 `runs`，但 `totalKills`/`totalRuns` 仍計入。
- localStorage 不可用或 `setItem` 丟例外：`recordRun` 靜默略過寫入，回傳的記憶體內 `save`
  仍正確（供本次結算畫面顯示），遊戲不受影響。
- 壞 JSON／版號不符／結構缺漏：`loadSave` 回空白存檔（等同重置），不 crash。

## API Contracts

僅前端模組介面，無後端 API。介面如 FR-2。

## Data Model Changes

新增 `src/persistence/types.ts`（或併入 saveStore）定義 `SaveData`/`RunRecord`/
`CumulativeStats`/`StorageLike`。**不修改引擎 `types.ts`**；`CharacterKind`/`MapKind`
由引擎 types 匯入型別（型別專用，不引入執行期依賴）。

## State Changes

- 無新增 Pinia store。`App.vue` 持有 `stats`、`lastRunResult`（破紀錄旗標）作為區域反應式狀態。
- 既有狀態機 `menu / playing / upgrading / over` 不變；僅在進入 `over` 與回 `menu` 時觸發存檔讀寫。

## UI Behaviour

- `MainMenu` 統計區與既有選單樣式一致，套免疫主題配色，尊重 `prefers-reduced-motion`。
- `GameOver` 破紀錄提示醒目但不阻擋「重新開始」操作。
- 時間一律以 `M:SS` 格式顯示（沿用 HUD 既有格式化慣例）。

## Non-Functional Requirements

- **不破壞引擎純度／確定性**：存檔不進入模擬迴圈，引擎與 game.ts 零改動。
- **韌性**：任何存檔層異常都不得影響遊玩（容錯如 Edge Cases）。
- **可測試性**：`saveStore` 純邏輯，靠注入 `StorageLike` 單元測試，不依賴 jsdom／真 localStorage。
- **既有測試全綠**：142 既有測試不受影響。
