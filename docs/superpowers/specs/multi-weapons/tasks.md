# Tasks — 多種武器 + 武器專屬升級

逐 task 執行；詳細步驟與程式碼見 `plan.md`。每個 task 為一個邏輯變更、各自 commit。

- [ ] **Task 1：型別基礎** — `types.ts`：EntityKind +orbit；新增 Weapon / WeaponLevelStats /
  WeaponDef / UpgradeContext；PlayerStats 改乘區；UpgradeOption.apply 改吃 ctx。
- [ ] **Task 2：武器等級表** — 建 `systems/weaponDefs.ts`（WEAPON_DEFS + WEAPON_ORDER）。commit。
- [ ] **Task 3：findNearestN** — `systems/combat.ts` + 測試（多目標鎖定）。commit。
- [ ] **Task 4：武器行為函式** — 建 `systems/weapons.ts` + 測試
  （fireWand / fireKnife / orbitPositions / garlicTick）。commit。
- [ ] **Task 5：環繞物工廠** — `entities/factory.ts` 新增 `createOrbit`。
- [ ] **Task 6：升級系統改寫** — `systems/leveling.ts` + 測試：buildCandidates、
  applyUpgradeById、乘區被動、heal 保底、rollUpgrades(ctx)。commit（含 Task 5）。
- [ ] **Task 7：World 整合** — `World.ts` + 測試：weapons[]、lastMoveDir、bibleAngle、orbits、
  step() 武器迴圈、updateBible、checkKills、upgradeContext、applyUpgrade 改寫、garlicRadius。commit。
- [ ] **Task 8：Game 接線** — `Game.ts`：rollUpgrades 傳入 `world.upgradeContext()`。commit。
- [ ] **Task 9：渲染** — `PixiRenderer.ts`：orbit 顏色、收集 orbits、大蒜場域半透明圓。commit。
- [ ] **Task 10：驗證與進度** — test + typecheck + build + lint + 瀏覽器煙霧測試；
  更新 acceptance.md 勾選與 progress.md。commit。

## 驗收門檻（全綠才算完成）
- `npm test`、`npm run typecheck`、`npm run build`、`npm run lint` 全通過
- acceptance.md 所有項目勾選
- progress.md 反映最新狀態
