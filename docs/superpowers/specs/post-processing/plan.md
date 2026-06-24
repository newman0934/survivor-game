# 整體調性/後製（post-processing）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 為 Pixi 畫面加全域後製（泛光 + 色彩分級 + 暈影），行動裝置自動關泛光，純呈現層不碰模擬。

**Architecture:** 新增 `pixi-filters` 依賴；新增 `PostProcessing` 模組封裝濾鏡建立、vignette 覆蓋物與行動偵測；`PixiRenderer` 建構時實例化、resize 時重繪 vignette。濾鏡套於 `app.stage`，Vue DOM 疊層不受影響。

**Tech Stack:** PixiJS v8（`ColorMatrixFilter` 內建）、`pixi-filters`（`AdvancedBloomFilter`）、TypeScript。

## Global Constraints

- 繁體中文（zh-TW）：所有註解；型別/程式名稱英文。
- 純呈現層：只動 `src/engine/PixiRenderer.ts` + 新增 `src/engine/postProcessing.ts`；**不碰**模擬/`World`/ store / 引擎型別 / 確定性。
- 既有 173 單元測試維持全綠（引擎/模擬零改動，本功能無新增單元測試，以 typecheck/build/實機驗證）。
- 後製任何異常都不得影響可玩性（建立濾鏡以 try/catch 退回無濾鏡渲染）。
- 行動裝置（coarse pointer）不建立 bloom；保留 grade + vignette。
- 參數為模組頂部具名常數、走克制路線。
- Commit 格式：`[mvp][type][scope] 描述` + `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`。

---

### Task 1: pixi-filters 依賴 + PostProcessing 模組 + PixiRenderer 接線

**Files:**
- Modify: `package.json`（新增 `pixi-filters` 依賴，透過 `npm install`）
- Create: `src/engine/postProcessing.ts`
- Modify: `src/engine/PixiRenderer.ts`
- Modify: `progress.md`
- Modify: `docs/superpowers/specs/post-processing/acceptance.md`

**Interfaces:**
- Produces: `class PostProcessing { constructor(app: Application); resize(): void }`、`function prefersLightweight(): boolean`。
- Consumes: PixiJS `Application`/`ColorMatrixFilter`/`Graphics`；`pixi-filters` `AdvancedBloomFilter`。

- [ ] **Step 1: 安裝 pixi-filters**

Run: `npm install pixi-filters`
Expected: `package.json` 的 `dependencies` 出現 `pixi-filters`；安裝成功無錯。

- [ ] **Step 2: 建立 `src/engine/postProcessing.ts`**

```ts
/**
 * 全域後製（PostProcessing）。
 *
 * 把泛光（AdvancedBloom）+ 色彩分級（ColorMatrix）+ 暈影（vignette 覆蓋物）套在 PixiJS
 * app.stage，一次拉升整體畫面質感。純呈現層——不碰模擬/確定性/store。
 *
 * 行動裝置（coarse pointer）自動關閉 bloom（保留 grade + vignette，兩者極輕）；
 * 濾鏡建立以 try/catch 包住，任何失敗退回無濾鏡正常渲染，不影響可玩性。
 */
import { Application, ColorMatrixFilter, Graphics, type Filter } from 'pixi.js'
import { AdvancedBloomFilter } from 'pixi-filters'

/** 泛光參數（克制：高 threshold 只讓亮部發散）。 */
const BLOOM = { threshold: 0.55, bloomScale: 0.85, brightness: 1.0, blur: 6, quality: 4 }
/** 色彩分級（輕微對比 + 飽和 + 一抹免疫藍綠冷調 tint）。 */
const GRADE = { contrast: 0.12, saturate: 0.1, tint: 0xe8fffb }
/** 暈影（螢幕四角柔和壓暗）。 */
const VIGNETTE = { color: 0x000010, alpha: 0.4, layers: 8, band: 26 }

/**
 * 是否走輕量路徑（行動/觸控裝置）→ 不建立 bloom。
 * 無 matchMedia 的環境視為非 coarse（桌機路徑）。
 */
export function prefersLightweight(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches
}

/** 後製管理：建立濾鏡 + 維護螢幕空間的 vignette 覆蓋物。 */
export class PostProcessing {
  /** 螢幕空間暈影覆蓋物（直接掛在 stage、不隨鏡頭平移）。 */
  private vignette = new Graphics()

  constructor(private app: Application) {
    try {
      const filters: Filter[] = []
      // 行動裝置略過 bloom（GPU 較弱）；桌機才加。
      if (!prefersLightweight()) {
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
      app.stage.filters = filters
    } catch {
      // 濾鏡建立失敗 → 退回無濾鏡正常渲染。
    }
    // vignette 疊在最上層（stage 子節點 = 螢幕空間，不隨 world 平移）。
    app.stage.addChild(this.vignette)
    this.drawVignette()
  }

  /** resize 時重繪 vignette 以貼合新尺寸。 */
  resize(): void {
    this.drawVignette()
  }

  /** 內部：以同心暗框 stroke 畫螢幕邊緣柔和壓暗（alpha 由內而外遞增）。 */
  private drawVignette(): void {
    const w = this.app.renderer.width
    const h = this.app.renderer.height
    this.vignette.clear()
    for (let i = 0; i < VIGNETTE.layers; i++) {
      const inset = i * VIGNETTE.band
      const a = (VIGNETTE.alpha * (VIGNETTE.layers - i)) / VIGNETTE.layers
      this.vignette
        .rect(inset, inset, w - 2 * inset, h - 2 * inset)
        .stroke({ width: VIGNETTE.band, color: VIGNETTE.color, alpha: a })
    }
  }
}
```

- [ ] **Step 3: 接進 `src/engine/PixiRenderer.ts`**

在 import 區（`import { EffectsLayer } from './effects'` 之後）新增：

```ts
import { PostProcessing } from './postProcessing'
```

在 class 欄位區（`private effects!: EffectsLayer` 之後）新增：

```ts
  /** 全域後製（泛光/色調/暈影）。 */
  private post!: PostProcessing
```

在 constructor 末尾（`this.effects = new EffectsLayer(...)` 與 `this.lastW/lastH` 設定之後）新增：

```ts
    this.post = new PostProcessing(app)
```

在 `render()` 的 resize 偵測區塊內，把：

```ts
    if (this.app.renderer.width !== this.lastW || this.app.renderer.height !== this.lastH) {
      this.lastW = this.app.renderer.width
      this.lastH = this.app.renderer.height
      this.effects.resize(this.lastW, this.lastH)
    }
```

改為（加 vignette 重繪）：

```ts
    if (this.app.renderer.width !== this.lastW || this.app.renderer.height !== this.lastH) {
      this.lastW = this.app.renderer.width
      this.lastH = this.app.renderer.height
      this.effects.resize(this.lastW, this.lastH)
      this.post.resize()
    }
```

（destroy 不需改：vignette 為 stage 子節點、濾鏡掛在 stage，既有 `this.app.destroy(true, { children: true })` 會一併清除；`destroyed` guard 維持冪等。）

- [ ] **Step 4: 型別檢查**

Run: `npm run typecheck`
Expected: 乾淨（若 pixi-filters 型別有出入，依其 v8 型別調整 AdvancedBloomFilter 建構參數，但維持相同效果與保守值）

- [ ] **Step 5: 既有測試 + build**

Run: `npm test`
Expected: PASS（173，不變）

Run: `npm run build`
Expected: 乾淨（pixi-filters 正常打包）

- [ ] **Step 6: 實機驗證**

Run: `npm run dev`，於瀏覽器：
1. 桌機畫面有泛光（發光彈/特效/抗原寶石發散光暈）+ 色調統一 + 四角暈影；精緻不過曝、不糊。
2. HUD/選單/彈窗（Vue DOM）文字清晰、不受濾鏡影響。
3. 開發者工具切到行動模擬（coarse pointer）重整 → 無 bloom 但仍有色調 + 暈影、FPS 正常。
4. 縮放視窗 → 暈影貼合新尺寸。
5. 死亡 → 重新開始數次 → 無殘留/洩漏、0 功能相關 console error。

- [ ] **Step 7: 更新 acceptance.md 與 progress.md**

勾選 `docs/superpowers/specs/post-processing/acceptance.md` 各項並填驗證日期 2026-06-25（「實機驗證」項保持未勾、標註待玩家）；
在 `progress.md` 階段 4 美術相關處補一行「整體後製：全域泛光 + 色彩分級 + 暈影（行動裝置自動關 bloom）→ specs/post-processing/」。

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json src/engine/postProcessing.ts src/engine/PixiRenderer.ts progress.md docs/superpowers/specs/post-processing/acceptance.md
git commit -m "[mvp][feat][art] 全域後製：泛光 + 色彩分級 + 暈影（pixi-filters，行動裝置關 bloom）

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-Review（plan 對 spec 的覆蓋檢查）

- **FR-1 依賴**：Step 1 `npm install pixi-filters`。✅
- **FR-2 三效果**：Step 2 AdvancedBloom + ColorMatrix（contrast/saturate/tint）+ vignette 同心暗框；套於 app.stage（Step 3）。✅
- **FR-3 行動降級**：`prefersLightweight()`（coarse pointer，無 matchMedia 視為 false）控制是否加 bloom。✅
- **FR-4 參數集中克制**：BLOOM/GRADE/VIGNETTE 具名常數於模組頂部。✅
- **FR-5 容錯清理**：try/catch 退回；destroy 由 app.destroy 清濾鏡與 vignette（冪等）；resize 重繪 vignette。✅
- **不變項**：只動 PixiRenderer + 新模組；引擎/模擬/store 零改動；173 測試於 Step 5 驗證。✅
- **Placeholder 掃描**：無 TBD；每步含完整程式碼/指令。✅
