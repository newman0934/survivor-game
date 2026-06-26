# Spec — 多玩家 World 結構重構（coop-multiplayer-world，多人合作 子專案 1A）

**日期：** 2026-06-27
**功能名稱：** coop-multiplayer-world
**所屬：** 多人合作連線 子專案 1（拆 1A/1B），本份為 **1A：players[] 結構重構**
**上層設計：** `docs/superpowers/specs/2026-06-26-multiplayer-coop-design.md`
**狀態：** 待批准（Approval Gate）

---

## 1. Overview（總覽）

把 `World` 從「唯一玩家」重構為「`players: PlayerState[]` 多玩家共享一個 World」，所有 system（生怪/敵人 AI/武器/碰撞/經驗/撿取/死亡）改為對 N 個玩家運作，難度依人數放大。

- **純引擎、零網路、可 TDD**；多鏡頭/多 HUD/等待室/選單/連線都不在本份（屬 SP3/SP4）。
- **N=1 行為與現況完全一致**：透過「指向 `players[0]` 的相容存取器 + 建構子重載」，既有 World 測試全套保留即為 N=1 回歸護欄。
- **升級流程僅做引擎層 per-player 資料**；單人 Game/store/UI 暫停握手不變；N>1 的非阻塞升級 UX 留 **1B**。

---

## 2. Business Requirements（商業需求）

- 為多人合作（同場 N 玩家、共享敵群）打地基；此為整條多人功能風險最低、可離線驗證的第一塊。
- 不破壞單人：N=1 零退化是硬性要求。
- 沿用既有純函式 system（多吃「目標座標/stats」參數），重構集中在 World 編排層，blast radius 可控。
- 不破壞架構紅線：引擎純 TS、無 Vue/Pinia 執行期依賴；確定性（seeded rng）；固定步長 1/60。

---

## 3. Functional Requirements（功能需求）

### FR-1 PlayerState 與 players[]
- 新增 `PlayerState`（每位玩家一份）：`entity / character / stats / weapons / passives / level / xp / pendingLevelUps / lastMoveDir / vacuumTimer / alive`。
- `World` 改持有 `players: PlayerState[]`，取代散落的單人欄位（`player/stats/weapons/passives/level/xp/lastMoveDir/vacuumTimer/pendingLevelUps`）。
- 共享狀態（`enemies/gems/chests/pickups/rng/pickupRng/elapsed/spawnTimer/bossTimer/eventTimer/bossCount/finalBoss*/map*`）維持單份。

### FR-2 建構子重載與相容存取器
- 建構子：`constructor(seed: number, character: CharacterKind | CharacterKind[] = 'macrophage', map: MapKind = 'vessel', finalBossTime?: number)`。
  - 傳單一 `CharacterKind` → 一名玩家（N=1，與現況等價）。
  - 傳 `CharacterKind[]` → 依序建立 N 名玩家（各自起始狀態）。
- 相容存取器一律指向 `players[0]`，使既有呼叫端/測試零改動：
  - `get player()`、`get stats()`、`get weapons()`、`get passives()`、`get level()`、`get playerColor()`、`get playerCharacter()`。
  - `isPlayerDead()`（players[0] 不存活）、`loadoutSnapshot()`、`consumeLevelUp()`、`applyUpgrade(id)`、`grantXp(amount)`、`set moveInput(v)` 皆作用於 players[0]。

### FR-3 輸入（indexed）
- 新增 `setMoveInput(playerIndex: number, dir: Vec2): void`。
- 保留 `set moveInput(v: Vec2)` 相容設定器（= `setMoveInput(0, v)`），使 `Game.ts` 既有 `this.world.moveInput = …` 不需改。

### FR-4 各 system 對 N 玩家運作
- **玩家移動**：每位存活玩家依自己的 `moveInput × stats.moveSpeed` 位移；更新各自 `lastMoveDir`。
- **敵人 AI**：每隻敵人每幀朝**最近的存活玩家**轉向（`steerEnemy` 餵該玩家座標）；spitter 朝最近存活玩家吐彈。
- **武器**：每位存活玩家各自的 `weapons`，瞄準「離該玩家最近的敵人」，用該玩家 `stats` 與 `lastMoveDir` 開火。
- **碰撞/接觸傷害**：敵人傷害它重疊到的玩家（逐玩家判定，套該玩家護甲）。
- **經驗/寶石**：寶石被進入其 `pickupRadius`（或 vacuum 範圍）的玩家逐顆收取，`grantXp` 只加到該玩家、可能觸發該玩家升級。
- **撿取物**：heal → 回收的玩家補血；vacuum → 啟動「觸發玩家」的全場吸取（吸向該玩家）；mercy 回血掉落門檻 = **任一存活玩家** `hp < maxHp × 0.5`。
- **寶箱**：碰到的玩家收取並使該玩家 `pendingLevelUps += 1`。

### FR-5 難度依人數
- 生怪量 ×N：常態生怪間隔改為 `spawnInterval(elapsed) × mapSpawnIntervalMult ÷ playerCount`。
- Boss 與終局 Boss 的 hp ×N（`× playerCount`），疊乘既有縮放。
- 敵人個體數值（一般怪 hp/speed/damage）不因人數改變。

### FR-6 死亡 / 觀戰 / 結束
- 玩家 `entity.hp ≤ 0` → 該 `PlayerState.alive = false`：不再被敵人瞄準、不開火、不再受接觸傷害、不收撿取物。
- `hasLost(): boolean` = 全部玩家皆不存活。
- N=1：`isPlayerDead()`（players[0] 死）與 `hasLost()` 等價，結束時機同現況。

### FR-7 對 UI 的輸出（1A 不動畫面）
- `summary()` 以 `players[0]` 產生（與現況同欄位）；Boss 血條偵測不變。
- `Game.ts` 改用相容存取器（或 `hasLost()`）驅動 N=1；`PixiRenderer` 玩家改畫 `players[0]`。多玩家渲染/HUD 屬 SP3。

---

## 4. Acceptance Criteria（驗收標準）

詳見 `acceptance.md`。摘要：既有 World 測試全套不改且全綠（N=1 回歸）；新增 N>1 測試（獨立 loadout/升級、敵人追最近玩家、難度 ×N、Boss hp ×N、接觸傷害對應玩家、死亡/觀戰/hasLost、基本確定性）；引擎邊界與確定性不變；型別/build 乾淨；單人實機行為照舊。

---

## 5. Edge Cases（邊界情況）

- **N=1 完全等價**：相容存取器 + array-of-1，既有測試與單人實機不變。
- **全員死亡同幀**：`hasLost()` 一致回 true。
- **某玩家死亡後**：其 entity 不被瞄準/不開火；敵人 AI 的「最近存活玩家」需排除死者；若所有玩家皆死，敵人 AI 維持最後狀態（不崩潰，世界即將結束）。
- **寶石同幀被多名玩家觸及**：以固定玩家迭代順序（index 升冪）判定收取，確保確定性。
- **mercy 回血**：門檻看任一存活玩家，掉落仍走既有 `pickupRng` 機率（與單人同序列，N=1 不變）。
- **vacuum 由多名玩家先後觸發**：各自有 `vacuumTimer`；吸取以「該玩家」為目標。

---

## 6. API Contracts（介面契約）

```ts
// types.ts
export interface PlayerState {
  entity: Entity
  character: CharacterKind
  stats: PlayerStats
  weapons: Weapon[]
  passives: Passive[]
  level: number
  xp: number
  pendingLevelUps: number
  lastMoveDir: Vec2
  vacuumTimer: number
  alive: boolean
}

// World.ts
constructor(seed: number, character?: CharacterKind | CharacterKind[], map?: MapKind, finalBossTime?: number)
players: PlayerState[]
get playerCount(): number
setMoveInput(playerIndex: number, dir: Vec2): void
hasLost(): boolean
// 相容存取器（皆作用於 players[0]）：
get player(): Entity; get stats(): PlayerStats; get weapons(): Weapon[]; get passives(): Passive[]
get level(): number; get playerColor(): number; get playerCharacter(): CharacterKind
set moveInput(v: Vec2)
isPlayerDead(): boolean; loadoutSnapshot(): LoadoutSnapshot
grantXp(amount: number): void; consumeLevelUp(): boolean; applyUpgrade(id: string): void
```

- store / `Summary` 形狀不變（仍 players[0] 視角）；`Game.ts`/`PixiRenderer` 僅最小調整。

---

## 7. Data Model Changes（資料模型變更）

- 新增 `PlayerState`；`World` 以 `players: PlayerState[]` 取代單人欄位。
- 建構子簽章擴充（`character` 接受陣列）；新增 `setMoveInput`/`hasLost`/`playerCount`。
- 既有單人欄位改為相容存取器（行為不變）。

---

## 8. State Changes（狀態變更）

- World 每 step 逐玩家跑移動/武器/碰撞/撿取；共享敵群一次生成、AI 對最近玩家。
- 死亡使玩家退出作用；全員死亡結束。
- N=1 的升級/結算/暫停握手與現況一致。

---

## 9. UI Behaviour（UI 行為）

- 1A 不改畫面：單人維持現有 HUD/選單/升級/結算/Boss 血條；多人 UI 屬 SP3。
- `PixiRenderer` 在 1A 僅確保以 `players[0]` 畫玩家與鏡頭中心（行為同現況）。

---

## 10. Non-Functional Requirements（非功能需求）

- **確定性**：玩家以固定 index 順序迭代；寶石/碰撞判定順序固定；模擬中不呼叫 `Math.random()`；相同 seed + 相同 N 組輸入 → 相同結果。
- **架構邊界**：`World`/`types`/systems 純 TS；renderer/UI 呈現層。
- **TDD**：N=1 回歸（既有測試）＋ N>1 新測試；refactor 不得讓既有測試失敗。
- **資源清理**：`Game.stop()`/`PixiRenderer.destroy()` 維持冪等。

---

## 11. 非目標（本 spec 明確不做）

- 非阻塞升級流程 + 逾時確定性自動選（**1B**）。
- 多鏡頭、多/簡化 HUD、隊友指示、走散處理（SP3）。
- 主選單單人/多人分層、建立/加入/等待室（SP3）。
- 確定性全面稽核（盤點 sin/sqrt 等）與回放雜湊測試（SP2）。
- 網路傳輸 / 房間 / 種子廣播（SP4）。
- 復活、房主遷移、中途加入、PvP（整體多人 Non-Goals）。
