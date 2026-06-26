# Tasks — content-mastcell-maps

依 `plan.md` 逐步執行；每個 task 結束時 typecheck/test 必須乾淨。詳細步驟與程式碼見 plan.md。

## Task 1：肥大細胞角色（mastcell）
- [ ] Step 1：寫失敗測試（World 以 mastcell 套用起始狀態）— `World.test.ts`
- [ ] Step 2：跑測試確認失敗
- [ ] Step 3：`types.ts` — `CharacterKind` 加 `'mastcell'`
- [ ] Step 4：`characterDefs.ts` — `CHARACTER_DEFS.mastcell` + `CHARACTER_ORDER`
- [ ] Step 5：`iconRegistry.ts` — `CHARACTER_ICONS.mastcell`
- [ ] Step 6：`sprites.ts` — `drawPlayer` 新增 `case 'mastcell'`
- [ ] Step 7：跑測試確認通過
- [ ] Step 8：`npm run typecheck` 乾淨
- [ ] Step 9：`npm test` 全綠
- [ ] Step 10：Commit

## Task 2：兩張地圖（gut／brain）
- [ ] Step 1：寫失敗測試（World 以 gut/brain 套用難度）— `World.test.ts`
- [ ] Step 2：跑測試確認失敗
- [ ] Step 3：`types.ts` — `MapKind` 加 `'gut' | 'brain'`
- [ ] Step 4：`mapDefs.ts` — `MAP_DEFS.gut/brain` + `MAP_ORDER`
- [ ] Step 5：`noiseBackground.ts` — `MAP_TINT.gut/brain`
- [ ] Step 6：`noiseBackground.ts` — `makeNoiseTexture` gut/brain 地貌分支
- [ ] Step 7：`soundManager.ts` — `MUSIC_THEMES.gut/brain`
- [ ] Step 8：跑測試確認通過
- [ ] Step 9：`npm run typecheck` 乾淨
- [ ] Step 10：`npm test` 全綠
- [ ] Step 11：Commit

## 實機驗證（呈現層，兩 task 後）
- [ ] 主選單：新角色卡 + 兩張新地圖卡自動出現
- [ ] 肥大細胞：洋紅造型 + 發炎起手
- [ ] 腸道：暖橙地貌 + 對應背景音樂；腦：冷藍紫地貌 + 對應背景音樂
- [ ] `npm run build` 乾淨
- [ ] 更新 `acceptance.md` + `progress.md`
