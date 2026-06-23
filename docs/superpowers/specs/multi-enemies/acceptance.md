# Acceptance — 多種敵人

本檔為本功能完成與否的**唯一驗收來源**。所有項目通過才得標記為完成。
（不重複 BDD scenario；此處為可勾選的驗收清單。）

## 敵種與數值
- [ ] 共 4 種敵人：basic / swarm / tank / charger
- [ ] `createEnemy(pos, kind)` 依 `ENEMY_DEFS[kind]` 套出正確 hp/speed/damage/radius/xp
- [ ] 建立的敵人帶正確 `enemyKind`
- [ ] 未指定 kind 時預設建立 basic

## 時間解鎖 + 加權生成
- [ ] `pickEnemyKind` 只在 `elapsed >= unlockTime` 的種類間抽選
- [ ] t=0 只會抽到 basic / swarm
- [ ] 超過 45s 候選含 tank；超過 90s 候選含 charger
- [ ] 抽選依 spawnWeight 加權
- [ ] 抽到 swarm 時 World 一次生成 4 隻（位置略偏移）
- [ ] 其餘種類單隻生成

## 敵人 AI
- [ ] basic / swarm / tank 直線追玩家（steerTowards）
- [ ] charger 走路相朝玩家慢速轉向（速度約 walkSpeed）
- [ ] charger 跨入衝刺相那格鎖定當下朝玩家方向、速度 = dir×dashSpeed
- [ ] charger 衝刺相中不再轉向（維持衝刺速度向量），結束後自動回走路相

## 渲染
- [ ] 不同敵種以不同顏色呈現（PixiRenderer 依 enemyKind 取色）
- [ ] 不同敵種半徑不同（factory 設定）

## 確定性與架構邊界
- [ ] 選種與生成位置全走 seeded rng，無 Math.random()
- [ ] 相同 seed + 相同步數 → 相同敵種與位置序列
- [ ] enemyDefs.ts / enemyAI.ts / spawn.ts / types.ts 無 Vue/Pinia 執行期 import
- [ ] 固定步長 1/60 不變
- [ ] Game.stop() / PixiRenderer.destroy() 維持冪等

## 回歸（既有行為不被破壞）
- [ ] 任一敵種被擊殺仍掉經驗寶石、記擊殺
- [ ] 接觸玩家扣血、武器命中結算照常運作
- [ ] 升級握手、HUD、死亡結算不受影響

## 驗證快照（完成時填寫）
- [ ] 單元測試（Vitest）全數通過（含新增 spawn/enemyAI/factory/World 測試）
- [ ] 型別檢查（vue-tsc）乾淨
- [ ] Production build 乾淨
- [ ] 瀏覽器煙霧測試：四種敵人隨時間出現、顏色/體型各異、charger 會衝刺，無功能相關 console error
- [ ] progress.md 已更新
