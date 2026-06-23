# Spec — 多地圖（視覺 + 難度）

**日期：** 2026-06-23
**功能名稱：** multi-maps
**所屬階段：** 階段 3 — 多樣化（第二項）
**狀態：** 待批准（Approval Gate）

---

## 1. Overview（總覽）

進場前除了選角色，再選一張地圖。每張地圖有不同的**背景視覺**（底色 + 網格線顏色/透明度）與
**難度修正**（生怪間隔倍率 + 敵人 hp 倍率）。鏡像多角色的「選擇 UI ↔ World 起始參數化」模式。

World 難度套用為純引擎邏輯、寫單元測試；MainMenu/renderer 為膠水層、實機驗證；store 不變。

---

## 2. Business Requirements（商業需求）

- 提供場景與難度的多樣性，增加重玩變化，是 roguelite 常見擴充軸。
- 沿用既有 spawn / drawBackgroundGrid，工量可控。
- 不破壞架構紅線：引擎純 TS、無 Vue/Pinia 執行期依賴；確定性；固定步長。

---

## 3. Functional Requirements（功能需求）

### FR-1 地圖定義
- 新增 `MapKind = 'plains' | 'lava' | 'tundra'` 與 `MapDef`。
- `src/engine/systems/mapDefs.ts` 提供 `MAP_DEFS` 與 `MAP_ORDER`。
- `MapDef`：`kind / name / description / bgColor / gridColor / gridAlpha / spawnIntervalMult / enemyHpMult`。

### FR-2 World 套用難度
- 建構子改為 `constructor(seed, character: CharacterKind = 'warrior', map: MapKind = 'plains')`。
- 生怪計時重置改為 `this.spawnTimer = spawnInterval(this.elapsed) * mapDef.spawnIntervalMult`。
- 敵人 hp 倍率：在 `spawnEnemyAt` / `spawnSwarmAt` 生出的每隻敵人、`spawnBossAt` 在 boss 成長縮放
  「之後」再乘 `mapDef.enemyHpMult`（同步 hp 與 maxHp）。
- 暴露視覺欄位：`mapBgColor`、`mapGridColor`、`mapGridAlpha`。

### FR-3 渲染（視覺）
- `drawBackgroundGrid(g, cx, cy, w, h, color, alpha)` 加 color/alpha 參數；renderer 傳
  `world.mapGridColor` / `world.mapGridAlpha`。
- renderer 每幀設 `app.renderer.background.color = world.mapBgColor`（冪等）。

### FR-4 選圖流程
- `MainMenu.vue` 在角色卡下方加一排地圖卡（預設第一張 plains），可點選 highlight。
- `start` 事件改帶物件 `{ character: CharacterKind, map: MapKind }`。
- `App.startGame({ character, map })` 記住兩者（供重玩），`Game.start(canvasParent, seed, character, map)`
  與 `new World(seed, character, map)` 往下傳。

---

## 4. Acceptance Criteria（驗收標準）

詳見 `acceptance.md`。摘要：3 張地圖可選、難度倍率（生怪間隔/敵人 hp）與視覺（底色/網格色）正確套用、
選圖 UI 可運作、預設 plains 向後相容；確定性與引擎邊界不變；單元測試 + 既有測試全綠、型別/build 乾淨。

---

## 5. Edge Cases（邊界情況）

- **省略 map**：預設 plains；既有 `new World(seed)` / `new World(seed, char)` 不壞（plains 倍率皆 1、
  視覺同現況）。
- **enemyHpMult 套用順序**：boss 在成長縮放後再乘 mult；一般敵人於 spawn 入口生成後立即乘。
- **背景色變更**：renderer 每幀冪等設定 `app.renderer.background.color`。
- **再玩一次**：沿用上次的角色 + 地圖。
- **倍率與既有確定性**：倍率為定值乘法，不引入隨機，確定性不變。

---

## 6. API Contracts（介面契約）

```ts
// types.ts
export type MapKind = 'plains' | 'lava' | 'tundra'

export interface MapDef {
  kind: MapKind
  name: string
  description: string
  bgColor: number
  gridColor: number
  gridAlpha: number
  spawnIntervalMult: number
  enemyHpMult: number
}

// systems/mapDefs.ts
export const MAP_DEFS: Record<MapKind, MapDef>
export const MAP_ORDER: MapKind[]

// World.ts
constructor(seed: number, character?: CharacterKind, map?: MapKind) // 預設 warrior / plains
mapBgColor: number
mapGridColor: number
mapGridAlpha: number

// engine/sprites.ts
export function drawBackgroundGrid(
  g: Graphics, cx: number, cy: number, viewW: number, viewH: number, color: number, alpha: number,
): void

// engine/Game.ts
static start(canvasParent: HTMLElement, seed: number, character: CharacterKind, map: MapKind): Promise<Game>

// ui/MainMenu.vue — emit 改為 start: [{ character: CharacterKind; map: MapKind }]
```

- store / Summary 不變。

---

## 7. Data Model Changes（資料模型變更）

- 新增 `MapKind`、`MapDef`、`MAP_DEFS`、`MAP_ORDER`。
- `World` 新增 `mapBgColor / mapGridColor / mapGridAlpha` 與建構子 `map` 參數、`mapDef` 私有引用。
- `drawBackgroundGrid` 簽章加 color/alpha。
- `Game.start` / `App.startGame` / `MainMenu` emit 簽章改帶 map。

---

## 8. State Changes（狀態變更）

- World 建構時讀入地圖難度倍率與視覺欄位；生怪計時與敵人 hp 套用倍率。
- 選圖狀態存於 MainMenu local + App（記住供重玩）；不進 store。
- 其餘流程不變。

---

## 9. UI Behaviour（UI 行為）

- 主選單新增地圖卡排（角色排下方），預設平原、可切換、選中以地圖 gridColor 描邊。
- 遊戲畫面底色與背景網格顏色為所選地圖。
- HUD / 升級彈窗 / Boss 血條 / 死亡結算不變。

---

## 10. Non-Functional Requirements（非功能需求）

- **確定性**：地圖只改倍率與視覺；隨機仍走既有 seeded rng；固定步長不變。
- **架構邊界**：`mapDefs.ts` / World 純 TS；MainMenu 為呈現層。
- **TDD**：World 難度/視覺套用寫單元測試；MainMenu/renderer 不寫單元測試。
- **資源清理**：`Game.stop()` / `PixiRenderer.destroy()` 維持冪等。

---

## 11. 地圖數值表（草案，定稿於 mapDefs.ts）

| 地圖 | kind | bgColor | gridColor | gridAlpha | spawnIntervalMult | enemyHpMult |
|------|------|---------|-----------|-----------|-------------------|-------------|
| 平原 | plains | 0x0c0c12 | 0xffffff | 0.04 | 1.0 | 1.0 |
| 熔岩 | lava | 0x1a0a0a | 0xff7043 | 0.06 | 0.8 | 1.25 |
| 冰原 | tundra | 0x0a1420 | 0x80d8ff | 0.05 | 1.15 | 0.9 |

---

## 12. 非目標（本 spec 明確不做）

- 障礙物 / 牆壁 / 地圖邊界碰撞。
- 地圖專屬敵種 / 音樂。
- 地圖解鎖（階段 4）、多層視差背景。
