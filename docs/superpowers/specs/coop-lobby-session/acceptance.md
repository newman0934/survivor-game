# Acceptance — 連線會話抽象 + 主選單多人分層 + 等待室（多人合作 4B-1）

本檔為本功能完成與否的**唯一驗收來源**。所有項目通過才得標記為完成。

_驗證日期：（待填）_

## NetSession 抽象 + LoopbackSession
- [ ] `engine/net/session.ts`：`NetSession`/`LobbyPlayer`/`MAX_PLAYERS=4`，純 TS、無 Vue/Pinia
- [ ] `LoopbackSession implements NetSession`：建立即房主、roomCode/localId 可注入
- [ ] `addFakePlayer/removeFakePlayer` 模擬他人；超過 MAX_PLAYERS 略過
- [ ] setCharacter/setReady 改本地玩家並觸發 onChange；setMap 僅房主
- [ ] `canStart()`：isHost && players≥2 && 全員 ready
- [ ] `start(seed)`：canStart 才觸發 onStart(seed, map, players)；否則無效
- [ ] players() 依加入順序（＝玩家 index）

## store lobby 狀態
- [ ] 新增 `lobbyPlayers/roomCode/isHost/lobbyMap/canStart` + `setLobby`；reset 清空
- [ ] Phase 加 `'lobby'`

## UI
- [ ] `MainMenu` 單人/多人分層；單人＝現有選角/選圖流程（不變）
- [ ] `MultiplayerMenu.vue`：建立/加入（輸入碼）
- [ ] `WaitingRoom.vue`（phase==='lobby'）：玩家列表/角色/就緒、本地選角 + 就緒；房主選圖 + 開始（canStart 才可按）；顯示房間碼
- [ ] App 持有 session；建立/加入→phase 'lobby'；onChange→setLobby；onStart→（4B-2 接，4B-1 暫 console/TODO）；離開→leave + 回 menu

## 單人零退化
- [ ] 單人路徑不建立 session、與現況完全一致；既有測試零改動全綠
- [ ] 單人實機：選角/開局/遊玩/結算無差異

## 確定性與架構邊界
- [ ] `engine/net/**` 純 TS、無 Vue/Pinia 執行期
- [ ] 不改既有引擎模擬邏輯

## 驗證快照
- [ ] 單元測試（Vitest）全數通過（LoopbackSession 行為）
- [ ] 型別檢查（vue-tsc）乾淨
- [ ] Production build 乾淨
- [ ] 單人實機煙霧測試：行為與現況無差異；多人選單/等待室可開啟目視（真多人列表需 4C）
- [ ] progress.md 已更新

## 後續
- 4B-2：onStart → 以 LockstepRunner + NetTransport 開多人局（含 M-1）。
- 4C：Playroom 實作 NetSession + NetTransport（真房間/碼/onPlayerJoin/RPC/斷線）。
