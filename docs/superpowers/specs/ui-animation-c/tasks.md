# Tasks — HUD/UI 動畫（C 批）

逐 task 執行；詳細步驟與程式碼見 `plan.md`。每個 task 一個邏輯變更、各自 commit。
（UI 呈現層：不寫單元測試、以實機驗證；引擎/store 不動，既有 122 測試須維持全綠。每個動畫面含 `prefers-reduced-motion` 關閉規則。）

- [ ] **Task 1：HUD 動畫** — `Hud.vue` 血條/經驗條平滑填充 + 升級 Lv 彈跳 + 受傷紅閃（watch level/hp 上升下降沿）。實機驗證。commit。
- [ ] **Task 2：升級彈窗進場** — `UpgradeModal.vue` 標題 + 三卡錯落 slide-up/scale/fade（依 index 延遲）+ 按壓 :active 反饋。實機驗證。commit。
- [ ] **Task 3：Boss 血條** — `BossBar.vue` Vue `<Transition>` 進場/退場 + 血量 <25% 脈動發光。實機驗證。commit。
- [ ] **Task 4：死亡結算進場** — `GameOver.vue` 內容 panel 縮放浮現。實機驗證。commit。
- [ ] **Task 5：phase 轉場** — `App.vue` 三個 overlay 包 Vue `<Transition name="fade">` + 非 scoped fade 類別。實機驗證。commit。
- [ ] **Task 6：驗證與進度** — `npm test`（122）+ typecheck + build + 實機完整驗證（含 reduced-motion）；更新 acceptance.md 與 progress.md。commit。

## 驗收門檻（全綠才算完成）
- `npm test`（122）、`npm run typecheck`、`npm run build` 全通過
- 未修改 `src/engine/**` 與 `src/stores/game.ts`
- acceptance.md 所有項目勾選（五動畫面實機目視 + reduced-motion 生效 + 不變項）
- progress.md 反映最新狀態
