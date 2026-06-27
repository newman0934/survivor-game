# Spec — Lockstep 核心（coop-lockstep-core，多人合作 子專案 4A）

**日期：** 2026-06-27
**功能名稱：** coop-lockstep-core
**所屬：** 多人合作連線 子專案 4（拆 4A/4B/4C），本份為 **4A：傳輸抽象 + lockstep 輸入迴圈 + loopback**
**上層設計：** `docs/superpowers/specs/2026-06-26-multiplayer-coop-design.md`（4.1 同步模型、子專案 4）
**狀態：** 待批准（Approval Gate）

---

## 1. Overview（總覽）

實作 lockstep 同步的**可測核心**：傳輸抽象 `NetTransport`、行程內 `LoopbackTransport`、協調器 `LockstepRunner`（每 tick 蒐集全員輸入、固定延遲幀緩衝、到齊才推進 `World.step`），並以 `World.checksum()`（SP2）驗證多端同步。

- **獨立新增 `src/engine/net/`（純 TS）+ 測試**；**不改** World/Game/store/UI/renderer → 零退化（既有檔案一行不動）。
- 升級選擇也走輸入流（`pick`），確保各端確定性一致。
- Game 接線、M-1、選單/等待室（4B）、真 Playroom adapter（4C）**不在本份**（需多人實跑、無法在此驗）。

---

## 2. Business Requirements（商業需求）

- lockstep 是多人合作的同步基礎；先把傳輸無關的核心 + loopback 做扎實並可單元測試，再接真網路（4C），降低風險與廠商綁定。
- 升級選擇納入輸入流，避免 lockstep 分歧。
- 不動既有單人程式，確保零退化。

---

## 3. Functional Requirements（功能需求）

### FR-1 輸入型別（net/types.ts）
- `PlayerInput = { move: { x: number; y: number }; pick?: string | null }`
  - `move`：該 tick 移動方向（鍵盤離散 `-1|0|1`，無浮點量化問題）。
  - `pick`：該 tick 該玩家選定的升級卡 id（無則省略/null）。
- `TickInputs = PlayerInput[]`（長度＝playerCount，依玩家 index）。

### FR-2 NetTransport 介面（net/types.ts）
```ts
export interface NetTransport {
  readonly playerCount: number
  readonly localIndex: number
  /** 送出本地玩家某 tick 的輸入。 */
  sendInput(tick: number, input: PlayerInput): void
  /** 取某 tick 全員輸入；尚未到齊回 null。 */
  inputsForTick(tick: number): TickInputs | null
}
```

### FR-3 LoopbackTransport（net/loopbackTransport.ts）
- `LoopbackBus`：共享輸入儲存，依 `(tick, playerIndex)` 存 `PlayerInput`；`get(tick, playerCount)` 在該 tick 全員到齊才回 `TickInputs`、否則 null。
- `LoopbackTransport implements NetTransport`：`constructor(bus, playerCount, localIndex)`；`sendInput(tick, input)` 寫入 bus[tick][localIndex]；`inputsForTick(tick)` 委派 `bus.get`。
- 供單一行程內模擬 N 玩家（測試 + 未來同機）。

### FR-4 LockstepRunner（net/lockstep.ts）
- `constructor(world: World, transport: NetTransport, inputDelay = 2)`。
- 內部：`currentTick`（下一個待執行 tick，自 0）、本地待送 tick 計數。
- **初始延遲窗**：建構時為本地玩家預送 `inputDelay` 筆中性輸入（`move:{x:0,y:0}`）至 tick 0..inputDelay-1，使緩衝存在、模擬可起步。
- `submitLocalInput(input: PlayerInput): void`：把本地輸入指派到 `(已送筆數)` 對應的 tick（即 `currentSubmit`，自 inputDelay 起），並 `transport.sendInput(tick, input)`；遞增本地送出計數。
- `tryAdvance(): boolean`：
  - 取 `transport.inputsForTick(this.currentTick)`；為 null（未到齊）→ 回 `false`（停滯）。
  - 到齊 → 依玩家 index 升冪：`world.setMoveInput(i, inputs[i].move)`；若 `inputs[i].pick` → `world.chooseUpgrade(i, inputs[i].pick)`。再 `world.step(1/60)`、`currentTick++`、回 `true`。
- `getCurrentTick(): number`、`checksum(): number`（委派 `world.checksum()`）。
- **不呼叫** `consumeLevelUp`（多人升級一律走 `pick` 輸入）→ 自然滿足 M-1 之精神於核心層。

### FR-5 確定性與順序
- 全程依玩家 index 升冪套用輸入；`world.step` 為既有固定步長；不引入時間/亂數。

---

## 4. Acceptance Criteria（驗收標準）

詳見 `acceptance.md`。摘要：`PlayerInput`/`NetTransport`/`LoopbackTransport`/`LockstepRunner` 完成；兩 runner 經共享 bus 各送自己輸入 → 每 tick checksum 完全相同；缺輸入時 `tryAdvance` 停滯、到齊恢復；inputDelay 生效（T 送的輸入 T+delay 套用）；`pick` 於該 tick 以 `chooseUpgrade` 套用；相同腳本兩跑 checksum 序列一致；**不動既有檔案、既有測試全綠**；型別/build 乾淨。

---

## 5. Edge Cases（邊界情況）

- **初始 inputDelay 窗**：預送中性輸入使 tick 0..inputDelay-1 可執行（雙端對稱 → 同步）。
- **缺一玩家輸入**：`inputsForTick` 回 null → runner 停滯、不前進、不丟例外；輸入到齊後續推。
- **pick 指向非待選 id**：`world.chooseUpgrade` 既有「非待選 id 安靜略過」（1B）保護。
- **單人（playerCount 1）跑 runner**：可運作（每 tick 只需本地輸入）；但實務單人仍用既有 Game 迴圈，runner 不接（本份不接 Game）。
- **tick 單調遞增**：currentTick 只增不退（無 rollback）。

---

## 6. API Contracts（介面契約）

```ts
// engine/net/types.ts
export interface PlayerInput { move: { x: number; y: number }; pick?: string | null }
export type TickInputs = PlayerInput[]
export interface NetTransport {
  readonly playerCount: number
  readonly localIndex: number
  sendInput(tick: number, input: PlayerInput): void
  inputsForTick(tick: number): TickInputs | null
}

// engine/net/loopbackTransport.ts
export class LoopbackBus {
  submit(tick: number, playerIndex: number, input: PlayerInput): void
  get(tick: number, playerCount: number): TickInputs | null
}
export class LoopbackTransport implements NetTransport { /* …上述… */ }

// engine/net/lockstep.ts
export class LockstepRunner {
  constructor(world: World, transport: NetTransport, inputDelay?: number)
  submitLocalInput(input: PlayerInput): void
  tryAdvance(): boolean
  getCurrentTick(): number
  checksum(): number
}
```

- `World` 既有 `setMoveInput`/`chooseUpgrade`/`step`/`checksum` 皆已存在（1A/1B/SP2）；本份不改 World。

---

## 7. Data Model Changes（資料模型變更）

- 新增 `engine/net/{types,loopbackTransport,lockstep}.ts`。
- 無既有型別/World/store 變更。

---

## 8. State Changes（狀態變更）

- `LockstepRunner` 推進其持有的 `World`；輸入經 transport 緩衝。
- 不影響既有單人執行路徑（未接 Game）。

---

## 9. UI Behaviour（UI 行為）

- 無 UI 變更（4B 才接選單/等待室）。

---

## 10. Non-Functional Requirements（非功能需求）

- **確定性**：runner 依固定 index 套用輸入、走既有 seeded 固定步長；不呼叫時間/亂數；兩端同輸入 → 同 checksum。
- **架構邊界**：`engine/net/**` 純 TS、無 Vue/Pinia 執行期；不 import renderer/UI。
- **可測**：loopback + checksum 使核心可完整單元測試（CI 友善）。
- **零退化**：不動既有檔案，既有測試全綠。

---

## 11. 非目標（本 spec 明確不做）

- Game 迴圈改用 LockstepRunner、M-1 的 Game 接線、單人/多人共用驅動（4B/4C）。
- 主選單多人分層、建立/加入/等待室、房間碼（4B）。
- 真 Playroom（或任何外部 SDK）adapter、種子廣播、斷線/房主離開（4C）。
- rollback / 預測回滾、輸入壓縮、抗作弊（整體不做）。
