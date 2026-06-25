# 遊戲中暫停選單（pause-menu）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development 或 superpowers:executing-plans 逐 task 實作。**建議 inline 執行**（需瀏覽器實機按 ESC/鈕看暫停）。Steps use checkbox (`- [ ]`) 語法。

**Goal:** 遊戲中以 ESC 或畫面暫停鈕暫停，顯示暫停選單（繼續/重新開始/回主選單），重用 D1 膜質 UI。

**Architecture:** 沿用既有「phase 驅動 overlay」——`store` 加 `'paused'` phase 與 `pauseGame`/`resumeGame`；`App.vue` 擴充 `watch(phase)` 暫停引擎、加 ESC 監聽、渲染 `PauseMenu`（重用 `Overlay`/`Panel`/`.ui-btn`）與 `PauseButton`。引擎模擬/確定性零改動。

**Tech Stack:** Vue 3 `<script setup>`、Pinia、CSS（重用 D1 token/元件）、Vitest（store 純邏輯）。

## Global Constraints

- 繁體中文註解；型別/程式名稱英文；commit `[mvp][type][scope] 描述` + `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`。
- 純前端：只動 `stores/game.ts`(+ 新測試)、`App.vue`、`Hud.vue`（擊殺數位移）、新 `PauseMenu.vue`/`PauseButton.vue`、`progress.md`、acceptance.md。**不碰** 引擎模擬/system/World 計算/確定性、其餘 overlay。
- store 暫停轉換寫單元測試；元件/接線屬呈現/整合層，以 typecheck/build + 瀏覽器驗證。既有 189 測試維持全綠。
- 重用 D1：`<Overlay>`/`<Panel>`、`.ui-btn`/`.ui-btn-primary`/`.ui-btn-ghost`、`--panel-*`/`--font-display` token。
- 暫停僅停止模擬推進（`Game.pause()` 既有行為），不改變隨機序列/確定性。

---

### Task 1: store paused phase + pauseGame/resumeGame（TDD）

**Files:**
- Modify: `src/stores/game.ts`
- Create: `src/stores/game.test.ts`

**Interfaces:**
- Produces: `Phase` 含 `'paused'`；`pauseGame()`（playing→paused）、`resumeGame()`（paused→playing）。供 Task 2/3 使用。

- [ ] **Step 1: 寫失敗測試 `src/stores/game.test.ts`**

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useGameStore } from './game'

describe('暫停 phase 轉換', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('pauseGame 僅在 playing 生效', () => {
    const s = useGameStore()
    s.start()
    s.pauseGame()
    expect(s.phase).toBe('paused')
  })
  it('pauseGame 在非 playing 不改變狀態', () => {
    const s = useGameStore()
    expect(s.phase).toBe('menu')
    s.pauseGame()
    expect(s.phase).toBe('menu')
    s.gameOver()
    s.pauseGame()
    expect(s.phase).toBe('over')
  })
  it('resumeGame 僅在 paused 生效', () => {
    const s = useGameStore()
    s.start()
    s.pauseGame()
    s.resumeGame()
    expect(s.phase).toBe('playing')
  })
  it('resumeGame 在非 paused 不改變狀態', () => {
    const s = useGameStore()
    s.start()
    s.resumeGame()
    expect(s.phase).toBe('playing')
  })
})
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `npx vitest run src/stores/game.test.ts`
Expected: FAIL（`pauseGame`/`resumeGame` 不存在）。

- [ ] **Step 3: `stores/game.ts` 加 `'paused'` 與兩個 action**

把 `Phase` 型別：

```ts
export type Phase = 'menu' | 'playing' | 'upgrading' | 'over'
```

改為：

```ts
export type Phase = 'menu' | 'playing' | 'upgrading' | 'over' | 'paused'
```

在 `toMenu` action 之後（`actions` 區塊內、`},` 之前）加：

```ts
    /** 遊戲中暫停（僅 playing 生效，切到 paused）。 */
    pauseGame() {
      if (this.phase === 'playing') this.phase = 'paused'
    },
    /** 從暫停恢復（僅 paused 生效，切回 playing）。 */
    resumeGame() {
      if (this.phase === 'paused') this.phase = 'playing'
    },
```

- [ ] **Step 4: 跑測試確認通過**

Run: `npx vitest run src/stores/game.test.ts` → PASS（4 it 全綠）

- [ ] **Step 5: Commit**

```bash
git add src/stores/game.ts src/stores/game.test.ts
git commit -m "[mvp][feat][ui] store paused phase + pauseGame/resumeGame（暫停選單 1）

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: PauseMenu.vue + PauseButton.vue 元件

**Files:**
- Create: `src/ui/PauseMenu.vue`
- Create: `src/ui/PauseButton.vue`

**Interfaces:**
- Consumes: `Overlay`/`Panel`/`.ui-btn`（D1）、`store.pauseGame`（Task 1）。
- Produces: `<PauseMenu>`（emits `resume`/`restart`/`menu`）、`<PauseButton>`（點擊呼叫 `store.pauseGame`）。供 Task 3 接線。

- [ ] **Step 1: 建立 `src/ui/PauseMenu.vue`**

```vue
<script setup lang="ts">
/** PauseMenu.vue — 暫停選單 overlay（phase==='paused'）。重用 Overlay/Panel + .ui-btn。 */
import Overlay from './Overlay.vue'
import Panel from './Panel.vue'

const emit = defineEmits<{ resume: []; restart: []; menu: [] }>()
</script>

<template>
  <Overlay>
    <Panel class="pause-panel">
      <h1>暫停</h1>
      <div class="actions">
        <button class="ui-btn ui-btn-primary" @click="emit('resume')">繼續</button>
        <button class="ui-btn ui-btn-ghost" @click="emit('restart')">重新開始</button>
        <button class="ui-btn ui-btn-ghost" @click="emit('menu')">回主選單</button>
      </div>
    </Panel>
  </Overlay>
</template>

<style scoped>
.pause-panel { gap: 1.2rem; }
h1 { font-family: var(--font-display); margin: 0; letter-spacing: 0.08em; }
.actions { display: flex; flex-direction: column; gap: 0.7rem; align-items: stretch; }
.actions .ui-btn { font-size: 1.2rem; padding: 0.55rem 2rem; }
</style>
```

- [ ] **Step 2: 建立 `src/ui/PauseButton.vue`**

```vue
<script setup lang="ts">
/** PauseButton.vue — 戰鬥中右上角暫停鈕（呈現層）。點擊呼叫 store.pauseGame。 */
import { useGameStore } from '../stores/game'

const store = useGameStore()
</script>

<template>
  <button class="pause-btn" aria-label="暫停" @click="store.pauseGame()">⏸</button>
</template>

<style scoped>
.pause-btn {
  position: absolute; top: 0.5rem; right: 3.4rem; z-index: 10;
  width: 2.4rem; height: 2.4rem; font-size: 1.1rem; cursor: pointer; color: #fff;
  border: 1px solid var(--panel-border); border-radius: 10px;
  background: var(--panel-surface); backdrop-filter: blur(var(--panel-blur));
  transition: box-shadow var(--ui-med), border-color var(--ui-med), transform var(--ui-fast);
}
.pause-btn:hover { border-color: var(--immune-accent-strong); box-shadow: 0 0 12px rgba(77, 208, 192, 0.5); }
.pause-btn:active { transform: scale(0.94); }
.pause-btn:focus-visible { outline: 2px solid var(--immune-accent-strong); outline-offset: 2px; }
@media (prefers-reduced-motion: reduce) { .pause-btn:active { transform: none; } }
</style>
```

- [ ] **Step 3: 驗證 typecheck + build**

Run: `npm run typecheck` → 乾淨
Run: `npm run build` → 乾淨

- [ ] **Step 4: Commit**

```bash
git add src/ui/PauseMenu.vue src/ui/PauseButton.vue
git commit -m "[mvp][feat][ui] PauseMenu + PauseButton 元件（暫停選單 2）

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: App.vue 接線（watch + ESC + 渲染）+ HUD 位移 + 驗證 + 文件

**Files:**
- Modify: `src/App.vue`
- Modify: `src/ui/Hud.vue`
- Modify: `docs/superpowers/specs/pause-menu/acceptance.md`
- Modify: `progress.md`

**Interfaces:**
- Consumes: `PauseMenu`/`PauseButton`（Task 2）、`store.pauseGame`/`resumeGame`（Task 1）、既有 `restart()`/`toMenu()`。

- [ ] **Step 1: `App.vue` import 元件與 onMounted**

把：

```ts
import { ref, watch, onBeforeUnmount } from 'vue'
```

改為：

```ts
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
```

在 UI import 區（`import Leaderboard ...` 附近）加：

```ts
import PauseMenu from './ui/PauseMenu.vue'
import PauseButton from './ui/PauseButton.vue'
```

- [ ] **Step 2: `watch(phase)` 擴充——paused 也暫停引擎**

把：

```ts
    if (game) {
      if (phase === 'upgrading') game.pause()
      else if (phase === 'playing') game.resume()
    }
```

改為：

```ts
    if (game) {
      if (phase === 'upgrading' || phase === 'paused') game.pause()
      else if (phase === 'playing') game.resume()
    }
```

- [ ] **Step 3: 加 ESC 監聽（切換暫停）**

在 `onBeforeUnmount` 之前加 ESC 處理與掛載：

```ts
// ESC 切換暫停：playing→暫停、paused→恢復；其餘 phase 忽略。
function onKeydown(e: KeyboardEvent): void {
  if (e.key !== 'Escape') return
  if (store.phase === 'playing') store.pauseGame()
  else if (store.phase === 'paused') store.resumeGame()
}
onMounted(() => window.addEventListener('keydown', onKeydown))
```

把既有：

```ts
onBeforeUnmount(() => game?.stop())
```

改為（一併移除 listener）：

```ts
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  game?.stop()
})
```

- [ ] **Step 4: `App.vue` template 渲染 PauseButton 與 PauseMenu**

把：

```vue
<MuteButton v-if="store.phase !== 'menu'" />
```

改為（暫停鈕只在遊玩中顯示）：

```vue
<MuteButton v-if="store.phase !== 'menu'" />
    <PauseButton v-if="store.phase === 'playing'" />
```

在 `GameOver` 的 `<Transition>` 之後加：

```vue
<Transition name="fade"><PauseMenu v-if="store.phase === 'paused'" @resume="store.resumeGame()" @restart="restart" @menu="toMenu" /></Transition>
```

- [ ] **Step 5: `Hud.vue` 擊殺數位移避開暫停鈕**

把：

```css
.kills { position: absolute; right: 3.4rem; top: 0.6rem; font-family: var(--font-display); }
```

改為（清過靜音鈕 + 暫停鈕兩顆，各 2.4rem + 間距）：

```css
.kills { position: absolute; right: 6.3rem; top: 0.6rem; font-family: var(--font-display); }
```

- [ ] **Step 6: 驗證 typecheck + 測試 + build + 瀏覽器**

Run: `npm run typecheck` → 乾淨
Run: `npm test` → 189 + 新增 store 暫停測試全綠
Run: `npm run build` → 乾淨
瀏覽器遊玩：ESC 暫停（敵人凍結、選單出現）→ ESC 或「繼續」恢復；點暫停鈕暫停；「重新開始」同角色重開、「回主選單」回選單；確認放棄不計戰績（主選單統計場數不增）；手機寬度暫停鈕可點、選單不破版；擊殺數不被鈕蓋。截圖。

- [ ] **Step 7: 更新 acceptance.md 與 progress.md**

- acceptance.md：勾選所有項目、填驗證日期。
- progress.md：階段 4 後設系統處補一行「暫停選單：ESC/暫停鈕 → 繼續/重新開始/回主選單（paused phase，重用膜質 UI）→ specs/pause-menu/」。

- [ ] **Step 8: Commit**

```bash
git add src/App.vue src/ui/Hud.vue docs/superpowers/specs/pause-menu/acceptance.md progress.md
git commit -m "[mvp][feat][ui] App 接線暫停（ESC/鈕/選單/引擎暫停）+ HUD 位移（暫停選單完成）

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-Review（plan 對 spec 的覆蓋檢查）

- **FR-1 phase 與 store**：Task 1 `'paused'` + `pauseGame`/`resumeGame` + guard 測試。✅
- **FR-2 引擎暫停接線**：Task 3 Step 2（paused→game.pause）。✅
- **FR-3 ESC 觸發**：Task 3 Step 3（切換 + onBeforeUnmount 移除）。✅
- **FR-4 PauseMenu**：Task 2 Step 1（Overlay/Panel/.ui-btn + 三鈕 emits）+ Task 3 Step 4 渲染。✅
- **FR-5 PauseButton**：Task 2 Step 2（膜質鈕、playing 顯示）+ Task 3 Step 4/5（顯示條件 + HUD 位移）。✅
- **FR-6 接線**：Task 3 Step 4（resume→resumeGame、restart→既有 restart、menu→既有 toMenu）。✅
- **邊界**：upgrading/over ESC 忽略（Step 3 條件）、放棄不計戰績（不經 over，天然成立，Step 6 驗）、確定性（Game.pause 既有）。✅
- **不變項**：引擎/其餘 overlay 未動；Task 3 Step 6 驗 189+新測試。✅
- **Placeholder 掃描**：無 TBD；完整程式碼/指令。✅
- **型別/命名一致**：`pauseGame`/`resumeGame`/`'paused'`/`PauseMenu`/`PauseButton` 跨 Task 一致。✅
