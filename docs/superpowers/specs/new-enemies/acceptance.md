# Acceptance — 新增三種敵人（噴吐病原 / 分裂菌 / 膿疱自爆體）

本檔為本功能完成與否的**唯一驗收來源**。所有項目通過才得標記為完成。
（AI/生怪/死亡鉤走 TDD 單元測試；造型以實機目視驗證；既有測試維持全綠。）

_驗證日期：2026-06-24（程式/型別/build/單元測試通過；實機目視待玩家確認）_

## 敵人定義（types / enemyDefs）
- [x] `EnemyKind` 新增 `spitter` / `splitter` / `exploder`
- [x] `EnemyDef` 新增選用 `spit?` / `splitInto?` / `explode?`
- [x] `ENEMY_DEFS` 三筆數值如 spec、`ENEMY_ORDER` 追加三種
- [x] 既有五種敵人數值不變

## 敵方投射物子系統
- [x] `Entity.projShape` 加 `'toxin'`；`createEnemyProjectile` 包裝
- [x] `World.enemyProjectiles` 與玩家 `projectiles` 分離、互不干擾
- [x] 敵彈每格飛行 + 壽命回收；與玩家重疊扣 `max(0, dmg-armor)` 後消失
- [x] renderer 繪製/回收敵彈；`drawProjectile` toxin 分支（毒綠球）

## 噴吐病原 AI
- [x] `steerSpitter`：太遠靠近、太近後退、區間停步
- [x] `spitterTick`：固定 interval 開火、確定性、無 `Math.random()`
- [x] World 對 spitter 開火生敵彈朝玩家當前位置 + 推 shoot 音效

## 死亡鉤（World.killEnemy，資料驅動）
- [x] `splitInto`：死亡生 `count` 隻 `kind` 子體（錯位、子體不再分裂）
- [x] `explode`：玩家在 radius 內扣 `max(0, dmg-armor)` + 推 nova fx + hit 音效；半徑外不受傷
- [x] 既有 superbug 掉寶箱不變

## 造型（sprites.ts）
- [x] spitter（囊體+噴口+毒斑）/ splitter（8 字分裂雙葉）/ exploder（鼓脹膿包+外瘤）
- [x] drawProjectile toxin 毒綠球
- [x] 既有造型/命中閃白/動畫/相機跟隨不變

## 不變項（硬性）
- [x] 既有五敵種數值/行為/平衡不變；武器/玩家彈/升級/store/地圖不變
- [x] 模擬無 `Math.random()`（grep 確認僅註解）；相同 seed 結果一致
- [x] Game.stop / PixiRenderer.destroy 冪等；enemyProjectiles 不跨局殘留

## 驗證快照（完成時填寫）
- [x] 單元測試全綠（既有 131 + 新測試 6 = 137）
- [x] 型別檢查（vue-tsc）乾淨
- [x] Production build 乾淨
- [ ] 實機驗證：三敵種解鎖登場、機制如設計、敵彈/分裂/爆炸正確、造型可辨、FPS 正常、0 功能相關 console error（**待玩家 `npm run dev` 目視確認**）
- [x] progress.md 已更新
