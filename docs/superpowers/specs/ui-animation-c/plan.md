# HUD/UI 動畫（C 批）— 實作計畫

> **For agentic workers:** 用 superpowers:subagent-driven-development 或 executing-plans 逐 task 實作。步驟用 `- [ ]` 追蹤。
> 全部屬 UI 呈現層（Vue/CSS），依 CLAUDE.md **不寫單元測試**、以實機目視驗證；既有 122 測試須維持全綠（引擎/store 不動）。每個 task 一個邏輯變更、各自 commit。

**Goal:** 為 HUD、升級彈窗、Boss 血條、死亡結算與 phase overlay 加入核心戰鬥反饋動畫，純 UI 層、玩法/數值不變。

**Architecture:** 各 `src/ui/*.vue` 元件以本地 ref/watch 偵測 store 值變化（升級/受傷）並切換 CSS keyframe class；進場/轉場用 Vue `<Transition>` 與 CSS animation。overlay 層級的淡入淡出集中由 `App.vue` 的 `<Transition>` 處理，各元件只負責自身內容動畫，避免重複淡入。

**Tech Stack:** Vue 3（`<script setup>` Composition API）、CSS animation/transition、Vue `<Transition>`。

## Global Constraints（每個 task 隱含適用）

- 只動 `src/ui/*.vue` 與 `src/App.vue`；**不修改** `src/engine/**`、`src/stores/game.ts`、模擬、數值、確定性、握手邏輯。
- UI 只讀 store summary；動畫狀態（ref/class/計時器）存元件本地，不進 store。
- 動畫只用 transform/opacity/width/box-shadow（GPU 友善）；不新增每幀 JS。
- 全部動畫在 `@media (prefers-reduced-motion: reduce)` 下關閉或瞬時。
- 既有版面/互動/emit 行為不變（HUD 靜音鈕預留、卡片 pickUpgrade、restart、引擎握手）。
- 驗證：`npm run typecheck` + `npm run build` 乾淨；不寫單元測試；既有 122 測試維持全綠。
- commit 格式 `[mvp][type][scope] 描述`，含 `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`。

---

## 檔案結構（修改一覽）

| 檔案 | 責任 | 動作 |
|------|------|------|
| `src/ui/Hud.vue` | 血條平滑 + 升級彈跳 + 受傷紅閃 | 修改 |
| `src/ui/UpgradeModal.vue` | 卡片錯落進場 + 按壓反饋 | 修改 |
| `src/ui/BossBar.vue` | 進場/退場 Transition + 低血脈動 | 修改 |
| `src/ui/GameOver.vue` | 內容縮放浮現 | 修改 |
| `src/App.vue` | overlay phase 淡入淡出 Transition | 修改 |
| `progress.md`、`acceptance.md` | 進度與驗收 | 修改 |

---

## Task 1：HUD 平滑填充 + 升級彈跳 + 受傷紅閃（Hud.vue）

**Files:** Modify `src/engine/../ui/Hud.vue`（即 `src/ui/Hud.vue`）

- [ ] **Step 1：script 加偵測 watcher**

把 `<script setup>` 內 `import { computed } from 'vue'` 改為 `import { computed, ref, watch } from 'vue'`，並在 `mmss` 之後新增：

```ts
// 升級彈跳：偵測等級上升沿，重觸發一次縮放動畫。
const levelPop = ref(false)
watch(() => store.level, (n, o) => {
  if (n > o) {
    levelPop.value = false
    requestAnimationFrame(() => { levelPop.value = true })
  }
})
// 受傷紅閃：偵測血量下降，重觸發一次閃動。
const hurt = ref(false)
watch(() => store.hp, (n, o) => {
  if (n < o) {
    hurt.value = false
    requestAnimationFrame(() => { hurt.value = true })
  }
})
```

- [ ] **Step 2：template 綁定 class 與 animationend 重置**

把 `<span>擊殺...` 區塊所在的 topbar 與血條改為（Lv span 加 pop、hp bar 加 hurt）：

```vue
    <div class="topbar">
      <span class="lv" :class="{ pop: levelPop }" @animationend="levelPop = false">Lv {{ store.level }}</span>
      <span class="time">{{ mmss }}</span>
      <span>擊殺 {{ store.kills }}</span>
    </div>
    <div class="bar xp"><div class="fill" :style="{ width: xpPct + '%' }" /></div>
    <div class="bar hp" :class="{ hurt }" @animationend="hurt = false"><div class="fill" :style="{ width: hpPct + '%' }" /></div>
```

- [ ] **Step 3：style 加過渡 + keyframe + reduced-motion**

在 `<style scoped>` 內，把 `.xp .fill`/`.hp .fill` 規則之後（或就近）新增：

```css
.bar .fill { transition: width 0.25s ease-out; }
.lv.pop { display: inline-block; animation: levelpop 0.4s ease-out; }
@keyframes levelpop {
  0% { transform: scale(1); }
  40% { transform: scale(1.35); filter: drop-shadow(0 0 6px #ffd54a); }
  100% { transform: scale(1); }
}
.bar.hp.hurt { animation: hurtflash 0.3s ease-out; }
@keyframes hurtflash {
  0% { box-shadow: 0 0 0 0 rgba(255, 40, 40, 0); }
  30% { box-shadow: 0 0 10px 3px rgba(255, 40, 40, 0.8); }
  100% { box-shadow: 0 0 0 0 rgba(255, 40, 40, 0); }
}
@media (prefers-reduced-motion: reduce) {
  .bar .fill { transition: none; }
  .lv.pop { animation: none; }
  .bar.hp.hurt { animation: none; }
}
```

- [ ] **Step 4：typecheck + build + 實機驗證 + commit**

Run: `npm run typecheck && npm run build`（乾淨）。
`npm run dev`：吸經驗/受傷時條平滑變化；升級時 Lv 彈跳發光；受傷時血條紅閃；連續升級以最後一次重觸發。
```bash
git add src/ui/Hud.vue
git commit -m "$(cat <<'EOF'
[mvp][feat][ui] HUD 動畫：血條平滑填充 + 升級彈跳 + 受傷紅閃

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2：升級彈窗錯落進場 + 按壓反饋（UpgradeModal.vue）

**Files:** Modify `src/ui/UpgradeModal.vue`

> overlay 層級淡入由 App.vue 的 Transition 處理（Task 5）；本 task 只做標題/卡片內容進場。

- [ ] **Step 1：template 加 title class 與逐卡 animation-delay**

```vue
  <div class="overlay">
    <h2 class="title">選擇升級</h2>
    <div class="cards">
      <button v-for="(opt, i) in store.upgradeOptions" :key="opt.id" class="card"
        :style="{ animationDelay: 0.06 * i + 's' }"
        @click="store.pickUpgrade(opt.id)">
        {{ opt.label }}
      </button>
    </div>
  </div>
```

- [ ] **Step 2：style 加進場 keyframe + 按壓 + reduced-motion**

在 `<style scoped>` 內新增（既有 `.card:hover` 保留）：

```css
.title { animation: rise 0.3s ease-out both; }
.card { animation: rise 0.35s ease-out both; }
.card:active { transform: scale(0.96); }
@keyframes rise {
  from { opacity: 0; transform: translateY(16px) scale(0.96); }
  to { opacity: 1; transform: none; }
}
@media (prefers-reduced-motion: reduce) {
  .title, .card { animation: none; }
}
```

- [ ] **Step 3：typecheck + build + 實機驗證 + commit**

`npm run dev`：升級彈窗出現時標題與三卡錯落滑入；按壓卡片有縮放反饋；點選升級行為不變。
```bash
git add src/ui/UpgradeModal.vue
git commit -m "$(cat <<'EOF'
[mvp][feat][ui] 升級彈窗錯落進場 + 卡片按壓反饋

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3：Boss 血條進場/退場 + 低血脈動（BossBar.vue）

**Files:** Modify `src/ui/BossBar.vue`

- [ ] **Step 1：template 包 Transition + 低血 class**

```vue
  <Transition name="boss">
    <div v-if="store.bossActive" class="bossbar">
      <div class="label">BOSS</div>
      <div class="bar"><div class="fill" :class="{ low: pct < 25 }" :style="{ width: pct + '%' }" /></div>
    </div>
  </Transition>
```

- [ ] **Step 2：style 加 Transition 類別 + 脈動 + reduced-motion**

在 `<style scoped>` 內新增（既有 `.fill { ... transition: width 0.1s }` 保留）：

```css
.boss-enter-active, .boss-leave-active { transition: opacity 0.3s ease, transform 0.3s ease; }
.boss-enter-from, .boss-leave-to { opacity: 0; transform: translate(-50%, -12px); }
.fill.low { animation: bosslow 0.6s ease-in-out infinite; }
@keyframes bosslow {
  0%, 100% { box-shadow: 0 0 0 0 rgba(229, 115, 246, 0); }
  50% { box-shadow: 0 0 10px 2px rgba(229, 115, 246, 0.9); }
}
@media (prefers-reduced-motion: reduce) {
  .boss-enter-active, .boss-leave-active { transition: none; }
  .fill.low { animation: none; }
}
```

> 註：`.bossbar` 既有 `transform: translateX(-50%)` 為定位；`<Transition>` 進場由 `translate(-50%,-12px)` 過渡到該定位，落定後即一般 `translateX(-50%)`。

- [ ] **Step 3：typecheck + build + 實機驗證 + commit**

`npm run dev`：Boss 出現時血條滑下淡入、消失時淡出；血量 <25% 時血條脈動發光。
```bash
git add src/ui/BossBar.vue
git commit -m "$(cat <<'EOF'
[mvp][feat][ui] Boss 血條進場/退場轉場 + 低血脈動

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4：死亡結算內容浮現（GameOver.vue）

**Files:** Modify `src/ui/GameOver.vue`

> overlay 淡入由 App.vue Transition 處理（Task 5）；本 task 做內容 panel 縮放浮現。

- [ ] **Step 1：template 內容包進 .panel**

```vue
  <div class="overlay">
    <div class="panel">
      <h1>你倒下了</h1>
      <p>存活時間 {{ mmss }}</p>
      <p>擊殺 {{ store.kills }} · 等級 {{ store.level }}</p>
      <button @click="emit('restart')">再玩一次</button>
    </div>
  </div>
```

- [ ] **Step 2：style 把置中與間距移到 .panel + 加浮現 keyframe**

把既有 `.overlay { ... gap: 1rem; ... }` 改為（overlay 仍負責滿版置中，gap 與動畫移到 panel）：

```css
.overlay { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
  background: rgba(16, 16, 24, 0.9); color: #fff; font-family: sans-serif; }
.panel { display: flex; flex-direction: column; align-items: center; gap: 1rem;
  animation: gopop 0.35s ease-out both; }
@keyframes gopop {
  from { opacity: 0; transform: scale(0.9); }
  to { opacity: 1; transform: none; }
}
@media (prefers-reduced-motion: reduce) { .panel { animation: none; } }
```

（既有 `button { ... }` 規則保留不動。）

- [ ] **Step 3：typecheck + build + 實機驗證 + commit**

`npm run dev`：死亡時結算內容縮放浮現；「再玩一次」行為不變。
```bash
git add src/ui/GameOver.vue
git commit -m "$(cat <<'EOF'
[mvp][feat][ui] 死亡結算內容縮放浮現進場

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5：phase overlay 淡入淡出轉場（App.vue）

**Files:** Modify `src/App.vue`

- [ ] **Step 1：template 用 Transition 包三個 overlay**

把 template 內三個 overlay 區塊：

```vue
    <MainMenu v-if="store.phase === 'menu'" @start="startGame" />
    <UpgradeModal v-if="store.phase === 'upgrading'" />
    <GameOver v-if="store.phase === 'over'" @restart="restart" />
```

替換為：

```vue
    <Transition name="fade"><MainMenu v-if="store.phase === 'menu'" @start="startGame" /></Transition>
    <Transition name="fade"><UpgradeModal v-if="store.phase === 'upgrading'" /></Transition>
    <Transition name="fade"><GameOver v-if="store.phase === 'over'" @restart="restart" /></Transition>
```

- [ ] **Step 2：新增非 scoped style 定義 fade 轉場類別**

Vue `<Transition>` 類別套在子元件根節點，scoped 樣式選不到，需用非 scoped style。在既有 `<style scoped>` 區塊之後新增第二個 `<style>`（不加 scoped）：

```vue
<style>
.fade-enter-active, .fade-leave-active { transition: opacity 0.25s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
@media (prefers-reduced-motion: reduce) {
  .fade-enter-active, .fade-leave-active { transition: none; }
}
</style>
```

- [ ] **Step 3：typecheck + build + 實機驗證 + commit**

`npm run dev`：menu→playing→upgrading→over 之間 overlay 淡入淡出；引擎握手（升級暫停/恢復）正常、重新開始無殘留。
```bash
git add src/App.vue
git commit -m "$(cat <<'EOF'
[mvp][feat][ui] phase overlay 淡入淡出轉場（Vue Transition）

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 6：驗證與進度更新

**Files:** Modify `progress.md`、`docs/superpowers/specs/ui-animation-c/acceptance.md`

- [ ] **Step 1：完整測試 + 型別 + build**

Run: `npm test && npm run typecheck && npm run build`
Expected: 122 全綠、型別乾淨、build 乾淨。

- [ ] **Step 2：實機完整驗證（含 reduced-motion）**

`npm run dev`：HUD 平滑/彈跳/紅閃、升級彈窗錯落進場、Boss 血條進場+低血脈動、死亡浮現、overlay 轉場皆如設計；
於系統開啟「減少動態」後重載，確認動畫關閉/瞬時、資訊與功能不受影響；FPS 正常、0 功能相關 console error。

- [ ] **Step 3：更新 acceptance.md 勾選 + progress.md**

依結果勾選 `acceptance.md` 填驗證日期；`progress.md` 階段 4 美術補一條「HUD/UI 動畫 C 批」。

- [ ] **Step 4：commit**

```bash
git add progress.md docs/superpowers/specs/ui-animation-c/acceptance.md
git commit -m "$(cat <<'EOF'
[mvp][docs][meta] HUD/UI 動畫 C 批驗證通過，更新 progress 與 acceptance

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## 自我檢查（Self-Review）結果

- **Spec 覆蓋：** FR-1 HUD（Task1）、FR-2 升級彈窗（Task2）、FR-3 Boss 血條（Task3）、FR-4 死亡結算（Task4）、
  FR-5 phase 轉場（Task5）、FR-6 reduced-motion（每 task 的 style 各含 guard）、FR-7 不變項（只動 ui/App、全程 typecheck/build/122 測試，Task6）皆有對應。
- **無 placeholder：** 每面給出完整 template/script/style 與指令、預期。
- **一致性：** overlay 淡入集中於 App Transition；元件只做內容動畫（UpgradeModal 卡片、GameOver panel），不重複淡入。class 名（pop/hurt/low/fade/boss）跨 task 一致。
- **不變項：** 不碰 engine/store；動畫狀態本地；emit/握手/版面不變 → 既有 122 測試全綠。
- **無障礙：** 每個動畫面均含 `prefers-reduced-motion: reduce` 關閉規則。
