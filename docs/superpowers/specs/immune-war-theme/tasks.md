# Tasks — 免疫大戰主題化（Immune War Re-theme）

逐 task 執行；詳細步驟與程式碼見 `plan.md`。每個 task 一個邏輯變更、各自 commit。
（代號改名以 typecheck + 既有 122 測試 + 殘留掃描保護；造型/背景/特效屬呈現層，不寫單元測試、實機驗證。）

**關鍵陷阱：** `'boss'` 同時是 `EnemyKind`（改 `superbug`）與 `SoundEvent`（保留 `'boss'`）。
SoundEvent 的 4 處不可動：`types.ts` SoundEvent 型別、`soundManager.ts` case、`World.ts` push、`World.test.ts` toContain。

- [ ] **Task 1：EnemyKind 改名** — basic→virus、swarm→bacteria、tank→spore、charger→spiral、boss→superbug；
  型別 + enemyDefs + factory/spawn/enemyAI/World/PixiRenderer/sprites case + 測試；typecheck+測試+殘留掃描。commit。
- [ ] **Task 2：WeaponKind 改名** — wand→antibody、knife→perforin、bible→complement、garlic→inflammation；
  型別 + weaponDefs（含 label）+ characterDefs.startWeapon + World 比較 + 測試。函式名保留。commit。
- [ ] **Task 3：CharacterKind 改名** — warrior→macrophage、ranger→neutrophil、mage→nkcell、harvester→dendritic；
  型別 + characterDefs（含 name/desc）+ World/App.vue/MainMenu 預設 + 測試。commit。
- [ ] **Task 4：MapKind 改名** — plains→vessel、lava→stomach、tundra→lung；
  型別 + mapDefs（含 name/desc）+ World 預設 + sprites PATCH_COLORS/case + App.vue/MainMenu + 測試。commit。
- [ ] **Task 5：被動道具標籤主題化** — 10 個 label 改免疫風（代號與 apply 不動）；typecheck + 全測試。commit。
- [ ] **Task 6：病原造型重繪** — drawEnemy 五 case 改病毒棘突/桿菌鞭毛/孢子/螺旋體/超級病原。實機驗證。commit。
- [ ] **Task 7：玩家細胞 + 武器 + 抗原寶石造型** — drawPlayer/drawProjectile/drawOrbit/drawGarlicAura/drawGem。實機驗證。commit。
- [ ] **Task 8：人體場景背景** — PATCH_COLORS + drawTerrain + drawAmbient 三分支（血管/胃/肺泡）。實機驗證。commit。
- [ ] **Task 9：特效配色** — effects.ts 收集抗原黃 + 升級免疫藍綠。實機驗證。commit。
- [ ] **Task 10：完整驗證與進度** — npm test + typecheck + build + 全域殘留掃描 + 實機完整驗證（三地圖+重開）；
  更新 acceptance.md 與 progress.md。commit。

## 驗收門檻（全綠才算完成）
- `npm test`（122）、`npm run typecheck`、`npm run build` 全通過
- 全域殘留掃描：舊代號 0 筆（`'boss'` 僅限 SoundEvent 4 處）
- acceptance.md 所有項目勾選（含四類改名、被動標籤、五造型 + 三背景 + 特效配色實機目視 + 玩法/平衡無變化 + 重開）
- progress.md 反映最新狀態
