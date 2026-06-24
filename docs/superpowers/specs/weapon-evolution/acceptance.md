# Acceptance — 武器進化

本檔為本功能完成與否的**唯一驗收來源**。所有項目通過才得標記為完成。
（進化條件/套用/數值/招牌行為走 TDD 單元測試；視覺/彈窗強調以實機目視驗證；166 測試全綠＝既有 154 + 新增 12。）

_驗證日期：2026-06-24_

## 型別與資料
- [x] `Weapon` 新增 `evolved?: boolean`；`Entity` 新增 `pierce?: number` / `evolved?: boolean`
- [x] 新增 `WeaponEvolution` 介面；`WeaponDef` 新增選用 `evolution?`
- [x] `WEAPON_DEFS` 七筆各補 `evolution`（requires / label / level / 旗標如 spec FR-3）
- [x] 不修改 `Summary` / store 形狀 / saveStore

## 進化候選與套用（leveling，含單元測試）
- [x] `buildCandidates`：武器滿級 + 持有所需被動 + 未進化 → 提供 `evolve:<kind>` 卡
- [x] 未滿級 / 未持有被動 / 已進化 → 不提供該卡
- [x] 取得所需被動後，進化卡才動態出現
- [x] 已進化武器不再提供 `levelup:<kind>` 與 `evolve:<kind>`
- [x] `applyUpgradeById('evolve:X')`：條件成立 → 設 `evolved=true`；條件不成立 → 不設、不丟例外

## World 進化效果（含單元測試）
- [x] 進化武器以 `def.evolution.level` 取生效數值（仍乘全域乘區）
- [x] perforin pierce：子彈命中後 pierce>0 不失效、可續命中不同敵人，最多穿透設定敵數；同一敵人只命中一次（hitEnemies，不跨幀重複）
- [x] cascade noFalloff：每跳全額傷害（不套 0.75 衰減）
- [x] phagocyte halfAngle：環掃用進化半角
- [x] inflammation fieldRegen：場域存在時每格回 `fieldRegen*dt` 血（夾 maxHp）
- [x] complement 進化：per-enemy 命中冷卻 0.5→0.25s

## 視覺 / UI
- [x] 進化武器投射物加進化色調（`Entity.evolved` → drawProjectile 上色）
- [x] UpgradeModal 對 `evolve:` 卡片給星標/高亮強調

## 不變項（硬性）
- [x] 未進化時所有武器數值/行為/平衡與現況一致
- [x] 模擬無 `Math.random()`（grep 確認僅註解）；相同 seed 結果一致
- [x] 引擎不引入 Vue/Pinia 執行期依賴；既有 154 單元測試全綠
- [x] `evolved` 為局內狀態、不入存檔

## 驗證快照（完成時填寫）
- [x] 單元測試全綠（既有 154 + 新測試 = 166 通過）
- [x] 型別檢查（vue-tsc）乾淨
- [x] Production build 乾淨
- [ ] 實機驗證：升滿某武器 + 對應被動 → 出現進化卡 → 選取後變強/招牌行為正確/投射物變色、進化卡有強調、FPS 正常、0 功能相關 console error（待玩家 npm run dev 確認）
- [x] progress.md 已更新
