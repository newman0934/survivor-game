# 多人合作 4C — Playroom（Free）adapter 設計

_日期：2026-06-28　子專案：coop-playroom-adapter（多人合作最後一塊：真連線）_

## Overview

把既有的多人 lockstep 地基（1A→4B-2，皆以 `LoopbackSession`/`LoopbackTransport`
在單機驗證）接上**真實跨機連線**。做法是用 [Playroom Kit](https://joinplayroom.com)
（Free 方案，免 API key、免信用卡、非商業、10 DAU）實作既有的兩個抽象介面：

- `NetSession`（4B-1，大廳）→ `PlayroomSession`
- `NetTransport`（4A，局內每 tick 輸入）→ `PlayroomTransport`

完成後，主選單「多人」改用 `PlayroomSession`，玩家可建立/加入真房間，
跨機以確定性 lockstep 合作遊玩。

## Business Requirements

- 私房好友合作（2–4 人）即可，Free 方案足夠。
- 部署在 GitHub Pages（純靜態、HTTPS）；client 主動對外連線（wss），不需自架伺服器。
- 不得破壞單人與既有 312 測試。

## Functional Requirements

### 架構落點（純引擎邊界）
- `playroomkit` 為第三方網路庫（含瀏覽器 globals/timers），**不得進入純引擎**。
- adapter 放 app 層 **`src/net/playroom/`**，只 `import type` 引擎的 `NetSession`/`NetTransport`/相關型別。
- `engine/net/` 維持純 TS（介面 + Loopback 實作續留，供單元測試與本地單機測試）。
- 確定性 source-guard 測試（`determinism.test.ts`）掃描範圍為模擬路徑（World/systems/core/net/lockstep 等），
  **不含** `src/net/playroom/`（adapter 非模擬路徑，允許 `Math.random`/timers/network）。

### PlayroomSession（大廳，實作 `NetSession`）
- 初始化：`insertCoin({ skipLobby: true })` — 使用我們自己的 `WaitingRoom`，不用 Playroom 內建大廳 UI。
- 玩家列表：`onPlayerJoin(cb)` 維護 `LobbyPlayer[]`；任何狀態變動經 `onChange` 回呼推給 store。
- 角色/就緒：`player.setState('character', kind)` / `player.setState('ready', bool)`；本地經 `setCharacter`/`setReady` 寫入。
- 房主：`isHost()` 決定 `isHost`；房主可 `setMap`（寫 room-level state `'map'`），他人 `getMap` 讀取。
- 房間碼/邀請：
  - 主要：`insertCoin({ roomCode })` 加入指定房；`getRoomCode()` 取得碼供房主分享。
  - 後備：若該版 API 不支援注入 roomCode，使用 URL `?r=CODE`（指南載明）。
- 開始：房主 `canStart`（人數 ≥2 且全員 ready）後 `start(seed)` → 廣播 seed + started 旗標（room state 或 start RPC）→ 各端 `onStart(seed, map, players)`。
- `toTransport(localIndex)` 回傳 `PlayroomTransport`。
- `leave()`：離開房間、清理回呼。

### playerIndex 一致性（lockstep 命脈）
- 所有機器對「誰是 index 0/1/2/3」必須有**相同共識**。
- 做法：**開局瞬間**凍結一份 `player.id` 排序後快照，`index = 排序位置`；各機獨立計算結果相同。
- `localIndex = 本地 id 在排序快照中的位置`。
- 此快照在 `onStart` 時建立並用於整局（局內玩家集合固定）。

### 種子（seed）
- 房主於 `start()` 產生 seed（`Math.random` — 屬選單/連線層，非模擬路徑，允許）。
- 經 start RPC / room state 廣播；他端沿用。
- 各端 `new World(seed, characters, map)` → 完全一致的初始狀態。

### PlayroomTransport（局內，實作 `NetTransport`）
- `playerCount`：開局快照玩家數；`localIndex`：本地排序位置。
- `sendInput(tick, input)`：`RPC.call('input', { tick, input }, RPC.Mode.ALL)`（reliable/ordered）；
  同時把本地輸入寫入自己的 `buffer[tick][localIndex]`。
- 收到 RPC：存入 `buffer[tick][senderIndex]`（senderIndex 由發送者 id 對快照解析）。
- `inputsForTick(tick)`：`buffer[tick]` 湊齊 `playerCount` 格才回 `TickInputs`，否則 `null`
  （`LockstepRunner` 自然等待，不推進）。

### 斷線處理（MVP，確定性安全）
- lockstep 不可「不同機在不同 tick 各自補中性」→ 會 desync。
- MVP 採最保守：**任一玩家 `onPlayerQuit` → 本局所有端結束**，回主選單並顯示「有玩家離線，本局結束」。
- 不做續跑、不做房主遷移（列為未來工作）。

### 接線
- `App.vue`「多人」改 `new PlayroomSession()`（取代 `LoopbackSession`）；
  其餘 `onChange`/`onStart`/`Game.startMultiplayer` 流程不變。
- `LoopbackSession` 保留（單元測試 + 本地單機煙霧測試）。
- 單人路徑完全不動。

## Acceptance Criteria

見 `acceptance.md`（唯一驗收來源）。核心：typecheck/build 對 `playroomkit` 真型別過、
單人零退化、既有測試全綠、附兩機手動測試指南。

## Edge Cases

- 加入不存在/已滿房間 → 顯示錯誤回主選單（依 Playroom 回報）。
- 房主在大廳離開 → 其他人回主選單（無遷移）。
- 玩家在 ready 後改角色 → 取消 ready（沿用 4B-1 既有規則，由 store/WaitingRoom 控制）。
- RPC 亂序/延遲 → 以 tick 為 key 緩衝，`inputDelay`（=2）吸收抖動；湊齊才推進。

## API Contracts

實作既有介面（不新增引擎介面）：
- `NetSession`（`engine/net/session.ts`）：`localId`、`roomCode`、`isHost`、`players()`、`setCharacter`、`setReady`、`setMap`、`getMap`、`onChange`、`canStart`、`start(seed)`、`onStart`、`leave`、`toTransport(localIndex)`。
- `NetTransport`（`engine/net/types.ts`）：`playerCount`、`localIndex`、`sendInput(tick, input)`、`inputsForTick(tick)`。
- Playroom 外部 API（依文件，實測可能需微調）：`insertCoin`、`onPlayerJoin`、`isHost`、`myPlayer`、`getRoomCode`、`getState`/`setState`、`RPC.register`/`RPC.call`、`onPlayerQuit`/player `.onQuit`。

## Data Model Changes

- 新增 npm 相依 `playroomkit`（打包進靜態 build）。
- 無引擎資料模型變更（沿用 `PlayerInput`/`TickInputs`/`LobbyPlayer`/`CharacterKind`）。

## State Changes

- 無新 store phase（沿用 `lobby`/`playing`/`won`/`over`）。
- 斷線結束沿用既有「回主選單」路徑，附離線提示文案。

## UI Behaviour

- 沿用 `MultiplayerMenu`/`WaitingRoom`/`MultiUpgradeOverlay`，不改版面。
- 房主在等待室看到可分享的房間碼/連結。

## Non-Functional Requirements

- 確定性：模擬路徑零 `Math.random`/`Date.now`/`performance.now`（adapter 的 seed/碼產生在連線層，允許）。
- 架構：純引擎不得 import Vue/Pinia/playroomkit；adapter 僅 `import type` 引擎型別。
- 零退化：單人與既有 312 測試不受影響。
- 可驗證界線：typecheck/build/單元測試可由我驗；真跨機同步由使用者兩機實測。

## 任務拆解（單一 spec，3 task）

1. 裝 `playroomkit` + `PlayroomSession`（大廳：房間/碼/角色/就緒/地圖/種子/開始/離開）。
2. `PlayroomTransport`（RPC 每 tick 輸入 + index 快照解析 + 斷線結束鉤）。
3. `App.vue` 接線（多人→PlayroomSession）+ 兩機手動測試指南。

## 未來工作（Non-Goals）

- 斷線續跑 / 房主遷移。
- 反作弊 / 權威伺服器（私房合作不需要）。
- 觀戰、重連。
