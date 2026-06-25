# HUD / 戰鬥內 UI 精修（hud-polish / D3）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development 或 superpowers:executing-plans 逐 task 實作。**建議 inline 執行**（HUD 需瀏覽器實機遊玩看效果微調）。Steps use checkbox (`- [ ]`) 語法。

**Goal:** 精修戰鬥 HUD：血條/經驗條光澤分段數值、左上玩家頭像框（4 角色圖示）、左下武器/被動持有圖示列、BossBar 與靜音鈕質感統一到 D1 語言。

**Architecture:** 角色圖示併入 D2 的 `iconRegistry`（`Record<CharacterKind, IconDef>` + 完整性測試）；`GameIcon` 加 `'character'` 分類；新增 `PlayerAvatar`/`LoadoutBar` 兩個純讀取小元件掛進 `Hud`；`Hud`/`BossBar`/`MuteButton` 套 D1 token/字體精修。`store` 加 `character` 顯示欄位、`Game.start` 推一次初始 loadout 快照。模擬/確定性零改動。

**Tech Stack:** Vue 3 `<script setup>`、CSS（token/漸層/backdrop-filter）、內聯 SVG、Vitest。

## Global Constraints

- 繁體中文註解；型別/程式名稱英文；commit `[mvp][type][scope] 描述` + `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`。
- 純前端呈現 + 一處 glue：可動 `iconRegistry.ts/.test.ts`、`GameIcon.vue`、`Hud.vue`、`BossBar.vue`、`MuteButton.vue`、新 `PlayerAvatar.vue`/`LoadoutBar.vue`、`stores/game.ts`、`App.vue`、`Game.ts`（僅初始快照一行）、`progress.md`、acceptance.md。**不碰** 模擬/system/World 計算、其餘 overlay。
- `CharacterKind = macrophage|neutrophil|nkcell|dendritic`；色 `#ff6b6b|#6bff8c|#b39ddb|#ffd54a`（取自 CHARACTER_DEFS）。
- HUD 除靜音鈕外 `pointer-events: none`；尊重 `prefers-reduced-motion`；行動寬度不破版不擋戰鬥。
- 角色圖示 registry 寫單元測試；HUD 元件呈現層以 typecheck/build + 瀏覽器驗證。既有測試（187）維持全綠。
- 重用 D1 token（`--panel-surface`/`--panel-blur`/`--font-display` 等）與 D2 `GameIcon`。

---

### Task 1: 角色圖示 + GameIcon 'character' 分類 + 完整性測試

**Files:**
- Modify: `src/ui/icons/iconRegistry.ts`
- Modify: `src/ui/icons/iconRegistry.test.ts`
- Modify: `src/ui/GameIcon.vue`

**Interfaces:**
- Consumes: `IconDef`、`CHARACTER_ORDER`（`src/engine/systems/characterDefs.ts`）、`CharacterKind`。
- Produces: `CHARACTER_ICONS: Record<CharacterKind, IconDef>`；`GameIcon` 支援 `category: 'character'`。

- [ ] **Step 1: 先加角色完整性測試（失敗）**

在 `iconRegistry.test.ts` 補：

```ts
import { CHARACTER_ICONS } from './iconRegistry'
import { CHARACTER_ORDER } from '../../engine/systems/characterDefs'

describe('角色圖示完整性', () => {
  it('每個角色 kind 都有圖示', () => {
    for (const k of CHARACTER_ORDER) expect(CHARACTER_ICONS[k]).toBeDefined()
  })
  it('角色圖示無 placeholder', () => {
    for (const def of Object.values(CHARACTER_ICONS)) {
      expect(def.paths.length + (def.fills?.length ?? 0)).toBeGreaterThan(0)
      for (const d of [...def.paths, ...(def.fills ?? [])]) expect(d.trim().length).toBeGreaterThan(0)
      expect(def.color).toMatch(/^#[0-9a-fA-F]{6}$/)
    }
  })
})
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `npx vitest run src/ui/icons/iconRegistry.test.ts`
Expected: FAIL（`CHARACTER_ICONS` 未匯出）。

- [ ] **Step 3: `iconRegistry.ts` 加 `CHARACTER_ICONS`**

檔頭型別 import 改為：

```ts
import type { WeaponKind, PassiveKind, CharacterKind } from '../../engine/types'
```

在 `PASSIVE_ICONS` 之後加：

```ts
/** 角色圖示（4）。色用各角色主題色（對齊 CHARACTER_DEFS）。 */
export const CHARACTER_ICONS: Record<CharacterKind, IconDef> = {
  // 巨噬細胞：偽足變形蟲狀大細胞 + 核
  macrophage: { color: '#ff6b6b',
    paths: ['M12 4 C16 4 18 7 18 10 C20 11 21 14 19 15 C18 18 15 17 14 19 C12 21 9 20 8 18 C5 18 3 15 5 13 C4 10 6 7 9 6 C10 4 11 4 12 4 Z'],
    fills: ['M12 12 a2.4 2.4 0 1 0 0.01 0'] },
  // 嗜中性球：多葉核細胞（外圈 + 三葉）
  neutrophil: { color: '#6bff8c', paths: ['M12 3 a9 9 0 1 0 0.01 0'],
    fills: ['M10 10 a1.8 1.8 0 1 0 0.01 0', 'M14.5 11 a1.8 1.8 0 1 0 0.01 0', 'M11.5 14.5 a1.8 1.8 0 1 0 0.01 0'] },
  // NK 細胞：細胞 + 標靶十字（殺傷）
  nkcell: { color: '#b39ddb', paths: ['M12 3 a9 9 0 1 0 0.01 0', 'M9 12 H15', 'M12 9 V15'] },
  // 樹突細胞：中心 + 放射樹突
  dendritic: { color: '#ffd54a',
    paths: ['M12 12 L12 4', 'M12 12 L19 8', 'M12 12 L20 15', 'M12 12 L14 20', 'M12 12 L6 19', 'M12 12 L4 13', 'M12 12 L7 6'],
    fills: ['M12 12 a2 2 0 1 0 0.01 0'] },
}
```

- [ ] **Step 4: `GameIcon.vue` 支援 `'character'`**

把 import 與 props/lookup 改為：

```ts
import { WEAPON_ICONS, PASSIVE_ICONS, CHARACTER_ICONS, type IconDef } from './icons/iconRegistry'

const props = withDefaults(defineProps<{
  category: 'weapon' | 'passive' | 'character'
  kind: string
  size?: number
}>(), { size: 20 })

const REG = { weapon: WEAPON_ICONS, passive: PASSIVE_ICONS, character: CHARACTER_ICONS }
const def = computed<IconDef | undefined>(() => REG[props.category][props.kind as never])
```

- [ ] **Step 5: 跑測試 + typecheck**

Run: `npx vitest run src/ui/icons/iconRegistry.test.ts` → PASS
Run: `npm run typecheck` → 乾淨（Record 編譯期完整）

- [ ] **Step 6: Commit**

```bash
git add src/ui/icons/iconRegistry.ts src/ui/icons/iconRegistry.test.ts src/ui/GameIcon.vue
git commit -m "[mvp][feat][ui] 4 角色圖示 + GameIcon character 分類 + 完整性測試（D3-1）

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: store.character 資料流 + Game.start 初始快照

**Files:**
- Modify: `src/stores/game.ts`
- Modify: `src/App.vue`
- Modify: `src/engine/Game.ts`

**Interfaces:**
- Produces: `store.character: CharacterKind`、`store.setCharacter(kind)`。供 Task 3 PlayerAvatar 使用。

- [ ] **Step 1: `stores/game.ts` 加 `character` 欄位**

檔頭型別 import 改為：

```ts
import type { WeaponKind, PassiveKind, CharacterKind } from '../engine/types'
```

`interface State` 內加（在 `loadout` 後）：

```ts
  /** 目前角色（顯示用：HUD 頭像）。 */
  character: CharacterKind
```

`state` 初始值加（在 `loadout` 後）：

```ts
    character: 'macrophage',
```

`start()` 內加（在 `this.loadout = ...` 後，重置不動 character，因為 App 會在 start 後 setCharacter；保險起見不重置）：
（不需在 start 重置 character——App.startGame 會緊接著 setCharacter。）

在 `setLoadout` action 後加：

```ts
    /** 設定目前角色（App 開賽時呼叫，供 HUD 頭像顯示）。 */
    setCharacter(kind: CharacterKind) {
      this.character = kind
    },
```

- [ ] **Step 2: `App.vue` `startGame` 設定角色**

把：

```ts
  selected = opts
  showLeaderboard.value = false // 開賽前收起排行榜，避免日後回主選單時殘留自動重開
  store.start()
```

改為：

```ts
  selected = opts
  showLeaderboard.value = false // 開賽前收起排行榜，避免日後回主選單時殘留自動重開
  store.start()
  store.setCharacter(opts.character)
```

- [ ] **Step 3: `Game.ts` 推初始 loadout 快照**

把（`start` 內）：

```ts
    const game = new Game(world, renderer, seed)
    game.input.attach()
```

改為：

```ts
    const game = new Game(world, renderer, seed)
    game.store.setLoadout(world.loadoutSnapshot()) // 開賽即把起始武器推進持有快照，供 HUD 持有列顯示
    game.input.attach()
```

- [ ] **Step 4: 驗證 typecheck + build**

Run: `npm run typecheck` → 乾淨
Run: `npm run build` → 乾淨

- [ ] **Step 5: Commit**

```bash
git add src/stores/game.ts src/App.vue src/engine/Game.ts
git commit -m "[mvp][feat][ui] store.character 資料流 + Game.start 初始 loadout 快照（D3-2）

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: PlayerAvatar + LoadoutBar 元件 + 掛載 Hud（topbar 重組）

**Files:**
- Create: `src/ui/PlayerAvatar.vue`
- Create: `src/ui/LoadoutBar.vue`
- Modify: `src/ui/Hud.vue`

**Interfaces:**
- Consumes: `GameIcon`（D2 + Task 1 'character'）、`store.character`/`store.level`/`store.loadout`（Task 2）。

- [ ] **Step 1: 建立 `src/ui/PlayerAvatar.vue`**

```vue
<script setup lang="ts">
/** PlayerAvatar.vue — 左上玩家頭像框（純讀取）。角色圖示 + 主題色發光邊 + Lv 徽章。 */
import { computed } from 'vue'
import { useGameStore } from '../stores/game'
import { CHARACTER_DEFS } from '../engine/systems/characterDefs'
import GameIcon from './GameIcon.vue'

const store = useGameStore()
const color = computed(() => {
  const c = CHARACTER_DEFS[store.character]?.color
  return c === undefined ? '#ffffff' : '#' + c.toString(16).padStart(6, '0')
})
</script>

<template>
  <div class="avatar" :style="{ '--char-color': color }">
    <div class="frame"><GameIcon category="character" :kind="store.character" :size="32" /></div>
    <div class="lv">Lv {{ store.level }}</div>
  </div>
</template>

<style scoped>
.avatar { position: absolute; top: 0.6rem; left: 0.6rem; display: flex; align-items: center; gap: 0.5rem; pointer-events: none; }
.frame { width: 3rem; height: 3rem; display: flex; align-items: center; justify-content: center; border-radius: 50%;
  border: 2px solid var(--char-color); background: var(--panel-surface); backdrop-filter: blur(var(--panel-blur));
  box-shadow: 0 0 14px color-mix(in srgb, var(--char-color) 45%, transparent); }
.lv { font-family: var(--font-display); font-weight: 700; font-size: 1.1rem; color: #fff; text-shadow: 0 1px 2px #000; }
@media (max-width: 600px) { .frame { width: 2.4rem; height: 2.4rem; } .lv { font-size: 0.95rem; } }
</style>
```

- [ ] **Step 2: 建立 `src/ui/LoadoutBar.vue`**

```vue
<script setup lang="ts">
/** LoadoutBar.vue — 左下持有圖示列（純讀取）。武器+被動小圖示 + 等級 pip + 進化金邊。 */
import { useGameStore, type LoadoutSnapshot } from '../stores/game'
import { WEAPON_DEFS } from '../engine/systems/weaponDefs'
import { PASSIVE_DEFS } from '../engine/systems/passiveDefs'
import GameIcon from './GameIcon.vue'

const store = useGameStore()
type W = LoadoutSnapshot['weapons'][number]
type P = LoadoutSnapshot['passives'][number]
function wLv(w: W): string { return w.level >= WEAPON_DEFS[w.kind].maxLevel ? 'M' : String(w.level) }
function pLv(p: P): string { return p.level >= PASSIVE_DEFS[p.kind].maxLevel ? 'M' : String(p.level) }
</script>

<template>
  <div class="loadout-bar">
    <div v-for="w in store.loadout.weapons" :key="'w' + w.kind" class="slot" :class="{ evolved: w.evolved }">
      <GameIcon category="weapon" :kind="w.kind" :size="22" />
      <span class="pip">{{ wLv(w) }}</span>
    </div>
    <div v-for="p in store.loadout.passives" :key="'p' + p.kind" class="slot">
      <GameIcon category="passive" :kind="p.kind" :size="22" />
      <span class="pip">{{ pLv(p) }}</span>
    </div>
  </div>
</template>

<style scoped>
.loadout-bar { position: absolute; left: 0.6rem; bottom: 2.6rem; display: flex; flex-wrap: wrap; gap: 0.35rem;
  max-width: 60vw; pointer-events: none; }
.slot { position: relative; width: 2rem; height: 2rem; display: flex; align-items: center; justify-content: center;
  border-radius: 8px; border: 1px solid var(--panel-border); background: var(--panel-surface);
  backdrop-filter: blur(var(--panel-blur)); }
.slot.evolved { border-color: var(--antigen); box-shadow: 0 0 8px rgba(255, 213, 74, 0.55); }
.pip { position: absolute; right: -2px; bottom: -4px; font-family: var(--font-display); font-size: 0.62rem; font-weight: 700;
  color: #fff; background: rgba(0, 0, 0, 0.6); border-radius: 4px; padding: 0 2px; line-height: 1.1; }
@media (max-width: 600px) { .slot { width: 1.7rem; height: 1.7rem; } .loadout-bar { bottom: 2.2rem; max-width: 72vw; } }
</style>
```

- [ ] **Step 3: `Hud.vue` 掛載兩元件 + topbar 移除 Lv**

`<script setup>` import 區加：

```ts
import PlayerAvatar from './PlayerAvatar.vue'
import LoadoutBar from './LoadoutBar.vue'
```

把 template 的 topbar：

```vue
<div class="topbar">
      <span class="lv" :class="{ pop: levelPop }" @animationend="levelPop = false">Lv {{ store.level }}</span>
      <span class="time">{{ mmss }}</span>
      <span>擊殺 {{ store.kills }}</span>
    </div>
```

改為（移除 Lv span、計時置中、擊殺靠右；Lv 改由頭像顯示）：

```vue
<PlayerAvatar />
    <div class="topbar">
      <span class="time">{{ mmss }}</span>
      <span class="kills">擊殺 {{ store.kills }}</span>
    </div>
    <LoadoutBar />
```

- [ ] **Step 4: `Hud.vue` topbar 樣式調整**

把：

```css
.topbar { display: flex; justify-content: space-between; padding: 0.5rem 1rem;
  /* 右側預留靜音鈕（2.4rem + 右距 0.5rem）空間，避免蓋住「擊殺」 */
  padding-right: 3.4rem;
  font-size: 1.1rem; text-shadow: 0 1px 2px #000; }
.time { font-size: 1.4rem; font-weight: bold; }
```

改為（計時置中、擊殺絕對定位右上避開靜音鈕；`levelPop` 已不在 topbar，保留其 keyframe 供頭像不需要——刪除 lv 樣式）：

```css
.topbar { display: flex; justify-content: center; padding: 0.5rem 1rem; position: relative;
  font-size: 1.1rem; text-shadow: 0 1px 2px #000; }
.time { font-family: var(--font-display); font-size: 1.5rem; font-weight: 700; }
.kills { position: absolute; right: 3.4rem; top: 0.55rem; font-family: var(--font-display); }
```

並刪除 `.lv.pop { ... }` 與 `@keyframes levelpop { ... }`（Lv 已移至頭像，topbar 不再需要彈跳）。
`<script setup>` 內 `levelPop` ref 與其 `watch` 一併刪除（不再使用）。

- [ ] **Step 5: 驗證 typecheck + build + 瀏覽器**

Run: `npm run typecheck` → 乾淨
Run: `npm run build` → 乾淨
瀏覽器開始遊戲：確認左上頭像（角色圖示 + 主題色邊 + Lv，升級後 Lv 變）、左下持有列（開賽即有起始武器、升級後新增、進化金邊）、計時置中、擊殺右上不被靜音鈕蓋、HUD 不擋操作。切換不同角色確認頭像對應。截圖微調。

- [ ] **Step 6: Commit**

```bash
git add src/ui/PlayerAvatar.vue src/ui/LoadoutBar.vue src/ui/Hud.vue
git commit -m "[mvp][feat][ui] 玩家頭像框 + 持有圖示列 + topbar 重組（D3-3）

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: Hud 血條/經驗條精修（光澤/分段/數值）

**Files:**
- Modify: `src/ui/Hud.vue`

- [ ] **Step 1: 血條/經驗條加數值讀出**

把 template 的兩條 bar：

```vue
<div class="bar xp"><div class="fill" :style="{ width: xpPct + '%' }" /></div>
    <div class="bar hp" :class="{ hurt }" @animationend="hurt = false"><div class="fill" :style="{ width: hpPct + '%' }" /></div>
```

改為（疊數值；血條顯示目前/最大，經驗條顯示百分比）：

```vue
<div class="bar xp"><div class="fill" :style="{ width: xpPct + '%' }" /><span class="readout">XP {{ Math.floor(xpPct) }}%</span></div>
    <div class="bar hp" :class="{ hurt }" @animationend="hurt = false"><div class="fill" :style="{ width: hpPct + '%' }" /><span class="readout">{{ Math.ceil(store.hp) }} / {{ store.maxHp }}</span></div>
```

- [ ] **Step 2: 血條/經驗條精修樣式**

把：

```css
.bar { height: 8px; margin: 2px 1rem; background: rgba(255, 255, 255, 0.15); border-radius: 4px; }
.bar.xp { order: 3; margin-top: auto; }
.bar.hp { order: 4; margin-bottom: 0.6rem; height: 12px; }
.xp .fill { background: var(--antigen); height: 100%; border-radius: 4px; }
.hp .fill { background: #ff5252; height: 100%; border-radius: 4px; }
.bar .fill { transition: width 0.25s ease-out; }
```

改為（凹槽 + 圓角 + 分段刻度 + 填充頂部光澤 + 柔光暈 + 數值）：

```css
.bar { position: relative; margin: 3px 1rem; border-radius: 6px; overflow: hidden;
  background: rgba(0, 0, 0, 0.45); box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.6);
  /* 分段刻度：每約 10% 一道細分隔 */
  background-image: repeating-linear-gradient(90deg, transparent 0, transparent calc(10% - 1px), rgba(0, 0, 0, 0.5) calc(10% - 1px), rgba(0, 0, 0, 0.5) 10%); }
.bar.xp { order: 3; margin-top: auto; height: 12px; }
.bar.hp { order: 4; margin-bottom: 0.6rem; height: 18px; }
.bar .fill { height: 100%; border-radius: 6px; transition: width 0.25s ease-out;
  /* 頂部光澤 */
  background-image: linear-gradient(180deg, rgba(255, 255, 255, 0.4) 0%, rgba(255, 255, 255, 0) 55%); }
.xp .fill { background-color: var(--antigen); box-shadow: 0 0 8px rgba(255, 213, 74, 0.5); }
.hp .fill { background-color: #ff5252; box-shadow: 0 0 8px rgba(255, 82, 82, 0.5); }
.readout { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
  font-family: var(--font-display); font-size: 0.72rem; font-weight: 700; color: #fff;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.9); letter-spacing: 0.03em; }
```

（`prefers-reduced-motion` 既有區塊保留：`.bar .fill { transition: none }`。）

- [ ] **Step 3: 驗證 typecheck + build + 瀏覽器**

Run: `npm run typecheck` → 乾淨
Run: `npm run build` → 乾淨
瀏覽器遊玩：確認血條（18px、凹槽、頂部光澤、分段刻度、`目前/最大` 數值、受傷紅閃仍在）、經驗條（XP %、升級時填滿/重置）、可讀性佳、不擋戰鬥。微調刻度密度/數值字級。

- [ ] **Step 4: Commit**

```bash
git add src/ui/Hud.vue
git commit -m "[mvp][feat][ui] 血條/經驗條光澤分段 + 數值讀出（D3-4）

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5: BossBar + MuteButton 質感統一 + 跨畫面驗證 + 文件

**Files:**
- Modify: `src/ui/BossBar.vue`
- Modify: `src/ui/MuteButton.vue`
- Modify: `docs/superpowers/specs/hud-polish/acceptance.md`
- Modify: `progress.md`

- [ ] **Step 1: `BossBar.vue` 質感統一**

把：

```css
.label { font-size: 0.9rem; font-weight: bold; letter-spacing: 0.2em;
  text-shadow: 0 1px 2px #000; margin-bottom: 2px; }
.bar { height: 14px; background: rgba(255, 255, 255, 0.15); border-radius: 7px; overflow: hidden; }
.fill { background: #9c27b0; height: 100%; border-radius: 7px; transition: width 0.1s linear; }
```

改為：

```css
.label { font-family: var(--font-display); font-size: 0.95rem; font-weight: 700; letter-spacing: 0.25em;
  text-shadow: 0 1px 2px #000; margin-bottom: 3px; }
.bar { height: 16px; border-radius: 8px; overflow: hidden;
  background: rgba(0, 0, 0, 0.45); box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.6); }
.fill { height: 100%; border-radius: 8px; transition: width 0.1s linear; background-color: #9c27b0;
  background-image: linear-gradient(180deg, rgba(255, 255, 255, 0.4) 0%, rgba(255, 255, 255, 0) 55%);
  box-shadow: 0 0 10px rgba(156, 39, 176, 0.6); }
```

（`.fill.low` 脈動與 reduced-motion 區塊保留。）

- [ ] **Step 2: `MuteButton.vue` 質感統一**

把：

```css
.mute {
  position: absolute; top: 0.5rem; right: 0.5rem; z-index: 10;
  width: 2.4rem; height: 2.4rem; font-size: 1.2rem; cursor: pointer;
  border: none; border-radius: 8px; background: rgba(255, 255, 255, 0.12); color: #fff;
}
</style>
```

改為（毛玻璃膜質 + 細邊 + hover/focus 主題回饋）：

```css
.mute {
  position: absolute; top: 0.5rem; right: 0.5rem; z-index: 10;
  width: 2.4rem; height: 2.4rem; font-size: 1.2rem; cursor: pointer; color: #fff;
  border: 1px solid var(--panel-border); border-radius: 10px;
  background: var(--panel-surface); backdrop-filter: blur(var(--panel-blur));
  transition: box-shadow var(--ui-med), border-color var(--ui-med), transform var(--ui-fast);
}
.mute:hover { border-color: var(--immune-accent-strong); box-shadow: 0 0 12px rgba(77, 208, 192, 0.5); }
.mute:active { transform: scale(0.94); }
.mute:focus-visible { outline: 2px solid var(--immune-accent-strong); outline-offset: 2px; }
@media (prefers-reduced-motion: reduce) { .mute:active { transform: none; } }
</style>
```

- [ ] **Step 3: 全套驗證**

Run: `npm run typecheck` → 乾淨
Run: `npm test` → 既有 187 + 新增角色測試全綠
Run: `npm run build` → 乾淨
瀏覽器：（a）觸發 Boss（存活一段時間），確認 BossBar 膜質凹槽/紫光澤/Chakra Petch 標題/低血脈動；（b）靜音鈕膜質 + hover/focus 回饋且可切換；（c）行動寬度（≤600px）頭像/持有列/血條/BossBar 不破版不擋戰鬥；（d）`prefers-reduced-motion` 模擬確認脈動/紅閃關閉。截圖微調。

- [ ] **Step 4: 更新 acceptance.md 與 progress.md**

- acceptance.md：勾選所有項目、填驗證日期。
- progress.md：階段 4 美術處補一行「HUD/戰鬥內 UI 精修（D3）：血條/經驗條光澤分段數值 + 玩家頭像框（4 角色圖示）+ 持有圖示列 + BossBar/靜音鈕質感統一 → specs/hud-polish/」；並把「美術」狀態列的 D 系列標示完成。

- [ ] **Step 5: Commit**

```bash
git add src/ui/BossBar.vue src/ui/MuteButton.vue docs/superpowers/specs/hud-polish/acceptance.md progress.md
git commit -m "[mvp][feat][ui] BossBar 與靜音鈕質感統一 + D3 驗收文件（D3 完成）

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-Review（plan 對 spec 的覆蓋檢查）

- **FR-1 角色圖示 + GameIcon**：Task 1 `CHARACTER_ICONS` + `category 'character'` + 完整性測試。✅
- **FR-2 PlayerAvatar**：Task 3 Step 1（角色圖示 + 主題色邊 + Lv、退回預設）。✅
- **FR-3 LoadoutBar**：Task 3 Step 2（武器+被動圖示、pip、進化金邊、pointer-events none）。✅
- **FR-4 Hud 血條/經驗條精修**：Task 4（光澤/分段/數值/字體）+ Task 3（topbar 重組、掛載）。✅
- **FR-5 BossBar**：Task 5 Step 1。✅
- **FR-6 MuteButton**：Task 5 Step 2。✅
- **FR-7 資料流接線**：Task 2（store.character + setCharacter + App + Game.start 初始快照）。✅
- **FR-8 完整性測試**：Task 1（角色完整性 + 無 placeholder）。✅
- **邊界**：起始持有列（Task 2 初始快照）、未知角色退回（Task 3 PlayerAvatar color/GameIcon v-if）、RWD/reduced-motion（Task 3/4/5 @media）、pointer-events（各元件）。✅
- **不變項**：模擬零改動；其餘 overlay 未動；Task 5 Step 3 驗測試全綠。✅
- **Placeholder 掃描**：無 TBD；含完整元件/CSS/測試/指令。✅
- **型別/命名一致**：`CHARACTER_ICONS`/`setCharacter`/`PlayerAvatar`/`LoadoutBar`/`category 'character'` 跨 Task 一致。✅
