# Acceptance — 終局 Boss + 勝利條件

本檔為本功能完成與否的**唯一驗收來源**。所有項目通過才得標記為完成。

_驗證日期：（待填）_

## 終局 Boss 敵種
- [ ] `EnemyKind` 含 `'finalboss'`；`ENEMY_DEFS.finalboss` 完整、`spawnWeight: 0`；`ENEMY_ORDER` 含 finalboss
- [ ] 數值正確：hp 4000、speed 26、damage 26、radius 60、xp 200、color 0xff1744
- [ ] `drawEnemy` 有 finalboss 造型（大體型 + 光環）

## 生成與生怪閘門
- [ ] `FINAL_BOSS_TIME = 900`；elapsed≥900 且未生成時生一隻 finalboss
- [ ] `finalBossSpawned` 旗標確保只生一隻（重複到點不再生）
- [ ] finalboss 生成後不再推進 60s Boss 計時與地圖事件排程
- [ ] finalboss 生成後一般生怪與升級照常
- [ ] finalboss hp 不套地圖 enemyHpMult（固定 4000）

## 勝利判定
- [ ] `World.hasWon()` 存在；finalboss 死亡時設 won=true
- [ ] `Game` 迴圈偵測 hasWon → 推送 summary、播勝利音效、store.victory()、stop()
- [ ] 同幀死亡與勝利以勝利優先（hasWon 先檢查）

## 結局狀態機與勝利畫面
- [ ] store `Phase` 含 `'won'`；`victory()` 設 phase='won'
- [ ] `App` 在 phase 變 `over` 或 `won`（上升沿）記錄一場，cleared=(phase==='won')
- [ ] `GameOver.vue` won prop（預設 false）；won=true 顯示「通關！」正向文案
- [ ] App 對 phase==='won' 渲染 GameOver 並傳 won=true

## Boss 血條
- [ ] `summary()` Boss 偵測含 superbug 或 finalboss
- [ ] `Summary.isFinalBoss`：boss 為 finalboss 時 true；HUD 可據此標示

## 存檔與排行榜
- [ ] `RunRecord.cleared` 加入；`CumulativeStats.clears` 加入
- [ ] `loadSave` 對缺 cleared 正規化 false、缺 clears 正規化 0、不丟例外
- [ ] `recordRun` 累計 clears；App 記錄帶入 cleared
- [ ] `Leaderboard.vue` 對通關紀錄顯示 ★ 標記

## 確定性與架構邊界
- [ ] 終局 Boss 固定時間生成、生怪閘門為時間判斷；模擬中不呼叫 Math.random()
- [ ] World/enemyDefs/saveStore 無 Vue/Pinia 執行期 import
- [ ] 固定步長 1/60 不變；死亡路徑（over/cleared=false）不變
- [ ] 暫停期間（不 step）不誤生終局 Boss
- [ ] new World 重置 finalBossSpawned/won；Game.stop()/PixiRenderer.destroy() 冪等

## 呈現層（實機目視）
- [ ] 15:00 出現大體型終局 Boss + 光環、Boss 血條顯示
- [ ] 擊敗顯示「通關！」勝利畫面
- [ ] 排行榜通關列顯示 ★

## 驗證快照
- [ ] 單元測試（Vitest）全數通過（終局 Boss 生成/閘門/勝利、saveStore cleared/clears/相容）
- [ ] 型別檢查（vue-tsc）乾淨
- [ ] Production build 乾淨
- [ ] 實機煙霧測試：通關流程（可暫時調小 FINAL_BOSS_TIME 驗證後還原）
- [ ] progress.md 已更新
