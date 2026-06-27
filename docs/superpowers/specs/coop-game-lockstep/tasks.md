# Tasks — coop-game-lockstep (4B-2)

依 `plan.md` 執行。單人零退化（runner=null 即單人，單人分支逐行等價；既有測試零改動全綠）。詳細步驟與程式碼見 plan.md。

## Task 1：NetSession.toTransport + auto-neutral + 整合測試
- [ ] Step 1：寫失敗測試（toTransport 自動補中性 / runner+auto-neutral 單機推進 / 全員死 hasLost）— `loopbackSession.test.ts`
- [ ] Step 2：確認失敗
- [ ] Step 3：`session.ts` 介面加 `toTransport(localIndex)`
- [ ] Step 4：`loopbackSession.ts` 實作 toTransport（非本地自動中性）
- [ ] Step 5：測試 + typecheck + 全測試
- [ ] Step 6：Commit

## Task 2：Game 多人模式 + App onStart 接線
- [ ] Step 1：Game imports + `runner`/`pendingPick` 欄位
- [ ] Step 2：`Game.startMultiplayer`（多人 World + LockstepRunner + onMultiUpgradePicked）
- [ ] Step 3：loop 分多人/單人兩支（單人逐行等價、共用尾段）+ M-1 + hasWon/hasLost
- [ ] Step 4：typecheck + 全測試 + build（單人零退化）
- [ ] Step 5：`App.vue` onStart → Game.startMultiplayer
- [ ] Step 6：typecheck + build
- [ ] Step 7：Commit

## 實機驗證（兩 task 後）
- [ ] 單人與現況無差異；多人可開局（你操作、隊友待命、不崩潰）
- [ ] `npm run build` 乾淨；更新 `acceptance.md` + `progress.md`
