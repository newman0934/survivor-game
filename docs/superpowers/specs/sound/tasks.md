# Tasks — 音效

逐 task 執行；詳細步驟與程式碼見 `plan.md`。每個 task 一個邏輯變更、各自 commit。

- [ ] **Task 1：語意事件** — `types.ts` SoundEvent；`World` soundEventQueue/consumeSoundEvents + 8 個
  emit 點（shoot/hit/kill/pickup/levelup/hurt/boss/chest）+ 測試。commit。
- [ ] **Task 2：SoundManager** — 建 `core/soundManager.ts`（Web Audio 合成/節流/靜音/音樂單例）。commit。
- [ ] **Task 3：Game 串接 + 靜音 UI** — Game 排空事件/gameover/resume/music、`MuteButton.vue`、
  `App.vue` 顯示。commit。
- [ ] **Task 4：驗證與進度** — test + typecheck + build + 實機驗證（AudioContext running、靜音切換、
  無 console error）；更新 acceptance.md 與 progress.md。commit。

## 驗收門檻（全綠才算完成）
- `npm test`、`npm run typecheck`、`npm run build` 全通過
- acceptance.md 所有項目勾選
- progress.md 反映最新狀態
