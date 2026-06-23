# Spec — 新增三把武器（吞噬偽足 / 補體級聯 / 抗原脈衝）

**日期：** 2026-06-24
**功能名稱：** new-weapons
**所屬階段：** 內容擴充（武器系統）
**狀態：** 待批准（Approval Gate）

---

## 1. Overview（總覽）

新增三把免疫主題武器，補足目前沒有的三種機制原型：**吞噬偽足**（近戰扇形掃擊）、**補體級聯**（連鎖彈跳）、
**抗原脈衝**（擴張衝擊波/範圍爆發）。三者皆為冷卻觸發的即時效果武器（不產生 projectile），套用現有全域乘區。
同步新增一條 `fxEventQueue`（仿 `soundEventQueue`）讓引擎把武器視覺事件交給呈現層繪製。

---

## 2. Business Requirements（商業需求）

- 擴充 build 多樣性：補上近戰、連鎖、爆發三種與現有四把（追擊彈/方向彈/軌道/光環）不重疊的機制。
- 零素材依賴、純程式繪製與邏輯。
- 不破壞架構紅線：引擎純 TS、確定性、固定步長；武器邏輯為純函式可單元測試；視覺走呈現層。

---

## 3. Functional Requirements（功能需求）

### FR-1 武器種類與定義（types / weaponDefs）
- `WeaponKind` 新增 `'phagocyte' | 'cascade' | 'nova'`。
- `WEAPON_DEFS` 新增三筆（`maxLevel: 5`，逐級數值如下，皆為套乘區前的基礎值）：
  - **phagocyte（吞噬偽足）**：cd 0.7→0.5、damage 8→20、radius 70→100。
    `levels`：`{cd0.7,dmg8,r70} {cd0.7,dmg12,r70} {cd0.6,dmg12,r85} {cd0.6,dmg16,r85} {cd0.5,dmg20,r100}`
  - **cascade（補體級聯）**：cd 1.0→0.7、damage 10→18、count(跳數) 3→6、radius(跳躍範圍) 160→200。
    `levels`：`{cd1.0,dmg10,c3,r160} {cd1.0,dmg10,c4,r160} {cd0.85,dmg14,c4,r180} {cd0.85,dmg14,c5,r180} {cd0.7,dmg18,c6,r200}`
  - **nova（抗原脈衝）**：cd 1.6→1.2、damage 12→26、radius 120→210。
    `levels`：`{cd1.6,dmg12,r120} {cd1.6,dmg12,r150} {cd1.4,dmg18,r150} {cd1.4,dmg18,r180} {cd1.2,dmg26,r210}`
- `WEAPON_ORDER` 追加 `phagocyte`、`cascade`、`nova`（接在現有四把之後）。
- 沿用既有 `WeaponLevelStats` 欄位（cooldown/damage/count/radius）；不新增欄位。扇形半角為 `weapons.ts` 常數（70°）、連鎖傷害遞減係數為常數（0.75）。

### FR-2 武器行為純函式（weapons.ts，TDD）
- **`phagocyteSweep(center, dir, enemies, radius, halfAngle, damage): Entity[]`**：對 `center` 半徑內、且與 `dir` 夾角 ≤ `halfAngle` 的存活敵人扣 `damage`（就地改 hp），回傳被命中的敵人陣列（供視覺/結算）。
- **`chainTargets(origin, enemies, maxJumps, jumpRange): Entity[]`**：從距 `origin` 最近的存活敵人起跳，之後每次跳到「距上一個命中點最近、未命中過、且距離 ≤ `jumpRange`」的敵人，最多 `maxJumps` 個；回傳依序命中的敵人陣列（不在此扣血，扣血由 World 套遞減傷害）。
- **`novaBurst(center, enemies, radius, damage): Entity[]`**：對 `center` 半徑內所有存活敵人扣 `damage`，回傳被命中者。
- 三者皆為純函式、確定性（最近選擇以距離排序，平手以陣列順序）；不呼叫 `Math.random()`。

### FR-3 World.step 接線
- 在既有「武器遍歷」迴圈內為三把新武器各加分支（冷卻倒數，歸零時觸發）：
  - 生效值：`damage = lvl.damage × damageMult`、`radius = lvl.radius × areaMult`、`cooldown = lvl.cooldown × cooldownMult`。
  - phagocyte：以 `lastMoveDir` 為朝向呼叫 `phagocyteSweep`，命中後 `checkKills()`。
  - cascade：`chainTargets` 取得命中序列，對第 k 個套 `damage × 0.75^k` 扣血，`checkKills()`。
  - nova：`novaBurst` 扣血，`checkKills()`。
  - 命中數 > 0 時 `soundEventQueue.push('hit')`；同時推對應 `fxEventQueue` 視覺事件（見 FR-4）。

### FR-4 視覺事件佇列（fxEventQueue）
- 新增型別 `FxEvent`（帶種類與位置/半徑/點列）：
  - `{ kind: 'sweep', x, y, angle, radius, halfAngle }`
  - `{ kind: 'chain', points: {x,y}[] }`（依序命中點，前置玩家座標）
  - `{ kind: 'nova', x, y, radius }`
- `World` 新增 `private fxEventQueue: FxEvent[]` 與 `consumeFxEvents(): FxEvent[]`（取走並清空），完全比照既有 `soundEventQueue` / `consumeSoundEvents`。
- 確定性：fx 事件僅為呈現資料，不回饋模擬。

### FR-5 視覺繪製（EffectsLayer / PixiRenderer / Game）
- `EffectsLayer` 新增三個 spawn：
  - `spawnSweep(x, y, angle, radius, halfAngle)`：前方扇形快速掃過的弧形閃光（短壽命淡出）。
  - `spawnChain(points)`：相鄰命中點間的連鎖閃電線段（短壽命淡出）。
  - `spawnNova(x, y, radius)`：由小擴張到 `radius` 的衝擊環（短壽命淡出）。
- `Game`（或 `PixiRenderer`）每幀排空 `world.consumeFxEvents()` 並轉呼叫對應 `EffectsLayer` 方法（比照既有音效事件排空）。
- 視覺走 renderer clock / 固定 dt，受 `EffectsLayer` 既有壽命回收管理。

### FR-6 解除武器持有上限
- `leveling.ts` 的 `WEAPON_CAP` 由 `4` 改為 `7`，讓七把武器可全數解鎖（符合「不加上限」決定）。
- `buildCandidates` / `unlockOption` 邏輯不變（僅常數值變）。

### FR-7 不變項（硬性）
- 既有四把武器（antibody/perforin/complement/inflammation）的數值、行為、平衡完全不變。
- 升級握手、store/Summary、被動道具、敵人/角色/地圖、確定性（seeded rng）不變。
- `Game.stop()` / `PixiRenderer.destroy()` / `EffectsLayer.destroy()` 維持冪等（fx 特效隨既有回收）。

---

## 4. Acceptance Criteria（驗收標準）

詳見 `acceptance.md`。摘要：三把武器可解鎖/升級並如機制運作（扇掃/連鎖遞減/範圍爆發），視覺事件正確繪製，
武器上限解除可收齊 7 把；三純函式有單元測試且確定性；既有測試全綠 + 新測試、型別/build 乾淨、實機驗證、FPS 正常。

---

## 5. Edge Cases（邊界情況）

- **無敵人**：三函式皆回空陣列、不扣血、不崩潰；World 不推 fx/sound 事件（命中數 0）。
- **連鎖無更多目標**：`chainTargets` 在找不到範圍內未命中目標時提前結束（命中數 < maxJumps）。
- **連鎖平手距離**：以陣列順序為穩定 tiebreak，保持確定性。
- **扇形朝向**：`lastMoveDir` 預設朝右；靜止時沿用最後方向（與飛刀一致）。
- **大量敵人**：nova/sweep 以網格鄰近查詢候選（`queryRadius`）避免全列表掃描。
- **乘區極端**：areaMult 放大半徑時，候選查詢半徑同步加 `MAX_ENEMY_RADIUS`，不漏接。
- **重新開始**：fxEventQueue 隨新 World 建構為空；特效層 destroy 清空。

---

## 6. API Contracts（介面契約）

```ts
// types.ts
export type WeaponKind = 'antibody' | 'perforin' | 'complement' | 'inflammation'
  | 'phagocyte' | 'cascade' | 'nova'
export type FxEvent =
  | { kind: 'sweep'; x: number; y: number; angle: number; radius: number; halfAngle: number }
  | { kind: 'chain'; points: { x: number; y: number }[] }
  | { kind: 'nova'; x: number; y: number; radius: number }

// weapons.ts（純函式）
phagocyteSweep(center: Vec2, dir: Vec2, enemies: Entity[], radius: number, halfAngle: number, damage: number): Entity[]
chainTargets(origin: Vec2, enemies: Entity[], maxJumps: number, jumpRange: number): Entity[]
novaBurst(center: Vec2, enemies: Entity[], radius: number, damage: number): Entity[]

// World.ts
consumeFxEvents(): FxEvent[]

// effects.ts（EffectsLayer）
spawnSweep(x: number, y: number, angle: number, radius: number, halfAngle: number): void
spawnChain(points: { x: number; y: number }[]): void
spawnNova(x: number, y: number, radius: number): void
```

- store/Summary、其他引擎介面不變。

---

## 7. Data Model Changes（資料模型變更）

- `WeaponKind` 增三成員；`WEAPON_DEFS`/`WEAPON_ORDER` 增三筆；新增 `FxEvent` 型別與 `World.fxEventQueue`。
- 不改 store、不新增 entity 種類（武器為即時效果，不生 projectile/entity）。

---

## 8. State Changes（狀態變更）

- `World` 新增 `fxEventQueue`（每幀排空、不入庫）；無其他模擬狀態語意變更。`WEAPON_CAP` 常數 4→7。

---

## 9. UI Behaviour（UI 行為）

- 升級彈窗：可出現「新武器：吞噬偽足 / 補體級聯 / 抗原脈衝」與其升級卡（沿用既有動態抽選）。
- 遊戲畫面：吞噬偽足扇掃閃光、補體級聯連鎖閃電、抗原脈衝擴張環。HUD/選單/結算不變。

---

## 10. Non-Functional Requirements（非功能需求）

- **確定性**：武器邏輯純函式、無 `Math.random()`；fx 僅呈現資料、不回饋模擬；相同 seed 結果一致。
- **效能**：以空間網格鄰近查詢候選；fx 特效固定壽命回收；維持原 FPS。
- **測試**：weapons.ts 三純函式走 TDD 單元測試（命中判定/連鎖序列/遞減）；World 接線與既有測試維持全綠；視覺屬呈現層膠水以實機驗證。
- **架構邊界**：引擎純 TS；fxEventQueue 比照既有 soundEventQueue 模式，不引入 Vue/Pinia 依賴。

---

## 11. 非目標（本 spec 明確不做）

- 武器進化/合成（VS 風 evolution）。
- 友軍召喚單位、佈署型地雷、群控漩渦（屬其他備選，未選）。
- 武器持有上限機制（本批反而解除上限）。
- 既有四把武器的數值重平衡。
- 新被動道具 / 新敵人 / 新地圖。
