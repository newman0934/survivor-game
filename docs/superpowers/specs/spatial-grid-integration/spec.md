# Spec — 空間網格接入 World（碰撞效能重構）

**日期：** 2026-06-23
**功能名稱：** spatial-grid-integration
**所屬階段：** 階段 2 — 內容（第五項，收尾）
**狀態：** 待批准（Approval Gate）

---

## 1. Overview（總覽）

把已建好並測過、但尚未接線的 `core/spatialGrid` 接進 `World`，將**逐幀的敵人鄰近查詢**
（子彈命中、接觸傷害、大蒜、聖經）從「對全體敵人線性掃描」改為「查空間網格的少量候選」，
解決高敵數時的 O(n²) 碰撞熱點。**行為完全不變**，僅縮小候選集。

本次只接 `spatialGrid`；`objectPool` 維持現狀（已建好備用，不在本 spec 範圍）。

---

## 2. Business Requirements（商業需求）

- 支撐階段 2 後續「數百敵人」的高物件數情境，維持 60 FPS（地基設計目標）。
- 不改變玩法、傷害、掉寶、確定性等任何可觀察行為。
- 不破壞架構紅線：引擎純 TS、無 Vue/Pinia 執行期依賴；確定性；固定步長。

---

## 3. Functional Requirements（功能需求）

### FR-1 每幀重建敵人網格
- `World` 持有 `private enemyGrid = new SpatialGrid<Entity>(CELL_SIZE)`（CELL_SIZE = 100）。
- 每個 `step()`，在敵人 AI 移動（步驟 3）之後呼叫 `rebuildEnemyGrid()`：`clear()` 後把所有
  `active` 敵人 `insert(e, e.pos.x, e.pos.y)`。

### FR-2 查詢半徑保語意
- 查詢半徑一律取「該查詢作用半徑 + `MAX_ENEMY_RADIUS`」，確保不漏接任何實際重疊敵人。
- `MAX_ENEMY_RADIUS` 由 `Math.max(...ENEMY_ORDER.map(k => ENEMY_DEFS[k].radius))` 推得（不寫死）。
- 候選再做既有精確距離判定（`circlesOverlap` / `distance <= radius`）。

### FR-3 四處查詢改走網格
- **子彈命中（步驟 5）**：每發子彈以 `queryRadius(p.pos, p.radius + MAX_ENEMY_RADIUS)` 取候選，
  內部 overlap / 扣血 / 擊殺掉寶 / break 邏輯不變。
- **接觸傷害（步驟 7）**：以 `queryRadius(player.pos, player.radius + MAX_ENEMY_RADIUS)` 取候選，
  迭代候選做 `circlesOverlap(e, player)`。
- **大蒜（步驟 4）**：`garlicTick` 簽章不變，World 改傳
  `queryRadius(player.pos, garlicRadius + MAX_ENEMY_RADIUS)` 的候選而非 `this.enemies`。
- **聖經（步驟 4b）**：每個 orbit 以 `queryRadius(orb.pos, orb.radius + MAX_ENEMY_RADIUS)` 取候選，
  再跑既有命中冷卻與扣血。

### FR-4 targeting 維持全掃描
- 武器鎖定 `findNearest` / `findNearestN` 找「最近」而非半徑內，網格不適用且開火非熱點，維持現狀。

---

## 4. Acceptance Criteria（驗收標準）

詳見 `acceptance.md`。摘要：既有測試全綠（行為保持）；四處查詢改走網格且功能正確；確定性與引擎
邊界不變；測試/型別/build 全綠。

---

## 5. Edge Cases（邊界情況）

- **查詢跨多格**：`queryRadius` 已正確涵蓋 bounding box。
- **敵人在格邊界**：insert 與 query 用同一 `Math.floor` 換算，不漏接。
- **本格中途死亡敵人仍在網格**：所有查詢迴圈沿用既有 `if (!e.active) continue` 略過。
- **負座標**：`Math.floor` 對負數行為一致（與既有 SpatialGrid 相同）。
- **空場（無敵人）**：網格空、查詢回空陣列，迴圈不執行。
- **去重**：一個 entity 只 insert 一格，候選天然不重複，無需 dedupe。

---

## 6. API Contracts（介面契約）

```ts
// World.ts（新增私有狀態與方法；對外 API 不變）
private enemyGrid: SpatialGrid<Entity>      // CELL_SIZE = 100
private rebuildEnemyGrid(): void            // clear + insert active enemies

// 既有對外 API（step / summary / spawnEnemyAt / ... ）簽章與行為皆不變。
// systems/weapons.ts garlicTick 簽章不變（仍接受 Entity[]，由 World 傳候選）。
// systems/combat.ts findNearest / findNearestN 不變。
```

無 store / Summary / UI 介面變更。

---

## 7. Data Model Changes（資料模型變更）

- `World` 新增 `enemyGrid`（SpatialGrid 實例）與 `MAX_ENEMY_RADIUS` / `CELL_SIZE` 常數。
- 無型別、store、entity 結構變更。

---

## 8. State Changes（狀態變更）

- `World.step()` 在步驟 3 後新增 `rebuildEnemyGrid()`；步驟 4 / 4b / 5 / 7 改用網格候選。
- 其餘流程與行為不變。

---

## 9. UI Behaviour（UI 行為）

- 無變更。

---

## 10. Non-Functional Requirements（非功能需求）

- **效能**：高敵數時碰撞由 O(P×N)/O(N) 降為查少量候選；目標維持 60 FPS。
- **行為保持**：玩法、傷害、掉寶、確定性與重構前一致。
- **確定性**：網格不引入隨機；迭代順序由 insert 順序（= enemies 順序）決定，穩定。固定步長不變。
- **架構邊界**：SpatialGrid 與 World 皆純 TS，無 Vue/Pinia。
- **TDD**：以既有測試為安全網 + 補功能測試（遠近混合命中）。
- **資源清理**：`Game.stop()` / `PixiRenderer.destroy()` 維持冪等（不受影響）。

---

## 11. 非目標（本 spec 明確不做）

- objectPool 接線。
- targeting（findNearest）改用網格。
- 把 projectile / gem 也納入網格查詢。
- cellSize 自動調參。
