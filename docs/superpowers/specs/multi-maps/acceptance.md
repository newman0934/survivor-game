# Acceptance — 多地圖

本檔為本功能完成與否的**唯一驗收來源**。所有項目通過才得標記為完成。

## 地圖定義
- [ ] 新增 MapKind（3 種）、MapDef；MAP_DEFS + MAP_ORDER
- [ ] 每地圖含 kind/name/description/bgColor/gridColor/gridAlpha/spawnIntervalMult/enemyHpMult 完整欄位

## World 套用難度
- [ ] 建構子 constructor(seed, character='warrior', map='plains')
- [ ] 生怪計時重置乘 spawnIntervalMult（lava 0.8 / plains 1 / tundra 1.15）
- [ ] spawnEnemyAt / spawnSwarmAt 生出的敵人 hp/maxHp 乘 enemyHpMult
- [ ] spawnBossAt 在 boss 成長縮放後再乘 enemyHpMult（hp 同步 maxHp）
- [ ] mapBgColor / mapGridColor / mapGridAlpha 等於 def 值
- [ ] 省略 map 預設 plains（既有 new World(seed) / (seed, char) 不壞）

## 渲染（視覺）
- [ ] drawBackgroundGrid 加 color/alpha 參數；renderer 傳 world.mapGridColor/mapGridAlpha
- [ ] renderer 設 app.renderer.background.color = world.mapBgColor

## 選圖流程（實機目視）
- [ ] MainMenu 角色排下方有地圖排（3 張卡），預設平原、可切換、選中以 gridColor 描邊
- [ ] start 事件帶 { character, map }；App.startGame / Game.start 往下傳
- [ ] 遊戲底色與網格顏色為所選地圖
- [ ] 「再玩一次」沿用上次角色 + 地圖

## 確定性與架構邊界
- [ ] 地圖只改倍率與視覺，之後全走 seeded rng；相同 seed+角色+地圖+操作 → 相同結果
- [ ] mapDefs.ts / World 無 Vue/Pinia 執行期 import
- [ ] 固定步長 1/60 不變；store/Summary 不變
- [ ] Game.stop() / PixiRenderer.destroy() 維持冪等

## 驗證快照（完成時填寫）
- [ ] 單元測試（Vitest）全數通過（含新增 World 地圖套用測試 + 既有 103）
- [ ] 型別檢查（vue-tsc）乾淨
- [ ] Production build 乾淨
- [ ] 實機煙霧測試：3 張地圖可選、底色/網格色各異、難度感受不同（熔岩較硬較密），無功能相關 console error
- [ ] progress.md 已更新
