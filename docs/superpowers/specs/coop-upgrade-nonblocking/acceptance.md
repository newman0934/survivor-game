# Acceptance — 非阻塞升級流程（多人合作 1B）

本檔為本功能完成與否的**唯一驗收來源**。所有項目通過才得標記為完成。

_驗證日期：2026-06-27 — 單元測試 250 全過（既有升級測試零改動 = 單人零退化）、vue-tsc 乾淨、production build 乾淨；SDD 審查 Approved（單一 task = 全分支審查；3 Minor 非阻斷）。單人實機目視待玩家確認。_

## World 升級狀態
- [x] `World` 新增 `upgradeRng = createRng(seed ^ 0x9e3779b9)`（獨立 seeded 串流）
- [x] `PlayerState` 新增 `pendingOffer?: UpgradeOption[]`、`upgradeTimer: number`（初值 0）
- [x] `UPGRADE_TIMEOUT = 12`

## 非阻塞處理（playerCount>1）
- [x] `step` 呼叫 `processUpgrades(dt)`（7e，存活旗標同步後），**僅 playerCount>1 生效**
- [x] 玩家 pendingLevelUps>0 且無 pendingOffer → `rollUpgrades(upgradeRng,3,upgradeContextFor(p))` 產 3 張 + 設 upgradeTimer=12
- [x] 有 pendingOffer → upgradeTimer 倒數；≤0 自動選第一張 → 套用 → 清 pendingOffer → pendingLevelUps-1
- [x] 一次升多級 → 逐張依序（消一張後下一格再產下一張）
- [x] 升級浮層期間角色照常可動（不凍結輸入）

## 對外 API
- [x] `pendingOfferFor(i): UpgradeDescriptor[] | null`（無待選回 null）
- [x] `upgradeTimeRemaining(i): number`（無待選回 0）
- [x] `chooseUpgrade(i, id)`：套用該待選卡 → 清 pendingOffer → pendingLevelUps-1；非待選 id 安靜略過

## 死亡互動
- [x] 死亡玩家不再產新待選、不倒數、不自動選（7d alive 同步先於 7e processUpgrades）

## 單人零退化
- [x] playerCount===1 時 processUpgrades 為 no-op；`pendingOfferFor(0)` 為 null
- [x] 既有 `consumeLevelUp`/`applyUpgrade`/Game 暫停握手/UpgradeModal 行為不變（既有測試零改動）
- [ ] 單人實機升級流程照舊（暫停選卡、無限時間）（待玩家目視）

## 確定性與架構邊界
- [x] 選項產生與自動選一律走 upgradeRng + 固定 index 順序；模擬中不呼叫 Math.random()
- [x] 相同 seed + 相同角色陣列 + 相同輸入 → 升級選項序列兩局一致
- [x] World/types 無 Vue/Pinia 執行期 import（UpgradeDescriptor 為 type-only）；固定步長 1/60 不變
- [x] `rollUpgrades`/`applyUpgradeById` 沿用 leveling.ts（無重複邏輯）

## 驗證快照
- [x] 單元測試（Vitest）全數通過（多人非阻塞 9 筆 + 單人 no-op + 確定性）— 250 passed
- [x] 型別檢查（vue-tsc）乾淨
- [x] Production build 乾淨
- [ ] 單人實機煙霧測試：升級行為與現況無差異（待玩家於 `npm run dev` 確認）
- [x] progress.md 已更新

## 後續（SP3 接 UI 時）
- 多人升級浮層、12s 倒數條、各玩家獨立顯示，消費 `pendingOfferFor`/`upgradeTimeRemaining`/`chooseUpgrade`。
- 可選：`chooseUpgrade` 加 `!p.alive` 防禦 guard（審查 M2）。
