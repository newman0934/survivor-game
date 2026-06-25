# Tasks — HUD / 戰鬥內 UI 精修（hud-polish / D3）

逐 task 執行；詳細步驟與完整程式碼見 `plan.md`。**建議 inline 執行**（HUD 需瀏覽器實機遊玩看效果微調）。
（角色圖示 registry 走 TDD 寫測試；HUD 元件呈現層以 typecheck/build + 瀏覽器驗證。既有 187 測試維持全綠；模擬/system/World 計算/確定性零改動；唯一引擎觸碰為 Game.start 推初始快照（glue）。）

- [ ] **Task 1：角色圖示 + GameIcon character 分類** — 先寫角色完整性測試（失敗）→ 加 `CHARACTER_ICONS`(4) `Record<CharacterKind,IconDef>` + `GameIcon` 支援 `category 'character'`；測試 + typecheck（Record 完整性）全綠。commit。
- [ ] **Task 2：store.character 資料流 + 初始快照** — store 加 `character` 欄位 + `setCharacter`；App.startGame 設角色；Game.start 建 world 後推一次 `setLoadout`（起始武器開賽即顯示）；typecheck + build。commit。
- [ ] **Task 3：PlayerAvatar + LoadoutBar + 掛載 Hud** — 建頭像框（角色圖示+主題色邊+Lv）、持有列（武器/被動圖示+pip+進化金邊）；Hud 掛載 + topbar 重組（Lv 移入頭像、計時置中、擊殺右上）、刪除舊 levelPop；typecheck + build + 瀏覽器（切換角色、升級增長）微調。commit。
- [ ] **Task 4：血條/經驗條精修** — Hud 兩條 bar 加凹槽/圓角/分段刻度/頂部光澤/柔光暈/數值讀出（字體）；保留受傷紅閃；typecheck + build + 瀏覽器微調。commit。
- [ ] **Task 5：BossBar + 靜音鈕 + 驗證 + 文件** — BossBar 膜質凹槽+紫光澤+Chakra Petch 標題；MuteButton 毛玻璃膜質+hover/focus；typecheck + `npm test`(187+角色測試) + build + 瀏覽器（Boss、靜音、RWD、reduced-motion）；更新 acceptance/progress。commit。

## 驗收門檻（全綠才算完成）
- `npm run typecheck`、`npm test`(187 + 新增角色測試)、`npm run build` 全通過
- 只動指定檔（iconRegistry/.test、GameIcon、Hud、BossBar、MuteButton、PlayerAvatar(新)、LoadoutBar(新)、stores/game、App、Game.ts 一行、progress、acceptance）；模擬/system/World 計算/其餘 overlay 零改動
- 頭像/持有列/血條/經驗條/BossBar/靜音鈕質感統一、HUD 不擋戰鬥、RWD 不破版、reduced-motion 正常
- acceptance.md 所有項目勾選（含瀏覽器實機驗證）
- progress.md 反映最新狀態（D 系列完成）
