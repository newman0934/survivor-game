# Tasks — coop-determinism-audit (SP2)

依 `plan.md` 執行。不改遊戲行為；既有測試全綠。詳細步驟與程式碼見 plan.md。

## Task 1：core/checksum.ts（確定性雜湊工具）
- [ ] Step 1：寫失敗測試（確定性/順序敏感/32-bit/健全性）— `core/checksum.test.ts`
- [ ] Step 2：確認失敗
- [ ] Step 3：實作 `Checksum`（FNV-1a over float64 位元組）
- [ ] Step 4：確認通過
- [ ] Step 5：`npm run typecheck`
- [ ] Step 6：Commit

## Task 2：World.checksum()
- [ ] Step 1：寫失敗測試（同 seed 同值/step 後變/32-bit）— `World.test.ts`
- [ ] Step 2：確認失敗
- [ ] Step 3：World imports 補 `Checksum`/`WEAPON_ORDER`/`PASSIVE_ORDER`/`ELITE_AFFIX_ORDER`
- [ ] Step 4：實作 `checksum()`（標量+各玩家+各敵人+各類計數）
- [ ] Step 5：測試 + typecheck + 全測試
- [ ] Step 6：Commit

## Task 3：回放雜湊測試 + 原始碼守護測試
- [ ] Step 1：`determinism.test.ts`（回放兩-run/seed 敏感/單人 + 守護掃描去註解）
- [ ] Step 2：確認通過（守護現況全綠＝模擬路徑乾淨）
- [ ] Step 3：typecheck + 全測試 + build
- [ ] Step 4：Commit

## 完成後
- [ ] `npm test` 全綠、`npm run build` 乾淨；更新 `acceptance.md` + `progress.md`（記錄跨瀏覽器超越函式不定點化的已知限制）
