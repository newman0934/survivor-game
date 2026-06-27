# Tasks — coop-upgrade-nonblocking (1B)

依 `plan.md` 執行。**鐵律：單人零退化——playerCount===1 時 processUpgrades no-op、既有升級測試不改且全綠。** 詳細步驟與程式碼見 plan.md。

## Task 1：非阻塞升級引擎子系統（多人）+ 單人零退化
- [ ] Step 1：寫失敗測試（多人非阻塞 9 筆：產生待選/逾時自動選/主動選/非待選略過/逐張/可動/死亡排除/確定性/單人 no-op）
- [ ] Step 2：跑測試確認失敗
- [ ] Step 3：`types.ts` — `PlayerState` 加 `pendingOffer?`、`upgradeTimer`
- [ ] Step 4：`World.ts` — import rollUpgrades + UpgradeDescriptor 型別、`UPGRADE_TIMEOUT=12`、`upgradeRng` 欄位
- [ ] Step 5：`makePlayerState` 加 `upgradeTimer:0`、建構子 `upgradeRng = createRng(seed ^ 0x9e3779b9)`
- [ ] Step 6：`processUpgrades(dt)`（playerCount>1 才生效）+ step 7e 接線
- [ ] Step 7：`pendingOfferFor`/`upgradeTimeRemaining`/`chooseUpgrade` API
- [ ] Step 8：跑測試確認通過
- [ ] Step 9：`npm run typecheck && npm test && npm run build`（既有零改動全綠）
- [ ] Step 10：Commit

## 實機驗證（task 後）
- [ ] 單人升級行為與現況無差異（暫停選卡、無限時間）
- [ ] `npm test` 全綠、`npm run build` 乾淨；更新 `acceptance.md` + `progress.md`
