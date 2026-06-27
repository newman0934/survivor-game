# Tasks — coop-lobby-session (4B-1)

依 `plan.md` 執行。單人零退化（單人不經 session；既有測試零改動全綠）。詳細步驟與程式碼見 plan.md。

## Task 1：NetSession + LoopbackSession
- [ ] Step 1：寫失敗測試（房主/上限/setCharacter+Ready/setMap/canStart/start→onStart）— `loopbackSession.test.ts`
- [ ] Step 2：確認失敗
- [ ] Step 3：`net/session.ts`（NetSession/LobbyPlayer/MAX_PLAYERS）
- [ ] Step 4：`net/loopbackSession.ts`（LoopbackSession + addFakePlayer/removeFakePlayer）
- [ ] Step 5：測試通過 + typecheck
- [ ] Step 6：Commit

## Task 2：store lobby + 選單分層 + 等待室 UI + App 接線
- [ ] Step 1：`stores/game.ts` — `'lobby'` phase + lobby 狀態 + enterLobby/setLobby + toMenu 清理（import MapKind/LobbyPlayer）
- [ ] Step 2：`MainMenu.vue` — 單人/多人分層（emit multiplayer）
- [ ] Step 3：建立 `MultiplayerMenu.vue`（建立/加入）
- [ ] Step 4：建立 `WaitingRoom.vue`（玩家列表/選角/就緒/房主選圖+開始）
- [ ] Step 5：`App.vue` — 持有 session、createOrJoin/leaveLobby/pushLobby、render 接線
- [ ] Step 6：typecheck + 全測試 + build
- [ ] Step 7：Commit

## 實機驗證（兩 task 後）
- [ ] 單人遊玩與現況無差異；多人→建立→等待室可操作（選角/就緒/房間碼）
- [ ] `npm run build` 乾淨；更新 `acceptance.md` + `progress.md`
