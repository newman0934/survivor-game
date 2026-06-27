# Spec — 連線會話抽象 + 主選單多人分層 + 等待室（coop-lobby-session，多人合作 4B-1）

**日期：** 2026-06-27
**功能名稱：** coop-lobby-session
**所屬：** 多人合作連線 子專案 4（4A 已完成；4B 拆 4B-1/4B-2，本份為 **4B-1**）
**上層設計：** `docs/superpowers/specs/2026-06-26-multiplayer-coop-design.md`（UX 流程、D-2/D-3/D-7）
**傳輸：** Playroom Kit（Free）；真連線 adapter 屬 4C
**狀態：** 待批准（Approval Gate）

---

## 1. Overview（總覽）

定義等待室階段的 `NetSession` 抽象與 `LoopbackSession`（行程內可測），並做主選單「單人/多人」分層 + 建立/加入/等待室 UI。本份到「房主按開始觸發 `onStart`」為止；進遊戲的 lockstep 驅動屬 4B-2、真 Playroom 連線屬 4C。

- 單人路徑**完全不動**（零退化）。
- `NetSession` 純 TS、可單元測試（LoopbackSession）；選單/等待室為呈現層（實機目視）。

---

## 2. Business Requirements（商業需求）

- 私房多人需要「建立/加入房間 + 等待室就緒」前置流程；先以抽象 + loopback 把流程跑起來，4C 再接真 Playroom，降風險、低廠商綁定。
- 不破壞單人。

---

## 3. Functional Requirements（功能需求）

### FR-1 NetSession 抽象（engine/net/session.ts）
```ts
export interface LobbyPlayer { id: string; character: CharacterKind; ready: boolean }
export interface NetSession {
  readonly localId: string
  readonly roomCode: string
  isHost(): boolean
  players(): LobbyPlayer[]              // 依加入順序＝遊戲玩家 index
  setCharacter(kind: CharacterKind): void
  setReady(ready: boolean): void
  setMap(kind: MapKind): void           // 僅房主有效
  getMap(): MapKind
  onChange(cb: () => void): void        // 等待室狀態（玩家/角色/就緒/地圖）變更時通知
  canStart(): boolean                   // 房主、≥2 人、全員就緒
  start(seed: number): void             // 僅房主：鎖房並觸發 onStart（本地廣播）
  onStart(cb: (seed: number, map: MapKind, players: LobbyPlayer[]) => void): void
  leave(): void
}
```
- 玩家上限常數 `MAX_PLAYERS = 4`、下限開始人數 2。

### FR-2 LoopbackSession（engine/net/loopbackSession.ts）
- 行程內單機實作：建立即為房主、`roomCode` 為固定/可注入字串、`localId` 固定。
- 起始僅含本地玩家（房主）；提供測試輔助 `addFakePlayer(character?)`/`removeFakePlayer(id)` 以模擬他人加入（供 UI 與測試，4C 由真連線取代）。
- `setCharacter/setReady` 改本地玩家；`setMap` 房主有效；任何變更呼叫 onChange 回呼。
- `canStart()`：isHost && players≥2 && 全員 ready。
- `start(seed)`：canStart 才執行——觸發 onStart(seed, map, players)。
- 加入上限：超過 `MAX_PLAYERS` 的 addFakePlayer 略過。

### FR-3 store lobby 狀態
- `store` 新增（供等待室響應式渲染）：`lobbyPlayers: LobbyPlayer[]`、`roomCode: string`、`isHost: boolean`、`lobbyMap: MapKind`、`canStart: boolean`。
- action `setLobby(state)`（App 在 session.onChange 時推入）；`reset()` 清空。
- 新增 Phase：`'lobby'`（建立/加入後、開始前的等待室階段）；`'menu'` 維持。

### FR-4 主選單分層 + UI
- `MainMenu.vue`：頂層加「單人遊玩 / 多人遊玩」。單人＝現有選角/選圖流程（不變）；多人＝進多人選單。
- `MultiplayerMenu.vue`：建立房間 / 加入房間（輸入邀請碼欄位）。
- `WaitingRoom.vue`（phase==='lobby'）：玩家列表（各自角色色/就緒）、本地玩家選角 + 就緒切換；房主另顯示選圖 + 「開始」鈕（`canStart` 才可按）；顯示房間碼。
- App：持有 `session`，建立/加入 → `phase='lobby'`；綁 session.onChange→store.setLobby、session.onStart→（4B-2 接遊戲；4B-1 先留 TODO/console）；離開等待室→leave + 回 menu。

### FR-5 單人零退化
- 單人路徑（MainMenu 單人 → startGame）與現況完全一致；不經 session。

---

## 4. Acceptance Criteria（驗收標準）

詳見 `acceptance.md`。摘要：`NetSession`/`LoopbackSession` 完成且可測（建房=房主、上限、setCharacter/Ready/Map、canStart 規則、start 觸發 onStart、玩家順序）；store lobby 狀態 + `'lobby'` phase；主選單單人/多人分層 + 多人選單 + 等待室 UI；單人零退化（既有測試全綠、單人實機不變）；型別/build 乾淨。

---

## 5. Edge Cases（邊界情況）

- **未滿 2 人或未全就緒**：`canStart` 為 false、開始鈕禁用。
- **非房主**：無選圖/開始權限；UI 隱藏或禁用。
- **加入超過 MAX_PLAYERS**：略過、不加入。
- **離開等待室**：`leave()` + 回 menu；房主離開語意（真行為屬 4C）。
- **單人**：完全不建立 session。

---

## 6. API Contracts（介面契約）

```ts
// engine/net/session.ts — 見 FR-1；常數 MAX_PLAYERS = 4
// engine/net/loopbackSession.ts
export class LoopbackSession implements NetSession {
  constructor(opts?: { roomCode?: string; localId?: string; localCharacter?: CharacterKind; map?: MapKind })
  addFakePlayer(character?: CharacterKind): string  // 測試/UI 模擬；回新玩家 id
  removeFakePlayer(id: string): void
}
// stores/game.ts
lobbyPlayers: LobbyPlayer[]; roomCode: string; isHost: boolean; lobbyMap: MapKind; canStart: boolean
setLobby(s: { players: LobbyPlayer[]; roomCode: string; isHost: boolean; map: MapKind; canStart: boolean }): void
// Phase 加 'lobby'
```

- 單人 `Game.start` / 既有流程不變。

---

## 7. Data Model Changes（資料模型變更）

- 新增 `engine/net/session.ts`（NetSession/LobbyPlayer/MAX_PLAYERS）、`engine/net/loopbackSession.ts`。
- `store` 加 lobby 狀態 + `setLobby` + `'lobby'` phase。
- 新增 `MultiplayerMenu.vue`、`WaitingRoom.vue`；`MainMenu.vue` 加分層。

---

## 8. State Changes（狀態變更）

- 多人：menu →（建立/加入）→ lobby（等待室）→（房主 start）onStart（4B-2 才進遊戲）。
- 單人：menu → playing（不變）。

---

## 9. UI Behaviour（UI 行為）

- 主選單多一層單人/多人；多人選單建立/加入；等待室顯示玩家/角色/就緒/房間碼，房主可選圖 + 開始。
- 單人 HUD/選角/結算等不變。

---

## 10. Non-Functional Requirements（非功能需求）

- **架構邊界**：`engine/net/**` 純 TS、無 Vue/Pinia 執行期；UI 呈現層。
- **TDD**：`LoopbackSession` 行為寫單元測試；UI 實機 + 結構。
- **零退化**：單人既有測試與行為不變。

---

## 11. 非目標（本 spec 明確不做）

- 進遊戲的 lockstep 驅動、M-1（4B-2）。
- 真 Playroom 連線、真房間碼/邀請連結、真 onPlayerJoin/斷線（4C）。
- 房主遷移、復活、中途加入。
