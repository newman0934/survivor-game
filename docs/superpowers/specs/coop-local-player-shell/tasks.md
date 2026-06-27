# Tasks — coop-local-player-shell (SP3)

依 `plan.md` 執行。**鐵律：單人零退化（新 index 參數預設 0；playerCount===1 不推 multiOffer；既有測試零改動全綠）。** 詳細步驟與程式碼見 plan.md。

## Task 1：World.summary(i) / loadoutSnapshot(i)
- [ ] Step 1：寫失敗測試（summary(i)/省略=0、loadoutSnapshot(i)）— `World.test.ts`
- [ ] Step 2：確認失敗
- [ ] Step 3：`summary(playerIndex = 0)` 以該玩家取值（Boss/事件/kills/time 共享）
- [ ] Step 4：`loadoutSnapshot(playerIndex = 0)`
- [ ] Step 5：測試 + typecheck + 全測試
- [ ] Step 6：Commit

## Task 2：Game localPlayerIndex + Renderer 跟本地 + 渲染全部玩家
- [ ] Step 1：Game `localPlayerIndex` 欄位 + 建構子 + start（含初始 loadout/onUpgradePicked 用 index）
- [ ] Step 2：loop 改用 localPlayerIndex（輸入 setMoveInput、summary、loadout、render）
- [ ] Step 3：`PixiRenderer.render(world, i)` 跟本地玩家 + 渲染全部玩家；`syncSprite` 加 color/character override
- [ ] Step 4：typecheck + 全測試 + build（單人零退化）
- [ ] Step 5：Commit

## Task 3：store 多人升級狀態 + Game 推送 + MultiUpgradeOverlay
- [ ] Step 1：`stores/game.ts` 加 localPlayerIndex/multiOffer/multiOfferTimeLeft/onMultiUpgradePicked + setMultiOffer/pickMultiUpgrade + reset 清理
- [ ] Step 2：Game 設 onMultiUpgradePicked + loop 推送（僅 playerCount>1）
- [ ] Step 3：建立 `MultiUpgradeOverlay.vue`（非阻塞限時卡列 + 倒數條）
- [ ] Step 4：App.vue playing 期間掛載
- [ ] Step 5：typecheck + 全測試 + build
- [ ] Step 6：Commit

## 實機驗證（三 task 後）
- [ ] 單人行為與現況無差異、多人浮層不出現（playerCount 1）
- [ ] `npm run build` 乾淨；更新 `acceptance.md` + `progress.md`
