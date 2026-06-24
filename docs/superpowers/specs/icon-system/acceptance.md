# Acceptance — 主題圖示系統（D2）

本檔為本功能完成與否的**唯一驗收來源**。所有項目通過才得標記為完成。
（registry 與解析器為純資料/純函式，寫單元測試；GameIcon.vue 與 UpgradeModal 套用屬呈現層，
以 typecheck/build + 瀏覽器實機驗證。既有 181 測試維持全綠、引擎/模擬/store 零改動。）

_驗證日期：（待填）_

## 圖示 registry 與資料
- [ ] `IconDef` 型別與 `WEAPON_ICONS: Record<WeaponKind, IconDef>`（7 個）、`PASSIVE_ICONS: Record<PassiveKind, IconDef>`（10 個）
- [ ] 每個圖示為單色實心 SVG 輪廓、採功能意象、`IconDef.color` 為主題色 hex
- [ ] 17 圖示在小尺寸（loadout 16–18px、卡片 24–32px）下可辨識（瀏覽器驗證）

## 解析器
- [ ] `resolveOptionIcon(id)`：`unlock:`/`levelup:`/`evolve:` → weapon；`passunlock:`/`passlvl:` → passive；其餘/未知 → null
- [ ] 進化選項取進化武器 kind 的圖示

## GameIcon 元件
- [ ] `GameIcon { category, kind, size? }`：查 registry 渲染內聯 SVG（`fill: currentColor`、色取 `IconDef.color`、`flex-shrink: 0`、size 預設 20）
- [ ] 查無對應時安全不渲染、不丟例外

## 升級彈窗套用
- [ ] loadout 武器/被動列前各顯示對應主題色圖示；名稱/等級/進化提示不變
- [ ] 升級選項卡用 `resolveOptionIcon(opt.id)` 顯示對應圖示；點卡仍升級並恢復遊戲
- [ ] `heal` 等無對應選項：純文字卡、不顯示圖示、不破版

## 單元測試（registry 與解析器）
- [ ] 完整性：每個 `WeaponKind`/`PassiveKind` 在對應 registry 都有 entry
- [ ] 無 placeholder：每個 `IconDef.paths` 非空且每條 d 非空；`color` 符合 `#rrggbb`
- [ ] 解析器：5 種前綴對應正確；`heal`/未知/空字串回 `null`、不丟例外

## 邊界
- [ ] 行動寬度（≤600px）卡片垂直堆疊：圖示與文字並排、不溢出、不擠壓
- [ ] 缺漏/未知 kind 由 TS Record + 完整性測試擋下

## 不變項（硬性）
- [ ] 引擎/模擬/World/store/確定性零改動；`UpgradeModal` 對外 props/emits 與點卡升級行為不變
- [ ] 其餘 overlay（主選單/結算/排行榜/HUD/BossBar）不在本專案改動範圍
- [ ] 既有 181 單元測試全綠（新增 registry 測試後總數上升）

## 驗證快照（完成時填寫）
- [ ] 型別檢查（vue-tsc）乾淨（含 Record 完整性編譯期檢查）
- [ ] Production build 乾淨
- [ ] 單元測試全綠（181 + 新增 registry 測試）
- [ ] 實機驗證（瀏覽器）：升級彈窗 loadout + 三選一卡圖示正確、heal 無圖示不破版、與膜質面板協調、
      桌機 + 行動寬度可讀不破版、0 功能相關 console error
- [ ] progress.md 已更新
