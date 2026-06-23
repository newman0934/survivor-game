# Acceptance — 程式化美術

本檔為本功能完成與否的**唯一驗收來源**。所有項目通過才得標記為完成。
（呈現層功能，多數項目以實機截圖目視驗證。）

_驗證日期：2026-06-23 — 既有 99 測試全過、vue-tsc 乾淨、build 乾淨、實機截圖驗證通過。_

## 架構與分層
- [x] 新增 src/engine/sprites.ts，含 drawPlayer/drawEnemy/drawGem/drawProjectile/drawOrbit/drawBackgroundGrid/drawGarlicAura
- [x] PixiRenderer 改為呼叫 sprites.ts，保留相機/回收/destroy 冪等
- [x] world 容器底層加 gridGraphics；garlicAura 在 entity 之下、grid 之上
- [x] PixiRenderer 有 clock（每幀累加 ~1/60）

## 靜態 vs 每幀
- [x] 造型幾何在 sprite 建立時畫一次（依 kind/enemyKind）
- [x] 每幀只更新 position + 動畫 transform（rotation/scale；flash 用 alpha）
- [x] 背景網格每幀依玩家可視範圍 clear+重畫少量線（無限捲動）

## 各元素造型（實機目視）
- [x] 背景：方格地板、隨鏡頭捲動
- [x] 玩家：柔光圈+圓身+描邊+朝 lastMoveDir 的槍口指示
- [x] basic：圓+眼；swarm：小圓+尖刺（實機確認）；tank：大圓+裝甲環+核心；charger：菱形/箭頭；boss：大圓+鋸齒冠+脈動（後三者走相同繪製路徑、由 typecheck + 程式驗證）
- [x] 寶石：旋轉菱形+亮心+微脈動
- [x] 投射物：亮核+柔光暈，依 vel 拉長/旋轉
- [x] 聖經環繞物：旋轉書本造型（drawOrbit 路徑）
- [x] 大蒜光環：環形、半徑/alpha 呼吸脈動（drawGarlicAura 路徑）

## 特效
- [x] 命中閃白：敵人被扣血當下白色覆蓋層 alpha=0.8、約 6 幀衰減回透明
- [x] 玩家未移動時槍口朝右（lastMoveDir 預設）

## 行為/資源/確定性
- [x] 既有遊戲流程（移動/攻擊/擊殺/撿寶/升級/Boss/死亡結算）與升級前一致
- [x] 重啟正確清理 sprite/grid/lastHp（destroy 冪等、無洩漏）
- [x] 動畫/閃白純視覺，不影響模擬確定性
- [x] sprites.ts / PixiRenderer 不含引擎邏輯或 store 依賴；引擎與 entity 未變更

## 驗證快照
- [x] 既有單元測試（Vitest）全數維持通過（99）
- [x] 型別檢查（vue-tsc）乾淨
- [x] Production build 乾淨
- [x] 實機截圖驗證：背景捲動網格、玩家朝向、basic/swarm 造型、綠菱形寶石、黃光彈皆如設計；
      死亡結算 UI 正常；0 功能相關 console error（唯一為既有 favicon 404）。
      tank/charger/boss/書本/光環/閃白走相同繪製+動畫路徑（typecheck 通過、程式驗證）。
- [x] progress.md 已更新
