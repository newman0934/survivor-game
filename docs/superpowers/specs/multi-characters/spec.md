# Spec — 多角色（可選起始角色）

**日期：** 2026-06-23
**功能名稱：** multi-characters
**所屬階段：** 階段 3 — 多樣化（第一項）
**狀態：** 待批准（Approval Gate）

---

## 1. Overview（總覽）

進場前讓玩家從 4 個角色中選一個，各角色有不同的**起始武器、起始數值、起始被動與顏色**，
引導不同 build 走向。把「World 起始狀態」參數化為角色定義；選角在主選單完成。

本 feature 的引擎部分（World 起始套用）為純邏輯、寫單元測試；UI（MainMenu/App/Game/renderer）
為膠水層、實機驗證。store 不變。

---

## 2. Business Requirements（商業需求）

- 提供重玩動機與多樣性（不同角色 = 不同開局體驗），是 roguelite 常見的擴充軸。
- 沿用既有 WEAPON_DEFS / PASSIVE_DEFS / PlayerStats，工量可控。
- 不破壞架構紅線：引擎純 TS、無 Vue/Pinia 執行期依賴；確定性；固定步長。

---

## 3. Functional Requirements（功能需求）

### FR-1 角色定義
- 新增 `CharacterKind = 'warrior' | 'ranger' | 'mage' | 'harvester'` 與 `CharacterDef`。
- `src/engine/characterDefs.ts` 提供 `CHARACTER_DEFS` 與 `CHARACTER_ORDER`。
- `CharacterDef`：`kind / name / description / color / maxHp / startWeapon / statMods / startPassives`。

### FR-2 World 起始參數化
- `World` 建構子改為 `constructor(seed, character: CharacterKind = 'warrior')`。
- 建好 player 後依 def：
  - `player.maxHp = player.hp = def.maxHp`
  - `Object.assign(this.stats, def.statMods)`
  - `this.weapons = [{ kind: def.startWeapon, level: 1, cooldownTimer: 0 }]`
  - 逐一 `this.passives.push({ kind, level: 1 })` 並 `PASSIVE_DEFS[kind].apply(this.upgradeContext())`
  - `this.playerColor = def.color`
- 省略 character 時預設 `'warrior'`（向後相容既有 `new World(seed)`）。

### FR-3 選角流程
- `MainMenu.vue` 顯示 4 張角色卡（名稱 + 起始武器 + 特色），可點選（highlight，預設戰士），
  `start` 事件改帶 `CharacterKind`。
- `App.vue.startGame(kind)` 與 `Game.start(canvasParent, seed, character)` 簽章加 character 往下傳。
- 「再玩一次」沿用上次選定角色（App 保留）。

### FR-4 玩家顏色
- `World` 新增 `playerColor: number`（取自 def.color）。
- `drawPlayer(g, e, color)` 加 color 參數；`PixiRenderer` 畫玩家時傳 `world.playerColor`。

---

## 4. Acceptance Criteria（驗收標準）

詳見 `acceptance.md`。摘要：4 角色可選、各自起始武器/數值/血/被動/顏色正確套用、選角 UI 可運作、
預設 warrior 向後相容；確定性與引擎邊界不變；單元測試（World 起始）+ 既有測試全綠、型別/build 乾淨。

---

## 5. Edge Cases（邊界情況）

- **省略 character**：預設 warrior；既有 `new World(seed)` 測試不壞（既有測試未斷言 maxHp 特定值）。
- **起始被動與 maxHp 衝突**：先設 def.maxHp 再套被動；本陣容起始被動僅 crown（改 xpGain），不影響 maxHp。
- **再玩一次**：沿用上次角色（不強制回選單）。
- **statMods 部分欄位**：`Object.assign` 只覆寫提供的欄位，其餘維持預設。

---

## 6. API Contracts（介面契約）

```ts
// types.ts
export type CharacterKind = 'warrior' | 'ranger' | 'mage' | 'harvester'

export interface CharacterDef {
  kind: CharacterKind
  name: string
  description: string
  color: number
  maxHp: number
  startWeapon: WeaponKind
  statMods: Partial<PlayerStats>
  startPassives: PassiveKind[]
}

// systems/characterDefs.ts
export const CHARACTER_DEFS: Record<CharacterKind, CharacterDef>
export const CHARACTER_ORDER: CharacterKind[]

// World.ts
constructor(seed: number, character?: CharacterKind) // 預設 'warrior'
playerColor: number

// engine/sprites.ts
export function drawPlayer(g: Graphics, e: Entity, color: number): void // 加 color 參數

// engine/Game.ts
static start(canvasParent: HTMLElement, seed: number, character: CharacterKind): Promise<Game>

// ui/MainMenu.vue — emit 改為 start: [CharacterKind]
```

- store / Summary 不變。

---

## 7. Data Model Changes（資料模型變更）

- 新增 `CharacterKind`、`CharacterDef`、`CHARACTER_DEFS`、`CHARACTER_ORDER`。
- `World` 新增 `playerColor`，建構子加 `character` 參數。
- `drawPlayer` 簽章加 `color`。
- `Game.start` / `App.startGame` / `MainMenu` emit 簽章加 character。

---

## 8. State Changes（狀態變更）

- World 建構時套用角色起始狀態（武器/數值/血/被動/顏色）。
- 選角狀態存於 MainMenu local + App（記住上次選擇供重玩）；不進 store。
- 其餘流程（升級/戰鬥/死亡結算）不變。

---

## 9. UI Behaviour（UI 行為）

- 主選單新增 4 張角色卡，預設選戰士、可切換、選中以角色色描邊；「開始遊戲」以選定角色開局。
- 遊戲中玩家圓顏色為該角色色。
- HUD / 升級彈窗 / Boss 血條 / 死亡結算不變。

---

## 10. Non-Functional Requirements（非功能需求）

- **確定性**：角色只改起始狀態，之後全走既有 seeded rng；固定步長不變。
- **架構邊界**：`characterDefs.ts` / `World` 純 TS；MainMenu 為呈現層。
- **TDD**：World 起始套用寫單元測試；MainMenu/App/Game/renderer 不寫單元測試。
- **資源清理**：`Game.stop()` / `PixiRenderer.destroy()` 維持冪等。

---

## 11. 角色數值表（草案，定稿於 characterDefs.ts）

| 角色 | kind | startWeapon | maxHp | statMods | startPassives | color |
|------|------|-------------|-------|----------|---------------|-------|
| 戰士 | warrior | wand | 140 | `{ armor: 3 }` | [] | 0xff6b6b |
| 遊俠 | ranger | knife | 80 | `{ moveSpeed: 240, cooldownMult: 0.9 }` | [] | 0x6bff8c |
| 法師 | mage | bible | 90 | `{ damageMult: 1.25 }` | [] | 0xb39ddb |
| 豐收者 | harvester | garlic | 100 | `{ pickupRadius: 180 }` | ['crown'] | 0xffd54a |

---

## 12. 非目標（本 spec 明確不做）

- 角色解鎖（階段 4 後設系統）。
- 角色專屬主動技能 / 獨立美術造型（共用玩家造型、只換色）。
- 選角預覽動畫。
