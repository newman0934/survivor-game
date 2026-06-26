# Survivor Game —《免疫大戰》

一款《吸血鬼倖存者》風格的網頁遊戲（survivor-like / bullet-heaven），以 **Vue 3 + PixiJS** 打造。

玩家操控免疫細胞在血管／胃／肺泡中移動、閃避成群病原體；武器自動朝最近的敵人開火，
擊殺掉落經驗寶石，升級時三選一強化，目標是盡可能存活久一點。

## 這是什麼

- **主題**：免疫細胞 vs 病原體。角色是免疫細胞（巨噬／嗜中性球／NK／樹突），敵人是病毒、細菌、孢子、
  螺旋菌、噴吐／分裂／自爆病原與超級病原（Boss）。
- **核心循環**：移動閃避 → 自動攻擊 → 撿經驗升級 → 三選一強化 → 變強 → 撐更久 → 結算重來。
- **武器進化**：7 把武器各有進化層（滿級 + 指定被動 → 進化卡，獲得招牌行為）。

## 功能總覽

- 7 武器（各有進化）、8 病原、Boss（每 60 秒、隨次數變強）、10 被動、4 角色、3 地圖
- 撿取物：經驗寶石、寶箱（Boss 掉，免費升級）、回血（低血才掉）、全場吸取（寶石飛向角色）
- 升級彈窗顯示持有武器/被動與進化提示；HUD 含玩家頭像、持有圖示列、血條/經驗條
- 遊戲中暫停選單（繼續／重新開始／回主選單）＋ 泛光（bloom）開關
- 進度存檔（localStorage）：戰績紀錄 + 跨場累積統計；排行榜（前 10 場）
- 美術：程式化繪製造型、噪聲視差背景、整體後製（泛光 + 色彩分級 + 暈影）、打擊反饋特效、頓挫 + 震屏
- 音效：Web Audio 程式合成 SFX + 每地圖不同背景音樂 + 限幅防爆音 + 靜音開關
- 手機支援：浮動虛擬搖桿、窄螢幕 RWD 適配

## 操作

- **WASD／方向鍵**：移動（手機為觸控搖桿）
- 武器自動朝最近敵人開火
- **ESC** 或畫面暫停鈕：暫停

## 技術棧

- **Vue 3**（`<script setup>` + TypeScript）— 選單／HUD／升級彈窗／結算等 DOM UI
- **PixiJS（WebGL）** — 遊戲世界渲染
- **Pinia** — 純 TS 引擎與 Vue UI 之間的橋接（只傳 summary 資料）
- **Vite** — 開發伺服器與打包
- **Vitest** — 引擎單元測試

## 架構

引擎（`src/engine/`）是**純 TypeScript，執行期不依賴 Vue/Pinia**：

```
Vue (DOM UI)  ──讀 summary / 送升級選擇──►  Pinia store  ◄──推 summary──  引擎 (純 TS)
src/ui/*, App.vue                            src/stores/game.ts          src/engine/**
```

- **固定步長**（1/60 秒）迴圈驅動 ECS 風格的 `World`（純資料 entity + 無狀態 system 函式），與 FPS 解耦。
- **確定性**：所有隨機都走 seeded RNG（mulberry32），模擬中不呼叫 `Math.random()`，可重現。
- 引擎只在必要時把一小包 summary（hp/time/level/kills/xp…）推給 store；Vue 依此渲染 UI。

## 執行

```bash
npm install
npm run dev        # http://localhost:5173/survivor-game/
```

## 指令

```bash
npm test           # 單元測試（Vitest）
npm run typecheck  # vue-tsc 型別檢查
npm run build      # 型別檢查 + production build
npm run lint       # eslint --fix
```

## 專案結構

```
src/
├─ main.ts                 # Vue 進入點（匯入字體 + 全域樣式）
├─ App.vue                 # 狀態機根：menu / playing / upgrading / paused / over；掛載引擎
├─ stores/game.ts          # Pinia 橋接（summary + 升級握手 + 暫停 + 角色）
├─ persistence/            # saveStore（戰績/統計）、settingsStore（bloom 設定）
├─ styles/ui.css           # 設計 token + 共用按鈕 + 展示字體
├─ ui/                     # MainMenu, Hud, UpgradeModal, GameOver, Leaderboard,
│                          #   PauseMenu, PlayerAvatar, LoadoutBar, GameIcon, Overlay, Panel…
└─ engine/                 # 純 TS — 無 Vue
   ├─ core/                # vector, rng, objectPool, spatialGrid, input, touchInput,
   │                       #   noise, hitStop, soundManager
   ├─ systems/             # movement, spawn, combat, collision, pickup, leveling,
   │                       #   weapons, weaponDefs, enemyDefs, passiveDefs, characterDefs,
   │                       #   mapDefs, pickupDefs, loadout…
   ├─ entities/factory.ts  # player / enemy / projectile / gem / chest / pickup
   ├─ World.ts             # 核心模擬：持有 entity，每 step 依序跑 systems
   ├─ PixiRenderer.ts      # entity → PixiJS 顯示 + 跟隨鏡頭
   ├─ postProcessing.ts    # 泛光 + 色彩分級 + 暈影（bloom 可開關）
   ├─ effects.ts           # 特效層（粒子/環波/震屏/頓挫）
   ├─ sprites.ts           # 程式化造型繪製
   └─ Game.ts              # 固定步長 raf 迴圈，串接 World + renderer + input + store
```

## 部署

靜態站，托管於 **GitHub Pages**（base path `/survivor-game/`）。`npm run build` 後部署 `dist/`。

