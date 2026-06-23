# Acceptance — 玩家/敵人造型精緻化

本檔為本功能完成與否的**唯一驗收來源**。所有項目通過才得標記為完成。
（呈現層功能，多數以實機截圖目視驗證。）

_驗證日期：2026-06-23 — 既有 119 測試全過、vue-tsc 乾淨、build 乾淨、實機截圖驗證通過。_

## 立體感手法
- [x] 新增 lighten(color,f) 與 shaded(g,cx,cy,r,color) 私有 helper
- [x] 每個造型先畫落地陰影（壓扁半透明深色橢圓、墊最底）
- [x] 身體用 shaded（暗底 + 主色 + 左上高光）+ 深色描邊

## 玩家造型
- [x] 圓身 + 駕駛艙 + 機尾雙鰭 + 前方槍口三角；隨 lastMoveDir 旋轉
- [x] 顏色為傳入角色色

## 敵人造型（依 enemyKind）
- [x] basic：圓身 + 兩白眼（含瞳）+ 嘴/獠牙
- [x] swarm：小圓身 + 6 腿 + 兩小眼
- [x] tank：大圓身 + 厚裝甲環 + 4 鉚釘 + 深核心 + 厚描邊
- [x] charger：水滴/菱形身 + 雙角 + 單眼；隨 vel 朝向
- [x] boss：大圓身 + 鋸齒尖冠 + 兩發光眼 + 內核；維持脈動
- [x] 各敵種沿用 ENEMY_DEFS 顏色，暗底/高光由 dim/lighten 推導

## 不變項
- [x] drawPlayer(g,e,color)/drawEnemy(g,e) 簽章不變
- [x] 命中閃白、旋轉/脈動/朝向動畫、回收、相機照舊
- [x] e.radius 與碰撞不變；寶石/投射物/聖經/寶箱維持現狀

## 確定性與架構邊界
- [x] 純視覺、不進 sim；相同 seed 結果不變
- [x] 只動 sprites.ts（呈現層）；引擎/store/型別不變
- [x] 造型為建立時畫一次的靜態 Graphics，每幀只動 transform

## 驗證快照（完成時填寫）
- [x] 既有單元測試（Vitest）全數維持通過（119）
- [x] 型別檢查（vue-tsc）乾淨
- [x] Production build 乾淨
- [x] 實機截圖驗證：玩家 + 五敵種立體感/新輪廓/陰影/高光皆如設計，動畫與閃白正常，0 功能相關 console error
- [x] progress.md 已更新
