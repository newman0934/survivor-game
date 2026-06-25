# Tasks — 打擊頓挫 + 震屏（hit-stop-shake）

逐 task 執行；詳細步驟與完整程式碼見 `plan.md`。**建議 inline 執行**（需瀏覽器打 Boss 看震屏/頓挫微調）。
（HitStop 純邏輯走 TDD 寫測試；EffectsLayer/PixiRenderer/Game 接線屬呈現/整合層，以 typecheck/build + 瀏覽器驗證。
既有 193 測試維持全綠；World/system/factory/模擬/RNG/確定性零改動；Boss=superbug 用 enemyKind 分級。）

- [ ] **Task 1：HitStop 純邏輯計時器（TDD）** — 先寫 `hitStop.test.ts`（trigger/advance 到期/冷卻節流/冷卻後可再觸發）→ 實作 `core/hitStop.ts`（trigger+冷卻、advance、stopped）；測試全綠。commit。
- [ ] **Task 2：EffectsLayer 整合** — import HitStop；加 `hitStopTimer` + reduced-motion 旗標；抽 `shake()`、`hurt()` 改呼叫它（行為不變）、加 `hitStop()`/`isHitStopped()`；`update()` advance 計時。typecheck + test + build。commit。
- [ ] **Task 3：PixiRenderer 分級觸發 + Game 凍結 + 驗證 + 文件** — applyHitFlash（superbug 受擊大震+短頓挫）、擊殺回收（superbug/exploder/其餘分級震屏+頓挫）、nova 中震；PixiRenderer `isHitStopped` 委派；Game 迴圈 `!isHitStopped()` gating；typecheck + `npm test`(193+新) + build + 瀏覽器（Boss 震/頓挫不連抖、大型死亡頓挫、小怪只微震不卡頓、受傷不變、reduced-motion 關閉）；更新 acceptance/progress。commit。

## 驗收門檻（全綠才算完成）
- `npm run typecheck`、`npm test`(193 + 新增 HitStop 測試)、`npm run build` 全通過
- 只動 hitStop.ts(新+測試)、effects.ts、PixiRenderer.ts、Game.ts、progress.md、acceptance.md；World/模擬/確定性/store 零改動
- 震屏分級正確、頓挫只在大時刻且冷卻不連抖、一般擊殺不卡頓、受傷不變、reduced-motion 關閉
- acceptance.md 所有項目勾選（含瀏覽器實機驗證）
- progress.md 反映最新狀態
