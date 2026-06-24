# Acceptance — 主題圖示系統（D2）

本檔為本功能完成與否的**唯一驗收來源**。所有項目通過才得標記為完成。
（registry 與解析器為純資料/純函式，寫單元測試；GameIcon.vue 與 UpgradeModal 套用屬呈現層，
以 typecheck/build + 瀏覽器實機驗證。既有 181 測試維持全綠、引擎/模擬/store 零改動。）

_驗證日期：2026-06-25_

## 圖示 registry 與資料
- [x] `IconDef` 型別與 `WEAPON_ICONS: Record<WeaponKind, IconDef>`（7 個）、`PASSIVE_ICONS: Record<PassiveKind, IconDef>`（10 個）
- [x] 每個圖示為單色描邊 SVG 輪廓（+ 選填實心 fills）、採功能意象、`IconDef.color` 為主題色 hex
- [x] 圖示在小尺寸（loadout 15px、卡片 30px）下可辨識（瀏覽器驗證：抗體 Y、新星星芒、幹細胞紅心、受體磁吸 U 等）

## 解析器
- [x] `resolveOptionIcon(id)`：`unlock:`/`levelup:`/`evolve:` → weapon；`passunlock:`/`passlvl:` → passive；其餘/未知 → null
- [x] 進化選項取進化武器 kind 的圖示

## GameIcon 元件
- [x] `GameIcon { category, kind, size? }`：查 registry 渲染內聯 SVG（`stroke/fill: currentColor`、色取 `IconDef.color`、`flex-shrink: 0`、size 預設 20）
- [x] 查無對應時安全不渲染、不丟例外（`v-if="def"`）

## 升級彈窗套用
- [x] loadout 武器/被動列前各顯示對應主題色圖示；名稱/等級/進化提示不變
- [x] 升級選項卡用 `resolveOptionIcon(opt.id)` 顯示對應圖示；點卡仍升級並恢復遊戲
- [x] `heal` 等無對應選項：純文字卡、不顯示圖示、不破版（`v-if="cardIcons[i]"`）

## 單元測試（registry 與解析器）
- [x] 完整性：每個 `WeaponKind`/`PassiveKind` 在對應 registry 都有 entry
- [x] 無 placeholder：每個 `IconDef.paths` 非空且每條 d 非空；`color` 符合 `#rrggbb`
- [x] 解析器：5 種前綴對應正確；`heal`/未知/空字串回 `null`、不丟例外

## 邊界
- [x] 行動寬度（≤600px）卡片垂直堆疊：圖示與文字並排、不溢出、不擠壓（390px 實機驗證）
- [x] 缺漏/未知 kind 由 TS Record + 完整性測試擋下

## 不變項（硬性）
- [x] 引擎/模擬/World/store/確定性零改動；`UpgradeModal` 對外 props/emits 與點卡升級行為不變
- [x] 其餘 overlay（主選單/結算/排行榜/HUD/BossBar）不在本專案改動範圍
- [x] 既有 181 單元測試全綠（新增 6 筆 registry 測試 → 共 187）

## 驗證快照（完成時填寫）
- [x] 型別檢查（vue-tsc）乾淨（含 Record 完整性編譯期檢查）
- [x] Production build 乾淨
- [x] 單元測試全綠（187 = 181 + 6 registry）
- [x] 實機驗證（瀏覽器）：升級彈窗 loadout + 三選一卡圖示正確、heal 無圖示不破版、與膜質面板協調、
      桌機（1280px）+ 行動寬度（390px）可讀不破版、0 功能相關 console error（僅既有 favicon 404）
- [x] progress.md 已更新
