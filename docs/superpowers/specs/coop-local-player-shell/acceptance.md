# Acceptance — 本地玩家管線 + 多人升級浮層（多人合作 3）

本檔為本功能完成與否的**唯一驗收來源**。所有項目通過才得標記為完成。

_驗證日期：（待填）_

## World 視角化 API
- [ ] `summary(playerIndex = 0)`：以該玩家產生 HUD 摘要；Boss/事件欄位共享；省略＝players[0]（向後相容）
- [ ] `loadoutSnapshot(playerIndex = 0)`：回該玩家 weapons/passives；省略＝players[0]
- [ ] 測試：summary(1)/summary(0) 各回對應玩家；省略＝players[0]；loadoutSnapshot(1) 對應玩家武器

## Game 本地玩家接線
- [ ] `Game.start(..., bloomEnabled=true, localPlayerIndex=0)`；保存 localPlayerIndex
- [ ] 輸入用 `setMoveInput(localPlayerIndex, dir)`；summary/loadout/render 全用 localPlayerIndex
- [ ] 單人呼叫端（App.vue 5 參數 Game.start）不需改動（新參數有預設）

## Renderer
- [ ] `render(world, localPlayerIndex = 0)`：鏡頭/玩家相對視覺跟 `players[localPlayerIndex]`
- [ ] 渲染全部玩家 entity（各自 color/character）
- [ ] 省略 index＝0（單人等同現況）

## store 多人升級狀態
- [ ] 新增 `localPlayerIndex`（預設 0、start 重置）、`multiOffer`、`multiOfferTimeLeft`、`onMultiUpgradePicked`
- [ ] `setMultiOffer(offer, timeLeft)`、`pickMultiUpgrade(id)`（→ onMultiUpgradePicked）

## Game 推送 + 浮層元件
- [ ] Game 僅 playerCount>1 每幀推 `setMultiOffer(pendingOfferFor(i), upgradeTimeRemaining(i))`；無待選推 (null,0)
- [ ] Game 設 `onMultiUpgradePicked = id => world.chooseUpgrade(localPlayerIndex, id)`
- [ ] `MultiUpgradeOverlay.vue`：multiOffer 存在時顯示非阻塞限時卡列 + 倒數條；點卡→pickMultiUpgrade；不擋輸入/不暫停
- [ ] App.vue playing 期間掛載 MultiUpgradeOverlay

## 單人零退化
- [ ] playerCount===1 不推 multiOffer → multiOffer 恆 null → 浮層不顯示；既有暫停 UpgradeModal 不變
- [ ] 單人 summary()/loadoutSnapshot()/render(world) 行為與現況一致；既有測試零改動全綠
- [ ] 單人實機：移動/開火/升級/撿取/Boss/結算無差異

## 邊界與架構
- [ ] localPlayerIndex 越界安全退回 players[0]/略過、不崩潰
- [ ] World.summary/loadoutSnapshot 唯讀；不改模擬邏輯；無 Vue/Pinia 進引擎執行期
- [ ] Game.stop()/PixiRenderer.destroy() 維持冪等

## 驗證快照
- [ ] 單元測試（Vitest）全數通過（含 summary(i)/loadoutSnapshot(i)）
- [ ] 型別檢查（vue-tsc）乾淨
- [ ] Production build 乾淨
- [ ] 單人實機煙霧測試：行為與現況無差異
- [ ] progress.md 已更新
