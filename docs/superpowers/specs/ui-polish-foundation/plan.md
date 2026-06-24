# UI 精修地基（ui-polish-foundation / D1）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development（recommended）或 superpowers:executing-plans 逐 task 實作。**建議 inline 執行**（純 CSS/視覺，需瀏覽器逐畫面截圖微調）。Steps use checkbox (`- [ ]`) 語法。

**Goal:** 建立共用「免疫膜質」面板語言（Overlay/Panel 元件 + 設計 token + Chakra Petch 展示字體 + 共用按鈕類別），並套用到主選單/升級彈窗/結算/排行榜四個 overlay。

**Architecture:** 全域 `src/styles/ui.css` 提供設計 token 與按鈕類別、`@fontsource/chakra-petch` 自托管字體；兩個無狀態 slot 元件 `Overlay.vue`（毛玻璃遮罩+暈染）與 `Panel.vue`（發光膜質容器）收斂面板 CSS；四 overlay 改用這層外殼，內容排版與事件/資料流不動。純 DOM 呈現層、不碰引擎/模擬/store。

**Tech Stack:** Vue 3 `<script setup>`、CSS（backdrop-filter / @supports / CSS 變數）、`@fontsource/chakra-petch`（建置期打包、自托管）、Vite。

## Global Constraints

- 繁體中文註解；型別/程式名稱英文；commit 格式 `[mvp][type][scope] 描述` + `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`。
- 純 DOM 呈現層：只動 `src/styles/ui.css`(新)、`src/ui/Overlay.vue`(新)、`src/ui/Panel.vue`(新)、`src/main.ts`、四個 overlay（MainMenu/UpgradeModal/GameOver/Leaderboard）、`progress.md`、acceptance.md。**不碰** 引擎/模擬/World/store/sprites/確定性，**不碰** HUD/BossBar/MuteButton（D3 範圍）。
- 字體：Chakra Petch 經 `@fontsource/chakra-petch` 自托管（`latin-*` subset、`font-display: swap` 為其預設）、不走 CDN；只套拉丁字元，中文走系統字體棧。
- 既有 5 個主題變數（`--immune-accent`/`--immune-accent-strong`/`--antigen`/`--card-bg`/`--card-bg-hover`，定義於 App.vue `:root`）保留相容。
- 四 overlay 對外 props/emits 簽章不變；既有 RWD 斷點（≤600px）行為不變。
- 純視覺、無可測純邏輯：不寫單元測試；以 `npm run typecheck` + `npm run build` + 瀏覽器實機截圖驗證。既有 181 測試須維持全綠。
- 尊重 `prefers-reduced-motion: reduce`；`:focus-visible` 提供可見焦點環；`@supports not (backdrop-filter)` 退回不透明面。

---

### Task 1: 全域地基 — ui.css 設計 token + Chakra Petch 字體 + 共用按鈕類別

**Files:**
- Create: `src/styles/ui.css`
- Modify: `src/main.ts`
- Modify: `package.json`（新增 `@fontsource/chakra-petch` 相依，由 npm 寫入）

**Interfaces:**
- Produces: 全域 CSS 變數（`--font-display`、`--font-body`、`--panel-surface`、`--panel-surface-solid`、`--panel-border`、`--panel-blur`、`--panel-radius`、`--panel-glow`、`--panel-shadow`、`--overlay-bg`、`--overlay-blur`、`--space-1..4`、`--fs-title`/`--fs-h2`/`--fs-body`/`--fs-sm`、`--ui-fast`、`--ui-med`）；全域類別 `.ui-btn`、`.ui-btn-primary`、`.ui-btn-ghost`。Task 2–4 會使用。

- [ ] **Step 1: 安裝字體套件**

Run: `npm i @fontsource/chakra-petch`
Expected: 安裝成功，`package.json` dependencies 出現 `@fontsource/chakra-petch`。

- [ ] **Step 2: 建立 `src/styles/ui.css`**

```css
/* UI 精修地基：設計 token、展示字體套用與共用按鈕類別（全域；由 main.ts 匯入）。
   既有主題色（--immune-accent 等）定義於 App.vue :root，此處只新增、不重定義。 */

:root {
  /* 字體 */
  --font-display: 'Chakra Petch', 'Noto Sans TC', system-ui, sans-serif;
  --font-body: 'Noto Sans TC', 'PingFang TC', 'Microsoft JhengHei', system-ui, sans-serif;

  /* 免疫膜質面板 */
  --panel-surface: rgba(20, 14, 18, 0.72);
  --panel-surface-solid: rgba(20, 14, 18, 0.96); /* backdrop-filter 不支援時退回 */
  --panel-border: rgba(111, 227, 214, 0.35);     /* immune-accent 低透明 */
  --panel-blur: 14px;
  --panel-radius: 16px;
  --panel-glow: 0 0 40px rgba(77, 208, 192, 0.12);
  --panel-shadow: 0 18px 50px rgba(0, 0, 0, 0.55);

  /* 遮罩暈染 */
  --overlay-bg: radial-gradient(ellipse at center, rgba(18, 10, 14, 0.55) 0%, rgba(10, 6, 9, 0.88) 100%);
  --overlay-blur: 6px;

  /* 間距級距 */
  --space-1: 0.4rem;
  --space-2: 0.8rem;
  --space-3: 1.2rem;
  --space-4: 1.8rem;

  /* 字級階層 */
  --fs-title: 3rem;
  --fs-h2: 1.6rem;
  --fs-body: 1rem;
  --fs-sm: 0.85rem;

  /* 過渡 */
  --ui-fast: 0.12s ease-out;
  --ui-med: 0.22s ease-out;
}

/* 全域內文字體：中文走系統字體棧（拉丁展示字體由各處用 --font-display 局部套用） */
body { font-family: var(--font-body); }

/* 共用按鈕 */
.ui-btn {
  font-family: var(--font-display);
  font-weight: 600;
  cursor: pointer;
  border: none;
  border-radius: 10px;
  transition: transform var(--ui-fast), box-shadow var(--ui-med), background var(--ui-med), border-color var(--ui-med);
}
.ui-btn:focus-visible { outline: 2px solid var(--immune-accent-strong); outline-offset: 2px; }
.ui-btn:active { transform: scale(0.96); }

.ui-btn-primary { background: var(--immune-accent); color: #06231f; }
.ui-btn-primary:hover {
  background: var(--immune-accent-strong);
  box-shadow: 0 0 18px rgba(77, 208, 192, 0.6);
  transform: translateY(-1px);
}

.ui-btn-ghost { background: transparent; color: #fff; border: 2px solid var(--immune-accent); }
.ui-btn-ghost:hover {
  background: rgba(77, 208, 192, 0.14);
  border-color: var(--immune-accent-strong);
  transform: translateY(-1px);
}

@media (prefers-reduced-motion: reduce) {
  .ui-btn, .ui-btn:hover, .ui-btn:active { transform: none; }
}
@media (max-width: 600px) {
  :root { --panel-blur: 8px; --overlay-blur: 3px; }
}
```

- [ ] **Step 3: `src/main.ts` 匯入字體 subset 與 ui.css**

把：

```ts
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'

createApp(App).use(createPinia()).mount('#app')
```

改為（在 App 之前匯入樣式；只載拉丁 subset 的 400/500/700 三個字重）：

```ts
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import '@fontsource/chakra-petch/latin-400.css'
import '@fontsource/chakra-petch/latin-500.css'
import '@fontsource/chakra-petch/latin-700.css'
import './styles/ui.css'
import App from './App.vue'

createApp(App).use(createPinia()).mount('#app')
```

- [ ] **Step 4: 驗證 — typecheck + build**

Run: `npm run typecheck`
Expected: 乾淨無錯。
Run: `npm run build`
Expected: 乾淨；建置產物含 Chakra Petch woff2（latin subset）。

- [ ] **Step 5: 瀏覽器確認字體載入**

啟動 `npm run dev`，DevTools Network 確認 `chakra-petch-latin-*.woff2` 載入、Console 無新錯誤（既有 favicon 404 可忽略）。

- [ ] **Step 6: Commit**

```bash
git add src/styles/ui.css src/main.ts package.json package-lock.json
git commit -m "[mvp][feat][ui] UI 精修地基：設計 token + Chakra Petch 字體 + 共用按鈕類別（D1-1）

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: Overlay.vue + Panel.vue 共用元件，並套用主選單

**Files:**
- Create: `src/ui/Overlay.vue`
- Create: `src/ui/Panel.vue`
- Modify: `src/ui/MainMenu.vue`

**Interfaces:**
- Consumes: Task 1 的全域 token 與 `.ui-btn*` 類別。
- Produces: `<Overlay>`（slot，毛玻璃遮罩+暈染+置中）、`<Panel>`（slot，發光膜質容器、超高可捲）。Task 3–4 會使用。

- [ ] **Step 1: 建立 `src/ui/Overlay.vue`**

```vue
<script setup lang="ts">
/**
 * Overlay.vue — 共用背景遮罩層（無狀態 slot 元件、純呈現）。
 * 毛玻璃模糊 + 中心徑向暈染 + 置中容納內容；面板樣式請另用 Panel.vue 包內容。
 */
</script>

<template>
  <div class="ui-overlay"><slot /></div>
</template>

<style scoped>
.ui-overlay {
  position: absolute; inset: 0;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  background: var(--overlay-bg);
  backdrop-filter: blur(var(--overlay-blur));
  color: #fff;
  overflow: auto;
  padding: 1rem;
}
</style>
```

- [ ] **Step 2: 建立 `src/ui/Panel.vue`**

```vue
<script setup lang="ts">
/**
 * Panel.vue — 共用「免疫膜質」面板容器（無狀態 slot 元件、純呈現）。
 * 半透明深色面 + 1px 發光細邊 + 柔外發光 + 頂緣膜光澤 + 圓角；內容超高可捲、不溢出。
 */
</script>

<template>
  <div class="ui-panel"><slot /></div>
</template>

<style scoped>
.ui-panel {
  position: relative;
  display: flex; flex-direction: column; align-items: center;
  gap: var(--space-2);
  max-width: min(92vw, 720px);
  max-height: 88vh;
  overflow-y: auto;
  padding: var(--space-4);
  border-radius: var(--panel-radius);
  border: 1px solid var(--panel-border);
  background: var(--panel-surface);
  backdrop-filter: blur(var(--panel-blur));
  box-shadow: var(--panel-glow), var(--panel-shadow);
}
/* 頂緣膜光澤 */
.ui-panel::before {
  content: ''; position: absolute; inset: 0;
  border-radius: var(--panel-radius);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.06) 0%, rgba(255, 255, 255, 0) 32%);
  pointer-events: none;
}
/* backdrop-filter 不支援時退回不透明面（內容仍清楚可讀） */
@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  .ui-panel { background: var(--panel-surface-solid); }
}
</style>
```

- [ ] **Step 3: 改寫 `src/ui/MainMenu.vue` 的 `<template>`（用 Overlay/Panel 包裝、按鈕換共用類別）**

把整段 `<template>`（第 38–83 行）改為：

```vue
<template>
  <Overlay>
    <Panel class="menu-panel">
      <h1>Survivor</h1>

      <div class="stats" v-if="stats.totalRuns > 0">
        <span>總擊殺 <b>{{ stats.totalKills }}</b></span>
        <span>場數 <b>{{ stats.totalRuns }}</b></span>
        <span>最佳存活 <b>{{ fmtBest(stats.bestTime) }}</b></span>
        <span>最高等級 <b>{{ stats.maxLevel }}</b></span>
      </div>

      <div class="section-label">角色</div>
      <div class="row">
        <button
          v-for="kind in CHARACTER_ORDER"
          :key="kind"
          class="card"
          :class="{ active: character === kind }"
          :style="character === kind ? { borderColor: css(CHARACTER_DEFS[kind].color) } : {}"
          @click="character = kind"
        >
          <span class="name" :style="{ color: css(CHARACTER_DEFS[kind].color) }">{{ CHARACTER_DEFS[kind].name }}</span>
          <span class="desc">{{ CHARACTER_DEFS[kind].description }}</span>
        </button>
      </div>

      <div class="section-label">地圖</div>
      <div class="row">
        <button
          v-for="kind in MAP_ORDER"
          :key="kind"
          class="card"
          :class="{ active: map === kind }"
          :style="map === kind ? { borderColor: css(MAP_DEFS[kind].gridColor) } : {}"
          @click="map = kind"
        >
          <span class="name" :style="{ color: css(MAP_DEFS[kind].gridColor) }">{{ MAP_DEFS[kind].name }}</span>
          <span class="desc">{{ MAP_DEFS[kind].description }}</span>
        </button>
      </div>

      <button class="ui-btn ui-btn-primary start" @click="emit('start', { character, map })">開始遊戲</button>
      <button class="ui-btn ui-btn-ghost ranking" @click="emit('open-leaderboard')">排行榜</button>
      <p class="hint">WASD / 方向鍵移動 · 自動攻擊</p>
    </Panel>
  </Overlay>
</template>
```

- [ ] **Step 4: `src/ui/MainMenu.vue` `<script setup>` 匯入兩個元件**

在 import 區（第 7–10 行附近）加：

```ts
import Overlay from './Overlay.vue'
import Panel from './Panel.vue'
```

- [ ] **Step 5: `src/ui/MainMenu.vue` `<style>` 調整**

- 刪除舊的 `.overlay { ... }` 規則（背景/置中改由 `<Overlay>` 提供）。
- `h1` 加展示字體：把 `h1 { font-size: 3rem; ... }` 改為
  `h1 { font-family: var(--font-display); font-size: var(--fs-title); margin: 0 0 0.5rem; letter-spacing: 0.1em; }`
- 刪除舊 `.start { ... }` 與 `.ranking { ... }` 中與 `.ui-btn*` 重複的視覺宣告（背景/邊框/圓角/cursor/font-weight），僅保留尺寸/間距類：
  `.start { font-size: 1.4rem; padding: 0.6rem 2rem; margin-top: 0.6rem; }`
  `.ranking { font-size: 1.05rem; padding: 0.4rem 1.4rem; }`
- `.menu-panel` 不需額外規則（沿用 Panel 預設）；若主選單內容需更寬，可加 `.menu-panel { gap: 0.6rem; }`。
- 其餘（`.stats`、`.section-label`、`.row`、`.card`、`.name`、`.desc`、`.hint`、各 `@media`）保留不動；手機 `@media` 內對 `.start`/`.ranking` 的 `font-size`/`padding` 覆寫保留。

- [ ] **Step 6: 驗證 — typecheck + build + 瀏覽器**

Run: `npm run typecheck` → 乾淨
Run: `npm run build` → 乾淨
瀏覽器主選單：確認膜質面板（毛玻璃/發光邊/膜光澤）、標題用 Chakra Petch、按鈕 hover/press/focus 回饋、角色/地圖卡可選、開始/排行榜可點。截圖 before→after。微調 token 數值（blur/邊框/發光）至滿意。

- [ ] **Step 7: Commit**

```bash
git add src/ui/Overlay.vue src/ui/Panel.vue src/ui/MainMenu.vue
git commit -m "[mvp][feat][ui] 共用 Overlay/Panel 膜質元件 + 套用主選單（D1-2）

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: 套用升級彈窗（UpgradeModal）

**Files:**
- Modify: `src/ui/UpgradeModal.vue`

**Interfaces:**
- Consumes: `<Overlay>`/`<Panel>`（Task 2）、`.ui-btn*` 與 token（Task 1）。

- [ ] **Step 1: `<script setup>` 匯入兩個元件**

在 import 區（第 9–13 行附近）加：

```ts
import Overlay from './Overlay.vue'
import Panel from './Panel.vue'
```

- [ ] **Step 2: 改寫 `<template>`（用 Overlay/Panel 包裝）**

把整段 `<template>`（第 50–78 行）改為：

```vue
<template>
  <Overlay>
    <Panel class="upgrade-panel">
      <h2 class="title">選擇升級</h2>
      <div class="loadout" v-if="store.loadout.weapons.length || store.loadout.passives.length">
        <div class="ld-col" v-if="store.loadout.weapons.length">
          <div class="ld-title">武器</div>
          <div v-for="w in store.loadout.weapons" :key="w.kind" class="ld-item">
            <span class="ld-name">{{ weaponName(w) }} {{ weaponLevel(w) }}</span>
            <span class="ld-hint" :class="weaponHint(w).cls">{{ weaponHint(w).text }}</span>
          </div>
        </div>
        <div class="ld-col" v-if="store.loadout.passives.length">
          <div class="ld-title">被動</div>
          <div v-for="p in store.loadout.passives" :key="p.kind" class="ld-item">
            <span class="ld-name">{{ passiveName(p) }} {{ passiveLevel(p) }}</span>
          </div>
        </div>
      </div>
      <div class="cards">
        <button v-for="(opt, i) in store.upgradeOptions" :key="opt.id" class="card"
          :class="{ evolve: opt.id.startsWith('evolve:') }"
          :style="{ animationDelay: 0.06 * i + 's' }"
          @click="store.pickUpgrade(opt.id)">
          {{ opt.label }}
        </button>
      </div>
    </Panel>
  </Overlay>
</template>
```

- [ ] **Step 3: `<style>` 調整**

- 刪除舊的 `.overlay { ... }` 規則（改由 `<Overlay>` 提供）。
- `.title` 加展示字體：在現有 `.title { animation: ... }` 之外，補
  `.title { font-family: var(--font-display); font-size: var(--fs-h2); }`（與既有 animation 規則合併或另立一條）。
- 其餘（`.cards`、`.card`、`.card.evolve`、`rise` 動畫、`.loadout`、`.ld-*`、各 `@media`、reduced-motion）全部保留不動。升級卡 `.card` 維持既有自訂外觀（與按鈕類別不同，刻意保留卡片感）。

- [ ] **Step 4: 驗證 — typecheck + build + 瀏覽器**

Run: `npm run typecheck` → 乾淨
Run: `npm run build` → 乾淨
瀏覽器：遊戲中升到 2 級開升級彈窗，確認面板膜質、loadout 持有區與三卡在面板內、進化卡金邊發光仍在、點卡會升級並恢復遊戲、標題用展示字體。截圖。

- [ ] **Step 5: Commit**

```bash
git add src/ui/UpgradeModal.vue
git commit -m "[mvp][feat][ui] 升級彈窗套用膜質面板語言（D1-3）

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: 套用結算（GameOver）與排行榜（Leaderboard）

**Files:**
- Modify: `src/ui/GameOver.vue`
- Modify: `src/ui/Leaderboard.vue`

**Interfaces:**
- Consumes: `<Overlay>`/`<Panel>`（Task 2）、`.ui-btn*` 與 token（Task 1）。

- [ ] **Step 1: `GameOver.vue` `<script setup>` 匯入元件**

在 import 區（第 7–8 行附近）加：

```ts
import Overlay from './Overlay.vue'
import Panel from './Panel.vue'
```

- [ ] **Step 2: `GameOver.vue` 改寫 `<template>`**

把整段 `<template>`（第 31–46 行）改為（外層用 Overlay，內層用 Panel 取代原 `.panel`；按鈕換共用類別）：

```vue
<template>
  <Overlay>
    <Panel class="go-panel">
      <h1>你倒下了</h1>
      <p>存活時間 {{ mmss }}</p>
      <p>擊殺 {{ store.kills }} · 等級 {{ store.level }}</p>
      <p v-if="isNewBestTime" class="record">🏆 存活新紀錄！</p>
      <p v-if="isNewBestKills" class="record">🏆 擊殺新紀錄！</p>
      <p class="best">最佳存活：{{ bestText }}</p>
      <div class="actions">
        <button class="ui-btn ui-btn-primary" @click="emit('restart')">再玩一次</button>
        <button class="ui-btn ui-btn-ghost" @click="emit('menu')">回主選單</button>
      </div>
    </Panel>
  </Overlay>
</template>
```

- [ ] **Step 3: `GameOver.vue` `<style>` 調整**

- 刪除舊 `.overlay { ... }`（改由 `<Overlay>` 提供）。
- 刪除舊 `.panel { ... }` 的容器視覺（背景/置中改由 `<Panel>` 提供）；進場動畫改套在面板內容上：保留 `@keyframes gopop`，把 `.panel { animation: gopop ... }` 改為 `.go-panel { animation: gopop 0.35s ease-out both; }`，並保留 `@media (prefers-reduced-motion: reduce) { .go-panel { animation: none; } }`。
- `h1` 加展示字體：新增 `h1 { font-family: var(--font-display); }`。
- 刪除舊 `button { ... }` 與 `button.secondary { ... }`（改用 `.ui-btn*`）；保留 `.actions`、`.record`、`.best` 及其 reduced-motion 規則，並把 `button` 的尺寸補回到 `.actions .ui-btn`：
  `.actions .ui-btn { font-size: 1.3rem; padding: 0.5rem 1.5rem; }`

- [ ] **Step 4: `Leaderboard.vue` `<script setup>` 匯入元件**

在 import 區（第 7–10 行附近）加：

```ts
import Overlay from './Overlay.vue'
import Panel from './Panel.vue'
```

- [ ] **Step 5: `Leaderboard.vue` 改寫 `<template>`**

把整段 `<template>`（第 44–70 行）改為：

```vue
<template>
  <Overlay>
    <Panel class="lb-panel">
      <h1>排行榜</h1>
      <p v-if="runs.length === 0" class="empty">尚無紀錄，快去存活看看！</p>
      <div v-else class="table-wrap">
        <table class="board">
          <thead>
            <tr><th>#</th><th>存活</th><th>擊殺</th><th>等級</th><th>角色</th><th>地圖</th><th>日期</th></tr>
          </thead>
          <tbody>
            <tr v-for="(r, i) in runs" :key="i">
              <td class="rank">{{ i + 1 }}</td>
              <td>{{ fmtTime(r.time) }}</td>
              <td>{{ r.kills }}</td>
              <td>{{ r.level }}</td>
              <td :style="{ color: charColor(r.character) }">{{ charName(r.character) }}</td>
              <td>{{ mapName(r.map) }}</td>
              <td class="date">{{ fmtDate(r.date) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <button class="ui-btn ui-btn-primary" @click="emit('close')">關閉</button>
    </Panel>
  </Overlay>
</template>
```

- [ ] **Step 6: `Leaderboard.vue` `<style>` 調整**

- 刪除舊 `.overlay { ... }`（改由 `<Overlay>` 提供）。
- 刪除舊 `.panel { ... }` 容器視覺；進場動畫改套面板：保留 `@keyframes lbpop`，新增 `.lb-panel { animation: lbpop 0.3s ease-out both; }` 與 `@media (prefers-reduced-motion: reduce) { .lb-panel { animation: none; } }`。
- `h1` 加展示字體：把 `h1 { margin: 0; letter-spacing: 0.08em; }` 改為 `h1 { font-family: var(--font-display); margin: 0; letter-spacing: 0.08em; }`。
- 刪除舊 `button { ... }`（改用 `.ui-btn ui-btn-primary`）；若需尺寸補回：`.lb-panel > .ui-btn { font-size: 1.2rem; padding: 0.5rem 1.6rem; }`。
- 其餘（`.empty`、`.table-wrap`、`.board` 及表格、`.rank`、`.date`、各 `@media`）保留不動。

- [ ] **Step 7: 驗證 — typecheck + build + 瀏覽器**

Run: `npm run typecheck` → 乾淨
Run: `npm run build` → 乾淨
瀏覽器：（a）結算畫面——遊戲結束後確認膜質面板、破紀錄多行正常、再玩一次/回主選單可點且事件正確；（b）排行榜——主選單點排行榜，確認面板/表格/空狀態、關閉可點。截圖兩者。

- [ ] **Step 8: Commit**

```bash
git add src/ui/GameOver.vue src/ui/Leaderboard.vue
git commit -m "[mvp][feat][ui] 結算與排行榜套用膜質面板語言（D1-4）

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5: 跨畫面驗證（RWD / 可及性 / 退化）+ 文件收尾

**Files:**
- Modify: `docs/superpowers/specs/ui-polish-foundation/acceptance.md`
- Modify: `progress.md`

- [ ] **Step 1: 行動寬度驗證（≤600px）**

瀏覽器縮到 ≤600px（或 DevTools 裝置模擬）逐一檢查四 overlay：面板可捲不溢出、blur 降強度、既有 RWD 行為（角色卡縮放、升級卡垂直、表格可橫捲、loadout 可捲）維持。截圖。修正任何破版。

- [ ] **Step 2: 可及性與退化驗證**

- 鍵盤 Tab 巡覽四 overlay 按鈕，確認 `:focus-visible` 外環可見。
- 開系統「減少動態」（或 DevTools rendering emulate `prefers-reduced-motion: reduce`），確認按鈕/進場無位移/縮放、面板仍正常顯示。
- DevTools rendering 模擬不支援 backdrop-filter（或檢視 `@supports` 分支）確認面板退回不透明面、文字可讀。

- [ ] **Step 3: 全套驗證**

Run: `npm run typecheck` → 乾淨
Run: `npm test` → 181 全綠（引擎零影響）
Run: `npm run build` → 乾淨

- [ ] **Step 4: 更新 acceptance.md 與 progress.md**

- acceptance.md：勾選所有項目、填驗證日期。
- progress.md：階段 4 美術處補一行「UI 精修地基（D1）：免疫膜質 Overlay/Panel + Chakra Petch 展示字體 + 設計 token，套用主選單/升級/結算/排行榜 → specs/ui-polish-foundation/」。

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/specs/ui-polish-foundation/acceptance.md progress.md
git commit -m "[mvp][docs][meta] UI 精修地基（D1）驗收通過，更新 acceptance 與 progress

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-Review（plan 對 spec 的覆蓋檢查）

- **FR-1 設計 token**：Task 1 ui.css `:root` 擴充全套 token；既有 5 變數保留（定義於 App.vue，未動）。✅
- **FR-2 自托管展示字體**：Task 1 `@fontsource/chakra-petch` latin subset + main.ts 匯入；font-display: swap 為 fontsource 預設；不走 CDN。✅
- **FR-3 Overlay.vue**：Task 2 Step 1，毛玻璃+暈染+置中、行動降 blur（token @media）。✅
- **FR-4 Panel.vue**：Task 2 Step 2，膜質面+發光邊+膜光澤+圓角+可捲+@supports 退回。✅
- **FR-5 共用按鈕類別**：Task 1 `.ui-btn*`，hover/active/focus-visible/reduced-motion。✅
- **FR-6 四 overlay 套用**：Task 2（主選單）、Task 3（升級）、Task 4（結算+排行榜）；事件/資料流/RWD 保留。✅
- **邊界**：Task 5 含 no-backdrop 退化、RWD、長內容可捲、reduced-motion。✅
- **不變項**：只動指定檔；引擎/store/HUD/BossBar/MuteButton 未動；Task 5 Step 3 驗 181 測試。✅
- **Placeholder 掃描**：無 TBD；CSS/Vue 程式碼與指令完整；refactor 以精確 before→after 編輯描述。✅
- **型別/命名一致**：`Overlay`/`Panel` 元件名、`.ui-btn`/`.ui-btn-primary`/`.ui-btn-ghost`、token 變數名跨 Task 一致。✅
