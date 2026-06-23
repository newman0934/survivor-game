# Spec — 玩家/敵人造型精緻化

**日期：** 2026-06-23
**功能名稱：** sprite-polish
**所屬階段：** 美術精修（程式化美術延伸）
**狀態：** 待批准（Approval Gate）

---

## 1. Overview（總覽）

把玩家與五種敵人的程式化造型升級為「立體感 + 更豐富輪廓」：每個單位以分層疊畫
（落地陰影 → 暗部底 → 主色身 → 高光 → 描邊）做出立體感，並把「圓 + 眼睛/尖刺」重設計為
多部件生物剪影。全部在 `sprites.ts` 的 `drawPlayer`/`drawEnemy`，無引擎改動、無外部素材。

呈現層改動，不寫單元測試；既有 119 測試天然全綠；以實機截圖驗證。

---

## 2. Business Requirements（商業需求）

- 提升視覺完成度與角色辨識度，是原型走向成品的視覺一步。
- 零素材依賴、純程式繪製，完全可在本環境產出。
- 不破壞架構紅線：引擎純 TS、確定性、固定步長；造型只影響視覺、不動碰撞。

---

## 3. Functional Requirements（功能需求）

### FR-1 立體感分層手法
- 新增私有 helper：`lighten(color, f)`（調亮，對既有 `dim` 的補充）、
  `shaded(g, cx, cy, r, color)`（畫暗部底 + 主色身 + 左上高光）。
- 每個造型先畫**落地陰影**（壓扁半透明深色橢圓，墊最底），身體用 `shaded()` + 深色描邊。

### FR-2 玩家造型（drawPlayer，朝向）
- 圓身（shaded）+ 駕駛艙（小暗圓 + 亮點）+ 機尾雙鰭（後方小三角）+ 前方槍口三角 + 描邊。
- 顏色為傳入的角色色；隨 `lastMoveDir` 旋轉（既有 transform）。

### FR-3 敵人造型（drawEnemy，依 enemyKind）
- **basic**：圓身 + 兩白眼（含瞳）+ 嘴/小獠牙弧。
- **swarm**：小圓身 + 6 條短腿（輻射線）+ 兩小眼。
- **tank**：大圓身 + 厚裝甲環 + 環上 4 鉚釘 + 深核心 + 厚描邊。
- **charger**：水滴/菱形身 + 前方雙角 + 單眼；隨 `vel` 朝向（既有 transform）。
- **boss**：大圓身 + 鋸齒尖冠 + 兩發光眼 + 內核 + 厚描邊；維持既有脈動。
- 顏色一律沿用 `ENEMY_DEFS[enemyKind].color`；暗底/高光由 `dim`/`lighten` 推導。

### FR-4 不變項
- `drawPlayer(g, e, color)` / `drawEnemy(g, e)` 簽章不變。
- 命中閃白、旋轉/脈動/朝向動畫、回收、相機照舊。
- `e.radius` 與碰撞不變（造型只在視覺上更豐富）。
- 寶石/投射物/聖經/寶箱維持現狀（本次不重繪）。

---

## 4. Acceptance Criteria（驗收標準）

詳見 `acceptance.md`。摘要：玩家與五敵種各具立體感（陰影/高光/描邊）與新輪廓、辨識度提升、
動畫與命中閃白照常；既有測試全綠、型別/build 乾淨、實機截圖確認、0 功能相關 console error。

---

## 5. Edge Cases（邊界情況）

- **命中閃白**：白圓覆蓋層（半徑不變）仍蓋在新造型上、照常可見。
- **動畫**：旋轉/脈動/朝向 transform 套在新造型上正常。
- **碰撞不變**：`e.radius` 與碰撞邏輯完全不動。
- **顏色推導**：`dim`/`lighten` 對任意 color 安全（通道夾 0–255）。
- **陰影座標**：在 sprite 本地座標、隨 entity 移動，無需鏡頭特判。

---

## 6. API Contracts（介面契約）

```ts
// engine/sprites.ts（簽章不變，內部重繪 + 新增 helper）
export function drawPlayer(g: Graphics, e: Entity, color: number): void
export function drawEnemy(g: Graphics, e: Entity): void
// 內部 helper（非匯出）：lighten(color, f) / shaded(g, cx, cy, r, color)
```

- 引擎 / 型別 / store / PixiRenderer 介面不變。

---

## 7. Data Model Changes（資料模型變更）

- 無。僅 `sprites.ts` 內部繪製邏輯與新增私有 helper。

---

## 8. State Changes（狀態變更）

- 無狀態變更；造型於 sprite 建立時畫一次（同既有）。

---

## 9. UI Behaviour（UI 行為）

- 玩家與敵人在畫面上更立體、輪廓更豐富、辨識度更高；其餘 UI 不變。

---

## 10. Non-Functional Requirements（非功能需求）

- **確定性**：純視覺、不進 sim。
- **架構邊界**：只動 `sprites.ts`（呈現層）；引擎/store/型別不變。
- **效能**：造型仍為「建立時畫一次」的靜態 Graphics，每幀只動 transform，維持原效能。
- **測試**：呈現層不寫單元測試；既有 119 測試維持全綠 + 實機截圖驗證。

---

## 11. 非目標（本 spec 明確不做）

- 寶石/投射物/聖經/寶箱重繪、外部 sprite 素材、粒子、逐幀骨架動畫（走路擺動等）。
