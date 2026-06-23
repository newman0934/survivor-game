# Tasks — 被動道具 / 更多升級分支

逐 task 執行；詳細步驟與程式碼見 `plan.md`。每個 task 為一個邏輯變更、各自 commit。

- [ ] **Task 1：型別** — `types.ts`：PassiveKind/Passive/PassiveDef；PlayerStats +regen/armor/xpGain；
  UpgradeContext +passives/player。（typecheck 暫紅，與 Task 2 一起 commit）
- [ ] **Task 2：被動定義表** — 建 `systems/passiveDefs.ts`（PASSIVE_DEFS/PASSIVE_ORDER/PASSIVE_CAP）
  + 測試。commit（含 Task 1）。
- [ ] **Task 3：升級候選整合** — `leveling.ts` 加解鎖/升級被動、移除舊乘區卡、applyUpgradeById 加
  passunlock:/passlvl: 分支 + 測試。commit。
- [ ] **Task 4：World 整合** — stats +3 欄、passives[]、upgradeContext +passives/player、
  step 三鉤點（regen/armor/xpGain）+ 測試。commit。
- [ ] **Task 5：驗證與進度** — test + typecheck + build + 瀏覽器煙霧測試；更新 acceptance.md 與
  progress.md。commit。

## 驗收門檻（全綠才算完成）
- `npm test`、`npm run typecheck`、`npm run build` 全通過
- acceptance.md 所有項目勾選
- progress.md 反映最新狀態
