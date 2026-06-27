# Acceptance — 確定性全面稽核 + 回放雜湊測試（多人合作 2）

本檔為本功能完成與否的**唯一驗收來源**。所有項目通過才得標記為完成。

_驗證日期：（待填）_

## Checksum 工具（core/checksum.ts）
- [ ] 新增 `Checksum` 類別：`add(n)`/`addInt(n)`/`value()`；FNV-1a 風格、順序敏感、32-bit 無號
- [ ] 浮點以 DataView 取 float64 位元組混入；純函式、不依賴時間/亂數
- [ ] 測試：相同序列同 value；交換順序後 value 不同

## World.checksum()
- [ ] 新增 `World.checksum(): number`（唯讀，不改狀態）
- [ ] 雜湊涵蓋：elapsed/playerCount/bossCount/finalBossSpawned/won/三計時器；各玩家 pos/hp/maxHp/level/xp/pendingLevelUps/alive/weapons/passives；敵人數+各 pos/hp/kind/affix；彈幕/敵彈/寶箱/撿取數；寶石數+xp 總和
- [ ] 列舉（kind/affix）以固定對應（如既有 ORDER index）轉整數
- [ ] 測試：同 seed 未 step 的兩 World checksum 相同；step 後 checksum 改變

## 回放雜湊測試
- [ ] 固定輸入腳本（2 玩家、N 幀）→ 兩個全新 World 跑出相同最終 checksum
- [ ] 不同 seed → checksum 不同（非定值）
- [ ] 單人同 seed + 同輸入 → 兩 run 相同

## 原始碼守護測試
- [ ] 掃描 `src/engine/**/*.ts`，排除 `*.test` 與 `Game.ts`/`PixiRenderer.ts`/`sprites.ts`/`postProcessing.ts`/`noiseBackground.ts`/`effects.ts`/`core/soundManager.ts`/`core/input.ts`/`core/touchInput.ts`/`core/hitStop.ts`/`core/noise.ts`
- [ ] 去除註解後斷言受測檔不含 `Math.random(`/`Date.now(`/`performance.now(`
- [ ] 現況全數通過（確認模擬路徑已乾淨）
- [ ] 新增不在排除清單的 sim 檔預設受守護（fail-safe）

## 已知限制記錄
- [ ] spec/acceptance 載明：跨瀏覽器超越函式（sin/cos/sqrt/atan2/pow）極小差異為已知限制，本期不定點化；同引擎 lockstep 由回放測試保證

## 不退化與架構邊界
- [ ] 不改任何既有方法簽章、不改遊戲行為；既有單元測試全綠
- [ ] checksum/World.checksum 不呼叫時間/亂數；core/checksum.ts 純 TS、無 Vue/Pinia

## 驗證快照
- [ ] 單元測試（Vitest）全數通過（checksum 工具 + World.checksum + 回放 + 守護）
- [ ] 型別檢查（vue-tsc）乾淨
- [ ] Production build 乾淨
- [ ] progress.md 已更新
