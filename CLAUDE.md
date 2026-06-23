# CLAUDE.md

給 Claude Code 在此專案工作時的指南。

## 這是什麼

一款《吸血鬼倖存者》風格的 web 遊戲（survivor-like / bullet-heaven）。玩家移動閃避成群的敵人；
武器會自動朝最近的敵人開火；擊殺敵人掉落經驗寶石；收集經驗值升級並從 3 張卡選 1 個強化；
目標是盡可能存活久一點。

目前進度為**階段 0 + 1**（引擎地基 + 完整核心循環）。狀態與路線圖見 `progress.md`；

## 架構 — 最重要的一條規則

**引擎是純 TypeScript，執行期絕對不可以 import Vue 或 Pinia。**

```
Vue (DOM UI)  ──讀取 summary / 送出升級選擇──►  Pinia store  ◄──推送 summary──  引擎 (純 TS)
src/ui/*, App.vue                               src/stores/game.ts            src/engine/**
```

- `src/engine/**` 負責跑遊戲：固定步長迴圈驅動 ECS 風格的 `World`（純資料 entity + 無狀態的
  system 函式），用 PixiJS 渲染。它完全不碰 Vue 的響應式系統——畫面上數百個物件每幀更新會
  把效能拖垮。
- 唯一允許的「引擎 → store」參照是 `World.ts` 裡的 `import type { Summary }`（型別專用、編譯後
  會被抹除）。`engine/` 內不得有任何 Vue/Pinia 的執行期 import。
- 引擎只在 UI 真正需要知道的時機，把一小包 **summary**（hp、time、level、kills、xp…）推給
  store；Vue 再依此渲染 HUD/選單/彈窗。
- 升級握手流程：升級時迴圈暫停，呼叫 `store.offerUpgrades(...)` 並設定
  `store.onUpgradePicked`；升級彈窗呼叫 `store.pickUpgrade(id)`，進而觸發該 callback
  （→ `world.applyUpgrade`）並恢復遊戲。

## 檔案地圖

```
src/
├─ main.ts                 # Vue 進入點
├─ App.vue                 # 狀態機：menu / playing / upgrading / over；掛載引擎
├─ stores/game.ts          # Pinia 橋接 — 只放純 summary 資料 + {id,label} 升級描述
├─ ui/                     # MainMenu, Hud, UpgradeModal, GameOver（純呈現）
└─ engine/                 # 純 TS — 無 Vue/Pinia 執行期依賴
   ├─ types.ts             # Entity, PlayerStats, UpgradeOption
   ├─ core/                # vector, rng（seeded mulberry32）, objectPool, spatialGrid, input
   ├─ systems/             # movement, spawn, combat, collision, pickup, leveling（無狀態函式）
   ├─ entities/factory.ts  # createPlayer/Enemy/Projectile/Gem
   ├─ World.ts             # 持有 entities，每個 step() 依序跑 systems  ← 核心模擬
   ├─ PixiRenderer.ts      # entity → PixiJS Graphics + 跟隨玩家的鏡頭
   └─ Game.ts              # 固定步長 raf 迴圈；串接 World + renderer + input + store
```

## 指令

```bash
npm run dev        # Vite 開發伺服器 http://localhost:5173
npm test           # Vitest（引擎單元測試）
npm run typecheck  # vue-tsc --noEmit
npm run build      # 型別檢查 + production build
npm run lint       # eslint --fix
```

## 慣例

- **Vue：** 一律使用 Vue 3 Composition API 搭配 `<script setup lang="ts">`，不使用 Options API。
- **引擎邏輯走 TDD：** core/、systems/、`World` 都是純邏輯且有單元測試。先寫會失敗的測試。
  Renderer/迴圈/UI 屬於整合膠水層，靠實際跑起來驗證，不寫單元測試。
- **system 保持無狀態：** system 是對 entities/資料運算的函式，不是帶狀態的 class。所有可變的
  執行期狀態都放在 `World`。
- **確定性：** 隨機數一律走 `core/rng`（seeded）。模擬中不要呼叫 `Math.random()`，會破壞可重現性。
  遊戲迴圈是固定步長（1/60 秒），邏輯與 FPS 解耦；絕不要把遊戲邏輯綁在原始 frame delta 上。
- **資源清理：** `Game.stop()` 與 `PixiRenderer.destroy()` 必須是冪等的（有 guard），因為遊戲結束
  與重新開始都可能呼叫 stop——請維持這個特性。
- **commit 風格：** 採 conventional commits（`feat(engine): …`、`test(store): …`），一個 commit
  一個邏輯變更。

## 已知取捨（原型階段刻意保留）

- `World.step()` 每幀用 `Array.filter` 清掉死掉的 entity，碰撞也用陣列掃描。目前數量下沒問題。
  `core/objectPool` 與 `core/spatialGrid` 已建好並測過、但尚未接進來——它們是為階段 2 的高物件數
  預備的。若 FPS 出問題，先把它們透過 `World` 接上，再考慮其他優化。
- `Game.ts` 直接呼叫 `useGameStore()`，所以必須在 Pinia context 內執行。若日後引擎需要獨立做
  單元測試，再改成由 `App.vue` 注入 store 形狀的 callback。

## 小提醒

- **新增升級：** 在 `src/engine/systems/leveling.ts` 的 `ALL_UPGRADES` 加一筆（id + label +
  `apply(stats)`）。UI 與抽選邏輯會自動帶到。
- **新增敵人/武器/entity 類型：** 在 `src/engine/entities` 擴充 `EntityKind`/factory 與對應的
  system；並在 `PixiRenderer` 的 `COLORS` map 加上顏色。
- **調難度/手感：** 生怪曲線在 `systems/spawn.ts`，基礎數值在 `entities/factory.ts` 與
  `World.stats`，經驗曲線在 `systems/leveling.ts`。

  SDD 開發流程

所有新功能皆必須遵循：

PRD
↓
Spec
↓
BDD
↓
Acceptance
↓
Plan
↓
Tasks
↓
Approval
↓
Playwright Skeleton
↓
Implementation
↓
Verification
↓
Review
↓
Progress Update
文件優先順序

若文件內容衝突：

1. Spec
2. BDD
3. Acceptance
4. Plan
5. Tasks
6. Implementation

永遠遵循優先級較高的文件。

Approval Gate

開始實作前必須存在：

spec.md
bdd.feature
acceptance.md
plan.md
tasks.md

若尚未取得明確批准：

立即停止。

禁止：

修改程式碼
建立 Commit
修改正式功能
文件結構
docs/superpowers/specs/<feature-name>/

spec.md
bdd.feature
acceptance.md
plan.md
tasks.md
Spec 規範

每份 Spec 必須包含：

Overview
Business Requirements
Functional Requirements
Acceptance Criteria
Edge Cases
API Contracts
Data Model Changes
State Changes
UI Behaviour
Non-Functional Requirements
BDD 規範

BDD 使用 Gherkin 格式。

每個功能必須包含：

Happy Path
Validation Failure
Authorization
Error Handling
Boundary Conditions
Acceptance 規範

acceptance.md 為功能完成與否的唯一驗收來源。

Acceptance 使用 Checklist 編寫。

範例：

[ ] 使用者可成功登入
[ ] 錯誤密碼顯示錯誤訊息
[ ] JWT 成功保存
[ ] 重新整理後仍保持登入

Acceptance 不應重複撰寫 BDD Scenario。

Playwright 規範

Playwright 必須由 BDD 自動衍生。

必須維持可追蹤性：

BDD
↓
Playwright
↓
Acceptance

每個 BDD Scenario 至少對應一個 Playwright 測試。

Browser Testing Policy

優先順序：

1. Unit Test
2. Integration Test
3. Playwright Test
4. Browser Agent

除非：

使用者明確要求
Playwright 無法重現問題

否則避免使用 Browser Agent。

Browser Agent 成本高且耗費大量 Token。

Token Budget Policy

讀檔前：

只讀必要檔案。

測試前：

只執行受影響測試。

避免：

掃描整個 Repo
執行完整測試集
無意義重試

優先使用：

Log
Trace
Test Report

而非 Screenshot。

Commit 規範

格式：

[feature][type][scope] description

範例：

[mvp][feat][backend] 新增好友 API

[mvp][fix][ws] 修正自動重連問題

[mvp][test][chat] 補齊訊息狀態測試

所有 Commit 必須包含：

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
Review 規範

實作完成後：

執行測試
執行驗證
自我 Review
更新 Acceptance Checklist
更新 progress.md

未通過所有 Acceptance 項目：

不得標記為完成。

Progress 更新規範

每完成一個 Task：

更新 progress.md：

已完成工作
剩餘工作
已知問題
驗證結果
下一步建議

progress.md 必須永遠反映專案最新狀態。

# 語言規範

預設語言為繁體中文（zh-TW）。

除以下項目外，一律使用繁體中文：

- 程式碼
- API 路徑
- 資料庫欄位名稱
- 型別名稱
- 測試函式名稱
- Commit 格式
- 第三方套件名稱

包含：

- Spec
- Acceptance
- BDD
- Plan
- Tasks
- Review
- Debug
- Progress
- 驗證結果
- 執行狀態說明

皆使用繁體中文。
