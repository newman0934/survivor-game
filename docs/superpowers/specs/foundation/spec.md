# Survivor Game — 地基 + 核心可玩循環 設計文件

**日期：** 2026-06-22
**範圍：** 第一份 spec — 階段 0（地基）+ 階段 1（核心可玩循環）
**遊戲類型：** 即時動作 / Roguelite 生存遊戲（survivor-like / bullet-heaven，仿《吸血鬼倖存者》）

---

## 1. 目標與範圍

做出一款 Vampire Survivors 風格的 web 遊戲。最終目標是「盡量接近完整」，因此本份 spec
的重點是**打好可擴充的地基**，並搭配一個**能玩、好玩的最小核心循環**一起交付（地基不跑起來
看不出對不對，兩者一起做最實際）。

### 分階段總覽（本 spec 只涵蓋階段 0 + 1）

- **階段 0｜地基**：Vue 3 + TypeScript + Vite 專案、PixiJS 渲染層、固定步長遊戲迴圈、
  ECS 風格實體/系統架構、Vue 負責選單與 HUD。
- **階段 1｜核心循環（本 spec）**：玩家移動、1 種自動武器、1 種敵人成群湧來、經驗寶石、
  升級 3 選 1、存活計時、死亡結算。
- 階段 2：多武器、多敵人、Boss、更多升級分支、被動道具。
- 階段 3：多角色 / 多地圖 / 寶箱。
- 階段 4：進度存檔、解鎖、計分排行。

每個階段各自有 spec → 計畫 → 實作的循環。

### 平台與操作

- **桌面瀏覽器為主，鍵盤操作**（WASD / 方向鍵移動）。
- 不支援觸控（本階段 YAGNI；架構上輸入處理獨立成模組，未來可加觸控）。

---

## 2. 架構總覽 — Vue 與引擎的分工

核心原則：**Vue 管 UI（DOM），PixiJS 管遊戲畫面（WebGL Canvas），兩者透過 Pinia store 溝通。**

```
┌─────────────────────────────────────────────┐
│  Vue App (DOM 層)                             │
│  ├─ 主選單 / 開始畫面                          │
│  ├─ HUD（血量、計時、等級、經驗條）             │
│  ├─ 升級選擇彈窗（暫停遊戲時出現）              │
│  └─ 死亡結算畫面                               │
│         ↕ 透過 Pinia store 讀寫共享狀態         │
├─────────────────────────────────────────────┤
│  Game Engine（純 TypeScript，不依賴 Vue）      │
│  ├─ GameLoop（固定步長更新 + 渲染）            │
│  ├─ World（持有所有 entities）                 │
│  ├─ Systems（移動、攻擊、碰撞、生怪、撿寶…）    │
│  └─ PixiRenderer（把 entities 畫到畫布上）     │
└─────────────────────────────────────────────┘
```

**關鍵設計決定：**

- 遊戲引擎是**純 TypeScript、完全不碰 Vue 的響應式系統**。避免畫面上數百個物件每幀觸發
  大量響應式更新而拖垮效能。
- 引擎只在「值得讓 UI 知道」的時刻（血量變化、升級、暫停、死亡）把**摘要資料**推到 Pinia
  store；Vue 才更新 HUD 與彈窗。
- 升級時：引擎將遊戲**暫停**、把 3 個升級選項寫入 store → Vue 顯示升級彈窗 → 玩家點選 →
  store 通知引擎套用升級並恢復遊戲。這是 Vue ↔ 引擎雙向溝通的唯一複雜互動點，需明確定義
  介面。

---

## 3. 遊戲迴圈與實體系統

- **固定步長（fixed timestep）迴圈**：邏輯每秒更新固定次數（目標 60 次），與畫面 FPS 解耦，
  確保不同電腦上遊戲速度一致、碰撞不穿透。用 `requestAnimationFrame` 驅動，內部累積時間
  （accumulator）跑固定步長，渲染在每個 raf 進行。
- **輕量 ECS 風格**：Entity 是一包資料（position、velocity、hp、sprite ref…），System 是
  處理邏輯的函式（MovementSystem、CombatSystem…）。**不引入重型 ECS 函式庫**（YAGNI），
  自己寫薄薄一層；結構上預留擴充空間，後面階段加武器/敵人只要新增資料與 system。
- **空間網格（spatial grid）做碰撞**：敵人一多，兩兩比對會爆炸（O(n²)）。用簡單的網格分區
  只比對鄰近物件。這是撐住「數百敵人」的關鍵，地基階段就先放進去。
- **物件池（object pooling）**：投射物、經驗寶石、敵人頻繁生成/銷毀，用物件池複用以減少
  GC 壓力。地基階段先為投射物與敵人建立基本物件池。

---

## 4. 核心玩法循環（階段 1）

| 元素 | 階段 1 的內容 |
|------|--------------|
| **玩家** | WASD / 方向鍵移動，有血量。Camera 跟隨玩家捲動 |
| **武器** | 1 種，**自動攻擊**（朝最近敵人發射投射物），有冷卻時間 |
| **敵人** | 1 種，從畫面外緣**成群生成**，朝玩家直線追擊，碰到玩家扣血 |
| **生怪** | 隨時間推移，生成速度逐漸加快（難度曲線） |
| **經驗** | 敵人死亡掉落經驗寶石，玩家靠近自動吸取 |
| **升級** | 經驗滿 → 暫停遊戲、彈出 3 選 1 升級卡（攻速↑ / 移速↑ / 傷害↑） |
| **結算** | 玩家血量歸零 → 顯示存活時間、擊殺數、等級 |

**美術：** 用簡單色塊 / 幾何圖形（玩家＝藍方塊、敵人＝紅圓、寶石＝綠點）。原型階段不卡在
美術上；之後階段再換成 sprite。

**遊戲狀態機（App 層）：** `主選單 → 遊玩中 ⇄ 升級暫停 → 死亡結算 → 回主選單`。

---

## 5. 專案結構

新專案建在 workspace 同層，名稱 `survivor-game`：

```
survivor-game/
├─ index.html
├─ vite.config.ts
├─ package.json
├─ tsconfig.json
└─ src/
   ├─ main.ts              # Vue app 進入點
   ├─ App.vue              # 根組件，依遊戲狀態切換選單/遊戲/結算
   ├─ stores/
   │  └─ game.ts           # Pinia：分數、遊戲狀態、升級選項橋接
   ├─ ui/                  # Vue 組件
   │  ├─ MainMenu.vue
   │  ├─ Hud.vue
   │  ├─ UpgradeModal.vue
   │  └─ GameOver.vue
   └─ engine/             # 純 TS，無 Vue 依賴
      ├─ GameLoop.ts       # 固定步長迴圈
      ├─ World.ts          # 持有所有 entities，協調 systems
      ├─ PixiRenderer.ts   # 把 entities 畫到 PixiJS 畫布
      ├─ entities/         # 玩家、敵人、投射物、寶石的資料定義
      ├─ systems/          # movement / combat / spawn / collision / pickup
      └─ core/             # 向量數學、空間網格、物件池、輸入處理、亂數
```

**工具鏈：** Vue 3 + `<script setup>` + TypeScript + Vite + Pinia + PixiJS，
搭配 ESLint + Prettier + vue-tsc 型別檢查。Vue 部分遵循 Composition API + `<script setup>`
標準寫法。

---

## 6. 模組職責（單元邊界）

| 模組 | 做什麼 | 依賴 |
|------|--------|------|
| `core/vector.ts` | 2D 向量數學（加減、長度、正規化、距離） | 無 |
| `core/spatialGrid.ts` | 空間分區，查詢鄰近 entities | vector |
| `core/objectPool.ts` | 泛型物件池 | 無 |
| `core/input.ts` | 鍵盤輸入狀態（按下中的方向） | 無 |
| `core/rng.ts` | 可控亂數（生怪、升級抽選） | 無 |
| `engine/World.ts` | 持有 entities，每步驟依序跑 systems | entities, systems, core |
| `engine/GameLoop.ts` | fixed timestep，驅動 update + render | World, PixiRenderer |
| `engine/PixiRenderer.ts` | 同步 entity 狀態到 Pixi 顯示物件、camera | World, PixiJS |
| `engine/systems/*` | 各自單一職責的遊戲邏輯（純函式優先） | entities, core |
| `stores/game.ts` | Vue ↔ 引擎的橋接狀態與事件 | Pinia |

引擎透過 store 暴露給 Vue 的介面（摘要資料）：玩家 HP、存活時間、等級、經驗進度、
當前升級選項、遊戲狀態（playing/paused/over）、擊殺數。

---

## 7. 測試策略

- **引擎核心邏輯用單元測試（Vitest），以 TDD 撰寫**：向量數學、空間網格、物件池、碰撞
  偵測、傷害計算、升級套用、生怪曲線、亂數抽選。這些是純函式、好測，也是 bug 最容易藏的
  地方。
- **遊戲迴圈與渲染**：不寫自動化測試（涉及 canvas / raf 不值得），靠實際跑起來人工驗證手感。
- **Vue 組件**：本階段不寫測試（原型階段 UI 會頻繁調整，YAGNI）。

---

## 8. 驗收標準（階段 1 完成的定義）

1. 開啟頁面看到主選單，點「開始」進入遊戲。
2. 用 WASD / 方向鍵可流暢移動玩家，camera 跟隨。
3. 敵人從邊緣成群生成並追擊玩家；隨時間增多。
4. 武器自動朝最近敵人攻擊，命中可消滅敵人。
5. 敵人死亡掉落經驗寶石，玩家靠近自動吸取。
6. 經驗滿時遊戲暫停、彈出 3 選 1 升級卡，選擇後套用並繼續。
7. 玩家被敵人接觸扣血，血量歸零顯示結算（存活時間、擊殺數、等級），可回主選單重玩。
8. 畫面上同時數百個敵人時仍維持流暢（目標 60 FPS）。
9. 引擎核心邏輯單元測試全數通過，vue-tsc 型別檢查無誤。

---

## 9. 非目標（本 spec 明確不做）

- 觸控 / 行動裝置操作。
- 多武器、多敵人類型、Boss、被動道具（階段 2）。
- 多角色、多地圖、寶箱（階段 3）。
- 存檔、解鎖、排行榜（階段 4）。
- 音效與音樂（後續階段視情況加入）。
- 最終美術 sprite（原型用幾何圖形）。
