# Acceptance — 非阻塞升級流程（多人合作 1B）

本檔為本功能完成與否的**唯一驗收來源**。所有項目通過才得標記為完成。

_驗證日期：（待填）_

## World 升級狀態
- [ ] `World` 新增 `upgradeRng = createRng(seed ^ 0x9e3779b9)`（獨立 seeded 串流）
- [ ] `PlayerState` 新增 `pendingOffer?: UpgradeOption[]`、`upgradeTimer: number`（初值 0）
- [ ] `UPGRADE_TIMEOUT = 12`

## 非阻塞處理（playerCount>1）
- [ ] `step` 呼叫 `processUpgrades(dt)`，**僅 playerCount>1 生效**
- [ ] 玩家 pendingLevelUps>0 且無 pendingOffer → `rollUpgrades(upgradeRng,3,upgradeContextFor(p))` 產 3 張 + 設 upgradeTimer=12
- [ ] 有 pendingOffer → upgradeTimer 倒數；≤0 自動選第一張 → 套用 → 清 pendingOffer → pendingLevelUps-1
- [ ] 一次升多級 → 逐張依序（消一張後下一格再產下一張）
- [ ] 升級浮層期間角色照常可動（不凍結輸入）

## 對外 API
- [ ] `pendingOfferFor(i): UpgradeDescriptor[] | null`（無待選回 null）
- [ ] `upgradeTimeRemaining(i): number`（無待選回 0）
- [ ] `chooseUpgrade(i, id)`：套用該待選卡 → 清 pendingOffer → pendingLevelUps-1；非待選 id 安靜略過

## 死亡互動
- [ ] 死亡玩家不再產新待選、不倒數、不自動選（以 alive/livingPlayers 判斷）

## 單人零退化
- [ ] playerCount===1 時 processUpgrades 為 no-op；`pendingOfferFor(0)` 為 null
- [ ] 既有 `consumeLevelUp`/`applyUpgrade`/Game 暫停握手/UpgradeModal 行為不變
- [ ] 單人實機升級流程照舊（暫停選卡、無限時間）

## 確定性與架構邊界
- [ ] 選項產生與自動選一律走 upgradeRng + 固定 index 順序；模擬中不呼叫 Math.random()
- [ ] 相同 seed + 相同角色陣列 + 相同輸入 → 升級選項序列與自動選結果兩局一致
- [ ] World/types/leveling 無 Vue/Pinia 執行期 import；固定步長 1/60 不變
- [ ] `rollUpgrades`/`applyUpgradeById` 沿用 leveling.ts（無重複邏輯）

## 驗證快照
- [ ] 單元測試（Vitest）全數通過（多人非阻塞 + 單人 no-op 回歸 + 確定性）
- [ ] 型別檢查（vue-tsc）乾淨
- [ ] Production build 乾淨
- [ ] 單人實機煙霧測試：升級行為與現況無差異
- [ ] progress.md 已更新
