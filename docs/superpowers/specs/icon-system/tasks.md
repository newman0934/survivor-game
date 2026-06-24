# Tasks — 主題圖示系統（icon-system / D2）

逐 task 執行；詳細步驟與完整程式碼（含 17 圖示 path 起始稿）見 `plan.md`。**建議 inline 執行**（圖示需瀏覽器放大微調 path）。
（registry/解析器走 TDD 寫單元測試；GameIcon.vue/UpgradeModal 套用屬呈現層，以 typecheck/build + 瀏覽器驗證。既有 181 測試維持全綠；引擎/模擬/store/其餘 overlay 零改動；角色圖示延到 D3。）

- [ ] **Task 1：型別 + 解析器（TDD）** — `iconRegistry.ts` 放 `IconDef` + `resolveOptionIcon`；`iconRegistry.test.ts` 先寫解析器失敗測試（5 前綴 + heal/未知/空/缺 kind→null）再實作。commit。
- [ ] **Task 2：17 圖示資料 + 完整性測試** — 補完整性/無 placeholder 測試（先失敗）→ 加 `WEAPON_ICONS`(7) + `PASSIVE_ICONS`(10) `Record<Kind,IconDef>` 描邊輪廓 + 主題色；測試 + typecheck（Record 編譯期完整性）全綠。commit。
- [ ] **Task 3：GameIcon.vue** — 薄呈現元件（props category/kind/size，查表渲染內聯 SVG、currentColor、查無安全不渲染）；typecheck + build。commit。
- [ ] **Task 4：套用升級彈窗 + 驗證 + 文件** — UpgradeModal loadout 武器/被動列加圖示、選項卡用 `resolveOptionIcon`（heal 純文字）；卡片直向排版；typecheck + `npm test`(181+新測試) + build + 瀏覽器（桌機+行動寬度、放大微調圖示清晰度）；更新 acceptance/progress。commit。

## 驗收門檻（全綠才算完成）
- `npm run typecheck`、`npm test`(181 + 新增 registry 測試)、`npm run build` 全通過
- 只動 iconRegistry.ts/.test.ts(新)、GameIcon.vue(新)、UpgradeModal.vue、progress.md、acceptance.md；引擎/store/其餘 overlay 零改動
- 17 圖示齊全可辨識、loadout 與選項卡正確顯示、heal 無圖示不破版、行動寬度不破版
- acceptance.md 所有項目勾選（含瀏覽器實機驗證）
- progress.md 反映最新狀態
