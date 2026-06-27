# Acceptance — 確定性全面稽核 + 回放雜湊測試（多人合作 2）

本檔為本功能完成與否的**唯一驗收來源**。所有項目通過才得標記為完成。

_驗證日期：2026-06-27 — 287 測試全過（含 checksum 工具 + World.checksum + 回放 + 守護 26 sim 檔）、vue-tsc 乾淨、production build 乾淨；SDD 審查（3 task + 全分支廣審）皆 Approved（廣審 Ready to merge: Yes，I-1 經查誤報、白名單註解已補）。_

## Checksum 工具（core/checksum.ts）
- [x] `Checksum`：`add(n)`/`addInt(n)`/`value()`；FNV-1a、順序敏感、32-bit 無號
- [x] 浮點以 DataView float64 位元組混入；純函式、不依賴時間/亂數
- [x] 測試：相同序列同 value；交換順序後不同；32-bit 範圍；健全性

## World.checksum()
- [x] `World.checksum(): number`（唯讀，不改狀態）
- [x] 雜湊涵蓋：elapsed/playerCount/bossCount/finalBossSpawned/won/三計時器；各玩家 pos/hp/maxHp/level/xp/pendingLevelUps/alive/weapons/passives；敵人數+各 pos/hp/kind/affix；彈幕/敵彈/寶箱/撿取數；寶石數+xp 總和
- [x] 列舉以 WEAPON_ORDER/PASSIVE_ORDER/ENEMY_ORDER/ELITE_AFFIX_ORDER 的 indexOf 轉整數
- [x] 測試：同 seed 未 step 兩 World 相同；step 後改變；32-bit 範圍

## 回放雜湊測試
- [x] 固定輸入腳本（2 玩家、600 幀）→ 兩個全新 World 相同最終 checksum
- [x] 不同 seed → checksum 不同（非定值）
- [x] 單人同 seed+輸入 → 兩 run 相同

## 原始碼守護測試
- [x] 掃描 `src/engine/**/*.ts`，排除 `*.test` 與 11 個呈現/IO/驅動白名單（含說明註解）
- [x] 去除註解後斷言受測檔不含 `Math.random(`/`Date.now(`/`performance.now(`
- [x] 現況全數通過（26 sim 檔皆乾淨）
- [x] sanity 斷言（範圍非空 + 含 World.ts/systems）防假性通過；新 sim 檔預設受守護

## 已知限制記錄
- [x] 跨瀏覽器超越函式（sin/cos/sqrt/atan2/pow）極小差異為已知限制，本期不定點化；同引擎 lockstep 由回放測試保證

## 不退化與架構邊界
- [x] 不改任何既有方法簽章、不改遊戲行為；既有測試全綠
- [x] checksum/World.checksum 不呼叫時間/亂數；core/checksum.ts 純 TS、無 Vue/Pinia

## 驗證快照
- [x] 單元測試（Vitest）全數通過 — 287 passed
- [x] 型別檢查（vue-tsc）乾淨
- [x] Production build 乾淨
- [x] progress.md 已更新
