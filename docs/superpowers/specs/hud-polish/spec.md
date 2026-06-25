# Spec — HUD / 戰鬥內 UI 精修（hud-polish / D3）

## Overview

D（UI 介面精修）的第三個、也是最後一個子專案，精修戰鬥中的 HUD：血條/經驗條加光澤分段與數值讀出、
新增左上玩家頭像框（含 4 角色圖示）與左下武器/被動持有圖示列（重用 D2 的 GameIcon），
並把 BossBar 與靜音鈕的質感統一到 D1 的設計語言。建立在 D1（token/字體/膜質）與 D2（圖示系統）之上。

## Business Requirements

- 戰鬥 HUD 精緻度與已精修的遊戲畫面、選單/彈窗（D1）、圖示（D2）一致，消除最後的落差。
- 玩家在遊玩中能一眼看到自己的角色身分（頭像）與當前持有（持有列），延續 D2 解決盲選的方向。
- 維持 HUD 非侵入性（不擋中央戰鬥、不影響操作）與行動裝置可用性。

## Functional Requirements

- **FR-1 角色圖示 + GameIcon 擴充**：`iconRegistry.ts` 加 `CHARACTER_ICONS: Record<CharacterKind, IconDef>`
  （4 角色細胞圖示，色用各角色主題色）；`GameIcon.vue` 的 `category` 增加 `'character'`。
- **FR-2 PlayerAvatar 元件**：左上頭像框——角色主題色發光細邊 + 角色圖示 + `Lv N` 徽章（Chakra Petch）；
  讀 `store.character` 與 `store.level`；查無角色退回預設、不丟例外。
- **FR-3 LoadoutBar 元件**：左下（血條上方）持有圖示列——讀 `store.loadout`，用 `GameIcon` 排武器+被動小圖示，
  每個含等級 pip、進化武器加金邊；`pointer-events: none`、半透明、不擋戰鬥。
- **FR-4 Hud 血條/經驗條精修**：深色凹槽 + 填充頂部光澤 + 圓角 + 柔光暈 + 分段刻度 + 數值讀出
  （血條 `HP 目前/最大`、經驗條進度），數字套 `--font-display`；topbar 重組（Lv 移入頭像、計時置中、擊殺靠右）；
  保留受傷紅閃/升級脈動（token 化）；掛載 PlayerAvatar 與 LoadoutBar。
- **FR-5 BossBar 質感統一**：膜質凹槽 + 紫色填充光澤 + `BOSS` 標題套 Chakra Petch 字距 + 低血脈動（token 化）。
- **FR-6 MuteButton 質感統一**：毛玻璃膜質小鈕 + 細邊 + hover 主題發光 + `:focus-visible`，與 D1 按鈕語言一致。
- **FR-7 資料流接線**：`store` 加 `character: CharacterKind` 欄位 + `setCharacter` action；
  `App.startGame` 設定角色；`Game.start` 建 world 後推一次初始 `setLoadout` 快照（起始武器開賽即顯示）。
- **FR-8 完整性測試**：`iconRegistry.test.ts` 擴充——每個 `CharacterKind` 都有圖示、無 placeholder。

## Acceptance Criteria

詳見 `acceptance.md`（唯一驗收來源）。重點：四元件視覺統一、頭像顯示正確角色與 Lv、持有列從開賽即正確、
血條/經驗條光澤分段數值、BossBar/靜音鈕質感統一、HUD 不擋戰鬥、typecheck/build 乾淨、測試全綠。

## Edge Cases

- 起始/首次升級前：持有列顯示起始武器（靠 `Game.start` 初始快照）；無被動時被動段為空、不破版。
- 持有滿載：持有列在行動寬度換行或限寬、不溢出、不擋中央戰鬥。
- Boss 不存在：BossBar 隱藏（維持現狀）。
- 未知/預設角色：頭像退回預設角色圖示、不丟例外。
- `prefers-reduced-motion: reduce`：關閉脈動/位移動畫，保留必要狀態。

## API Contracts

- `iconRegistry.ts`：新增 `CHARACTER_ICONS`；既有匯出不變。
- `GameIcon.vue`：`category: 'weapon' | 'passive' | 'character'`。
- `PlayerAvatar.vue` / `LoadoutBar.vue`：無 props（讀 store）、不發事件、純呈現。
- `store`：新增 `character` 狀態與 `setCharacter(kind: CharacterKind)` action；既有 API 不變。
- `MuteButton.vue` 對外行為（切換靜音）不變。

## Data Model Changes

`store` State 新增 `character: CharacterKind`（顯示資料，預設 `'macrophage'`）。無引擎/持久化資料結構變更。

## State Changes

無遊戲模擬狀態變更。`store.character` 於開賽設定、為顯示用途。

## UI Behaviour

- 頭像於遊玩/升級/結束（HUD 顯示時）呈現；Lv 隨升級更新。
- 持有列隨升級增長、進化金邊呼應升級彈窗。
- 血條/經驗條即時反映 hp/xp，含光澤分段數值；受傷紅閃、升級脈動保留。
- BossBar 於 Boss 存在時顯示、低血脈動；靜音鈕 hover/focus 回饋。

## Non-Functional Requirements

- **非侵入**：HUD 全程 `pointer-events: none`（靜音鈕除外），不影響操作/碰撞/確定性。
- **效能**：純 CSS/SVG 呈現，無每幀重物件；沿用既有 summary 推送節奏。
- **相依**：純前端；重用 D1 token/字體、D2 GameIcon；新增 store `character` 為顯示欄位。
- **可及性**：靜音鈕 `:focus-visible`；尊重 `prefers-reduced-motion`。
- **架構純度**：模擬/system/World 計算邏輯零改動；唯一引擎觸碰為 `Game.start` 推初始快照（glue）。
