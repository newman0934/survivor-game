# Acceptance — 程式化美術

本檔為本功能完成與否的**唯一驗收來源**。所有項目通過才得標記為完成。
（呈現層功能，多數項目以實機截圖目視驗證。）

## 架構與分層
- [ ] 新增 src/engine/sprites.ts，含 drawPlayer/drawEnemy/drawGem/drawProjectile/drawOrbit/drawBackgroundGrid/drawGarlicAura
- [ ] PixiRenderer 改為呼叫 sprites.ts，保留相機/回收/destroy 冪等
- [ ] world 容器底層加 gridGraphics；garlicAura 在 entity 之下、grid 之上
- [ ] PixiRenderer 有 clock（每幀累加 ~1/60）

## 靜態 vs 每幀
- [ ] 造型幾何在 sprite 建立時畫一次（依 kind/enemyKind）
- [ ] 每幀只更新 position + 動畫 transform（rotation/scale/alpha/tint）
- [ ] 背景網格每幀依玩家可視範圍 clear+重畫少量線（無限捲動）

## 各元素造型（實機目視）
- [ ] 背景：方格地板、隨鏡頭捲動
- [ ] 玩家：柔光圈+圓身+描邊+朝 lastMoveDir 的槍口指示
- [ ] basic：圓+眼；swarm：小圓+尖刺；tank：大圓+裝甲環+核心；charger：菱形/箭頭；boss：大圓+鋸齒冠+脈動
- [ ] 寶石：旋轉菱形+亮心+微脈動
- [ ] 投射物：亮核+柔光暈，依 vel 拉長/旋轉
- [ ] 聖經環繞物：旋轉書本造型
- [ ] 大蒜光環：環形、半徑/alpha 呼吸脈動

## 特效
- [ ] 命中閃白：敵人被扣血當下 tint 轉白、約 6 幀衰減回原色
- [ ] 玩家未移動時槍口朝右（lastMoveDir 預設）

## 行為/資源/確定性
- [ ] 既有遊戲流程（移動/攻擊/擊殺/撿寶/升級/Boss/死亡結算）與升級前一致
- [ ] 重啟正確清理 sprite/grid/lastHp（destroy 冪等、無洩漏）
- [ ] 動畫/ tint 純視覺，不影響模擬確定性
- [ ] sprites.ts / PixiRenderer 不含引擎邏輯或 store 依賴；引擎與 entity 未變更

## 驗證快照（完成時填寫）
- [ ] 既有單元測試（Vitest）全數維持通過（99）
- [ ] 型別檢查（vue-tsc）乾淨
- [ ] Production build 乾淨
- [ ] 實機截圖驗證：背景/玩家朝向/五敵種/物件/命中閃白/動畫皆如設計，0 功能相關 console error
- [ ] progress.md 已更新
