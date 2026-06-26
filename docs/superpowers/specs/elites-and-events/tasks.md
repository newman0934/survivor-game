# Tasks — elites-and-events

依 `plan.md` 逐步執行；每個 task 結束時 typecheck/test 必須乾淨。詳細步驟與程式碼見 plan.md。

## Task 1：詞綴資料 + 精英套用
- [ ] Step 1：寫失敗測試（精英套用：giant/frenzy/省略 affix）— `World.test.ts`
- [ ] Step 2：跑測試確認失敗
- [ ] Step 3：`types.ts` — `EliteAffix`、`EliteAffixDef`、`Entity.affix?`
- [ ] Step 4：建立 `systems/eliteDefs.ts`（`ELITE_AFFIX_DEFS` + `ELITE_AFFIX_ORDER`）
- [ ] Step 5：`World.spawnEnemyAt(pos, kind?, affix?)` 套詞綴（hp×3/xp×5 + 乘區）
- [ ] Step 6：跑測試確認通過
- [ ] Step 7：`npm run typecheck && npm test`
- [ ] Step 8：Commit

## Task 2：精英行為（再生 / 爆裂 / 掉寶箱）
- [ ] Step 1：寫失敗測試（掉寶箱+xp×5、再生回血、爆裂爆炸）— `World.test.ts`
- [ ] Step 2：跑測試確認失敗
- [ ] Step 3：確認/新增 `World.chests()` getter
- [ ] Step 4：`killEnemy` 精英掉寶箱 + volatile 死亡爆炸
- [ ] Step 5：`step` 敵人迴圈加 regen 回血
- [ ] Step 6：跑測試確認通過
- [ ] Step 7：`npm run typecheck && npm test`
- [ ] Step 8：Commit

## Task 3：地圖事件系統 + 隨機精英 + 預警
- [ ] Step 1：寫失敗測試（pickEvent/pickAffix 確定性）— 建立 `systems/events.test.ts`
- [ ] Step 2：跑測試確認失敗
- [ ] Step 3：`types.ts` — `GameEventKind`、`GameEventDef`
- [ ] Step 4：建立 `systems/eventDefs.ts`
- [ ] Step 5：建立 `systems/events.ts`（`pickEvent`/`pickAffix`）
- [ ] Step 6：跑 events 測試確認通過
- [ ] Step 7：寫失敗測試（triggerEvent elite-pack/encircle、150s 預警）— `World.test.ts`
- [ ] Step 8：跑測試確認失敗
- [ ] Step 9：`World` 接線（import、欄位、常數、step 排程+隨機精英、`triggerEvent`、summary.eventWarning）
- [ ] Step 10：`stores/game.ts` — `Summary.eventWarning?` + updateSummary/reset
- [ ] Step 11：跑測試確認通過
- [ ] Step 12：`npm run typecheck && npm test`
- [ ] Step 13：Commit

## Task 4：呈現層（精英光環 + 事件預警橫幅）
- [ ] Step 1：`sprites.ts` — `drawEnemy` 對 `e.affix` 加畫光環
- [ ] Step 2：`npm run typecheck`
- [ ] Step 3：`Hud.vue` — 事件預警橫幅（`store.eventWarning`）
- [ ] Step 4：`npm run typecheck && npm run build`
- [ ] Step 5：Commit

## 實機驗證（呈現層，四 task 後）
- [ ] 精英光環可辨、hp 厚、死亡掉寶箱
- [ ] ~2:25 預警橫幅、~2:30 對應事件一波
- [ ] regen 回血、volatile 死亡爆炸
- [ ] `npm run build` 乾淨；更新 `acceptance.md` + `progress.md`
