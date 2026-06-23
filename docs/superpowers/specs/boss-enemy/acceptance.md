# Acceptance — Boss 敵人

本檔為本功能完成與否的**唯一驗收來源**。所有項目通過才得標記為完成。
（不重複 BDD scenario；此處為可勾選的驗收清單。）

## Boss 敵種與生成
- [ ] `EnemyKind` 新增 'boss'；`ENEMY_DEFS.boss` 定義 hp/speed/damage/radius/xp/color、spawnWeight 0
- [ ] `createEnemy(pos,'boss')` 套出 boss 數值且 enemyKind='boss'
- [ ] Boss 每 60s（BOSS_INTERVAL）由獨立計時器生成一隻
- [ ] Boss 在玩家周圍 SPAWN_RADIUS 環上生成（位置走 seeded rng）
- [ ] 第二隻 Boss 的 maxHp 大於第一隻（隨 bossCount 成長 ×1.5/隻）

## 一般生怪排除 Boss
- [ ] `pickEnemyKind` 只在 spawnWeight>0 的種類間抽，永不回傳 'boss'
- [ ] 既有四種敵人（basic/swarm/tank/charger）生成不受影響

## 行為與渲染
- [ ] Boss 直線追玩家（走既有 steerEnemy 預設分支）
- [ ] Boss 以巨大深紫色圓呈現（color 0x9c27b0、radius 34，走既有 enemyKind 取色路徑）

## 擊殺獎勵
- [ ] Boss 被擊殺：失效、擊殺數 +1、原地掉一顆 xp=50 的寶石（複用既有掉寶邏輯）

## Boss 血條
- [ ] `Summary` 新增 bossActive/bossHp/bossMaxHp
- [ ] Boss 存在時 summary：bossActive=true、bossHp=round(hp)、bossMaxHp=maxHp
- [ ] 無 Boss 時 summary：bossActive=false、bossHp=0、bossMaxHp=0
- [ ] store start() 重置、updateSummary() 複製 boss 三欄
- [ ] BossBar.vue 在 bossActive 時於頂部顯示血條（寬度=bossHp/bossMaxHp），否則隱藏

## 確定性與架構邊界
- [ ] Boss 生成位置走 seeded rng，無 Math.random()
- [ ] 相同 seed + 相同步數 → 相同 Boss 生成位置序列
- [ ] enemyDefs.ts / spawn.ts / World.ts / types.ts 無 Vue/Pinia 執行期 import
- [ ] BossBar.vue 為純呈現、只讀 store
- [ ] 固定步長 1/60 不變
- [ ] Game.stop() / PixiRenderer.destroy() 維持冪等

## 回歸（既有行為不被破壞）
- [ ] 多武器、多敵人、升級握手、HUD、死亡結算不受影響
- [ ] 武器命中 Boss 正常結算傷害

## 驗證快照（完成時填寫）
- [ ] 單元測試（Vitest）全數通過（含新增 spawn/World/factory 測試）
- [ ] 型別檢查（vue-tsc）乾淨
- [ ] Production build 乾淨
- [ ] 瀏覽器煙霧測試：Boss 於 60s 出現、巨型紫色、血條顯示並隨扣血縮短、擊殺掉大經驗，無功能相關 console error
- [ ] progress.md 已更新
