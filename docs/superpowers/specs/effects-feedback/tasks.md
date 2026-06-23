# Tasks — 打擊反饋特效（A 批）

逐 task 執行；詳細步驟與程式碼見 `plan.md`。每個 task 一個邏輯變更、各自 commit。
（呈現層：不寫單元測試，以實機驗證；既有 122 測試須維持全綠。）

- [ ] **Task 1：EffectsLayer + 擊殺** — 建立 `effects.ts`（完整模組：粒子/環波/閃光/光環/飄字/紅暈/震動）；
  PixiRenderer 建立 EffectsLayer、接擊殺偵測 + 鏡頭震動偏移 + resize + destroy。實機驗證擊殺。commit。
- [ ] **Task 2：收集 + 升級** — World 加唯讀 `currentLevel`；PixiRenderer 接寶石消失（收集閃光）與
  level 上升沿（升級光環）。實機驗證。commit。
- [ ] **Task 3：傷害數字** — PixiRenderer `applyHitFlash` 接敵人 hp 下降 → spawnDamage（含上限節流）。
  實機驗證。commit。
- [ ] **Task 4：受傷紅暈 + 震動** — `applyHitFlash` 接玩家 hp 下降 → hurt（依扣血量、boss 更強）。
  實機驗證。commit。
- [ ] **Task 5：驗證與進度** — `npm test` + typecheck + build + 實機完整驗證 + 重新開始；
  更新 acceptance.md 與 progress.md。commit。

## 驗收門檻（全綠才算完成）
- `npm test`（122）、`npm run typecheck`、`npm run build` 全通過
- acceptance.md 所有項目勾選（含五種特效實機目視 + 節流 + 重新開始無殘留）
- progress.md 反映最新狀態
