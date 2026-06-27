# Acceptance — Game 多人 lockstep 模式 + M-1（多人合作 4B-2）

本檔為本功能完成與否的**唯一驗收來源**。所有項目通過才得標記為完成。

_驗證日期：（待填）_

## NetSession.toTransport
- [ ] `NetSession` 介面加 `toTransport(localIndex): NetTransport`
- [ ] `LoopbackSession.toTransport`：playerCount=players 數；本地該 tick 有值時 inputsForTick 回陣列（本地＝記錄、其餘自動補中性）；本地未送回 null
- [ ] 測試：只送本地輸入 → inputsForTick 非 null 且非本地為中性

## Game 多人模式
- [ ] `Game.startMultiplayer(canvasParent, seed, characters, map, transport, localIndex, bloom=true)`：建多人 World + LockstepRunner + onMultiUpgradePicked
- [ ] 欄位 `runner: LockstepRunner | null`、`pendingPick: string | null`
- [ ] loop `if (this.runner)` 走多人分支、否則單人（單人不動）
- [ ] 多人分支：submitLocalInput({move, pick}) per STEP → 清 pendingPick → drain tryAdvance → 推 summary + setMultiOffer → hasWon/hasLost 結束
- [ ] M-1：多人不呼叫 consumeLevelUp、不暫停；升級走 pick
- [ ] 渲染共用 render(world, localIndex)

## App 接線
- [ ] onStart → Game.startMultiplayer（characters=players 角色、localIndex=本地 id 位置、transport=session.toTransport）
- [ ] 單人 startGame/Game.start 路徑不變

## 單人零退化
- [ ] runner=null 即單人；單人迴圈/暫停握手/UpgradeModal 不變；既有測試零改動全綠
- [ ] 單人實機：行為與現況無差異

## 確定性與架構邊界
- [ ] 多人推進全經 LockstepRunner（依 index、固定步長、seeded）；不引入時間/亂數於模擬
- [ ] engine/net/World 純 TS；Game 膠水層；無 Vue/Pinia 進引擎

## 驗證快照
- [ ] 單元/整合測試（Vitest）全數通過（toTransport auto-neutral + headless 多人推進/全員死/pick）
- [ ] 型別檢查（vue-tsc）乾淨
- [ ] Production build 乾淨
- [ ] 本地煙霧：多人遊玩可開局（你操作、隊友待命）；單人行為不變（待玩家目視）
- [ ] progress.md 已更新

## 後續（4C）
- Playroom 實作 NetSession + NetTransport（真房間/碼/onPlayerJoin/RPC 輸入/種子廣播/斷線/房主離開）；兩台機器實測真跨機同步。
