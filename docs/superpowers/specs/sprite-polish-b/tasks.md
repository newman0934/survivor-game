# Tasks — 掉落物/環繞物造型精緻化（B 批）

逐 task 執行；詳細步驟與程式碼見 `plan.md`。每個 task 一個邏輯變更、各自 commit。
（呈現層：只動 `sprites.ts` 四繪製函式、簽章不變，不寫單元測試、以實機驗證；既有 122 測試須維持全綠。）

- [ ] **Task 1：寶箱 → 補給囊泡** — 重寫 `drawChest`（金膜囊泡 + 發光核 + 高光）。typecheck/build + 實機驗證。commit。
- [ ] **Task 2：抗原碎片 + 補體複合體** — 重寫 `drawGem`（結晶切面 + 暈 + 亮核）與 `drawOrbit`（光暈 + 主球 + 亞基瓣 + 亮核）。實機驗證。commit。
- [ ] **Task 3：發炎場湍流優化** — 重寫 `drawGarlicAura`（多層徑向暈染 + 抖動邊界 + ROS 熱點），只用 `t`、無 `Math.random()`。grep 確認 + 實機驗證。commit。
- [ ] **Task 4：驗證與進度** — `npm test`（122）+ typecheck + build + 實機完整驗證；更新 acceptance.md 與 progress.md。commit。

## 驗收門檻（全綠才算完成）
- `npm test`（122）、`npm run typecheck`、`npm run build` 全通過
- `drawGarlicAura` 內無 `Math.random()` 呼叫
- acceptance.md 所有項目勾選（四造型實機目視 + 不變項）
- progress.md 反映最新狀態
