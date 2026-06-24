# 主題圖示系統（icon-system / D2）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development 或 superpowers:executing-plans 逐 task 實作。**建議 inline 執行**（圖示需瀏覽器放大看清晰度微調 path）。Steps use checkbox (`- [ ]`) 語法。

**Goal:** 為 7 武器 + 10 被動建立單色主題色描邊 SVG 圖示（registry + GameIcon 元件 + opt.id 解析器 + 完整性測試），套用升級彈窗 loadout 與三選一選項卡。

**Architecture:** 圖示資料與呈現分離——純資料 `iconRegistry.ts`（`Record<Kind, IconDef>` 編譯期強制完整 + 解析器，有單元測試）、薄呈現元件 `GameIcon.vue`（查表渲染內聯 SVG）、`UpgradeModal.vue` 套用。純前端 DOM，不碰引擎/模擬/store。

**Tech Stack:** Vue 3 `<script setup>`、內聯 SVG（Feather/Lucide 風描邊 `stroke=currentColor`）、TypeScript、Vitest。

## Global Constraints

- 繁體中文註解；型別/程式名稱英文；commit 格式 `[mvp][type][scope] 描述` + `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`。
- 純前端：只動 `src/ui/icons/iconRegistry.ts`(新)、`src/ui/icons/iconRegistry.test.ts`(新)、`src/ui/GameIcon.vue`(新)、`src/ui/UpgradeModal.vue`、`progress.md`、acceptance.md。**不碰** 引擎/模擬/World/store/確定性、其餘 overlay、HUD/BossBar。
- 圖示：描邊輪廓 `stroke="currentColor" stroke-width=2 linecap/linejoin round`，可選 `fills` 實心 path；色由 `IconDef.color`（`#rrggbb`）。
- `WeaponKind = antibody|perforin|complement|inflammation|phagocyte|cascade|nova`（7）；`PassiveKind = spinach|tome|bracer|wings|magnet|candle|heart|tomato|armor|crown`（10）。
- `UpgradeModal` 對外 props/emits 與點卡升級行為不變；行動寬度（≤600px）卡片垂直堆疊不破版。
- registry/解析器寫單元測試；GameIcon.vue/UpgradeModal 套用屬呈現層，以 typecheck/build + 瀏覽器驗證。既有 181 測試維持全綠。
- 角色圖示不在範圍（延到 D3）。圖示 path 為起始稿，inline 以瀏覽器微調清晰度。

---

### Task 1: iconRegistry 型別 + resolveOptionIcon 解析器（TDD）

**Files:**
- Create: `src/ui/icons/iconRegistry.ts`
- Create: `src/ui/icons/iconRegistry.test.ts`

**Interfaces:**
- Produces: `IconDef`、`resolveOptionIcon(id: string): { category: 'weapon' | 'passive'; kind: string } | null`。Task 2 填 registry、Task 3/4 使用。

- [ ] **Step 1: 寫失敗測試 `iconRegistry.test.ts`（解析器）**

```ts
import { describe, it, expect } from 'vitest'
import { resolveOptionIcon } from './iconRegistry'

describe('resolveOptionIcon', () => {
  it('武器前綴對應 weapon', () => {
    expect(resolveOptionIcon('unlock:antibody')).toEqual({ category: 'weapon', kind: 'antibody' })
    expect(resolveOptionIcon('levelup:nova')).toEqual({ category: 'weapon', kind: 'nova' })
    expect(resolveOptionIcon('evolve:cascade')).toEqual({ category: 'weapon', kind: 'cascade' })
  })
  it('被動前綴對應 passive', () => {
    expect(resolveOptionIcon('passunlock:heart')).toEqual({ category: 'passive', kind: 'heart' })
    expect(resolveOptionIcon('passlvl:tome')).toEqual({ category: 'passive', kind: 'tome' })
  })
  it('heal / 未知 / 空 / 缺 kind 回 null', () => {
    expect(resolveOptionIcon('heal')).toBeNull()
    expect(resolveOptionIcon('weird:x')).toBeNull()
    expect(resolveOptionIcon('')).toBeNull()
    expect(resolveOptionIcon('unlock:')).toBeNull()
  })
})
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `npx vitest run src/ui/icons/iconRegistry.test.ts`
Expected: FAIL（找不到模組/`resolveOptionIcon`）。

- [ ] **Step 3: 實作 `iconRegistry.ts`（型別 + 解析器）**

```ts
/** 圖示系統 registry：單色主題色描邊 SVG 圖示資料 + 升級選項 id 解析器。
   武器/被動定義皆無 color 欄位，故色彩由本檔每個 IconDef 自帶。 */
import type { WeaponKind, PassiveKind } from '../../engine/types'

/** 單個圖示：viewBox（預設 0 0 24 24）+ 描邊 path（stroke currentColor）+ 選填實心 path + 主題色。 */
export interface IconDef {
  viewBox?: string
  paths: string[]        // 描邊輪廓（fill none）
  fills?: string[]       // 選填：實心 path（fill currentColor）— 核心點等
  color: string          // 主題色 hex（#rrggbb）
}

/** 升級選項 id 前綴 → 圖示分類與 kind；無對應（如 heal、未知、缺 kind）回 null。 */
export function resolveOptionIcon(id: string): { category: 'weapon' | 'passive'; kind: string } | null {
  const i = id.indexOf(':')
  if (i < 0) return null
  const prefix = id.slice(0, i)
  const kind = id.slice(i + 1)
  if (!kind) return null
  switch (prefix) {
    case 'unlock':
    case 'levelup':
    case 'evolve':
      return { category: 'weapon', kind }
    case 'passunlock':
    case 'passlvl':
      return { category: 'passive', kind }
    default:
      return null
  }
}

// WEAPON_ICONS / PASSIVE_ICONS 於 Task 2 補上（Record<Kind, IconDef> 強制完整）。
```

註：本步只放 `IconDef` 型別與 `resolveOptionIcon`，**不** import `WeaponKind`/`PassiveKind`（Task 2 用到時再加），避免「未使用 import」噪音。

- [ ] **Step 4: 跑測試確認通過**

Run: `npx vitest run src/ui/icons/iconRegistry.test.ts`
Expected: PASS（解析器 3 個 it 全綠）。

- [ ] **Step 5: Commit**

```bash
git add src/ui/icons/iconRegistry.ts src/ui/icons/iconRegistry.test.ts
git commit -m "[mvp][feat][ui] 圖示 registry 型別 + resolveOptionIcon 解析器（D2-1）

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: 17 圖示資料 + 完整性/無 placeholder 測試

**Files:**
- Modify: `src/ui/icons/iconRegistry.ts`
- Modify: `src/ui/icons/iconRegistry.test.ts`

**Interfaces:**
- Consumes: `IconDef`（Task 1）、`WEAPON_ORDER`（`src/engine/systems/weaponDefs.ts`）、`PASSIVE_ORDER`（`src/engine/systems/passiveDefs.ts`）。
- Produces: `WEAPON_ICONS: Record<WeaponKind, IconDef>`、`PASSIVE_ICONS: Record<PassiveKind, IconDef>`。Task 3/4 使用。

- [ ] **Step 1: 補完整性/無 placeholder 測試（先失敗）**

在 `iconRegistry.test.ts` 末端加：

```ts
import { WEAPON_ICONS, PASSIVE_ICONS } from './iconRegistry'
import { WEAPON_ORDER } from '../../engine/systems/weaponDefs'
import { PASSIVE_ORDER } from '../../engine/systems/passiveDefs'

const HEX = /^#[0-9a-fA-F]{6}$/

describe('圖示 registry 完整性', () => {
  it('每個武器 kind 都有圖示', () => {
    for (const k of WEAPON_ORDER) expect(WEAPON_ICONS[k]).toBeDefined()
  })
  it('每個被動 kind 都有圖示', () => {
    for (const k of PASSIVE_ORDER) expect(PASSIVE_ICONS[k]).toBeDefined()
  })
  it('無 placeholder：paths/fills 非空、每條 d 非空、color 合法', () => {
    for (const def of [...Object.values(WEAPON_ICONS), ...Object.values(PASSIVE_ICONS)]) {
      expect(def.paths.length + (def.fills?.length ?? 0)).toBeGreaterThan(0)
      for (const d of [...def.paths, ...(def.fills ?? [])]) expect(d.trim().length).toBeGreaterThan(0)
      expect(def.color).toMatch(HEX)
    }
  })
})
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `npx vitest run src/ui/icons/iconRegistry.test.ts`
Expected: FAIL（`WEAPON_ICONS`/`PASSIVE_ICONS` 未匯出）。

- [ ] **Step 3: 在 `iconRegistry.ts` 補型別 import 與兩個 registry**

檔頭加（若 Task 1 未 import）：

```ts
import type { WeaponKind, PassiveKind } from '../../engine/types'
```

在 `resolveOptionIcon` 之後加（path d 為起始稿，viewBox 皆 24×24）：

```ts
/** 武器圖示（7）。描邊輪廓 + 主題色；意象見註解。 */
export const WEAPON_ICONS: Record<WeaponKind, IconDef> = {
  // 抗體：Y 形免疫球蛋白
  antibody: { color: '#7fd8ff', paths: ['M12 12 V20', 'M12 12 L6 5', 'M12 12 L18 5'] },
  // 穿孔素：細胞膜穿孔環
  perforin: { color: '#ff8a65', paths: ['M12 4 a8 8 0 1 0 0.01 0', 'M12 9 a3 3 0 1 0 0.01 0'] },
  // 補體：級聯雙箭頭
  complement: { color: '#a5d6a7', paths: ['M5 8 L12 12 L19 8', 'M5 13 L12 17 L19 13'] },
  // 發炎：放射爆裂
  inflammation: { color: '#ff7043',
    paths: ['M12 3 V7', 'M12 17 V21', 'M3 12 H7', 'M17 12 H21', 'M6 6 L9 9', 'M18 6 L15 9', 'M6 18 L9 15', 'M18 18 L15 15'],
    fills: ['M12 10 a2 2 0 1 0 0.01 0'] },
  // 吞噬：吞噬空泡（缺口吞小點）
  phagocyte: { color: '#ffca6b', paths: ['M17 6 a8 8 0 1 0 0 12'], fills: ['M9 12 a2 2 0 1 0 0.01 0'] },
  // 級聯：分叉鏈
  cascade: { color: '#80deea', paths: ['M6 6 L12 12', 'M18 6 L12 12', 'M12 12 V19'],
    fills: ['M6 6 a1.6 1.6 0 1 0 0.01 0', 'M18 6 a1.6 1.6 0 1 0 0.01 0', 'M12 19 a1.6 1.6 0 1 0 0.01 0'] },
  // 新星：爆發星芒
  nova: { color: '#fff176', paths: [], fills: ['M12 2 L14 10 L22 12 L14 14 L12 22 L10 14 L2 12 L10 10 Z'] },
}

/** 被動圖示（10）。色彩語意對齊功能。 */
export const PASSIVE_ICONS: Record<PassiveKind, IconDef> = {
  // 細胞激素（傷害）：利刃
  spinach: { color: '#ff5252', paths: ['M6 18 L16 8', 'M14 6 L18 10', 'M5 19 L8 16'] },
  // 干擾素（攻速）：閃電
  tome: { color: '#4dd0c0', paths: [], fills: ['M13 2 L4 14 H11 L9 22 L20 9 H13 Z'] },
  // 趨化因子（彈速）：箭簇
  bracer: { color: '#80d8ff', paths: ['M4 12 H18', 'M13 7 L18 12 L13 17'] },
  // 偽足（移速）：翼
  wings: { color: '#69f0ae', paths: ['M4 16 C8 8 14 8 20 6', 'M4 16 C9 14 14 13 18 12'] },
  // 受體（吸取）：磁吸
  magnet: { color: '#ce93d8', paths: ['M7 5 V12 a5 5 0 0 0 10 0 V5', 'M5 5 H9', 'M15 5 H19'] },
  // 組織胺（範圍）：擴散圈
  candle: { color: '#ffb74d', paths: ['M12 12 m-3 0 a3 3 0 1 0 6 0 a3 3 0 1 0 -6 0', 'M12 12 m-7 0 a7 7 0 1 0 14 0 a7 7 0 1 0 -14 0'],
    fills: ['M12 12 a1.4 1.4 0 1 0 0.01 0'] },
  // 幹細胞（最大血）：心
  heart: { color: '#ff8a80', paths: [], fills: ['M12 21 C5 15 3 11 5 8 C7 5 11 6 12 9 C13 6 17 5 19 8 C21 11 19 15 12 21 Z'] },
  // 生長因子（回復）：十字
  tomato: { color: '#a5d6a7', paths: ['M12 5 V19', 'M5 12 H19'] },
  // 細胞膜（減傷）：盾
  armor: { color: '#90caf9', paths: ['M12 3 L5 6 V12 C5 17 12 21 12 21 C12 21 19 17 19 12 V6 Z'] },
  // 記憶細胞（經驗）：冠
  crown: { color: '#ffd54a', paths: ['M4 18 H20', 'M4 18 L6 8 L10 13 L12 6 L14 13 L18 8 L20 18'] },
}
```

- [ ] **Step 4: 跑測試確認通過 + typecheck**

Run: `npx vitest run src/ui/icons/iconRegistry.test.ts`
Expected: PASS（解析器 + 完整性 + 無 placeholder 全綠）。
Run: `npm run typecheck`
Expected: 乾淨（`Record<WeaponKind|PassiveKind, IconDef>` 編譯期完整性通過）。

- [ ] **Step 5: Commit**

```bash
git add src/ui/icons/iconRegistry.ts src/ui/icons/iconRegistry.test.ts
git commit -m "[mvp][feat][ui] 17 武器/被動主題圖示資料 + 完整性測試（D2-2）

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: GameIcon.vue 呈現元件

**Files:**
- Create: `src/ui/GameIcon.vue`

**Interfaces:**
- Consumes: `WEAPON_ICONS`/`PASSIVE_ICONS`/`IconDef`（Task 2）。
- Produces: `<GameIcon category kind :size />`，供 Task 4 使用。

- [ ] **Step 1: 建立 `src/ui/GameIcon.vue`**

```vue
<script setup lang="ts">
/**
 * GameIcon.vue — 武器/被動主題圖示（無狀態純呈現）。
 * 查 registry 渲染內聯單色 SVG（描邊 currentColor，色取 IconDef.color）；查無對應安全不渲染。
 */
import { computed } from 'vue'
import { WEAPON_ICONS, PASSIVE_ICONS, type IconDef } from './icons/iconRegistry'

const props = withDefaults(defineProps<{
  category: 'weapon' | 'passive'
  kind: string
  size?: number
}>(), { size: 20 })

const def = computed<IconDef | undefined>(() =>
  (props.category === 'weapon' ? WEAPON_ICONS : PASSIVE_ICONS)[props.kind as never],
)
</script>

<template>
  <svg v-if="def" class="game-icon" :width="size" :height="size"
    :viewBox="def.viewBox ?? '0 0 24 24'" :style="{ color: def.color }"
    fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path v-for="(d, i) in def.paths" :key="'s' + i" :d="d" />
    <path v-for="(d, i) in def.fills ?? []" :key="'f' + i" :d="d" fill="currentColor" stroke="none" />
  </svg>
</template>

<style scoped>
.game-icon { flex-shrink: 0; display: inline-block; vertical-align: middle; }
</style>
```

- [ ] **Step 2: 驗證 typecheck + build**

Run: `npm run typecheck` → 乾淨
Run: `npm run build` → 乾淨

- [ ] **Step 3: Commit**

```bash
git add src/ui/GameIcon.vue
git commit -m "[mvp][feat][ui] GameIcon 圖示呈現元件（D2-3）

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: 套用升級彈窗（loadout + 選項卡）+ 驗證 + 文件

**Files:**
- Modify: `src/ui/UpgradeModal.vue`
- Modify: `docs/superpowers/specs/icon-system/acceptance.md`
- Modify: `progress.md`

**Interfaces:**
- Consumes: `GameIcon`（Task 3）、`resolveOptionIcon`（Task 1）。

- [ ] **Step 1: `<script setup>` 匯入 GameIcon 與解析器 + 預算圖示**

在 import 區（`import Overlay`/`Panel` 附近）加：

```ts
import GameIcon from './GameIcon.vue'
import { resolveOptionIcon } from './icons/iconRegistry'
```

在 `<script setup>` 內加（預算每張卡的圖示對應，避免 template 內重複呼叫）：

```ts
/** 每個升級選項對應的圖示（武器/被動/或 null）。 */
const cardIcons = computed(() => store.upgradeOptions.map((o) => resolveOptionIcon(o.id)))
```

（`computed` 已於現有 import；確認 `import { computed } from 'vue'` 存在——現況有。）

- [ ] **Step 2: loadout 列加圖示**

把武器列：

```vue
<div v-for="w in store.loadout.weapons" :key="w.kind" class="ld-item">
  <span class="ld-name">{{ weaponName(w) }} {{ weaponLevel(w) }}</span>
  <span class="ld-hint" :class="weaponHint(w).cls">{{ weaponHint(w).text }}</span>
</div>
```

改為（名稱前插圖示）：

```vue
<div v-for="w in store.loadout.weapons" :key="w.kind" class="ld-item">
  <span class="ld-name"><GameIcon category="weapon" :kind="w.kind" :size="15" /> {{ weaponName(w) }} {{ weaponLevel(w) }}</span>
  <span class="ld-hint" :class="weaponHint(w).cls">{{ weaponHint(w).text }}</span>
</div>
```

把被動列：

```vue
<div v-for="p in store.loadout.passives" :key="p.kind" class="ld-item">
  <span class="ld-name">{{ passiveName(p) }} {{ passiveLevel(p) }}</span>
</div>
```

改為：

```vue
<div v-for="p in store.loadout.passives" :key="p.kind" class="ld-item">
  <span class="ld-name"><GameIcon category="passive" :kind="p.kind" :size="15" /> {{ passiveName(p) }} {{ passiveLevel(p) }}</span>
</div>
```

- [ ] **Step 3: 升級選項卡加圖示**

把：

```vue
<button v-for="(opt, i) in store.upgradeOptions" :key="opt.id" class="card"
  :class="{ evolve: opt.id.startsWith('evolve:') }"
  :style="{ animationDelay: 0.06 * i + 's' }"
  @click="store.pickUpgrade(opt.id)">
  {{ opt.label }}
</button>
```

改為（有對應 kind 才顯示圖示；heal 等純文字）：

```vue
<button v-for="(opt, i) in store.upgradeOptions" :key="opt.id" class="card"
  :class="{ evolve: opt.id.startsWith('evolve:') }"
  :style="{ animationDelay: 0.06 * i + 's' }"
  @click="store.pickUpgrade(opt.id)">
  <GameIcon v-if="cardIcons[i]" :category="cardIcons[i]!.category" :kind="cardIcons[i]!.kind" :size="30" class="card-icon" />
  <span class="card-label">{{ opt.label }}</span>
</button>
```

- [ ] **Step 4: `<style>` 補卡片圖示排版**

在 `.card { ... }` 規則後補（卡片改為直向置中、圖示在上標籤在下）：

```css
.card { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.4rem; }
.card-icon { display: block; }
.card-label { display: block; }
.ld-name { display: inline-flex; align-items: center; gap: 0.3rem; }
```

（手機版 `.card { min-height: 56px; ... }` 既有規則保留；直向 flex 在手機卡亦適用、圖示+標籤垂直置中不破版。）

- [ ] **Step 5: 驗證 — typecheck + 測試 + build + 瀏覽器**

Run: `npm run typecheck` → 乾淨
Run: `npm test` → 181 + 新增 registry 測試全綠
Run: `npm run build` → 乾淨
瀏覽器：升級彈窗確認 loadout 每武器/被動有主題色圖示、三選一卡圖示對應正確（含 `heal` 純文字無圖示）、與膜質面板協調、桌機 + 行動寬度（≤600px）可讀不破版。放大檢查 17 圖示清晰度，微調 path（純 `iconRegistry.ts` 數值）。

- [ ] **Step 6: 更新 acceptance.md 與 progress.md**

- acceptance.md：勾選所有項目、填驗證日期。
- progress.md：階段 4 美術處補一行「主題圖示系統（D2）：17 武器/被動單色主題色 SVG 圖示 + GameIcon + 解析器，套用升級彈窗 loadout 與選項卡 → specs/icon-system/」。

- [ ] **Step 7: Commit**

```bash
git add src/ui/UpgradeModal.vue docs/superpowers/specs/icon-system/acceptance.md progress.md
git commit -m "[mvp][feat][ui] 升級彈窗 loadout 與選項卡套用主題圖示（D2 完成）

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-Review（plan 對 spec 的覆蓋檢查）

- **FR-1 IconDef + registry**：Task 1 型別、Task 2 `Record<Kind, IconDef>` 17 圖示。✅
- **FR-2 圖示視覺**：Task 2 描邊輪廓 + 主題色（色彩語意對齊功能）。✅
- **FR-3 解析器**：Task 1 `resolveOptionIcon` + 測試（5 前綴 + null）。✅
- **FR-4 GameIcon**：Task 3，props category/kind/size、查無安全不渲染、currentColor + flex-shrink。✅
- **FR-5 升級彈窗套用**：Task 4 loadout + 選項卡（cardIcons 預算、heal 純文字）。✅
- **FR-6 完整性測試**：Task 2 完整性 + 無 placeholder；TS Record 編譯期雙保險。✅
- **邊界**：heal/未知→null（Task 1 測試 + Task 4 v-if）、行動寬度（Task 4 Step 5）、缺漏 kind（TS+測試）。✅
- **不變項**：只動指定檔；引擎/store/其餘 overlay 未動；Task 4 Step 5 驗 181+新測試。✅
- **Placeholder 掃描**：無 TBD；含完整 path 起始稿、測試、指令。✅
- **型別/命名一致**：`IconDef`/`WEAPON_ICONS`/`PASSIVE_ICONS`/`resolveOptionIcon`/`GameIcon`/`cardIcons` 跨 Task 一致。✅
