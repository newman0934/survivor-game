# Acceptance — HUD / 戰鬥內 UI 精修（D3）

本檔為本功能完成與否的**唯一驗收來源**。所有項目通過才得標記為完成。
（角色圖示 registry 為純資料、寫單元測試；HUD 元件套用屬呈現層，以 typecheck/build + 瀏覽器實機驗證。
既有測試維持全綠、引擎模擬/確定性零改動。）

_驗證日期：2026-06-25_

## 角色圖示 + GameIcon 擴充
- [x] `CHARACTER_ICONS: Record<CharacterKind, IconDef>`（4 角色，色用各角色主題色）
- [x] `GameIcon` 的 `category` 支援 `'character'`，正確渲染角色圖示
- [x] 完整性測試：每個 `CharacterKind` 有 entry、無 placeholder（paths/fills 非空、color 合法）

## PlayerAvatar（左上頭像框）
- [x] 顯示目前角色圖示 + 角色主題色發光邊 + `Lv N` 徽章（Chakra Petch）
- [x] 讀 `store.character` / `store.level`；升級時 Lv 更新（實機 Lv 1→8 更新）
- [x] 未知/預設角色安全退回、不丟例外（color 退回 #fff、GameIcon `v-if`）

## LoadoutBar（左下持有列）
- [x] 讀 `store.loadout`，用 GameIcon 排武器+被動小圖示；等級 pip、進化金邊
- [x] 起始武器開賽即顯示（Game.start 初始快照）；升級後增長（實機長到 5 格）
- [x] `pointer-events: none`、不擋戰鬥；無被動時不破版

## Hud 血條/經驗條精修
- [x] 血條/經驗條：深色凹槽 + 填充頂部光澤 + 圓角 + 柔光暈 + 分段刻度
- [x] 數值讀出（血條目前/最大、經驗條 XP%），數字套 `--font-display`
- [x] topbar 重組（Lv 移入頭像、計時置中、擊殺靠右）；受傷紅閃保留（token 化）

## BossBar / MuteButton 質感統一
- [x] BossBar：膜質凹槽 + 紫色光澤 + Chakra Petch `BOSS` 標題 + 低血脈動（token 化）
- [x] MuteButton：毛玻璃膜質小鈕 + 細邊 + hover 主題發光 + `:focus-visible`；切換靜音不變

## 資料流接線
- [x] `store` 加 `character` 欄位 + `setCharacter`；`App.startGame` 設定角色
- [x] `Game.start` 推一次初始 loadout 快照（glue，非模擬邏輯）

## 邊界與可及性
- [x] HUD 除靜音鈕外 `pointer-events: none`，不影響操作/碰撞/確定性
- [x] 行動寬度（390px）：頭像/持有列/血條/BossBar 縮放或換行、不溢出、不擋中央（實機驗證）
- [x] 持有滿載：持有列換行或限寬、不溢出
- [x] `prefers-reduced-motion: reduce`：關脈動/位移、保留焦點回饋（各元件 `@media` 規則）

## 不變項（硬性）
- [x] 模擬/system/World 計算邏輯零改動；確定性不變（唯一引擎觸碰為 Game.start 推初始快照 glue）
- [x] 其餘 overlay（主選單/升級/結算/排行榜）不在本專案改動範圍、不退化
- [x] 既有單元測試全綠（新增 2 筆角色測試 → 共 189）

## 驗證快照（完成時填寫）
- [x] 型別檢查（vue-tsc）乾淨（含 Record 完整性編譯期檢查）
- [x] Production build 乾淨
- [x] 單元測試全綠（189 = 187 + 2 角色）
- [x] 實機驗證（瀏覽器）：頭像（角色色/Lv 更新）、持有列（開賽即顯示/升級增長到 5 格）、血條/經驗條光澤分段數值、
      BossBar（紫光澤/Chakra Petch）、靜音鈕膜質；切換嗜中性球頭像轉綠；桌機 + 行動寬度（390px）不破版不擋戰鬥、0 功能相關 console error（僅既有 favicon 404）
- [x] progress.md 已更新
