# Spec — Playroom（Free）adapter（多人合作 4C）

_子專案：coop-playroom-adapter。母設計：`../2026-06-28-coop-playroom-adapter-design.md`、`../2026-06-26-multiplayer-coop-design.md`。_

## Overview

以 Playroom Kit（Free）實作既有的 `NetSession`（4B-1）與 `NetTransport`（4A）抽象，
把單機驗證過的多人 lockstep 地基接上真實跨機連線。完成後主選單「多人」用 `PlayroomSession`，
玩家建立/加入真房間，跨機以確定性 lockstep 合作。

## Business Requirements

- 私房好友 2–4 人合作；Playroom Free（免 key、免卡、非商業、10 DAU）即足夠。
- 部署於 GitHub Pages（純靜態、HTTPS、wss 對外）；不自架伺服器。
- 不破壞單人與既有 312 測試。

## Functional Requirements

### FR1 架構邊界
- `playroomkit` 不得進入 `src/engine/**`。
- adapter 置於 `src/net/playroom/`，僅 `import type` 引擎型別。
- `engine/net/`（介面 + Loopback）維持純 TS 不動。
- `determinism.test.ts` source-guard 掃描不含 `src/net/playroom/`（adapter 非模擬路徑）。

### FR2 PlayroomSession（實作 NetSession）
- `insertCoin({ skipLobby: true })` 初始化，用自有 `WaitingRoom`。
- `onPlayerJoin` 維護玩家列表；變動經 `onChange` 推送。
- `setCharacter`/`setReady` → `player.setState`；`isHost()` → `isHost`。
- 房主 `setMap` 寫 room state；`getMap` 讀取。
- 房間碼：`insertCoin({ roomCode })` 加入、`getRoomCode()` 顯示；後備 URL `?r=CODE`。
- `start(seed)`：房主廣播 seed + started → 各端 `onStart(seed, map, players)`。
- `toTransport(localIndex)` 回 `PlayroomTransport`；`leave()` 清理。

### FR3 playerIndex 一致性
- 開局凍結 `player.id` 排序快照；`index = 排序位置`，各機一致。
- `localIndex = 本地 id 在快照位置`。

### FR4 種子廣播
- 房主 `start()` 產生 seed（`Math.random`，連線層允許），廣播；他端沿用。
- 各端 `new World(seed, characters, map)` 初始狀態一致。

### FR5 PlayroomTransport（實作 NetTransport）
- `playerCount` = 快照人數；`localIndex` = 排序位置。
- `sendInput(tick, input)` → `RPC.call('input', {tick, input})` + 本地寫 `buffer[tick][localIndex]`。
- 收 RPC → `buffer[tick][senderIndex]`（senderIndex 由 id 對快照解析）。
- `inputsForTick(tick)` 湊齊 playerCount 才回 `TickInputs`，否則 `null`。

### FR6 斷線處理（MVP）
- 任一 `onPlayerQuit` → 本局所有端結束 → 回主選單 + 顯示「有玩家離線，本局結束」。
- 不續跑、不遷移房主。

### FR7 接線
- `App.vue`「多人」改 `new PlayroomSession()`；onChange/onStart/`Game.startMultiplayer` 不變。
- `LoopbackSession` 保留供測試/本地單機。
- 單人路徑不動。

## Acceptance Criteria

見 `acceptance.md`（唯一驗收來源）。

## Edge Cases

- 加入不存在/已滿房間 → 錯誤提示回主選單。
- 房主大廳離開 → 他人回主選單（無遷移）。
- ready 後改角色 → 取消 ready（沿用既有規則）。
- RPC 亂序/延遲 → tick 為 key 緩衝 + `inputDelay=2` 吸收，湊齊才推進。

## API Contracts

- 實作既有 `NetSession`/`NetTransport`，不新增引擎介面。
- Playroom 外部 API（依文件，實測可能微調）：`insertCoin`、`onPlayerJoin`、`isHost`、`myPlayer`、`getRoomCode`、`getState`/`setState`、`RPC.register`/`RPC.call`、`onPlayerQuit`。

## Data Model Changes

- 新增 npm 相依 `playroomkit`。
- 無引擎資料模型變更。

## State Changes

- 無新 store phase；斷線結束沿用回主選單路徑 + 離線文案。

## UI Behaviour

- 沿用 `MultiplayerMenu`/`WaitingRoom`/`MultiUpgradeOverlay`，不改版面；房主見可分享房間碼/連結。

## Non-Functional Requirements

- 模擬路徑零 `Math.random`/`Date.now`/`performance.now`；adapter 連線層允許。
- 純引擎不 import Vue/Pinia/playroomkit；adapter 僅 `import type` 引擎型別。
- 單人與既有 312 測試零退化。
- 可驗證界線：typecheck/build/單元測試由我驗；真跨機同步由使用者兩機實測。
