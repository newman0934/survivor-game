# Acceptance — 多種敵人

本檔為本功能完成與否的**唯一驗收來源**。所有項目通過才得標記為完成。
（不重複 BDD scenario；此處為可勾選的驗收清單。）

_驗證日期：2026-06-23 — 單元測試 78 全過、vue-tsc 乾淨、build 乾淨、瀏覽器實測通過。_

## 敵種與數值
- [x] 共 4 種敵人：basic / swarm / tank / charger
- [x] `createEnemy(pos, kind)` 依 `ENEMY_DEFS[kind]` 套出正確 hp/speed/damage/radius/xp
- [x] 建立的敵人帶正確 `enemyKind`
- [x] 未指定 kind 時預設建立 basic

## 時間解鎖 + 加權生成
- [x] `pickEnemyKind` 只在 `elapsed >= unlockTime` 的種類間抽選
- [x] t=0 只會抽到 basic / swarm
- [x] 超過 45s 候選含 tank；超過 90s 候選含 charger
- [x] 抽選依 spawnWeight 加權
- [x] 抽到 swarm 時 World 一次生成 4 隻（位置略偏移）
- [x] 其餘種類單隻生成

## 敵人 AI
- [x] basic / swarm / tank 直線追玩家（steerTowards）
- [x] charger 走路相朝玩家慢速轉向（速度約 walkSpeed）
- [x] charger 跨入衝刺相那格鎖定當下朝玩家方向、速度 = dir×dashSpeed
- [x] charger 衝刺相中不再轉向（維持衝刺速度向量），結束後自動回走路相

## 渲染
- [x] 不同敵種以不同顏色呈現（PixiRenderer 依 enemyKind 取色）
- [x] 不同敵種半徑不同（factory 設定）

## 確定性與架構邊界
- [x] 選種與生成位置全走 seeded rng，無 Math.random()
- [x] 相同 seed + 相同步數 → 相同敵種與位置序列
- [x] enemyDefs.ts / enemyAI.ts / spawn.ts / types.ts 無 Vue/Pinia 執行期 import
- [x] 固定步長 1/60 不變
- [x] Game.stop() / PixiRenderer.destroy() 維持冪等

## 回歸（既有行為不被破壞）
- [x] 任一敵種被擊殺仍掉經驗寶石、記擊殺
- [x] 接觸玩家扣血、武器命中結算照常運作
- [x] 升級握手、HUD、死亡結算不受影響

## 驗證快照
- [x] 單元測試（Vitest）全數通過（含新增 spawn/enemyAI/factory/World 測試）— 78 passed
- [x] 型別檢查（vue-tsc）乾淨
- [x] Production build 乾淨
- [x] 瀏覽器煙霧測試：basic（亮紅）/ swarm（橘、較小、成群 4 隻）/ tank（大型暗紅）親眼確認；
      charger 的時間解鎖（90s）、衝刺狀態機與洋紅取色由單元測試 + 相同渲染路徑驗證
      （以暫降 unlockTime 的 HMR 手測亦確認 tank 大型暗紅外觀，事後已還原）。無功能相關 console error。
- [x] progress.md 已更新

## 備註
- tank（unlockTime 45s）/ charger（90s）在正常遊玩需存活到該時間才出現；瀏覽器自動化難以穩定
  存活至 90s，故 charger 外觀以「暫時調降 unlockTime + HMR」手測與單元測試交叉驗證，驗證後
  enemyDefs.ts 已還原為正式數值。
