# Spec — 非阻塞升級流程（coop-upgrade-nonblocking，多人合作 子專案 1B）

**日期：** 2026-06-27
**功能名稱：** coop-upgrade-nonblocking
**所屬：** 多人合作連線 子專案 1（1A 已完成），本份為 **1B：非阻塞升級流程（D-1）**
**上層設計：** `docs/superpowers/specs/2026-06-26-multiplayer-coop-design.md`（D-1）
**狀態：** 待批准（Approval Gate）

---

## 1. Overview（總覽）

多人 lockstep 下不能為一名玩家暫停全場。1B 在 `World` 內新增 **per-player 非阻塞升級流程**：玩家升級時於該玩家畫面出現限時升級選項，世界持續推進；逾時則以**確定性規則自動選**，確保各機器一致。

- **單人（playerCount===1）路徑完全不變**：維持現有「暫停 + UpgradeModal + 無限時間」握手（D-1 單人特例）。新流程在單人時為 no-op。
- **多人（playerCount>1）**：啟用 World 的非阻塞流程。**選項產生與逾時自動選移進 World**（用 World 獨立 seeded rng），跨機一致。
- 純引擎、可 TDD；多人升級**浮層 UI（倒數條、各玩家獨立顯示）屬 SP3**，本份不做。

---

## 2. Business Requirements（商業需求）

- 讓多人合作可實際運作：升級不暫停全場，避免 4 人頻繁升級互相打斷。
- 為 lockstep 提供確定性升級（選項 + 自動選跨機一致）。
- 單人零退化（沿用現有暫停選卡的良好 solo 體驗）。
- 沿用既有 `rollUpgrades`/`ALL_UPGRADES`/`applyUpgradeById`（leveling.ts 純函式），不重複邏輯。

---

## 3. Functional Requirements（功能需求）

### FR-1 World 升級 rng 與 per-player 待選狀態
- `World` 新增 `upgradeRng = createRng(seed ^ 0x9e3779b9)`（獨立 seeded 串流，使選項跨機一致、且不擾動既有 spawn/combat/pickup 串流）。
- `PlayerState` 新增：
  - `pendingOffer?: UpgradeOption[]`（目前提供的待選卡；無則 undefined）。
  - `upgradeTimer: number`（待選逾時倒數秒；初值 0）。

### FR-2 非阻塞升級處理（僅 playerCount>1）
- `World.step(dt)` 新增 `processUpgrades(dt)`，**僅當 `playerCount > 1` 時生效**（單人為 no-op）：
  - 對每位玩家，依固定 index 升冪：
    - 若 `pendingLevelUps > 0` 且 `pendingOffer` 為空 → 以 `rollUpgrades(this.upgradeRng, 3, this.upgradeContextFor(p))` 產生待選卡、設 `p.upgradeTimer = UPGRADE_TIMEOUT`。
    - 若 `pendingOffer` 存在 → `p.upgradeTimer -= dt`；`<= 0` 時**自動選第一張**（`pendingOffer[0]`）→ 套用 → 清 `pendingOffer` → `pendingLevelUps -= 1`。
  - 一次升多級：選定/逾時消一張後，若仍 `pendingLevelUps > 0`，下一格再產下一輪（逐張依序）。

### FR-3 升級常數
- `UPGRADE_TIMEOUT = 12`（秒）。

### FR-4 World 對外 API（供 UI / 測試 / SP3）
- `pendingOfferFor(playerIndex: number): UpgradeDescriptor[] | null` — 該玩家目前待選卡的 `{id,label}`（無則 null）。
- `upgradeTimeRemaining(playerIndex: number): number` — 該玩家待選剩餘秒（無待選則 0）。
- `chooseUpgrade(playerIndex: number, id: string): void` — 玩家於逾時前選定：在該玩家 `pendingOffer` 找對應 id 套用（`applyUpgradeById` via `upgradeContextFor(p)`），清 `pendingOffer`、`pendingLevelUps -= 1`；id 不在待選中則安靜略過。

### FR-5 玩家手感（多人）
- 升級浮層期間角色**照常可動**（非阻塞；不凍結輸入）。
- 浮層 UI（倒數條、各玩家獨立）屬 SP3；1B 僅提供上述狀態/API 供其讀取。

### FR-6 單人路徑不變
- `playerCount === 1` 時：`processUpgrades` 不動任何狀態；`consumeLevelUp()`/`applyUpgrade(id)`/Game 暫停握手/UpgradeModal 全部維持現況。

---

## 4. Acceptance Criteria（驗收標準）

詳見 `acceptance.md`。摘要：多人玩家升級→`pendingOfferFor` 回 3 張且世界不暫停；逾時 12s 自動選第一張並套用、pendingLevelUps 遞減；`chooseUpgrade` 逾時前選定套用該卡；一次升多級逐張；選項與自動選跨機確定性；單人路徑零退化（既有升級測試全綠、processUpgrades no-op）；引擎邊界/確定性不變；型別/build 乾淨。

---

## 5. Edge Cases（邊界情況）

- **單人**：processUpgrades 完全 no-op；既有 `consumeLevelUp`/`applyUpgrade` 行為不變。
- **一次升多級**：逐張依序，每張各自 12s（或被選定/逾時後立即產下一張）。
- **chooseUpgrade 傳入非待選 id**：安靜略過、不改狀態（避免外部誤觸）。
- **玩家在有待選時死亡**：死亡玩家不再產新待選；既有待選可由 SP3 決定隱藏（引擎不強制清，但 `processUpgrades` 對死者不再倒數/自動選——以 `livingPlayers()` 或 alive 判斷）。
- **同一玩家逾時與被 chooseUpgrade 同幀**：以 chooseUpgrade 優先（玩家主動選定先處理；本格 processUpgrades 該玩家已無 pendingOffer 即略過）。
- **playerCount 由 1 變化**：本專案玩家數固定於建構（開打鎖房），無動態變更。

---

## 6. API Contracts（介面契約）

```ts
// types.ts — PlayerState 擴充
export interface PlayerState {
  /* …既有… */
  pendingOffer?: UpgradeOption[]
  upgradeTimer: number
}

// World.ts
// 新增私有：upgradeRng；step 內呼叫 processUpgrades(dt)（playerCount>1 才生效）
pendingOfferFor(playerIndex: number): UpgradeDescriptor[] | null
upgradeTimeRemaining(playerIndex: number): number
chooseUpgrade(playerIndex: number, id: string): void

// leveling.ts（不變，沿用）
export function rollUpgrades(rng: Rng, count: number, ctx: UpgradeContext): UpgradeOption[]
export function applyUpgradeById(id: string, ctx: UpgradeContext): void

// 常數
const UPGRADE_TIMEOUT = 12
```

- 單人 `Game.ts`/`store`/`UpgradeModal` 介面與行為不變。

---

## 7. Data Model Changes（資料模型變更）

- `PlayerState` 加 `pendingOffer?`、`upgradeTimer`。
- `World` 加 `upgradeRng`、`processUpgrades`、`pendingOfferFor`、`upgradeTimeRemaining`、`chooseUpgrade`、`UPGRADE_TIMEOUT`。
- 無 store/Summary 形狀變更（多人 UI 屬 SP3）。

---

## 8. State Changes（狀態變更）

- 多人時 World 每 step 推進各玩家待選/倒數/自動選；世界不暫停。
- 單人時升級流程與現況完全一致。

---

## 9. UI Behaviour（UI 行為）

- 1B 不改畫面：單人維持 UpgradeModal 暫停選卡。
- 多人升級浮層（倒數條、各玩家獨立、邊玩邊選）屬 SP3，僅消費 1B 的 `pendingOfferFor`/`upgradeTimeRemaining`/`chooseUpgrade`。

---

## 10. Non-Functional Requirements（非功能需求）

- **確定性**：選項產生與逾時自動選一律走 `upgradeRng`（seeded）+ 固定 index 順序；模擬中不呼叫 `Math.random()`；相同 seed + 相同輸入 → 相同升級序列。
- **架構邊界**：`World`/`types`/`leveling` 純 TS；UI 屬呈現層。
- **TDD**：多人非阻塞流程 + 單人 no-op 回歸寫單元測試；UI 不寫單元測試。
- **N=1 零退化**：單人既有升級測試與行為不變。

---

## 11. 非目標（本 spec 明確不做）

- 多人升級浮層 UI、12s 倒數條視覺、各玩家畫面獨立顯示（SP3）。
- 單人改為非阻塞（單人刻意維持暫停選卡）。
- 確定性全面稽核 / 回放雜湊（SP2）。
- 網路傳輸 / 房間 / 種子廣播（SP4）。
- 升級被打斷的保護/減速生怪等數值調校（屬日後手感調整）。
