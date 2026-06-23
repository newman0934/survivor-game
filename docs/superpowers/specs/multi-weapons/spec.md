# Spec — 多種武器 + 武器專屬升級

**日期：** 2026-06-23
**功能名稱：** multi-weapons
**所屬階段：** 階段 2 — 內容（第一項）
**狀態：** 待批准（Approval Gate）

---

## 1. Overview（總覽）

目前遊戲只有一把寫死在 `World.step()` 的自動武器（鎖定最近敵人、單發直線），升級卡全是改
`PlayerStats` 的全域數值。本功能把武器抽象成**可共存、可獨立升級的多把武器**，並引入「升級卡
解鎖新武器 / 升級既有武器」的 VS（《吸血鬼倖存者》）經典成長模式。

本階段交付 **4 把武器**：

- **魔杖（wand）** — 起始武器，鎖定最近敵人、單發直線（沿用現有邏輯）。
- **飛刀（knife）** — 朝玩家最後移動方向連射、彈速快、射程短。
- **聖經（bible）** — 數本書以玩家為圓心環繞旋轉，碰到敵人扣血。
- **大蒜（garlic）** — 玩家周圍圓形場域，範圍內敵人持續扣血。

四把**全部共存、同時開火**，可全數收齊。武器專屬升級採 **VS 風：每把 5 級、每級套用預定的固定
效果**。

---

## 2. Business Requirements（商業需求）

- 提供 build 多樣性與成長深度，是 survivor-like 類型的核心爽感來源（疊加武器、各自變強）。
- 為階段 2 後續內容（多敵人、Boss、被動道具）建立可擴充的「武器資料 + 等級表 + 行為函式」分層。
- 不破壞既有架構紅線：引擎純 TS、無 Vue/Pinia 執行期依賴；確定性（seeded rng）；固定步長。

---

## 3. Functional Requirements（功能需求）

### FR-1 武器為可共存的獨立單位
- `World` 持有 `weapons: Weapon[]`，起始只含 `wand`（Lv1）。
- 每把武器有獨立的冷卻計時器與等級，於 `World.step()` 各自倒數、到點開火，互不覆蓋。
- 四把可同時存在並同時開火。

### FR-2 兩層數值（武器專屬 × 全域被動）
- **武器專屬值**來自該武器當前等級的等級表項（離散、逐級固定）。
- **全域被動**為通用乘區：`damageMult`、`cooldownMult`、`projectileSpeedMult`、`areaMult`，
  外加既有的 `moveSpeed`、`pickupRadius`。
- 實際生效值 = 武器等級值 × 對應全域乘區。
- 既有 5 張全域升級卡改寫為乘區被動，影響**所有**武器：
  - 「傷害」→ `damageMult ×1.15`（原為 +3 絕對值，改為乘區）
  - 「攻速」→ `cooldownMult ×0.85`
  - 「彈速」→ `projectileSpeedMult ×1.2`
  - 「移速」→ `moveSpeed ×1.12`（不變）
  - 「吸取」→ `pickupRadius ×1.25`（不變）

### FR-3 升級卡池三類候選
升級時動態依當前 `World` 狀態產生候選，抽 3 張不重複：
1. **解鎖新武器**：玩家未持有、且持有數未達上限的武器。
2. **升級既有武器**：已持有且 `level < maxLevel` 的武器（卡面顯示「飛刀 Lv2→Lv3」）。
3. **全域被動**：上述 5 張乘區被動。

### FR-4 武器上限與等級上限
- 武器持有上限 **4**（本階段共 4 種，故必定能全數收齊，不需取捨丟棄）。
- 每把武器 **5 級**（取得即 Lv1，再升 4 次至 Lv5 滿級）。

### FR-5 抽選與 fallback
- 沿用現有不重複 `splice` 抽法，但池由「當前合法候選」動態組成。
- 若合法候選不足 3 張，以保底卡「補血（heal）」補滿至 3 張，確保永遠有 3 張可選。
- 全程走每局 seeded rng，不得使用 `Math.random()`。

### FR-6 四把武器的開火行為
- **wand**：`findNearest` 鎖定最近敵人發射投射物；高等級可鎖定最近 N 隻各射一發。
- **knife**：朝 `World` 記錄的「玩家最後非零移動方向」發射；多發時並排/扇形展開。
- **bible**：N 本環繞物以玩家為圓心、固定半徑與角速度旋轉；碰到敵人扣血，附 per-enemy 命中冷卻。
- **garlic**：每格掃描半徑內敵人，扣 `dmg × dt` 連續傷害（同既有玩家接觸傷害的做法）。

---

## 4. Acceptance Criteria（驗收標準）

詳見 `acceptance.md`。摘要：四把武器可各自取得、共存、同時開火並可升級；升級卡正確顯示三類
候選；全域被動影響所有武器；確定性與引擎邊界不變；單元測試 / 型別檢查 / build 全綠。

---

## 5. Edge Cases（邊界情況）

- **場上無敵人**：wand 不開火（`findNearest` 回 `null`）；knife 仍朝最後方向空射；
  bible/garlic 照常運作但無命中對象。
- **玩家從未移動過**：knife 預設方向朝右 `{x:1,y:0}`。
- **一次拾取跨多個等級門檻**：每次升級握手都重抽當前合法候選。
- **全武器滿級且被動已足**：fallback 補血卡補滿 3 張。
- **武器上限已滿（4 把）**：不再產生「解鎖新武器」候選。
- **bible 命中同一敵人**：per-enemy 命中冷卻，避免每幀重複扣血。
- **與玩家重疊（除以零）**：方向正規化沿用 `|| 1` 防護。

---

## 6. API Contracts（介面契約）

### 引擎內部新增/變更
```ts
// types.ts
export type WeaponKind = 'wand' | 'knife' | 'bible' | 'garlic'
export type EntityKind = 'player' | 'enemy' | 'projectile' | 'gem' | 'orbit' // 新增 orbit

export interface Weapon {
  kind: WeaponKind
  level: number          // 1..maxLevel
  cooldownTimer: number  // 各自的開火倒數（秒）
}

// 每把武器某一等級的生效參數（離散）
export interface WeaponLevelStats {
  cooldown?: number          // 開火冷卻（秒）；garlic/bible 可省略
  damage: number             // 單次/單發傷害
  count?: number             // 投射物或環繞物數量
  projectileSpeed?: number   // wand/knife
  radius?: number            // bible 環繞半徑 / garlic 場域半徑
  angularSpeed?: number      // bible 角速度（弧度/秒）
}

export interface WeaponDef {
  kind: WeaponKind
  label: string              // 顯示名稱（繁中）
  maxLevel: number
  levels: WeaponLevelStats[] // 長度 = maxLevel，levels[level-1] 為當前生效值
}
```

```ts
// PlayerStats 演化（全域乘區 + 既有）
export interface PlayerStats {
  moveSpeed: number
  pickupRadius: number
  damageMult: number          // 預設 1
  cooldownMult: number        // 預設 1（越小攻速越快）
  projectileSpeedMult: number // 預設 1
  areaMult: number            // 預設 1（影響 bible/garlic 半徑）
}
```

```ts
// UpgradeOption.apply 簽章變更：可同時讀寫 stats 與 weapons
export interface UpgradeContext {
  stats: PlayerStats
  weapons: Weapon[]
  heal: (amount: number) => void
}
export interface UpgradeOption {
  id: string
  label: string
  apply: (ctx: UpgradeContext) => void
}

// leveling.ts：候選改為依當前狀態動態產生
export function rollUpgrades(rng: Rng, count: number, ctx: UpgradeContext): UpgradeOption[]
```

```ts
// systems/weapons.ts（新檔，純函式）
// 每種武器一個「結算」函式，回傳要新增的 entity（或就地改 World 暴露的資料）。
// 確切簽章於 plan.md 定稿；原則：純函式、輸入 (weapon, stats, world 查詢資料, rng?)，
// 不依賴 Vue/Pinia。
```

### store 橋接
- `Summary` 不變（HUD 不需要逐武器資訊）。
- 升級選項仍以 `{ id, label }` 純資料傳給 store；`label` 內含等級資訊字串。

---

## 7. Data Model Changes（資料模型變更）

- 新增 `Weapon`、`WeaponLevelStats`、`WeaponDef`、`UpgradeContext` 型別。
- `EntityKind` 新增 `'orbit'`（聖經環繞物）。
- `PlayerStats` 欄位由絕對值改為乘區（見 §6）。
- `World` 新增：`weapons: Weapon[]`、`lastMoveDir: Vec2`（飛刀方向）、聖經環繞物的角度狀態
  （可存於環繞 entity 自身或 World）。
- 新增 `WEAPON_DEFS`（武器等級表常數）與 `bibleHitCooldowns`（per-enemy 命中冷卻記錄）。

---

## 8. State Changes（狀態變更）

- `World` 開火段由「單一寫死武器」改為「遍歷 `weapons` 各自結算」。
- 升級握手流程不變（暫停 → store.offerUpgrades → pickUpgrade → applyUpgrade → 恢復），
  僅 `applyUpgrade` 改為以 `UpgradeContext` 套用、`rollUpgrades` 改為依狀態產生候選。
- 每格更新「玩家最後非零移動方向」`lastMoveDir`。

---

## 9. UI Behaviour（UI 行為）

- 升級彈窗顯示 3 張卡，卡面文案涵蓋三類：
  - 解鎖：「新武器：聖經」
  - 升級：「飛刀 Lv2→Lv3」
  - 被動：「傷害 +15%」
  - 保底：「補血 +20」
- HUD 不變（不顯示逐武器狀態，YAGNI）。
- 渲染：`PixiRenderer.COLORS` 新增 `orbit` 顏色；大蒜場域畫半透明圓（renderer 讀 `World`
  暴露的大蒜半徑與是否持有）。

---

## 10. Non-Functional Requirements（非功能需求）

- **架構邊界**：`systems/weapons.ts`、`leveling.ts`、`types.ts` 皆純 TS，無 Vue/Pinia 執行期
  import。
- **確定性**：所有隨機走 seeded rng；固定步長 1/60 不變。
- **TDD**：引擎純邏輯（weapons、leveling、武器等級套用）先寫失敗測試；renderer/迴圈/UI 不寫
  單元測試，靠實跑驗證。
- **效能**：bible 為少量 entity、garlic 為純掃描，現有 `Array.filter` 規模下無虞；物件池/
  空間網格仍留待階段 2 後段接入。
- **資源清理**：`Game.stop()` / `PixiRenderer.destroy()` 維持冪等。

---

## 11. 非目標（本 spec 明確不做）

- 武器進化（evolution，滿級 + 特定被動合成新武器）— 留待後續。
- 第 5 把以後的武器、被動道具系統（passive items）獨立卡池 — 留待後續。
- 逐武器 HUD、武器圖示美術 — 留待後續。
- 多敵人 / Boss（同階段其他 spec）。