# Tasks — coop-playroom-adapter（4C）

依 `plan.md` 執行（含完整程式碼與指令）。
單人零退化（既有 312 測試零改動全綠）；adapter 置 `src/net/playroom/` 僅 `import type` 引擎；
Playroom 綁定/UI 屬整合膠水層，以 typecheck/build + 兩機實測驗證。

## Task 1：安裝 playroomkit + 玩家 index 共識純函式
- [ ] Step 1：`npm install playroomkit`
- [ ] Step 2：寫失敗測試 `playerIndex.test.ts`（排序不改入參／各機一致／indexOf）
- [ ] Step 3：確認失敗
- [ ] Step 4：實作 `playerIndex.ts`（`sortPlayerIds`/`indexOfPlayer`）
- [ ] Step 5：測試通過 + typecheck
- [ ] Step 6：Commit

## Task 2：PlayroomTransport（可注入 RpcChannel，純單元測試）
- [ ] Step 1：寫失敗測試 `playroomTransport.test.ts`（未湊齊 null／湊齊排序／非0 index／亂序歸位／未知 sender 不寫）
- [ ] Step 2：確認失敗
- [ ] Step 3：實作 `playroomTransport.ts`（`InputMsg`/`RpcChannel`/`PlayroomTransport`）
- [ ] Step 4：測試通過 + typecheck
- [ ] Step 5：Commit

## Task 3：PlayroomSession（Playroom 綁定，實作 NetSession + onPeerLeft）
- [ ] Step 1：`session.ts` 介面加 `onPeerLeft(cb)`
- [ ] Step 2：`loopbackSession.ts` 加 `onPeerLeft` no-op + typecheck
- [ ] Step 3：實作 `playroomSession.ts`（insertCoin/onPlayerJoin/state 輪詢/players 排序/setMap/start RPC/input RPC/onQuit 結束/toTransport/leave）
- [ ] Step 4：typecheck + build（對 playroomkit 真型別，必要時依安裝型別微調命名）
- [ ] Step 5：既有測試零退化
- [ ] Step 6：Commit

## Task 4：App 接線 + 離線提示 + 兩機測試指南
- [ ] Step 1：store 加 `notice` + `setNotice`/`clearNotice`（`toMenu` 清空）
- [ ] Step 2：`MainMenu.vue` 顯示 notice 橫幅（可關閉）
- [ ] Step 3：`App.vue` `createOrJoin` 改 `PlayroomSession` + `onPeerLeft`（toMenu 後再 setNotice）
- [ ] Step 4：typecheck + build + 全測試
- [ ] Step 5：建 `manual-test-guide.md`（兩機步驟）
- [ ] Step 6：更新 `progress.md` + `acceptance.md`
- [ ] Step 7：Commit

## 實機驗證（四 task 後）
- [ ] 單人與現況無差異；既有測試全綠；typecheck/build 乾淨
- [ ] 兩機實測（使用者）：建房/加入/開局/合作/離線提示，依 manual-test-guide
