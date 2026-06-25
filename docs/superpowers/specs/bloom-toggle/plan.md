# Bloom 開關（bloom-toggle）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development 或 superpowers:executing-plans 逐 task 實作。**建議 inline 執行**（bloom 開關需瀏覽器看畫面差異）。Steps use checkbox (`- [ ]`) 語法。

**Goal:** bloom 兩平台預設開、可在暫停選單即時切換、選擇以 localStorage 記住。

**Architecture:** 新 `settingsStore`（localStorage、注入式、韌性）；`postProcessing` 移除手機強制關、加 `setBloom()` 運行時重建濾鏡鏈；`PixiRenderer`/`Game` 各收 `bloomEnabled` 布林並委派 `setBloom`；App.vue 為持久化/UI 單一出處（loadSettings→注入 Game.start；暫停選單切換→saveSettings+game.setBloom）。引擎不碰持久化、不碰確定性。

**Tech Stack:** TypeScript、PixiJS（pixi-filters AdvancedBloom）、Vue 3、Vitest。

## Global Constraints

- 繁體中文註解；型別/程式名稱英文；commit `[mvp][type][scope] 描述` + `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`。
- 只動 `persistence/settingsStore.ts`(新+測試)、`postProcessing.ts`、`PixiRenderer.ts`、`Game.ts`、`App.vue`、`ui/PauseMenu.vue`、`progress.md`、acceptance.md。**不碰** 模擬/system/World/確定性/store summary。
- 引擎只收 `bloomEnabled` 布林、**不 import 持久化**；App.vue 為持久化/UI 單一出處。
- grade/vignette 始終保留、與 bloom 開關獨立；濾鏡建立失敗安全退回（既有 try/catch）。
- 預設 `bloom: true`（兩平台）。既有 200 測試維持全綠。

---

### Task 1: settingsStore（TDD）

**Files:**
- Create: `src/persistence/settingsStore.ts`
- Create: `src/persistence/settingsStore.test.ts`

**Interfaces:**
- Produces: `Settings { bloom: boolean }`、`loadSettings()`（預設 bloom:true）、`saveSettings(s)`。供 App 使用。

- [ ] **Step 1: 寫失敗測試 `settingsStore.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { loadSettings, saveSettings } from './settingsStore'
import type { StorageLike } from './saveStore'

function mem(): StorageLike & { data: Record<string, string> } {
  const data: Record<string, string> = {}
  return { data, getItem: (k) => data[k] ?? null, setItem: (k, v) => { data[k] = v } }
}

describe('settingsStore', () => {
  it('無資料回預設 bloom:true', () => {
    expect(loadSettings(mem()).bloom).toBe(true)
  })
  it('save→load 往返一致', () => {
    const s = mem()
    saveSettings({ bloom: false }, s)
    expect(loadSettings(s).bloom).toBe(false)
  })
  it('壞資料/非布林回預設', () => {
    const s = mem()
    s.setItem('survivor-settings-v1', '{bad json')
    expect(loadSettings(s).bloom).toBe(true)
    s.setItem('survivor-settings-v1', '{"bloom":"yes"}')
    expect(loadSettings(s).bloom).toBe(true)
  })
})
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `npx vitest run src/persistence/settingsStore.test.ts`
Expected: FAIL（模組不存在）。

- [ ] **Step 3: 實作 `settingsStore.ts`**

```ts
/**
 * 設定存檔模組（純邏輯）。
 * 與 saveStore 分離（不同生命週期）；以注入式 StorageLike 解耦、可單元測試。
 * 韌性：讀取異常回預設、寫入異常靜默略過——絕不影響遊玩。
 */
import type { StorageLike } from './saveStore'

const SETTINGS_KEY = 'survivor-settings-v1'

/** 使用者設定。 */
export interface Settings {
  /** 泛光（bloom）是否開啟。 */
  bloom: boolean
}

/** 預設設定（兩平台 bloom 預設開）。 */
function defaults(): Settings {
  return { bloom: true }
}

function defaultStorage(): StorageLike | null {
  return typeof window !== 'undefined' && window.localStorage ? window.localStorage : null
}

/** 讀取設定；無資料/壞 JSON/型別不符一律回預設，永不丟例外。 */
export function loadSettings(storage: StorageLike | null = defaultStorage()): Settings {
  if (!storage) return defaults()
  try {
    const raw = storage.getItem(SETTINGS_KEY)
    if (!raw) return defaults()
    const parsed = JSON.parse(raw) as Partial<Settings>
    if (!parsed || typeof parsed.bloom !== 'boolean') return defaults()
    return { bloom: parsed.bloom }
  } catch {
    return defaults()
  }
}

/** 寫入設定；無 storage 或寫入失敗靜默略過。 */
export function saveSettings(settings: Settings, storage: StorageLike | null = defaultStorage()): void {
  if (!storage) return
  try {
    storage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  } catch {
    /* 寫入失敗靜默略過 */
  }
}
```

- [ ] **Step 4: 跑測試確認通過**

Run: `npx vitest run src/persistence/settingsStore.test.ts` → PASS（3 it 全綠）

- [ ] **Step 5: Commit**

```bash
git add src/persistence/settingsStore.ts src/persistence/settingsStore.test.ts
git commit -m "[mvp][feat][ui] settingsStore（bloom 設定持久化，預設開）（bloom 開關 1）

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: postProcessing setBloom + 引擎接線（PixiRenderer/Game）

**Files:**
- Modify: `src/engine/postProcessing.ts`
- Modify: `src/engine/PixiRenderer.ts`
- Modify: `src/engine/Game.ts`

**Interfaces:**
- Produces: `PostProcessing(app, bloomEnabled)` + `setBloom`；`PixiRenderer.create(canvasParent, bloomEnabled)` + `setBloom`；`Game.start(..., bloomEnabled)` + `setBloom`。供 Task 3 App 使用。

- [ ] **Step 1: `postProcessing.ts` 改 constructor + buildFilters + setBloom**

移除 `prefersLightweight` 的 export 與函式（不再強制關），把 `PostProcessing` 改為：

```ts
export class PostProcessing {
  /** 螢幕空間暈影覆蓋物（直接掛在 stage、不隨鏡頭平移）。 */
  private vignette: Sprite
  private bloomEnabled: boolean

  constructor(private app: Application, bloomEnabled: boolean) {
    this.bloomEnabled = bloomEnabled
    this.buildFilters()
    // vignette 疊在最上層（stage 子節點 = 螢幕空間，不隨 world 平移）。
    this.vignette = new Sprite(makeVignetteTexture())
    app.stage.addChild(this.vignette)
    this.resize()
  }

  /** 依目前 bloomEnabled 重建濾鏡鏈（bloom?+grade）；grade 始終保留；失敗退回無濾鏡。 */
  private buildFilters(): void {
    try {
      const filters: Filter[] = []
      if (this.bloomEnabled) {
        filters.push(new AdvancedBloomFilter({
          threshold: BLOOM.threshold, bloomScale: BLOOM.bloomScale,
          brightness: BLOOM.brightness, blur: BLOOM.blur, quality: BLOOM.quality,
        }))
      }
      const grade = new ColorMatrixFilter()
      grade.contrast(GRADE.contrast, true)
      grade.saturate(GRADE.saturate, true)
      grade.tint(GRADE.tint, true)
      filters.push(grade)
      this.app.stage.filters = filters
      // stage 被鏡頭平移，須固定濾鏡作用區為螢幕，否則 FilterSystem 取錯 bounds → 全黑。
      this.app.stage.filterArea = this.app.screen
    } catch {
      // 濾鏡建立失敗 → 退回無濾鏡正常渲染。
    }
  }

  /** 運行時切換 bloom：重建濾鏡鏈（grade/vignette 不受影響）。 */
  setBloom(enabled: boolean): void {
    if (this.bloomEnabled === enabled) return
    this.bloomEnabled = enabled
    this.buildFilters()
  }

  /** resize 時把暈影 Sprite 拉滿螢幕（紋理連續、不需重繪）。 */
  resize(): void {
    this.vignette.width = this.app.renderer.width
    this.vignette.height = this.app.renderer.height
  }

  /** 釋放生成的暈影紋理。 */
  destroy(): void {
    this.vignette.texture?.destroy(true)
  }
}
```

（同時刪除檔頭附近不再使用的 `prefersLightweight` 函式與其註解。）

- [ ] **Step 2: `PixiRenderer.ts` 串 bloomEnabled**

把 constructor 與 create 與 PostProcessing 建立改為：

```ts
  private constructor(app: Application, bloomEnabled: boolean) {
```

```ts
    this.post = new PostProcessing(app, bloomEnabled)
```

```ts
  static async create(canvasParent: HTMLElement, bloomEnabled: boolean): Promise<PixiRenderer> {
    const app = new Application()
    await app.init({ resizeTo: canvasParent, background: 0x0c0c12, antialias: true })
    canvasParent.appendChild(app.canvas)
    return new PixiRenderer(app, bloomEnabled)
  }
```

並在 `applyFxEvents` 或 `isHitStopped` 附近加委派：

```ts
  /** 運行時切換 bloom（委派後製）。 */
  setBloom(enabled: boolean): void {
    this.post.setBloom(enabled)
  }
```

- [ ] **Step 3: `Game.ts` 串 bloomEnabled**

把 `start` 簽章與 renderer 建立：

```ts
  static async start(canvasParent: HTMLElement, seed: number, character: CharacterKind, map: MapKind, bloomEnabled: boolean): Promise<Game> {
    const world = new World(seed, character, map)
    const renderer = await PixiRenderer.create(canvasParent, bloomEnabled)
```

並加委派方法（`pause`/`resume` 附近）：

```ts
  /** 運行時切換 bloom（委派 renderer）。 */
  setBloom(enabled: boolean): void {
    this.renderer.setBloom(enabled)
  }
```

- [ ] **Step 4: 驗證 typecheck + build**

Run: `npm run typecheck` → 乾淨
Run: `npm run build` → 乾淨

- [ ] **Step 5: Commit**

```bash
git add src/engine/postProcessing.ts src/engine/PixiRenderer.ts src/engine/Game.ts
git commit -m "[mvp][feat][art] postProcessing setBloom 運行時切換 + 引擎接線 bloomEnabled（bloom 開關 2）

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: App 接線 + PauseMenu 開關 + 驗證 + 文件

**Files:**
- Modify: `src/App.vue`
- Modify: `src/ui/PauseMenu.vue`
- Modify: `docs/superpowers/specs/bloom-toggle/acceptance.md`
- Modify: `progress.md`

**Interfaces:**
- Consumes: `loadSettings`/`saveSettings`（Task 1）、`Game.start(..., bloomEnabled)`/`game.setBloom`（Task 2）。

- [ ] **Step 1: `App.vue` 載入設定 + 注入 + 切換處理**

import 區加：

```ts
import { loadSettings, saveSettings } from './persistence/settingsStore'
```

在 setup 狀態區加：

```ts
// bloom 設定（持久化）；開機讀取、切換時存回並即時套到引擎。
const bloomEnabled = ref(loadSettings().bloom)
function toggleBloom(): void {
  bloomEnabled.value = !bloomEnabled.value
  saveSettings({ bloom: bloomEnabled.value })
  game?.setBloom(bloomEnabled.value)
}
```

把 `startGame` 的：

```ts
  game = await Game.start(canvasParent.value, seed++, opts.character, opts.map)
```

改為：

```ts
  game = await Game.start(canvasParent.value, seed++, opts.character, opts.map, bloomEnabled.value)
```

- [ ] **Step 2: `App.vue` template 傳 prop/事件給 PauseMenu**

把：

```vue
<Transition name="fade"><PauseMenu v-if="store.phase === 'paused'" @resume="store.resumeGame()" @restart="restart" @menu="toMenu" /></Transition>
```

改為：

```vue
<Transition name="fade"><PauseMenu v-if="store.phase === 'paused'" :bloom="bloomEnabled" @resume="store.resumeGame()" @restart="restart" @menu="toMenu" @toggle-bloom="toggleBloom" /></Transition>
```

- [ ] **Step 3: `PauseMenu.vue` 加 prop/事件 + 開關列**

`<script setup>` 改為：

```ts
defineProps<{ bloom: boolean }>()
const emit = defineEmits<{ resume: []; restart: []; menu: []; 'toggle-bloom': [] }>()
```

template 在 `.actions` 之後加一列設定開關：

```vue
      <div class="settings">
        <button class="ui-btn ui-btn-ghost setting-btn" @click="emit('toggle-bloom')">泛光：{{ bloom ? '開' : '關' }}</button>
      </div>
```

`<style>` 加：

```css
.settings { display: flex; justify-content: center; }
.settings .setting-btn { font-size: 1rem; padding: 0.4rem 1.4rem; }
```

- [ ] **Step 4: 驗證 typecheck + 測試 + build + 瀏覽器**

Run: `npm run typecheck` → 乾淨
Run: `npm test` → 200 + Task 1 settings 測試全綠
Run: `npm run build` → 乾淨
瀏覽器：遊玩→暫停→點「泛光：開」切為「關」，恢復後畫面發光明顯變弱；再切回開恢復；重新整理頁面後設定保留（暫停選單顯示上次狀態）；grade/vignette 仍在；0 功能相關 console error。

- [ ] **Step 5: 更新 acceptance.md 與 progress.md**

- acceptance.md：勾選所有項目、填驗證日期。
- progress.md：音效/美術處或平台支援處補一行「bloom 開關：兩平台預設開 + 暫停選單可切換 + localStorage 記住 → specs/bloom-toggle/」。

- [ ] **Step 6: Commit**

```bash
git add src/App.vue src/ui/PauseMenu.vue docs/superpowers/specs/bloom-toggle/acceptance.md progress.md
git commit -m "[mvp][feat][ui] App 接線 bloom 設定 + 暫停選單泛光開關（bloom 開關完成）

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-Review（plan 對 spec 的覆蓋檢查）

- **FR-1 設定持久化**：Task 1 `settingsStore`（預設 true、注入式、韌性、測試）。✅
- **FR-2 後製切換**：Task 2 `buildFilters`/`setBloom`、移除手機強制關、grade/vignette 保留。✅
- **FR-3 引擎接線**：Task 2 PixiRenderer/Game 收 bloomEnabled + setBloom 委派。✅
- **FR-4 App 持久化/注入**：Task 3 loadSettings→ref→Game.start；toggle→save+game.setBloom。✅
- **FR-5 暫停開關**：Task 3 PauseMenu prop/事件 + 開關列 + App 接線。✅
- **邊界**：壞資料回預設（Task 1 測試）、濾鏡失敗退回（try/catch 保留）、切換不影響確定性（純後製）、寫入失敗略過。✅
- **不變項**：引擎只收布林不 import 持久化；模擬零改動；Task 3 驗 200+新測試。✅
- **Placeholder 掃描**：無 TBD；完整程式碼/指令。✅
- **型別/命名一致**：`Settings`/`loadSettings`/`saveSettings`/`bloomEnabled`/`setBloom`/`toggle-bloom` 跨 task 一致。✅
