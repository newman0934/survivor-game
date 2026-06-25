# Acceptance — HUD / 戰鬥內 UI 精修（D3）

本檔為本功能完成與否的**唯一驗收來源**。所有項目通過才得標記為完成。
（角色圖示 registry 為純資料、寫單元測試；HUD 元件套用屬呈現層，以 typecheck/build + 瀏覽器實機驗證。
既有測試維持全綠、引擎模擬/確定性零改動。）

_驗證日期：（待填）_

## 角色圖示 + GameIcon 擴充
- [ ] `CHARACTER_ICONS: Record<CharacterKind, IconDef>`（4 角色，色用各角色主題色）
- [ ] `GameIcon` 的 `category` 支援 `'character'`，正確渲染角色圖示
- [ ] 完整性測試：每個 `CharacterKind` 有 entry、無 placeholder（paths/fills 非空、color 合法）

## PlayerAvatar（左上頭像框）
- [ ] 顯示目前角色圖示 + 角色主題色發光邊 + `Lv N` 徽章（Chakra Petch）
- [ ] 讀 `store.character` / `store.level`；升級時 Lv 更新
- [ ] 未知/預設角色安全退回、不丟例外

## LoadoutBar（左下持有列）
- [ ] 讀 `store.loadout`，用 GameIcon 排武器+被動小圖示；等級 pip、進化金邊
- [ ] 起始武器開賽即顯示（Game.start 初始快照）；升級後增長
- [ ] `pointer-events: none`、不擋戰鬥；無被動時不破版

## Hud 血條/經驗條精修
- [ ] 血條/經驗條：深色凹槽 + 填充頂部光澤 + 圓角 + 柔光暈 + 分段刻度
- [ ] 數值讀出（血條目前/最大、經驗條進度），數字套 `--font-display`
- [ ] topbar 重組（Lv 移入頭像、計時置中、擊殺靠右）；受傷紅閃/升級脈動保留（token 化）

## BossBar / MuteButton 質感統一
- [ ] BossBar：膜質凹槽 + 紫色光澤 + Chakra Petch `BOSS` 標題 + 低血脈動（token 化）
- [ ] MuteButton：毛玻璃膜質小鈕 + 細邊 + hover 主題發光 + `:focus-visible`；切換靜音不變

## 資料流接線
- [ ] `store` 加 `character` 欄位 + `setCharacter`；`App.startGame` 設定角色
- [ ] `Game.start` 推一次初始 loadout 快照（glue，非模擬邏輯）

## 邊界與可及性
- [ ] HUD 除靜音鈕外 `pointer-events: none`，不影響操作/碰撞/確定性
- [ ] 行動寬度（≤600px）：頭像/持有列/血條/BossBar 縮放或換行、不溢出、不擋中央
- [ ] 持有滿載：持有列換行或限寬、不溢出
- [ ] `prefers-reduced-motion: reduce`：關脈動/位移、保留焦點回饋

## 不變項（硬性）
- [ ] 模擬/system/World 計算邏輯零改動；確定性不變
- [ ] 其餘 overlay（主選單/升級/結算/排行榜）不在本專案改動範圍、不退化
- [ ] 既有單元測試全綠（新增角色完整性測試後總數上升）

## 驗證快照（完成時填寫）
- [ ] 型別檢查（vue-tsc）乾淨（含 Record 完整性編譯期檢查）
- [ ] Production build 乾淨
- [ ] 單元測試全綠（既有 + 新增角色測試）
- [ ] 實機驗證（瀏覽器）：頭像（角色/Lv）、持有列（開賽即顯示/升級增長/進化金邊）、血條/經驗條光澤分段數值、
      BossBar、靜音鈕質感；切換不同角色頭像正確；桌機 + 行動寬度不破版不擋戰鬥；0 功能相關 console error
- [ ] progress.md 已更新
