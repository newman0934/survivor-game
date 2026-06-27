# Acceptance — Playroom（Free）adapter（多人合作 4C）

本檔為本功能完成與否的**唯一驗收來源**。所有「我方可驗」項目通過才得標記為完成；
「使用者實測」項目需兩台機器人工驗證（標記待測）。

## 相依與架構邊界
- [ ] `playroomkit` 已加入 `package.json` 相依
- [ ] adapter 位於 `src/net/playroom/`，僅 `import type` 引擎型別（無執行期引擎耦合）
- [ ] `src/engine/**` 無 import `playroomkit`/Vue/Pinia
- [ ] `determinism.test.ts` source-guard 範圍不含 `src/net/playroom/`（adapter 非模擬路徑）

## PlayroomSession（NetSession）
- [ ] 實作 `NetSession` 全介面（localId/roomCode/isHost/players/setCharacter/setReady/setMap/getMap/onChange/canStart/start/onStart/leave/toTransport）
- [ ] `insertCoin({ skipLobby: true })` 初始化、用自有 WaitingRoom
- [ ] `onPlayerJoin` 維護列表、變動經 `onChange` 推送
- [ ] 角色/就緒寫 `player.setState`；`isHost()` 決定房主；房主 `setMap` 寫 room state
- [ ] 房間碼：`getRoomCode()` 顯示、`insertCoin({ roomCode })` 加入（後備 `?r=` URL 於指南載明）
- [ ] `start(seed)` 廣播 seed+started → 各端 `onStart`

## playerIndex 一致性
- [ ] 開局凍結 `player.id` 排序快照、`index=排序位置`
- [ ] `localIndex` 為本地 id 在快照位置
- [ ] 單元測試：給定相同 id 集合，各端解析出相同 index 映射

## PlayroomTransport（NetTransport）
- [ ] 實作 `NetTransport`（playerCount/localIndex/sendInput/inputsForTick）
- [ ] `sendInput` 經 `RPC.call('input',…)` 廣播 + 本地寫自身格
- [ ] 收 RPC 以 tick+senderIndex 寫 `buffer`
- [ ] `inputsForTick` 湊齊 playerCount 才回、否則 null
- [ ] 單元測試：未湊齊回 null、湊齊回 TickInputs、亂序到達仍正確歸位（以可注入的假 RPC/快照測，不依賴真網路）

## 斷線處理
- [ ] `onPlayerQuit` → 本局結束 → 回主選單 + 顯示離線文案
- [ ] 房主大廳離開 → 他人回主選單（無遷移）

## 接線
- [ ] `App.vue`「多人」改 `new PlayroomSession()`；onChange/onStart/`Game.startMultiplayer` 不變
- [ ] `LoopbackSession` 保留供測試/本地單機

## 單人零退化
- [ ] 單人 startGame/Game.start 路徑不變
- [ ] 既有 312 測試零改動全綠

## 驗證快照（我方可驗）
- [ ] 單元測試（Vitest）全數通過（index 映射 + transport buffer/亂序，皆用注入假件）
- [ ] 型別檢查（vue-tsc）乾淨（對 `playroomkit` 真型別）
- [ ] Production build 乾淨
- [ ] progress.md 已更新

## 使用者兩機實測（待測，無法由我驗）
- [ ] 兩台機器 + 朋友：房主建房、取得碼/連結
- [ ] 第二台用碼/連結加入、雙方等待室列表一致
- [ ] 雙方就緒 → 房主開始 → 兩端同時開局、角色/地圖一致
- [ ] 跨機合作可玩：移動/開火/升級選擇彼此可見、無明顯 desync
- [ ] 一方關閉分頁 → 另一方收到離線提示並回主選單
- [ ] 手動測試指南（`docs/` 內）步驟可照做
