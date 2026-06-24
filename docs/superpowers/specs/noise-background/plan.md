# 噪聲紋理視差背景（noise-background）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans（建議 inline，含瀏覽器截圖驗證）或 superpowers:subagent-driven-development。Steps use checkbox (`- [ ]`) syntax.

**Goal:** 以程序生成噪聲紋理 + 2 視差 TilingSprite 取代向量背景調性底，提供連續有機組織質感（保留特徵/粒子）。

**Architecture:** `core/noise.ts` 純函式（fBm，TDD）→ canvas 生成無縫平鋪灰階紋理 → `noiseBackground.ts`（2 視差 TilingSprite + 中央暖核，per-map tint）掛在 stage 最底；`PixiRenderer` 懶初始化（取 world.mapKind）+ 每幀 update tilePosition；`sprites.ts` 移除向量調性底、保留特徵/粒子。純呈現層。

**Tech Stack:** PixiJS v8（`TilingSprite`/`Texture`/`Container`/`Sprite`）、canvas 2D、TypeScript、Vitest。

## Global Constraints

- 繁體中文註解；型別/程式名稱英文。
- 純呈現層：只動 `core/noise.ts`(新)、`noiseBackground.ts`(新)、`PixiRenderer.ts`、`sprites.ts`；不碰 World/模擬/store/確定性。
- 噪聲純函式確定性可重現（seed）走 TDD；renderer 生成可用 `Math.random`（呈現層，既有 effects.ts 已用），模擬仍無 Math.random。
- 既有 173 測試維持全綠。
- 背景任何異常都不得影響可玩性（try/catch 退回）。
- 效能：TilingSprite GPU 取樣、生成一次性、每幀僅更新 tilePosition。
- Commit 格式：`[mvp][type][scope] 描述` + `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`。

---

### Task 1: 噪聲純函式 core/noise.ts（TDD）

**Files:**
- Create: `src/engine/core/noise.ts`
- Test: `src/engine/core/noise.test.ts`

**Interfaces:**
- Produces: `valueNoise(x, y, seed, period?): number`、`fbm(x, y, seed, octaves?, period?): number`（皆 0..1、確定性）。

- [ ] **Step 1: 寫失敗測試 `src/engine/core/noise.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { valueNoise, fbm } from './noise'

describe('noise', () => {
  it('fbm 相同 (x,y,seed) 可重現', () => {
    expect(fbm(3.7, 9.2, 42)).toBe(fbm(3.7, 9.2, 42))
  })
  it('fbm 輸出落在 0..1', () => {
    for (let i = 0; i < 50; i++) {
      const v = fbm(i * 1.3, i * 2.7, 7)
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThanOrEqual(1)
    }
  })
  it('不同 seed 一般產生不同值', () => {
    expect(fbm(2.5, 2.5, 1)).not.toBe(fbm(2.5, 2.5, 999))
  })
  it('valueNoise 0..1 且可重現', () => {
    const a = valueNoise(5.5, 8.1, 3)
    expect(a).toBe(valueNoise(5.5, 8.1, 3))
    expect(a).toBeGreaterThanOrEqual(0)
    expect(a).toBeLessThanOrEqual(1)
  })
  it('period 使格點環繞（平鋪）', () => {
    // 同 seed、座標差一個 period 的整數格點應雜湊到同值
    expect(valueNoise(0, 0, 5, 8)).toBe(valueNoise(8, 0, 5, 8))
  })
})
```

- [ ] **Step 2: 執行確認失敗**

Run: `npx vitest run src/engine/core/noise.test.ts`
Expected: FAIL（模組不存在）

- [ ] **Step 3: 實作 `src/engine/core/noise.ts`**

```ts
/**
 * 程序噪聲（value noise + fBm）。純函式、確定性（給定 seed 可重現）。
 * 供呈現層生成有機背景紋理用；不進入模擬。
 */

/** 整數格點雜湊 → [0,1)。 */
function hash2(ix: number, iy: number, seed: number): number {
  let h = (ix * 374761393 + iy * 668265263 + seed * 1274126177) | 0
  h = (h ^ (h >>> 13)) * 1274126177
  h = h ^ (h >>> 16)
  return ((h >>> 0) % 100000) / 100000
}

/** smoothstep 緩和插值。 */
function smooth(t: number): number {
  return t * t * (3 - 2 * t)
}

/**
 * value noise（雙線性 + smoothstep），輸出 0..1。
 * @param period >0 時格點環繞此週期，使紋理無縫平鋪。
 */
export function valueNoise(x: number, y: number, seed: number, period = 0): number {
  const x0 = Math.floor(x), y0 = Math.floor(y)
  const fx = smooth(x - x0), fy = smooth(y - y0)
  const wrap = (v: number): number => (period > 0 ? ((v % period) + period) % period : v)
  const a = hash2(wrap(x0), wrap(y0), seed)
  const b = hash2(wrap(x0 + 1), wrap(y0), seed)
  const c = hash2(wrap(x0), wrap(y0 + 1), seed)
  const d = hash2(wrap(x0 + 1), wrap(y0 + 1), seed)
  const top = a + (b - a) * fx
  const bot = c + (d - c) * fx
  return top + (bot - top) * fy
}

/**
 * 分形布朗運動（多八度疊加），輸出正規化 0..1。
 * @param period >0 時各八度格點環繞（period × 該八度頻率），維持無縫平鋪。
 */
export function fbm(x: number, y: number, seed: number, octaves = 4, period = 0): number {
  let sum = 0, amp = 1, freq = 1, norm = 0
  for (let i = 0; i < octaves; i++) {
    sum += amp * valueNoise(x * freq, y * freq, seed + i, period > 0 ? period * freq : 0)
    norm += amp
    amp *= 0.5
    freq *= 2
  }
  return sum / norm
}
```

- [ ] **Step 4: 執行確認通過 + 型別檢查**

Run: `npx vitest run src/engine/core/noise.test.ts` → PASS（5 tests）
Run: `npm run typecheck` → 乾淨

- [ ] **Step 5: Commit**

```bash
git add src/engine/core/noise.ts src/engine/core/noise.test.ts
git commit -m "[mvp][feat][engine] 程序噪聲 value noise + fBm 純函式（確定性、可平鋪，TDD）

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: NoiseBackground 模組 + PixiRenderer 接線 + sprites 清理（瀏覽器驗證）

**Files:**
- Create: `src/engine/noiseBackground.ts`
- Modify: `src/engine/PixiRenderer.ts`
- Modify: `src/engine/sprites.ts`
- Modify: `progress.md`
- Modify: `docs/superpowers/specs/noise-background/acceptance.md`

**Interfaces:**
- Consumes: `fbm`（Task 1）、`MapKind`（types）。
- Produces: `class NoiseBackground { constructor(app: Application, kind: MapKind); update(px: number, py: number): void; resize(): void; destroy(): void }`。

- [ ] **Step 1: 建立 `src/engine/noiseBackground.ts`**

```ts
/**
 * 噪聲紋理視差背景（呈現層）。
 *
 * 開機程序生成無縫平鋪灰階噪聲紋理，做成 2 層視差 TilingSprite（深層慢/中層快）
 * 疊出有機組織底，加在 stage 最底；外加中央暖核提亮維持縱深。per-map tint。
 * 純呈現——不碰模擬/確定性。生成/建立 try/catch 退回，destroy 釋放紋理。
 */
import { Application, Container, Sprite, Texture, TilingSprite } from 'pixi.js'
import type { MapKind } from './types'
import { fbm } from './core/noise'

/** 各場景兩層 tint（深層底色 / 中層提色）與暖核色。 */
const MAP_TINT: Record<MapKind, { deep: number; mid: number; core: number }> = {
  vessel:  { deep: 0x4a1119, mid: 0x8a2230, core: 0x6e1822 },
  stomach: { deep: 0x3a2208, mid: 0x7a4416, core: 0x6e3c12 },
  lung:    { deep: 0x123440, mid: 0x276079, core: 0x1d5066 },
}

/** 生成無縫平鋪灰階噪聲紋理（period 週期環繞）。 */
function makeNoiseTexture(seed: number): Texture {
  const T = 256, P = 8
  const cv = document.createElement('canvas')
  cv.width = cv.height = T
  const ctx = cv.getContext('2d')!
  const img = ctx.createImageData(T, T)
  for (let py = 0; py < T; py++) {
    for (let px = 0; px < T; px++) {
      const v = fbm((px / T) * P, (py / T) * P, seed, 4, P) // 0..1、平鋪
      const g = Math.round(40 + v * 200) // 灰階（避免純黑，留 tint 空間）
      const i = (py * T + px) * 4
      img.data[i] = g; img.data[i + 1] = g; img.data[i + 2] = g; img.data[i + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  return Texture.from(cv)
}

/** 生成中央暖核提亮紋理（中央暖→外透明）。 */
function makeCoreTexture(color: number): Texture {
  const S = 256
  const cv = document.createElement('canvas')
  cv.width = cv.height = S
  const ctx = cv.getContext('2d')!
  const r = (color >> 16) & 255, gg = (color >> 8) & 255, b = color & 255
  const grad = ctx.createRadialGradient(S / 2, S / 2, S * 0.05, S / 2, S / 2, S * 0.6)
  grad.addColorStop(0, `rgba(${r},${gg},${b},0.16)`)
  grad.addColorStop(1, `rgba(${r},${gg},${b},0)`)
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, S, S)
  return Texture.from(cv)
}

/** 視差背景管理。 */
export class NoiseBackground {
  private container = new Container()
  private deep?: TilingSprite
  private mid?: TilingSprite
  private core?: Sprite
  private noiseTex?: Texture
  private coreTex?: Texture

  constructor(private app: Application, kind: MapKind) {
    try {
      const tint = MAP_TINT[kind]
      this.noiseTex = makeNoiseTexture(Math.floor(Math.random() * 1e6))
      const w = app.renderer.width, h = app.renderer.height
      // 深層：大尺度、慢視差、底色
      this.deep = new TilingSprite({ texture: this.noiseTex, width: w, height: h })
      this.deep.tileScale.set(2.4)
      this.deep.tint = tint.deep
      // 中層：細尺度、快視差、提色（加亮）
      this.mid = new TilingSprite({ texture: this.noiseTex, width: w, height: h })
      this.mid.tileScale.set(1.1)
      this.mid.tint = tint.mid
      this.mid.alpha = 0.5
      this.mid.blendMode = 'add'
      // 中央暖核
      this.coreTex = makeCoreTexture(tint.core)
      this.core = new Sprite(this.coreTex)
      this.container.addChild(this.deep, this.mid, this.core)
      this.resize()
      app.stage.addChildAt(this.container, 0) // 最底（world 之下）
    } catch {
      // 生成/建立失敗 → 退回（不影響可玩性）
    }
  }

  /** 每幀更新視差捲動（依玩家座標 × 不同係數）。 */
  update(px: number, py: number): void {
    if (this.deep) this.deep.tilePosition.set(-px * 0.06, -py * 0.06)
    if (this.mid) this.mid.tilePosition.set(-px * 0.16, -py * 0.16)
  }

  /** resize：層尺寸貼合螢幕；暖核置中拉滿。 */
  resize(): void {
    const w = this.app.renderer.width, h = this.app.renderer.height
    if (this.deep) { this.deep.width = w; this.deep.height = h }
    if (this.mid) { this.mid.width = w; this.mid.height = h }
    if (this.core) { this.core.width = w; this.core.height = h }
  }

  /** 釋放生成的紋理（container/精靈由 app.destroy 清）。 */
  destroy(): void {
    this.noiseTex?.destroy(true)
    this.coreTex?.destroy(true)
  }
}
```

- [ ] **Step 2: 接進 `src/engine/PixiRenderer.ts`**

import 區新增：

```ts
import { NoiseBackground } from './noiseBackground'
```

class 欄位新增：

```ts
  /** 噪聲視差背景（懶初始化，需 world.mapKind）。 */
  private noise?: NoiseBackground
```

在 `render(world)` 開頭（`this.clock += 1 / 60` 之後）懶初始化 + 每幀更新：

```ts
    if (!this.noise) this.noise = new NoiseBackground(this.app, world.mapKind)
    this.noise.update(world.player.pos.x, world.player.pos.y)
```

在既有 resize 偵測區塊內，`this.post.resize()` 之後新增：

```ts
      this.noise?.resize()
```

在 `destroy()` 內，`this.post.destroy()` 之後新增：

```ts
    this.noise?.destroy()
```

- [ ] **Step 3: `sprites.ts` 移除向量調性底、保留特徵/粒子**

把 `drawMapBackground` 改為僅特徵 + 粒子：

```ts
/** 地圖背景：地面特徵 + 氛圍粒子（調性底改由 NoiseBackground 提供）。 */
export function drawMapBackground(
  g: Graphics, kind: MapKind, cx: number, cy: number, viewW: number, viewH: number, clock: number,
): void {
  drawTerrain(g, kind, cx, cy, viewW, viewH, clock)
  drawAmbient(g, kind, cx, cy, viewW, viewH, clock)
}
```

刪除 `groundPatches`、`drawMapStructure`、`warmCore` 三個函式與其專用常數 `STRUCT_COLORS`、`CORE_COLORS`；`PATCH_COLORS` 若不再被任何函式使用亦一併刪除（確認 `drawTerrain` 未用到後刪）。typecheck 會抓出殘留未使用符號。

- [ ] **Step 4: typecheck + 測試 + build**

Run: `npm run typecheck` → 乾淨（無未使用符號殘留）
Run: `npm test` → PASS（既有 173 + 噪聲 5 = 178）
Run: `npm run build` → 乾淨

- [ ] **Step 5: 瀏覽器三場景截圖驗證**

啟動 dev，分別進血管/胃/肺泡，截圖確認：連續有機組織底（依場景 tint）、玩家移動時視差捲動、中央暖核、紅血球/肺泡/酸泡特徵與粒子保留、與後製疊加精緻、無破圖；死亡重開無殘留。依觀感微調 tileScale/tint/alpha/視差係數。

- [ ] **Step 6: 更新 acceptance.md 與 progress.md**

勾選 acceptance 各項並填驗證日期；progress.md 階段 4 美術處補一行「噪聲紋理視差背景：程序噪聲 + 2 視差層取代向量調性底（保留特徵）→ specs/noise-background/」，更新測試數 173→178。

- [ ] **Step 7: Commit**

```bash
git add src/engine/noiseBackground.ts src/engine/PixiRenderer.ts src/engine/sprites.ts progress.md docs/superpowers/specs/noise-background/acceptance.md
git commit -m "[mvp][feat][art] 噪聲紋理視差背景：2 視差 TilingSprite 取代向量調性底（保留特徵）

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-Review（plan 對 spec 的覆蓋檢查）

- **FR-1 噪聲純函式**：Task 1 `valueNoise`/`fbm`（確定性、period 平鋪），5 TDD 測試。✅
- **FR-2 紋理生成**：Task 2 `makeNoiseTexture`（canvas、period 平鋪、Math.random seed）。✅
- **FR-3 視差層**：Task 2 deep/mid TilingSprite、tileScale、tint、blend、update tilePosition。✅
- **FR-4 暖核**：Task 2 `makeCoreTexture` + core Sprite。✅
- **FR-5 PixiRenderer 接線**：Task 2 懶初始化、update、resize、destroy、加在 stage 最底。✅
- **FR-6 移除調性底/保留特徵**：Task 2 Step 3 drawMapBackground 僅 terrain+ambient，刪三函式與常數。✅
- **不變項**：只動四檔；模擬零改動；173 測試於 Step 4 驗證；renderer Math.random 允許。✅
- **Placeholder 掃描**：無 TBD；每步完整程式碼/指令。✅
