# Acceptance — 終局 Boss + 勝利條件

本檔為本功能完成與否的**唯一驗收來源**。所有項目通過才得標記為完成。

_驗證日期：2026-06-27 — 單元測試 226 全過、vue-tsc 乾淨、production build 乾淨、SDD 雙階段審查（4 task + 全分支廣審）皆 Approved（廣審 M-2/M-3 已修並複審；I-1 以文件對齊浮點容差條件）。實機目視待玩家確認。_

## 終局 Boss 敵種
- [x] `EnemyKind` 含 `'finalboss'`；`ENEMY_DEFS.finalboss` 完整、`spawnWeight: 0`；`ENEMY_ORDER` 含 finalboss
- [x] 數值正確：hp 4000、speed 26、damage 26、radius 60、xp 200、color 0xff1744
- [ ] `drawEnemy` 有 finalboss 造型（大體型 + 光環）— 程式完成，待實機目視

## 生成與生怪閘門
- [x] `FINAL_BOSS_TIME = 900`；於到達 900 秒當格生成一隻 finalboss（浮點容差條件 `elapsed > FINAL_BOSS_TIME - dt`）
- [x] `finalBossSpawned` 旗標確保只生一隻（重複到點不再生）
- [x] finalboss 生成後不再推進 60s Boss 計時與地圖事件排程
- [x] finalboss 生成後一般生怪與升級照常
- [x] finalboss hp 不套地圖 enemyHpMult（固定 4000）

## 勝利判定
- [x] `World.hasWon()` 存在；finalboss 死亡時設 won=true
- [x] `Game` 迴圈偵測 hasWon → 推送 summary、播勝利音效、store.victory()、stop()
- [x] 同幀死亡與勝利以勝利優先（hasWon 先檢查）

## 結局狀態機與勝利畫面
- [x] store `Phase` 含 `'won'`；`victory()` 設 phase='won'（含 store 單元測試）
- [x] `App` 在 phase 變 `over` 或 `won`（上升沿）記錄一場，cleared=(phase==='won')
- [x] `GameOver.vue` won prop（預設 false）；won=true 顯示「通關！」正向文案
- [x] App 對 phase==='won' 渲染 GameOver 並傳 won=true

## Boss 血條
- [x] `summary()` Boss 偵測含 superbug 或 finalboss
- [x] `Summary.isFinalBoss`：boss 為 finalboss 時 true（HUD 消費為後續技術債）

## 存檔與排行榜
- [x] `RunRecord.cleared` 加入；`CumulativeStats.clears` 加入
- [x] `loadSave` 對缺 cleared 正規化 false、缺 clears 正規化 0、不丟例外
- [x] `recordRun` 累計 clears；App 記錄帶入 cleared
- [ ] `Leaderboard.vue` 對通關紀錄顯示 ★ 標記 — 程式完成，待實機目視

## 確定性與架構邊界
- [x] 終局 Boss 固定時間生成、生怪閘門為時間判斷；模擬中不呼叫 Math.random()
- [x] World/enemyDefs/saveStore 無 Vue/Pinia 執行期 import（World 僅 import type Summary）
- [x] 固定步長 1/60 不變；死亡路徑（over/cleared=false）不變
- [x] 暫停期間（不 step）不誤生終局 Boss
- [x] new World 重置 finalBossSpawned/won；finalboss 生成幀清 pendingEvent/eventWarning

## 呈現層（實機目視 — 待玩家確認）
- [ ] 15:00 出現大體型終局 Boss + 光環、Boss 血條顯示
- [ ] 擊敗顯示「通關！」勝利畫面
- [ ] 排行榜通關列顯示 ★

## 驗證快照
- [x] 單元測試（Vitest）全數通過（終局 Boss 生成/閘門/勝利、summary、saveStore cleared/clears/相容）— 226 passed
- [x] 型別檢查（vue-tsc）乾淨
- [x] Production build 乾淨
- [ ] 實機煙霧測試：通關流程（可暫時調小 FINAL_BOSS_TIME 驗證後還原）
- [x] progress.md 已更新
