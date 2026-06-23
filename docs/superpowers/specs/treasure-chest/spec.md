# Spec — 寶箱 / 隨機獎勵

**日期：** 2026-06-23
**功能名稱：** treasure-chest
**所屬階段：** 階段 3 — 多樣化（第三項，收尾）
**狀態：** 待批准（Approval Gate）

---

## 1. Overview（總覽）

Boss 死亡必掉一個**寶箱**；玩家撿取後觸發一次**免費升級三選一**（複用既有升級握手 `pendingLevelUps`，
零新 UI）。順手把分散兩處的「敵人死亡掉寶」邏輯重構成單一 `killEnemy()`。

寶箱掉落/拾取為純引擎邏輯、寫單元測試；寶箱繪製為呈現層、實機驗證。store 不變。

---

## 2. Business Requirements（商業需求）

- 強化「打贏 Boss」的回饋迴圈，提供 roguelite 的開箱爽感。
- 最大化複用既有升級系統與拾取機制，工量最小。
- 不破壞架構紅線：引擎純 TS、無 Vue/Pinia 執行期依賴；確定性；固定步長。

---

## 3. Functional Requirements（功能需求）

### FR-1 寶箱 entity
- `EntityKind` 新增 `'chest'`；`entities/factory.ts` 新增 `createChest(pos)`（radius 14）。
- `World` 新增 `chestEntities: Entity[]` 與 `chests()` getter（供 renderer）。

### FR-2 敵人死亡統一處理 + Boss 掉箱
- 抽出 `World.killEnemy(e)`：`e.active=false` → `kills += 1` → 掉經驗寶石（`createGem(e.pos, e.xp)`）→
  若 `e.enemyKind === 'boss'` 再 `chestEntities.push(createChest(e.pos))`。
- step 的投射物命中段與 `checkKills()` 兩處改呼叫 `killEnemy(e)`（行為對非 boss 不變）。

### FR-3 撿取寶箱 → 免費升級
- step 拾取段新增寶箱迴圈：沿用 `attractGem(chest, player.pos, pickupRadius, GEM_PULL_SPEED)` + 位移；
  `distance(chest.pos, player.pos) ≤ player.radius` 時 `chest.active=false`、`this.pendingLevelUps += 1`。
- 既有 `Game` 每步 `consumeLevelUp()` → `offerUpgrades(rollUpgrades(...,3,ctx))` 握手不變；寶箱自然彈出
  3 選 1。多個 pending（升級 + 開箱）逐一彈出。
- step 清理段新增 `chestEntities = chestEntities.filter(c => c.active)`。

### FR-4 渲染
- `sprites.drawChest(g, e)`：金棕箱身（roundRect）+ 蓋線 + 中央鎖扣。
- `PixiRenderer` render 清單加入 `world.chests()`；走既有 sprite 重用/回收路徑。

---

## 4. Acceptance Criteria（驗收標準）

詳見 `acceptance.md`。摘要：Boss 死亡掉寶箱、非 boss 不掉、撿取觸發升級三選一、寶箱繪製正確；
既有掉寶/擊殺行為不變；確定性與引擎邊界不變；單元測試 + 既有測試全綠、型別/build 乾淨。

---

## 5. Edge Cases（邊界情況）

- **同格升級 + 開箱**：`pendingLevelUps` 累加，握手逐一彈出（既有 while 消化）。
- **Boss 由大蒜/聖經（checkKills）擊殺**：一樣經 `killEnemy` 掉箱。
- **玩家死亡同格撿箱**：pendingLevelUps 仍加，但既有順序為「升級檢查在死亡檢查前」，可接受。
- **寶箱未撿就死亡/重開**：World 重建清空，無殘留。
- **吸取範圍道具**：對寶箱同樣有效（沿用 attractGem + pickupRadius）。

---

## 6. API Contracts（介面契約）

```ts
// types.ts
export type EntityKind = 'player' | 'enemy' | 'projectile' | 'gem' | 'orbit' | 'chest'

// entities/factory.ts
export function createChest(pos: Vec2): Entity  // kind 'chest', radius 14

// World.ts
chests(): Entity[]
private killEnemy(e: Entity): void   // active=false + kills++ + 掉寶 + boss 掉箱

// engine/sprites.ts
export function drawChest(g: Graphics, e: Entity): void
```

- store / Summary / 升級握手介面不變。

---

## 7. Data Model Changes（資料模型變更）

- `EntityKind` 新增 `'chest'`。
- `World` 新增 `chestEntities` 與 `chests()`、`killEnemy()`。
- 新增 `createChest`、`drawChest`。

---

## 8. State Changes（狀態變更）

- 敵人死亡集中於 `killEnemy`；Boss 額外掉寶箱。
- step 新增寶箱拾取（→ pendingLevelUps）與清理。
- 其餘流程（升級握手、戰鬥、死亡結算）不變。

---

## 9. UI Behaviour（UI 行為）

- 寶箱以金棕色箱子呈現於 Boss 死亡點；玩家靠近吸取、撿到彈出既有升級三選一。
- HUD / 選單 / Boss 血條不變。

---

## 10. Non-Functional Requirements（非功能需求）

- **確定性**：寶箱不引入隨機；升級候選仍走既有 seeded upgradeRng；固定步長不變。
- **架構邊界**：factory/World 純 TS；drawChest 在 sprites 呈現層。
- **TDD**：killEnemy / 寶箱拾取 / createChest 寫單元測試；drawChest 實機驗證。
- **資源清理**：`Game.stop()` / `PixiRenderer.destroy()` 維持冪等。

---

## 11. 非目標（本 spec 明確不做）

- 多稀有度寶箱、開箱動畫/特效、寶箱專屬獎勵池（用既有升級候選）。
- 一般敵人掉箱（僅 Boss）。
