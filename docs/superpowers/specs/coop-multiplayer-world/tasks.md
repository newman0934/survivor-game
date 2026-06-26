# Tasks — coop-multiplayer-world (1A)

依 `plan.md` 逐步執行。**鐵律：每個 task 結束時既有 `World.test.ts` 不得修改且全綠（N=1 回歸護欄）、typecheck/build 乾淨。** 詳細步驟與程式碼見 plan.md。

## Task 1：PlayerState + players[0] + 相容存取器（純內部重構、零測試改動）
- [ ] Step 1：`types.ts` 新增 `PlayerState`
- [ ] Step 2：`World.makePlayerState(character)` 工廠
- [ ] Step 3：欄位改 `players[]` + 全套相容 get/set 存取器（→ players[0]）
- [ ] Step 4：建構子建立 players[0]（step/summary/grantXp 等不動）
- [ ] Step 5：`npm run typecheck && npm test`（既有全綠、零測試改動）
- [ ] Step 6：Commit

## Task 2：多玩家建構 + playerCount/setMoveInput/hasLost/helper
- [ ] Step 1：寫失敗測試（陣列建構/hasLost）
- [ ] Step 2：跑測試確認失敗
- [ ] Step 3：建構子接受 `CharacterKind[]` + `upgradeContextFor` + `playerCount/setMoveInput/hasLost/livingPlayers/nearestLivingPlayer`
- [ ] Step 4：跑測試通過 + typecheck
- [ ] Step 5：Commit

## Task 3：逐玩家移動 + lastMoveDir
- [ ] Step 1：寫失敗測試（各玩家依自己輸入移動）
- [ ] Step 2：確認失敗
- [ ] Step 3：step 區段 1 逐玩家迴圈
- [ ] Step 4：測試 + typecheck
- [ ] Step 5：Commit

## Task 4：逐玩家武器 + 聖經 per-player
- [ ] Step 1：寫失敗測試（各玩家各自開火）
- [ ] Step 2：確認失敗
- [ ] Step 3：step 區段 4 武器迴圈 + `updateBibleFor` + `forceFire`/`orbits` 多玩家化
- [ ] Step 4：測試 + typecheck
- [ ] Step 5：Commit

## Task 5：敵人 AI 追最近玩家 + spitter/敵彈/接觸傷害/回復逐玩家
- [ ] Step 1：寫失敗測試（追最近、接觸傷害對應玩家）
- [ ] Step 2：確認失敗
- [ ] Step 3：區段 3/5b/7/7b 逐玩家化（`nearestLivingPlayer`）
- [ ] Step 4：測試 + typecheck
- [ ] Step 5：Commit

## Task 6：逐玩家經驗/寶石/寶箱/撿取 + grantXpTo
- [ ] Step 1：寫失敗測試（寶石只給碰到的玩家）
- [ ] Step 2：確認失敗
- [ ] Step 3：`grantXpTo`/`spawnGemForTest`/`applyPickupTo` + 區段 6/6b/6c 最近玩家吸引 + mercy 任一玩家
- [ ] Step 4：測試 + typecheck
- [ ] Step 5：Commit

## Task 7：難度依人數
- [ ] Step 1：寫失敗測試（生怪 ÷N、Boss/終局 Boss hp ×N）
- [ ] Step 2：確認失敗
- [ ] Step 3：生怪間隔 ÷playerCount、`spawnBossAt`/`spawnFinalBossAt` ×playerCount
- [ ] Step 4：測試 + typecheck
- [ ] Step 5：Commit

## Task 8：死亡/觀戰 + hasLost 收尾 + 確定性
- [ ] Step 1：寫失敗測試（一人死續跑/全員死 hasLost/確定性回放）
- [ ] Step 2：確認失敗
- [ ] Step 3：維護 `alive` + `livingPlayers` 用 alive + `isPlayerDead`
- [ ] Step 4：測試 + typecheck + 全測試 + build
- [ ] Step 5：Game/renderer 健全檢查（proxy 應零改動）
- [ ] Step 6：Commit

## 實機驗證（八 task 後）
- [ ] 單人 dev 行為與現況無差異
- [ ] `npm test` 全綠、`npm run build` 乾淨；更新 `acceptance.md` + `progress.md`
