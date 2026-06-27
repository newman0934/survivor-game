# Tasks — coop-lockstep-core (4A)

依 `plan.md` 執行。純新增 `engine/net/`，不動既有檔（零退化）。詳細步驟與程式碼見 plan.md。

## Task 1：net/types.ts + loopbackTransport.ts
- [ ] Step 1：寫失敗測試（到齊才回 TickInputs / 唯讀屬性 / 不同 tick 互不干擾）— `loopbackTransport.test.ts`
- [ ] Step 2：確認失敗
- [ ] Step 3：`types.ts`（PlayerInput/TickInputs/NetTransport）
- [ ] Step 4：`loopbackTransport.ts`（LoopbackBus + LoopbackTransport）
- [ ] Step 5：測試通過 + typecheck
- [ ] Step 6：Commit

## Task 2：net/lockstep.ts（LockstepRunner）
- [ ] Step 1：寫失敗測試（兩端同步/停滯/延遲/pick/確定性）— `lockstep.test.ts`
- [ ] Step 2：確認失敗
- [ ] Step 3：實作 `LockstepRunner`（inputDelay 預送窗 + submitLocalInput + tryAdvance + getCurrentTick + checksum）
- [ ] Step 4：測試通過
- [ ] Step 5：typecheck + 全測試 + build
- [ ] Step 6：Commit

## 完成後
- [ ] `npm test` 全綠、`npm run build` 乾淨；更新 `acceptance.md` + `progress.md`（記錄 4B/4C 後續）
