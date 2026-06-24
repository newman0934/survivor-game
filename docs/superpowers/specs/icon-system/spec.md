# Spec — 主題圖示系統（icon-system / D2）

## Overview

D（UI 介面精修）的第二個子專案，為 17 種武器/被動建立一套單色主題色塑形的內聯 SVG 圖示，
透過 `GameIcon` 元件套用到升級彈窗的 loadout 持有區與三選一升級選項卡，
解決「盲選卡死」——讓玩家一眼辨識持有與選項。建立在 D1 的膜質面板語言之上。

圖示資料與呈現分離：純資料 registry（可單元測試、TS 強制完整）+ 薄呈現元件 + `opt.id` 解析器。
角色圖示（4 種）不在本範圍——延到 D3 HUD 玩家頭像框真正需要時再做（YAGNI）。

## Business Requirements

- 升級時玩家能憑圖示快速辨識每個武器/被動與升級選項，降低純文字盲選的認知負擔。
- 圖示與 D1 膜質面板視覺協調，延續豪華主題重塑的一致性。
- 圖示集合可維護、可擴充：新增武器/被動時，缺圖示應在編譯期或測試期被擋下。

## Functional Requirements

- **FR-1 IconDef 與 registry**：`src/ui/icons/iconRegistry.ts` 定義
  `IconDef = { viewBox?: string; paths: string[]; color: string }`，
  並提供 `WEAPON_ICONS: Record<WeaponKind, IconDef>`（7 個）與
  `PASSIVE_ICONS: Record<PassiveKind, IconDef>`（10 個）。用 `Record<Kind, IconDef>` 使缺漏在編譯期即型別錯誤。
- **FR-2 圖示視覺**：每個圖示為單色實心 SVG 輪廓，採該功能的生物/作用意象，小尺寸（16–32px）下可辨識；
  著色用 `IconDef.color`（主題色 hex），色彩語意對齊功能（如傷害紅、攻速青、經驗抗原黃）。
- **FR-3 解析器**：`resolveOptionIcon(id: string): { category: 'weapon' | 'passive'; kind: string } | null`，
  解析升級選項 id 前綴（`unlock:`/`levelup:`/`evolve:` → weapon；`passunlock:`/`passlvl:` → passive；
  其餘如 `heal` 與未知 id → `null`）。
- **FR-4 GameIcon 元件**：`src/ui/GameIcon.vue`，props `{ category: 'weapon' | 'passive'; kind: string; size?: number }`
  （size 預設 20），查對應 registry 渲染內聯 `<svg>`（`fill: currentColor`、色取 `IconDef.color`、`flex-shrink: 0`）；
  查無對應時安全不渲染。
- **FR-5 升級彈窗套用**：`UpgradeModal.vue` 的 loadout 武器/被動列前各加 `<GameIcon>`；
  升級選項卡用 `resolveOptionIcon(opt.id)` 顯示對應圖示（回 `null` 時不顯示圖示、純文字卡）。
- **FR-6 完整性測試**：`iconRegistry.test.ts` 驗證每個 `WeaponKind`/`PassiveKind` 都有 entry、
  每個 `IconDef` 無 placeholder（paths 非空、`color` 符合 `#rrggbb`）、`resolveOptionIcon` 各前綴對應正確。

## Acceptance Criteria

詳見 `acceptance.md`（唯一驗收來源）。重點：17 圖示齊全且可辨識、loadout 與升級卡正確顯示圖示、
`heal` 無圖示不破版、registry 測試全綠、typecheck/build 乾淨、既有 181 測試不破壞。

## Edge Cases

- 升級選項 `heal`（或任何未對應 kind 的 id）→ `resolveOptionIcon` 回 `null`，卡片純文字、不破版。
- 缺漏/未知 kind（理論上被 TS Record + 完整性測試擋掉）→ `GameIcon` 安全不渲染、不丟例外。
- 行動寬度（≤600px）卡片垂直堆疊 → 圖示與文字並排、不溢出、不擠壓。
- 進化選項（`evolve:`）→ 取進化武器 kind 的圖示（與該武器一致）。

## API Contracts

- `iconRegistry.ts`：匯出 `IconDef`、`WEAPON_ICONS`、`PASSIVE_ICONS`、`resolveOptionIcon`。
- `GameIcon.vue`：props `{ category: 'weapon' | 'passive'; kind: string; size?: number }`；不發事件。
- `UpgradeModal.vue` 對外 props/emits 與點卡升級行為不變。

## Data Model Changes

無引擎/store/持久化變更。新增的 `IconDef` 與 registry 為純 UI 層展示資料。

## State Changes

無遊戲狀態變更。圖示為純呈現。

## UI Behaviour

- loadout 每列：圖示 + 名稱 + 等級（+ 武器進化提示）；圖示色為該項主題色。
- 升級選項卡：有對應 kind 時左側/上方顯示圖示，無對應（heal）時維持純文字。
- 圖示不影響既有點選、進化金邊、loadout 捲動等行為。

## Non-Functional Requirements

- **相依**：純前端、內聯 SVG、零執行期相依與額外網路請求。
- **效能**：靜態 SVG、數量小，無效能疑慮。
- **排版**：圖示 `flex-shrink: 0`，不擠壓文字；loadout 列與卡片高度容納圖示。
- **架構純度**：UI 層不新增對引擎的執行期耦合；引擎/模擬/store/確定性零改動。
- **可維護性**：新增武器/被動時，缺圖示由 TS Record + 完整性測試擋下。
