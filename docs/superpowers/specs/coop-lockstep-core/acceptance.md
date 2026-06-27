# Acceptance — Lockstep 核心（多人合作 4A）

本檔為本功能完成與否的**唯一驗收來源**。所有項目通過才得標記為完成。

_驗證日期：（待填）_

## 型別與傳輸抽象
- [ ] `net/types.ts`：`PlayerInput`（move + 選填 pick）、`TickInputs`、`NetTransport` 介面
- [ ] `engine/net/**` 純 TS、無 Vue/Pinia 執行期、不 import renderer/UI

## LoopbackTransport
- [ ] `LoopbackBus`：依 (tick, playerIndex) 存輸入；`get(tick, playerCount)` 全員到齊才回 TickInputs、否則 null
- [ ] `LoopbackTransport implements NetTransport`：sendInput 寫 bus[tick][localIndex]、inputsForTick 委派 bus.get
- [ ] 測試：部分到齊回 null、全員到齊回 TickInputs

## LockstepRunner
- [ ] `constructor(world, transport, inputDelay = 2)`；初始預送 inputDelay 筆中性輸入
- [ ] `submitLocalInput(input)`：指派到對應 tick（offset inputDelay）並 transport.sendInput
- [ ] `tryAdvance()`：到齊→依 index 套 move(+pick chooseUpgrade)→step→tick++→true；未到齊→false 停滯
- [ ] `getCurrentTick()` / `checksum()`（委派 world.checksum）
- [ ] 不呼叫 consumeLevelUp（多人升級走 pick）

## Lockstep 同步（核心驗證）
- [ ] 兩 runner（兩 World）經共享 bus 各送自己玩家輸入 → 每 tick checksum 完全相同
- [ ] 缺一玩家輸入 → tryAdvance 回 false、不前進；到齊後恢復
- [ ] inputDelay=2：tick T 送的輸入於 T+2 套用
- [ ] pick 於該 tick 以 chooseUpgrade 套用（非待選 id 安靜略過）
- [ ] 相同 seed + 相同全員輸入腳本 → 兩跑 checksum 序列一致

## 確定性與架構邊界
- [ ] runner 依固定 index 套用、走既有 seeded 固定步長；不呼叫時間/亂數
- [ ] 不動既有檔案（World/Game/store/UI/renderer 一行不改）→ 零退化

## 驗證快照
- [ ] 單元測試（Vitest）全數通過（loopback + lockstep 同步 + 延遲 + pick + 確定性）
- [ ] 既有測試全綠（不受影響）
- [ ] 型別檢查（vue-tsc）乾淨
- [ ] Production build 乾淨
- [ ] progress.md 已更新

## 後續（4B/4C）
- 4B：Game 迴圈於多人改用 LockstepRunner（含 M-1：停用單人暫停握手）、主選單多人分層、建立/加入/等待室。
- 4C：真 Playroom（或選定）adapter 實作 NetTransport、房間碼、種子廣播、斷線/房主離開（需 app-id + 兩台機器手動測）。
