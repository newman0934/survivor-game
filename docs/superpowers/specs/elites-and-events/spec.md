# Spec — 精英怪 + 地圖事件（elites-and-events）

**日期：** 2026-06-26
**功能名稱：** elites-and-events
**所屬階段：** 階段 3 — 單局深度（Spec A，共 A/B 兩份；B 為終局 Boss/勝利條件，另案）
**狀態：** 待批准（Approval Gate）

---

## 1. Overview（總覽）

替「無限存活」單局加入**遭遇變化與起伏**，沿用既有 spawn/敵人/寶箱機制，最小新增：

- **精英怪（elite）**：既有敵種隨機帶 1 個**詞綴（affix）**，更硬、有發光光環標記、死亡掉寶箱（免費升級）。
- **地圖事件（event）**：每隔約 150 秒觸發一個波次事件（怪潮／精英來襲／包圍），觸發前 HUD 顯示預警。

引擎部分（事件排程、精英套用）為純邏輯、走 seeded rng、寫單元測試；光環與預警橫幅為呈現層、實機目視。本案**不**改升級/戰鬥/結算/勝負流程（勝利條件屬 Spec B）。

> 本案前置決策（已與使用者確認）：run 結構將於 Spec B 改為有限關卡（撐到終點 → 終局 Boss → 通關）。本 Spec A 的事件時間軸採設計過的有限節奏，但**不**實作勝利/終局 Boss。

---

## 2. Business Requirements（商業需求）

- 增加單局深度：精英帶來「優先處理的高價值目標」，事件帶來節奏起伏，提升重玩與緊張感。
- 沿用既有 spawn/factory/chest/effects，工量可控、風險低。
- 不破壞架構紅線：引擎純 TS、無 Vue/Pinia 執行期依賴；確定性（seeded rng）；固定步長。

---

## 3. Functional Requirements（功能需求）

### FR-1 詞綴定義（純資料）
- 新增 `EliteAffix = 'giant' | 'frenzy' | 'regen' | 'volatile'`。
- `src/engine/systems/eliteDefs.ts` 提供 `ELITE_AFFIX_DEFS: Record<EliteAffix, EliteAffixDef>` 與 `ELITE_AFFIX_ORDER`。
- `EliteAffixDef` 欄位：`affix / name / auraColor / hpMult / radiusMult / speedMult / damageMult / regenPerSec / explodeOnDeath`。
- 數值（定稿）：

  | affix | name | auraColor | hpMult | radiusMult | speedMult | damageMult | regenPerSec | explodeOnDeath |
  |-------|------|-----------|--------|-----------|-----------|-----------|-------------|----------------|
  | giant | 巨大化 | 0xff8a3d | 3.0 | 1.6 | 0.8 | 1.0 | 0 | false |
  | frenzy | 狂暴 | 0xff4d4d | 1.0 | 1.0 | 1.5 | 1.3 | 0 | false |
  | regen | 再生 | 0x5bff8c | 1.0 | 1.0 | 1.0 | 1.0 | 0.04 | false |
  | volatile | 爆裂 | 0xffd54a | 1.0 | 1.0 | 1.0 | 1.0 | 0 | true |

  > `regenPerSec` 為「每秒回 maxHp 的比例」。`explodeOnDeath` 沿用 exploder 的爆炸（半徑 90、傷害 18）。

### FR-2 精英基線與套用
- 精英 = 在所選 `EnemyKind` 基線上額外 **hp ×3、xp ×5**，再套詞綴乘區。
- `World.spawnEnemyAt(pos, kind, affix?)` 增加選填 `affix` 參數：
  - 設 `entity.affix = affix`。
  - hp/maxHp = `baseHp × mapEnemyHpMult × 3 × hpMult`。
  - radius = `baseRadius × radiusMult`；speed = `baseSpeed × speedMult`；damage = `baseDamage × damageMult`；xp 寶石 = `baseXp × 5`。
- 省略 `affix` 時行為與現況完全一致（向後相容）。

### FR-3 精英行為（World.step）
- **再生**：每幀對 `affix==='regen'` 且存活的敵人 `hp = min(maxHp, hp + maxHp × regenPerSec × dt)`。
- **爆裂**：精英死亡（`killEnemy`）時若 `explodeOnDeath`，對範圍內玩家造成爆炸傷害（沿用 exploder 既有爆炸邏輯/數值）。
- **掉寶箱**：精英死亡時額外掉一個寶箱（沿用 Boss 掉寶箱機制）。

### FR-4 精英隨機混入
- 常態生怪時，開局 `ELITE_MIN_TIME`（60 秒）後，每次一般生怪有 `ELITE_RANDOM_CHANCE`（0.02）機率改為生成一隻精英（詞綴由 seeded rng 抽）。
- 精英隨機混入不適用於 swarm（bacteria 群）生成。

### FR-5 地圖事件（純邏輯 + World 排程）
- 新增 `GameEventKind = 'swarm-rush' | 'elite-pack' | 'encircle'`。
- `src/engine/systems/eventDefs.ts`：`GAME_EVENT_DEFS`（含 `kind / name / warning`）與 `GAME_EVENT_ORDER`。
- `src/engine/systems/events.ts`（純函式，比照 spawn.ts）：
  - `pickEvent(rng: Rng): GameEventKind` — 依固定順序加權/等機率抽一種。
- World 接線：
  - `eventTimer` 初值 `EVENT_INTERVAL`（150 秒）；每 150 秒挑一個事件。
  - 觸發前 `EVENT_WARNING_LEAD`（5 秒）進入預警狀態，`summary.eventWarning` 帶警告字串。
  - 事件效果：
    - `swarm-rush`：自單一隨機方向短時間湧入一批弱怪（沿用環上座標 + 既有弱怪）。
    - `elite-pack`：一次生成 `ELITE_PACK_COUNT`（3）隻精英（隨機詞綴）。
    - `encircle`：在玩家四周整圈均勻生成一批敵人。

### FR-6 呈現層
- `PixiRenderer` 對 `entity.affix` 存在的敵人加畫**發光光環**（用 `auraColor`），與既有敵人造型疊加。
- HUD 顯示 `summary.eventWarning` 預警橫幅（存在才顯示，事件開始後清空）。

---

## 4. Acceptance Criteria（驗收標準）

詳見 `acceptance.md`。摘要：4 詞綴數值正確套用；精英 hp×3/xp×5、死亡掉寶箱、爆裂死亡爆炸、再生回血；隨機精英於 60 秒後依機率混入；事件每 150 秒觸發、預警 5 秒、三種事件行為正確；確定性與引擎邊界不變；單元測試 + 既有測試全綠、型別/build 乾淨；光環與預警橫幅實機目視。

---

## 5. Edge Cases（邊界情況）

- **省略 affix**：`spawnEnemyAt(pos, kind)` 行為與現況一致；既有測試不壞。
- **swarm 不變精英**：bacteria 群生成路徑不套隨機精英。
- **再生與致死同幀**：先結算傷害再回血；hp ≤ 0 當幀仍判定死亡（回血在存活敵人上做）。
- **爆裂精英被多段傷害同幀擊殺**：只觸發一次爆炸（沿用 exploder 既有一次性判定）。
- **預警期間玩家暫停**：固定步長下計時凍結，預警不誤觸（暫停即不 step）。
- **Boss 與事件重疊**：兩者獨立計時，可同時發生（刻意保留壓力）。

---

## 6. API Contracts（介面契約）

```ts
// types.ts
export type EliteAffix = 'giant' | 'frenzy' | 'regen' | 'volatile'
export type GameEventKind = 'swarm-rush' | 'elite-pack' | 'encircle'
export interface Entity { /* …既有… */ affix?: EliteAffix }
export interface Summary { /* …既有… */ eventWarning?: string }

export interface EliteAffixDef {
  affix: EliteAffix; name: string; auraColor: number
  hpMult: number; radiusMult: number; speedMult: number; damageMult: number
  regenPerSec: number; explodeOnDeath: boolean
}
export interface GameEventDef { kind: GameEventKind; name: string; warning: string }

// systems/eliteDefs.ts
export const ELITE_AFFIX_DEFS: Record<EliteAffix, EliteAffixDef>
export const ELITE_AFFIX_ORDER: EliteAffix[]

// systems/eventDefs.ts
export const GAME_EVENT_DEFS: Record<GameEventKind, GameEventDef>
export const GAME_EVENT_ORDER: GameEventKind[]

// systems/events.ts
export function pickEvent(rng: Rng): GameEventKind

// World.ts
spawnEnemyAt(pos: Vec2, kind?: EnemyKind, affix?: EliteAffix): Entity // 既有簽章後加選填 affix
```

- store 不新增方法；`summary.eventWarning` 隨既有 summary 推送鏈帶出。

---

## 7. Data Model Changes（資料模型變更）

- 新增型別 `EliteAffix`、`GameEventKind`、`EliteAffixDef`、`GameEventDef`。
- `Entity` 加選填 `affix`；`Summary` 加選填 `eventWarning`。
- 新增 `ELITE_AFFIX_DEFS`/`ELITE_AFFIX_ORDER`、`GAME_EVENT_DEFS`/`GAME_EVENT_ORDER`。
- `World` 新增計時/狀態欄位（`eliteTimer` 不需要——隨機混入走機率；`eventTimer`、事件預警狀態）。
- `spawnEnemyAt` 加選填參數 `affix`。

---

## 8. State Changes（狀態變更）

- World 每 step 推進事件計時、處理預警與觸發、處理 regen 回血。
- 精英/事件只增加生怪內容與一個 HUD 預警字串；升級/戰鬥/結算/勝負流程不變。

---

## 9. UI Behaviour（UI 行為）

- 精英敵人帶詞綴色發光光環，視覺上明顯區隔一般怪。
- 事件觸發前 5 秒 HUD 顯示預警橫幅（如「警告：怪潮來襲」），事件開始後消失。
- HUD/升級彈窗/Boss 血條/結算版面其餘不變。

---

## 10. Non-Functional Requirements（非功能需求）

- **確定性**：精英詞綴抽選、事件挑選、事件生怪一律走既有 seeded `rng`；模擬中不呼叫 `Math.random()`。
- **架構邊界**：`eliteDefs.ts`/`eventDefs.ts`/`events.ts`/`World` 純 TS；renderer/HUD 為呈現層。
- **TDD**：事件挑選/排程、精英套用/行為寫單元測試；光環/預警橫幅不寫單元測試。
- **資源清理**：`Game.stop()`/`PixiRenderer.destroy()` 維持冪等。

---

## 11. 非目標（本 spec 明確不做）

- 金幣 / meta 商店（精英先掉寶箱，金幣另案）。
- 終局 Boss / 勝利條件 / 有限關卡狀態機（Spec B）。
- 環境危害地形（hazard zones）。
- 詞綴疊加（一隻精英僅 1 個詞綴）。
