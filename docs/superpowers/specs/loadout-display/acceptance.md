# Acceptance — 升級彈窗顯示目前持有

本檔為本功能完成與否的**唯一驗收來源**。所有項目通過才得標記為完成。
（loadoutSnapshot / evolutionStatus 走 TDD 單元測試；UI 屬呈現層、以 typecheck/build/實機目視驗證；既有 168 測試維持全綠。）

_驗證日期：2026-06-24_

## 純函式與快照（含單元測試）
- [x] `World.loadoutSnapshot()` 回傳 `{ weapons:{kind,level,evolved}[], passives:{kind,level}[] }`，正確反映 World.weapons/passives（含 evolved）
- [x] `evolutionStatus`：evolved → `'evolved'`
- [x] `evolutionStatus`：滿級 + 持有所需被動 → `'ready'`
- [x] `evolutionStatus`：未滿級 或 缺所需被動 → `'pending'`
- [x] `evolutionStatus` 判定與 `leveling.buildCandidates` 進化條件一致

## store 與接線
- [x] store 新增 `LoadoutSnapshot` 型別、`loadout` 狀態（初值空）、`setLoadout` action；`start()` 重置
- [x] `Game` 在提供升級選項處呼叫 `store.setLoadout(world.loadoutSnapshot())`（含寶箱免費升級）
- [x] `World` 以 type-only import 取用 `LoadoutSnapshot`，引擎無 Vue/Pinia 執行期依賴

## UI 呈現（UpgradeModal）
- [x] 卡片上方顯示「目前持有」區，分武器/被動兩欄
- [x] 武器顯示名稱 + 等級（滿級 MAX；已進化顯示進化名 + ★）
- [x] 進化提示：evolved→「★ 已進化」、ready→「可進化！」、pending→「進化需：滿級＋{所需被動名}」
- [x] 被動顯示名稱 + 等級（滿級 MAX）
- [x] 套免疫主題 / `prefers-reduced-motion` / 窄螢幕不破版

## 不變項（硬性）
- [x] 不修改 `Summary` 形狀、既有 store 欄位、武器/被動數值/行為
- [x] 模擬無 `Math.random()`；既有 168 單元測試全綠
- [x] 引擎/系統純函式無 Vue/Pinia 執行期依賴

## 驗證快照（完成時填寫）
- [x] 單元測試全綠（173 通過，含 Task 1 +4、Task 2 +1）
- [x] 型別檢查（vue-tsc）乾淨
- [x] Production build 乾淨
- [ ] 實機驗證：升級彈窗顯示持有武器/被動 + 等級 + 進化提示（可進化/進化需○○/已進化）正確、窄螢幕不破版、0 功能相關 console error（待玩家 npm run dev 確認）
- [x] progress.md 已更新
