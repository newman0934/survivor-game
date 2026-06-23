# Acceptance — 寶箱 / 隨機獎勵

本檔為本功能完成與否的**唯一驗收來源**。所有項目通過才得標記為完成。

_驗證日期：2026-06-23 — 單元測試 115 全過、vue-tsc 乾淨、build 乾淨、實機驗證通過。_

## 寶箱 entity 與掉落
- [x] EntityKind 新增 'chest'；createChest(pos)（kind 'chest'、radius 14）
- [x] World 有 chestEntities 與 chests() getter
- [x] killEnemy(e)：active=false + kills++ + 掉經驗寶石 + boss 再掉寶箱
- [x] 投射物命中段與 checkKills 兩處改用 killEnemy（非 boss 行為不變）
- [x] Boss 死亡掉 1 寶箱（含被大蒜/聖經 checkKills 擊殺）
- [x] 一般敵人死亡不掉寶箱

## 撿取 → 免費升級
- [x] step 寶箱迴圈：attractGem 吸取 + 碰到玩家收取
- [x] 撿到寶箱：chest.active=false 且 pendingLevelUps +1（consumeLevelUp 回 true）
- [x] 既有 Game 握手不變，寶箱自然彈出 3 選 1
- [x] step 清理段過濾 chestEntities

## 渲染
- [x] sprites.drawChest：金棕箱身 + 蓋線 + 鎖扣
- [x] PixiRenderer render 清單含 world.chests()，走既有重用/回收

## 確定性與架構邊界
- [x] 寶箱不引入隨機；升級候選走既有 seeded upgradeRng；相同 seed+操作 → 相同結果
- [x] factory/World 無 Vue/Pinia 執行期 import；drawChest 在 sprites 呈現層
- [x] 固定步長 1/60 不變；store/Summary 不變
- [x] Game.stop() / PixiRenderer.destroy() 維持冪等

## 回歸（既有行為不被破壞）
- [x] 投射物擊殺/掉寶/記擊殺、大蒜/聖經擊殺（checkKills）與重構前一致
- [x] 多武器/多敵人/Boss/被動/升級握手/多角色/多地圖/手機支援不受影響

## 驗證快照（完成時填寫）
- [x] 單元測試（Vitest）全數通過（含 killEnemy/寶箱拾取/createChest + 既有 111）
- [x] 型別檢查（vue-tsc）乾淨
- [x] Production build 乾淨
- [x] 實機煙霧測試：擊殺 Boss 掉寶箱、撿取彈出升級三選一、寶箱造型正確，無功能相關 console error
- [x] progress.md 已更新（階段 3 收尾）
