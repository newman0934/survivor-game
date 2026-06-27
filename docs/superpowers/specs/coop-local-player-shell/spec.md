# Spec — 本地玩家管線 + 多人升級浮層（coop-local-player-shell，多人合作 子專案 3）

**日期：** 2026-06-27
**功能名稱：** coop-local-player-shell
**所屬：** 多人合作連線 子專案 3（1A/1B/SP2 已完成）
**上層設計：** `docs/superpowers/specs/2026-06-26-multiplayer-coop-design.md`（子專案 3、D-8）
**狀態：** 待批准（Approval Gate）

---

## 1. Overview（總覽）

把引擎/UI 從「寫死 players[0]」改為「跟隨**本地玩家 index**」，並提供**多人非阻塞升級浮層 UI**（消費 1B）。為 SP4 連線鋪好「每台機器渲染自己的玩家」之路；單人＝index 0，行為完全不變。

- 走「連線就緒外殼（A 案）」：**不做**本地同螢幕分割畫面/第二輸入；渲染仍單鏡頭、跟本地玩家。
- 主選單多人分層 / 等待室併入 **SP4**（屆時有真網路資料）。
- 真正的多人視覺要 SP4 接網路才完整可見；SP3 以單人零退化 + 單元測試 + 程式審查驗收。

---

## 2. Business Requirements（商業需求）

- 連線版每台機器只渲染自己的玩家、用單鏡頭即可（D-8）；需先把管線參數化為 `localPlayerIndex`。
- 多人升級為非阻塞（1B）；需有對應浮層 UI 元件供本地玩家邊玩邊選。
- 單人零退化（硬性）。

---

## 3. Functional Requirements（功能需求）

### FR-1 World 視角化 API（加 playerIndex，預設 0）
- `World.summary(playerIndex = 0): Summary`：以該玩家產生 HUD 摘要（hp/maxHp/level/xp/xpNeeded/kills…）；Boss/事件欄位（bossActive/bossHp/bossMaxHp/isFinalBoss/eventWarning）為共享、不分玩家。
  - 省略參數＝players[0]（向後相容；`kills` 為全域共享計數，維持現況）。
- `World.loadoutSnapshot(playerIndex = 0): LoadoutSnapshot`：回該玩家的 weapons/passives 快照；省略＝players[0]。

### FR-2 Game 本地玩家接線
- `Game.start(canvasParent, seed, character, map, bloomEnabled = true, localPlayerIndex = 0)`：保存 `this.localPlayerIndex`。
- 迴圈各處改用 index：
  - 輸入：`world.setMoveInput(this.localPlayerIndex, dir)`（取代 `world.moveInput = dir`）。
  - 摘要：`store.updateSummary(world.summary(this.localPlayerIndex))`。
  - 持有：`store.setLoadout(world.loadoutSnapshot(this.localPlayerIndex))`。
  - 渲染：`renderer.render(world, this.localPlayerIndex)`。
- 死亡/勝利判定維持用 `world.hasLost()`/`world.isPlayerDead()`（單人）；多人結束＝`hasLost()`（已於 1A 提供）。

### FR-3 Renderer 跟本地玩家 + 渲染全部玩家
- `PixiRenderer.render(world, localPlayerIndex = 0)`：
  - 鏡頭中心、升級閃光、地圖/大蒜光環等「玩家相對」視覺改用 `world.players[localPlayerIndex].entity`（及其 `color`/`character`）。
  - **渲染全部玩家**：對 `world.players` 每位畫其 `entity`，各用自己的 `color`/`character`（多人時看得到隊友）。
- 省略 index＝0（單人等同現況：只有一位玩家、鏡頭跟它）。

### FR-4 store 多人升級狀態
- `store` 新增：
  - `localPlayerIndex: number`（預設 0；`start()` 重置 0；供 UI）。
  - `multiOffer: UpgradeDescriptor[] | null`（本地玩家目前待選；無則 null）。
  - `multiOfferTimeLeft: number`（倒數秒）。
  - action `setMultiOffer(offer, timeLeft)`（引擎→store 推送）。
  - action `pickMultiUpgrade(id)`（UI→引擎：呼叫已註冊的 `onMultiUpgradePicked?.(id)`）。
  - `onMultiUpgradePicked: ((id: string) => void) | null`（Game 設定 → `world.chooseUpgrade(localPlayerIndex, id)`）。

### FR-5 Game 推送本地待選 + 多人浮層元件
- Game 迴圈（**僅 `world.playerCount > 1`**）每幀推送：`store.setMultiOffer(world.pendingOfferFor(localPlayerIndex), world.upgradeTimeRemaining(localPlayerIndex))`；無待選時推 `(null, 0)`。
- Game 開賽時設定 `store.onMultiUpgradePicked = (id) => world.chooseUpgrade(localPlayerIndex, id)`。
- 新元件 `src/ui/MultiUpgradeOverlay.vue`：`store.multiOffer` 存在時顯示**非阻塞**限時卡列（沿用 GameIcon/膜質風格）+ 倒數條（依 `multiOfferTimeLeft`）；點卡 → `store.pickMultiUpgrade(id)`；`pointer-events` 僅卡片可點、不擋遊戲輸入、不暫停。
- `App.vue` 在 `phase==='playing'` 期間掛載 `MultiUpgradeOverlay`。

### FR-6 單人零退化
- 單人（`Game.start` 省略 index＝0、`playerCount===1`）：summary(0)/loadout(0)/render(world,0) 全等現況；`setMultiOffer` 不被推送（playerCount 1 不進多人分支）→ `multiOffer` 恆 null → 浮層不顯示；既有暫停 UpgradeModal 流程不變。

---

## 4. Acceptance Criteria（驗收標準）

詳見 `acceptance.md`。摘要：`summary(i)`/`loadoutSnapshot(i)` 回對應玩家、省略＝players[0]；Game 各處改用 localPlayerIndex；renderer 跟本地玩家並渲染全部玩家；store 多人升級狀態 + 浮層元件非阻塞；單人零退化（既有測試全綠、實機不變）；型別/build 乾淨。

---

## 5. Edge Cases（邊界情況）

- **localPlayerIndex 越界**：理論不會（由 Game 設定合法值）；`summary(i)`/`render` 對不存在 index 應退回 players[0] 或安全略過（防呆）。
- **本地玩家死亡**：仍以該 index 為鏡頭中心（觀戰跟自己最後位置）；HUD 顯示其 0 血；多人結束待全員死。
- **多人浮層與單人 UpgradeModal**：互斥——單人只有 UpgradeModal（暫停），多人只有 MultiUpgradeOverlay（非阻塞、playerCount>1 才推）。
- **浮層顯示中世界推進**：非阻塞，玩家照常移動（1B 行為）；倒數歸零由 1B 自動選、store 下一幀推 null → 浮層消失。

---

## 6. API Contracts（介面契約）

```ts
// World.ts
summary(playerIndex?: number): Summary           // 預設 0
loadoutSnapshot(playerIndex?: number): LoadoutSnapshot  // 預設 0

// Game.ts（character 維持單一；多角色陣列構造留 SP4 等待室）
static start(canvasParent: HTMLElement, seed: number, character: CharacterKind,
             map: MapKind, bloomEnabled?: boolean, localPlayerIndex?: number): Promise<Game>

// PixiRenderer.ts
render(world: World, localPlayerIndex?: number): void  // 預設 0

// stores/game.ts
localPlayerIndex: number
multiOffer: UpgradeDescriptor[] | null
multiOfferTimeLeft: number
onMultiUpgradePicked: ((id: string) => void) | null
setMultiOffer(offer: UpgradeDescriptor[] | null, timeLeft: number): void
pickMultiUpgrade(id: string): void
```

- 單人呼叫端（App.vue 的 `Game.start(...)` 5 參數）因新參數有預設值而**不需改動**。

---

## 7. Data Model Changes（資料模型變更）

- `World.summary`/`loadoutSnapshot` 加選填 `playerIndex`。
- `Game` 加 `localPlayerIndex`；`Game.start` 加選填參數。
- `PixiRenderer.render` 加選填 `localPlayerIndex`。
- `store` 加 `localPlayerIndex`/`multiOffer`/`multiOfferTimeLeft`/`onMultiUpgradePicked` + 2 actions。
- 新增 `MultiUpgradeOverlay.vue`。

---

## 8. State Changes（狀態變更）

- 引擎→store：多人時每幀推本地待選；單人不推。
- 渲染以本地玩家為中心、畫全部玩家。
- 單人所有流程不變。

---

## 9. UI Behaviour（UI 行為）

- 單人：HUD/升級/結算/Boss 血條完全照舊。
- 多人（SP4 接網路後完整可見）：HUD 顯示本地玩家數值；畫面可見隊友；本地玩家升級時出現非阻塞限時卡列 + 倒數條，邊玩邊選。

---

## 10. Non-Functional Requirements（非功能需求）

- **確定性**：本案不改模擬邏輯（只改視角/UI 推送）；World.summary/loadoutSnapshot 唯讀。
- **架構邊界**：World/Game 純 TS（Game 為膠水層）；renderer/UI 呈現層。
- **TDD**：World.summary(i)/loadoutSnapshot(i) 寫單元測試；renderer/Game/UI 為呈現/膠水層、實機 + 審查。
- **N=1 零退化**：單人既有測試與行為不變。

---

## 11. 非目標（本 spec 明確不做）

- 主選單單人/多人分層、建立/加入/等待室（SP4 一起做）。
- 本地同螢幕分割畫面、本地第二輸入源（A 案排除）。
- 網路傳輸 / 房間 / 種子廣播（SP4）。
- 隊友 HUD 小指示/走散箭頭（屬日後 polish；本案僅「畫得出隊友 entity」）。
