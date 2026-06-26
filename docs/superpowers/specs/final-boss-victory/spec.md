# Spec — 終局 Boss + 勝利條件（final-boss-victory）

**日期：** 2026-06-26
**功能名稱：** final-boss-victory
**所屬階段：** 階段 3 — 單局深度（Spec B；A 為 elites-and-events，已完成）
**狀態：** 待批准（Approval Gate）

---

## 1. Overview（總覽）

把單局從「無限存活」改為**有限關卡**，給 run 一個高潮與結束：撐到 **15:00** 生成一隻**終局 Boss（新敵種 finalboss）**，擊敗即**通關（勝利結局）**。死亡仍為失敗結局。

- 終局 Boss 出現後：一般怪續生、**停止 60 秒 Boss 與地圖事件**、升級照常。
- 新增 `'won'` 結局 phase 與勝利畫面（沿用 GameOver 變體）。
- 存檔記錄「是否通關」（`RunRecord.cleared`）與累積通關次數（`CumulativeStats.clears`），排行榜顯示通關標記。

引擎部分（終局 Boss 生成、勝利判定、生怪閘門）為純邏輯、走既有 seeded 流程、寫單元測試；造型/勝利畫面/排行榜標記為呈現層、實機目視。

---

## 2. Business Requirements（商業需求）

- 提供明確目標與成就感（通關），提升單局張力與重玩動機；讓排行榜「通關」比純存活更有意義。
- 沿用既有 Boss/血條/結算/存檔機制，工量可控、風險低。
- 不破壞架構紅線：引擎純 TS、無 Vue/Pinia 執行期依賴；確定性；固定步長。

---

## 3. Functional Requirements（功能需求）

### FR-1 終局 Boss 敵種
- `EnemyKind` 新增 `'finalboss'`；`ENEMY_ORDER` 末端加入；`ENEMY_DEFS.finalboss` 新增一筆，`spawnWeight: 0`（永不隨機生）、`unlockTime` 任意（不參與隨機池）。
- 數值（定稿）：`hp: 4000`、`speed: 26`、`damage: 26`、`radius: 60`、`xp: 200`、`color: 0xff1744`（與 superbug 0x9c27b0 區隔）。
- 造型：`sprites.ts` 的 `drawEnemy` 新增 `case 'finalboss'`，大體型 + 特殊光環，讀既有 helper。

### FR-2 終局 Boss 生成與生怪閘門
- 新增 `World` 常數 `FINAL_BOSS_TIME = 900`（15×60 秒）。
- `World.step`：當 `elapsed >= FINAL_BOSS_TIME` 且尚未生成（`finalBossSpawned` 為 false）時，於環上生成一隻 finalboss，`finalBossSpawned = true`。
- finalboss 生成後（`finalBossSpawned` 為 true）：**不再**推進 60 秒 Boss 計時與地圖事件排程（兩段以 `if (!this.finalBossSpawned)` 閘住）；一般生怪與升級照常。
- finalboss 的 hp 不套地圖 `enemyHpMult`（固定數值，避免地圖難度影響通關門檻）。

### FR-3 勝利判定
- `World` 新增 `won` 狀態與 `hasWon(): boolean`（比照 `isPlayerDead()`）。
- `killEnemy`：被擊殺者 `enemyKind === 'finalboss'` 時設 `this.won = true`（finalboss 死亡同樣掉寶箱/經驗依既有規則）。
- `Game` 迴圈在死亡檢查處新增勝利檢查：`if (this.world.hasWon()) { 推送最終 summary；播勝利音效（沿用既有正向 SFX 'chest'）；store.victory()；stop()；return }`。

### FR-4 結局狀態機與勝利畫面
- store `Phase` 新增 `'won'`；新增 action `victory()`（設 `phase = 'won'`）。
- `App.vue`：把既有「進入 over 記錄戰績」邏輯擴充為「進入 `over` **或** `won`（上升沿）」時記錄一場，`cleared = (phase === 'won')`；勝利時顯示勝利畫面。
- 勝利畫面沿用 `GameOver.vue`，新增選填 prop `won?: boolean`（預設 false）：為 true 時標題顯示「通關！」、文案正向；版面與既有結算一致（含再玩一次/回主選單）。App 對 `phase==='won'` 渲染 `GameOver` 並傳 `won = true`。

### FR-5 Boss 血條涵蓋終局 Boss
- `summary()` 的 Boss 偵測由「superbug」擴充為「superbug **或** finalboss」。
- `Summary` 新增 `isFinalBoss: boolean`（boss 為 finalboss 時 true），HUD Boss 血條據此可標示「終局 Boss」。

### FR-6 存檔與排行榜
- `RunRecord` 新增 `cleared: boolean`。
- `loadSave`：讀取既有 runs 時，缺 `cleared` 欄位一律正規化為 `false`（向後相容，維持 `version: 1`）；缺 `clears` 一律正規化為 `0`。
- `CumulativeStats` 新增 `clears: number`（通關次數）。
- `recordRun`：`save.runs.push(run)`（含 cleared）；stats 計算加 `clears: save.stats.clears + (run.cleared ? 1 : 0)`。
- `App.vue` 記錄時帶入 `cleared`。
- `Leaderboard.vue`：通關紀錄顯示一個標記（★）。

---

## 4. Acceptance Criteria（驗收標準）

詳見 `acceptance.md`。摘要：15:00 生成 finalboss、之後不再生 60s Boss/事件、一般怪續生；擊敗 finalboss → `hasWon()` true → phase 'won' → 勝利畫面 + 記錄 cleared；死亡仍 phase 'over' cleared=false；存檔 cleared/clears 正確且舊存檔相容；排行榜通關標記；確定性與引擎邊界不變；單元測試 + 既有測試全綠、型別/build 乾淨。

---

## 5. Edge Cases（邊界情況）

- **同幀死亡與勝利**：先檢查 `hasWon()`（勝利優先）；若玩家在擊殺 finalboss 同幀也歸零，視為通關。
- **finalboss 已生成後重複到點**：`finalBossSpawned` 旗標確保只生一隻。
- **舊存檔無 cleared/clears**：`loadSave` 正規化為 false/0，不丟例外、不破壞既有排行榜。
- **暫停期間到 15:00**：計時靠 step，暫停不 step 即不生成（不誤觸）。
- **再玩一次**：`new World` 重建，`finalBossSpawned`/`won` 為初值，關卡重新計時。
- **finalboss 不套地圖 enemyHpMult**：在 stomach（×1.25）等地圖通關門檻一致。

---

## 6. API Contracts（介面契約）

```ts
// types.ts
export type EnemyKind = '…既有…' | 'finalboss'
export interface Summary { /* …既有… */ isFinalBoss: boolean }

// World.ts
hasWon(): boolean
// step：elapsed>=FINAL_BOSS_TIME 生成 finalboss、之後閘住 boss/event
// killEnemy：finalboss 死亡設 won
// summary：boss 偵測含 finalboss、回傳 isFinalBoss

// stores/game.ts
export type Phase = 'menu' | 'playing' | 'upgrading' | 'over' | 'paused' | 'won'
victory(): void // phase = 'won'
// Summary.isFinalBoss 接線 updateSummary

// persistence/saveStore.ts
export interface RunRecord { /* …既有… */ cleared: boolean }
export interface CumulativeStats { /* …既有… */ clears: number }
// loadSave 正規化缺欄；recordRun 累計 clears

// ui/GameOver.vue
defineProps<{ …既有…; won?: boolean }>() // 預設 false
```

---

## 7. Data Model Changes（資料模型變更）

- `EnemyKind` 加 `'finalboss'`；`ENEMY_DEFS`/`ENEMY_ORDER` 新增條目。
- `Entity` 不新增欄位（沿用 enemyKind 區分）。
- `Summary` 加 `isFinalBoss`；`Phase` 加 `'won'`。
- `RunRecord` 加 `cleared`；`CumulativeStats` 加 `clears`。
- `World` 新增 `FINAL_BOSS_TIME` 常數、`finalBossSpawned`/`won` 欄位、`hasWon()`。

---

## 8. State Changes（狀態變更）

- World 在 15:00 生成終局 Boss 並關閉 Boss/事件排程；finalboss 死亡置 won。
- Game 偵測 won → store.victory → phase 'won' → App 記錄 cleared 並顯示勝利畫面。
- 死亡路徑（phase 'over'、cleared=false）不變。

---

## 9. UI Behaviour（UI 行為）

- 15:00 出現大體型終局 Boss（特殊光環），Boss 血條顯示其血量（可標示終局 Boss）。
- 擊敗後顯示「通關！」勝利畫面（沿用結算版面，含本場數據與再玩一次/回主選單）。
- 排行榜對通關紀錄顯示 ★ 標記。
- 死亡結算、HUD、升級彈窗其餘不變。

---

## 10. Non-Functional Requirements（非功能需求）

- **確定性**：終局 Boss 於固定時間生成、生怪閘門為時間判斷；模擬中不呼叫 `Math.random()`。
- **架構邊界**：World/enemyDefs/saveStore 純 TS；renderer/UI 為呈現層。
- **TDD**：終局 Boss 生成/閘門/勝利判定、saveStore cleared/clears/相容寫單元測試；造型/勝利畫面/排行榜標記不寫單元測試。
- **資源清理**：`Game.stop()`/`PixiRenderer.destroy()` 維持冪等。

---

## 11. 非目標（本 spec 明確不做）

- 多階段 Boss、終局 Boss 專屬彈幕/技能機制（沿用既有接觸傷害 + Boss 行為）。
- 通關後續關（New Game+）、難度選擇、關卡長度可調 UI（長度為程式常數）。
- 通關專屬解鎖（後設系統另案）。
