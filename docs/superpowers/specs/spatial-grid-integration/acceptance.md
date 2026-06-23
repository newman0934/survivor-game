# Acceptance — 空間網格接入 World

本檔為本功能完成與否的**唯一驗收來源**。所有項目通過才得標記為完成。
（不重複 BDD scenario；此處為可勾選的驗收清單。）

## 網格接入
- [ ] World 持有 enemyGrid（SpatialGrid<Entity>，CELL_SIZE=100）
- [ ] MAX_ENEMY_RADIUS 由 ENEMY_DEFS 推得（非寫死）
- [ ] rebuildEnemyGrid 每格在敵人移動（步驟 3）後執行：clear + insert active 敵人

## 四處查詢改走網格（語意不變）
- [ ] 子彈命中：以 queryRadius(p.pos, p.radius+MAX) 取候選，overlap/扣血/擊殺/break 邏輯不變
- [ ] 接觸傷害：以 queryRadius(player.pos, player.radius+MAX) 取候選做 circlesOverlap
- [ ] 大蒜：World 傳 queryRadius(player.pos, garlicRadius+MAX) 候選給 garlicTick（簽章不變）
- [ ] 聖經：每 orbit 以 queryRadius(orb.pos, orb.radius+MAX) 取候選結算命中
- [ ] targeting（findNearest/findNearestN）維持全掃描、未改

## 行為保持（回歸）
- [ ] 子彈只命中重疊敵人、遠方敵人 hp 不變
- [ ] 接觸傷害只對重疊敵人生效
- [ ] 大蒜只傷害半徑內敵人
- [ ] 擊殺仍掉寶、記擊殺
- [ ] 聖經 orbit 命中與冷卻、Boss、多敵種、升級握手不受影響
- [ ] 既有所有單元測試維持通過

## 確定性與架構邊界
- [ ] 相同 seed + 相同步數 → 相同擊殺數與玩家 hp（網格不改變確定性）
- [ ] 中途死亡敵人由 active 檢查略過、不重複結算
- [ ] 空場查詢回空、不丟例外
- [ ] 負座標查詢正常
- [ ] SpatialGrid / World 無 Vue/Pinia 執行期 import
- [ ] 固定步長 1/60 不變；store/HUD/Summary 不變

## 驗證快照（完成時填寫）
- [ ] 單元測試（Vitest）全數通過（既有 + 新增遠近混合功能測試）
- [ ] 型別檢查（vue-tsc）乾淨
- [ ] Production build 乾淨
- [ ] 瀏覽器煙霧測試：遊玩流程與重構前一致（武器命中/大蒜/聖經/接觸傷害/Boss/升級皆正常），無功能相關 console error
- [ ] progress.md 已更新（階段 2 收尾）
