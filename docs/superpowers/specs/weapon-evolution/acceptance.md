# Acceptance — 武器進化

本檔為本功能完成與否的**唯一驗收來源**。所有項目通過才得標記為完成。
（進化條件/套用/數值/招牌行為走 TDD 單元測試；視覺/彈窗強調以實機目視驗證；既有 154 測試維持全綠。）

_驗證日期：（待填）_

## 型別與資料
- [ ] `Weapon` 新增 `evolved?: boolean`；`Entity` 新增 `pierce?: number` / `evolved?: boolean`
- [ ] 新增 `WeaponEvolution` 介面；`WeaponDef` 新增選用 `evolution?`
- [ ] `WEAPON_DEFS` 七筆各補 `evolution`（requires / label / level / 旗標如 spec FR-3）
- [ ] 不修改 `Summary` / store 形狀 / saveStore

## 進化候選與套用（leveling，含單元測試）
- [ ] `buildCandidates`：武器滿級 + 持有所需被動 + 未進化 → 提供 `evolve:<kind>` 卡
- [ ] 未滿級 / 未持有被動 / 已進化 → 不提供該卡
- [ ] 取得所需被動後，進化卡才動態出現
- [ ] 已進化武器不再提供 `levelup:<kind>` 與 `evolve:<kind>`
- [ ] `applyUpgradeById('evolve:X')`：條件成立 → 設 `evolved=true`；條件不成立 → 不設、不丟例外

## World 進化效果（含單元測試）
- [ ] 進化武器以 `def.evolution.level` 取生效數值（仍乘全域乘區）
- [ ] perforin pierce：子彈命中後 pierce>0 不失效、可續命中，最多穿透設定敵數
- [ ] cascade noFalloff：每跳全額傷害（不套 0.75 衰減）
- [ ] phagocyte halfAngle：環掃用進化半角
- [ ] inflammation fieldRegen：場域存在時每格回 `fieldRegen*dt` 血（夾 maxHp）
- [ ] complement 進化：per-enemy 命中冷卻 0.5→0.25s

## 視覺 / UI
- [ ] 進化武器投射物加進化色調（`Entity.evolved` → drawProjectile 上色）
- [ ] UpgradeModal 對 `evolve:` 卡片給星標/高亮強調

## 不變項（硬性）
- [ ] 未進化時所有武器數值/行為/平衡與現況一致
- [ ] 模擬無 `Math.random()`（grep 確認僅註解）；相同 seed 結果一致
- [ ] 引擎不引入 Vue/Pinia 執行期依賴；既有 154 單元測試全綠
- [ ] `evolved` 為局內狀態、不入存檔

## 驗證快照（完成時填寫）
- [ ] 單元測試全綠（既有 154 + 新測試）
- [ ] 型別檢查（vue-tsc）乾淨
- [ ] Production build 乾淨
- [ ] 實機驗證：升滿某武器 + 對應被動 → 出現進化卡 → 選取後變強/招牌行為正確/投射物變色、進化卡有強調、FPS 正常、0 功能相關 console error（待玩家 npm run dev 確認）
- [ ] progress.md 已更新
