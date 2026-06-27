# Acceptance — 本地玩家管線 + 多人升級浮層（多人合作 3）

本檔為本功能完成與否的**唯一驗收來源**。所有項目通過才得標記為完成。

_驗證日期：2026-06-27 — 290 測試全過（既有單人測試零改動 = 零退化）、vue-tsc 乾淨、production build 乾淨；SDD 審查（3 task + 全分支廣審）皆 Approved（廣審 I-1/I-2/M-2 已修並複審；M-1 留 SP4）。多人視覺需 SP4 接網路才完整可見。_

## World 視角化 API
- [x] `summary(playerIndex = 0)`：以該玩家產生摘要；Boss/事件/kills/time 共享；省略＝players[0]
- [x] `loadoutSnapshot(playerIndex = 0)`：回該玩家 weapons/passives；省略＝players[0]
- [x] 測試：summary(1)/summary(0)/省略；loadoutSnapshot(1) 對應武器

## Game 本地玩家接線
- [x] `Game.start(..., bloomEnabled=true, localPlayerIndex=0)`；保存 localPlayerIndex
- [x] 輸入 setMoveInput(localPlayerIndex)；summary/loadout/render 全用 localPlayerIndex
- [x] App.vue 5 參數 Game.start 不需改動（新參數預設）
- [x] `Game.start` 寫入 `store.localPlayerIndex`；`store.start()` 重置 0

## Renderer
- [x] `render(world, localPlayerIndex = 0)`：鏡頭/玩家相對視覺（含 garlicRadius(localPlayerIndex)）跟本地玩家
- [x] 渲染全部玩家 entity（各自 color/character、本地最後畫）
- [x] 省略 index＝0（單人等同現況）

## store 多人升級狀態
- [x] 新增 localPlayerIndex/multiOffer/multiOfferTimeLeft/onMultiUpgradePicked + setMultiOffer/pickMultiUpgrade
- [x] reset 清理 multiOffer/multiOfferTimeLeft/onMultiUpgradePicked/localPlayerIndex

## Game 推送 + 浮層元件
- [x] Game 僅 playerCount>1 每幀推 setMultiOffer(pendingOfferFor(i), upgradeTimeRemaining(i))
- [x] Game 設 onMultiUpgradePicked = id => chooseUpgrade(localPlayerIndex, id) + 刷新 loadout
- [x] `MultiUpgradeOverlay.vue`：multiOffer 存在時顯示非阻塞限時卡列 + 倒數條（容器 pointer-events:none、卡片 auto）；UPGRADE_TIMEOUT 單一來源
- [x] App.vue playing 期間掛載 MultiUpgradeOverlay

## 單人零退化
- [x] playerCount===1 不推 multiOffer → multiOffer 恆 null → 浮層不顯示；既有暫停 UpgradeModal 不變
- [x] 單人 summary()/loadoutSnapshot()/render(world) 行為與現況一致；既有測試零改動全綠
- [ ] 單人實機：移動/開火/升級/撿取/Boss/結算無差異（待玩家目視）

## 邊界與架構
- [x] localPlayerIndex 越界 `?? players[0]` 防呆
- [x] World/renderer 無 Vue/Pinia 執行期 import（UPGRADE_TIMEOUT 為純常數 export）
- [x] Game.stop()/PixiRenderer.destroy() 維持冪等（未動）

## 驗證快照
- [x] 單元測試（Vitest）全數通過（含 summary(i)/loadoutSnapshot(i)）— 290 passed
- [x] 型別檢查（vue-tsc）乾淨
- [x] Production build 乾淨
- [ ] 單人實機煙霧測試：行為與現況無差異（待玩家於 `npm run dev` 確認）
- [x] progress.md 已更新

## 留 SP4 處理（廣審記錄）
- M-1：playerCount>1 時 players[0] 的升級仍會走單人 consumeLevelUp 暫停握手，與多人非阻塞並行衝突——SP4 接多角色 Game.start 時，需在 playerCount>1 停用單人暫停握手。
