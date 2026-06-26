# Tasks — final-boss-victory

依 `plan.md` 逐步執行；每個 task 結束時 typecheck/test 必須乾淨。詳細步驟與程式碼見 plan.md。

## Task 1：終局 Boss 引擎（生成 + 閘門 + 勝利判定）
- [ ] Step 1：寫失敗測試（15:00 生成只一隻、停 60s Boss、hasWon、不套地圖倍率）— `World.test.ts`
- [ ] Step 2：跑測試確認失敗
- [ ] Step 3：`types.ts` — `EnemyKind` 加 `'finalboss'`
- [ ] Step 4：`enemyDefs.ts` — `ENEMY_DEFS.finalboss` + `ENEMY_ORDER`
- [ ] Step 5：`World.ts` — `FINAL_BOSS_TIME`、`finalBossSpawned`/`won`、`spawnFinalBossAt`、step 生成+閘門、killEnemy 置 won、`hasWon()`
- [ ] Step 6：跑測試確認通過
- [ ] Step 7：`npm run typecheck && npm test`
- [ ] Step 8：Commit

## Task 2：勝利狀態機接線（store / summary / Game）
- [ ] Step 1：寫失敗測試（summary 偵測終局 Boss + isFinalBoss）— `World.test.ts`
- [ ] Step 2：跑測試確認失敗
- [ ] Step 3：`World.summary` boss 偵測含 finalboss + isFinalBoss
- [ ] Step 4：`stores/game.ts` — `Phase 'won'`、`Summary.isFinalBoss`、state/updateSummary/reset、`victory()`
- [ ] Step 5：`Game.ts` — 迴圈偵測 hasWon → victory（勝利優先於死亡）
- [ ] Step 6：跑測試確認通過
- [ ] Step 7：`npm run typecheck && npm test`
- [ ] Step 8：Commit

## Task 3：存檔 cleared/clears + App 記錄通關
- [ ] Step 1：寫失敗測試（cleared 往返、clears 累計、舊存檔正規化）— `saveStore.test.ts`
- [ ] Step 2：跑測試確認失敗
- [ ] Step 3：`saveStore.ts` — `RunRecord.cleared`、`CumulativeStats.clears`、`emptySave` clears:0
- [ ] Step 4：`loadSave` 正規化缺欄（runs.cleared→false、stats.clears→0）
- [ ] Step 5：`recordRun` 累計 clears
- [ ] Step 6：`App.vue` — watch over|won 記錄 + cleared
- [ ] Step 7：跑測試確認通過 + `npm run typecheck && npm test`
- [ ] Step 8：Commit

## Task 4：呈現層（勝利畫面 + 排行榜標記 + 終局 Boss 造型）
- [ ] Step 1：`GameOver.vue` — `won?` prop + 標題變體
- [ ] Step 2：`App.vue` — render GameOver(over|won) + 傳 won
- [ ] Step 3：`Leaderboard.vue` — 通關 ★ 標記
- [ ] Step 4：`sprites.ts` — `drawEnemy` finalboss 造型
- [ ] Step 5：`npm run typecheck && npm run build`
- [ ] Step 6：Commit

## 實機驗證（呈現層，四 task 後）
- [ ] 暫時調小 `FINAL_BOSS_TIME` 跑 dev：終局 Boss 出現 + 血條、擊敗→「通關！」、排行榜 ★、死亡→「你倒下了」
- [ ] 還原 `FINAL_BOSS_TIME = 900`；`npm run build` 乾淨；更新 `acceptance.md` + `progress.md`
