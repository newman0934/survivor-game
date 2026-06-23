# 地圖背景視覺強化 — 實作計畫

> **給執行者：** `bgHash` 為純函式、走 TDD（先寫失敗測試）；`drawMapBackground` 與 renderer 接線屬
> 呈現層膠水、以實機驗證（依 CLAUDE.md 不寫單元測試）。既有測試須維持全綠（引擎模擬不動）。
> 每個 task 一個邏輯變更、各自 commit。

**目標：** 把「底色 + 單層網格」的地圖背景升級為三張地圖各自的程式化地貌（地面特徵 + 輕量氛圍動畫），
無限捲動穩定重現、不碰模擬。

**架構：** 在 `src/engine/sprites.ts` 新增 `bgHash`（確定性座標雜湊）與 `drawMapBackground`
（內部分 `drawTerrain` 地面特徵層 + `drawAmbient` 氛圍粒子層，並沿用 `drawBackgroundGrid` 疊淡網格）；
`World` 新增唯讀 `mapKind`；`PixiRenderer.render()` 改呼叫 `drawMapBackground`。引擎模擬不動。

**技術棧：** TypeScript、PixiJS v8 Graphics、Vitest。

## Global Constraints（全域約束，每個 task 隱含適用）

- 背景純呈現層：不得修改模擬狀態、不得呼叫 `Math.random()` 或模擬 `core/rng`。
- 確定性：地面地貌走 `bgHash` 純整數雜湊；氛圍動畫走 renderer `clock`。
- 架構邊界：只動 `sprites.ts`、`World`（加唯讀 `mapKind`）、`PixiRenderer`（換呼叫）；
  store / Summary / 型別 `MapDef` 契約不變。
- `drawBackgroundGrid` 簽章不變。
- commit 格式 `[mvp][type][scope] 描述`，含 `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`。

---

## 檔案結構（建立/修改一覽）

| 檔案 | 責任 | 動作 |
|------|------|------|
| `src/engine/sprites.ts` | 新增 `bgHash` / `drawMapBackground` / 私有 `drawTerrain` / `drawAmbient` | 修改 |
| `src/engine/sprites.bg.test.ts` | `bgHash` 確定性/區間/分布單元測試 | 建立 |
| `src/engine/World.ts` | 新增唯讀 `mapKind` 欄位 + 建構子賦值 | 修改 |
| `src/engine/PixiRenderer.ts` | `render()` 改呼叫 `drawMapBackground` | 修改 |
| `progress.md`、`acceptance.md` | 進度與驗收勾選 | 修改 |

---

## Task 1：bgHash 確定性雜湊（TDD）

**Files:**
- Create: `src/engine/sprites.bg.test.ts`
- Modify: `src/engine/sprites.ts`

**Interfaces:**
- Produces: `export function bgHash(gx: number, gy: number): number` — 回傳 `[0,1)`，純函式、確定性。

- [ ] **Step 1：寫失敗測試**

建立 `src/engine/sprites.bg.test.ts`：

```ts
import { describe, it, expect } from 'vitest'
import { bgHash } from './sprites'

describe('bgHash', () => {
  it('相同輸入回傳相同值（確定性）', () => {
    expect(bgHash(3, 7)).toBe(bgHash(3, 7))
    expect(bgHash(-12, 42)).toBe(bgHash(-12, 42))
  })

  it('輸出落在 [0,1) 區間', () => {
    for (let x = -50; x < 50; x++) {
      for (let y = -50; y < 50; y++) {
        const v = bgHash(x, y)
        expect(v).toBeGreaterThanOrEqual(0)
        expect(v).toBeLessThan(1)
      }
    }
  })

  it('不同座標分布分散（粗略均勻，無空桶）', () => {
    const buckets = new Array(10).fill(0)
    for (let x = 0; x < 100; x++) {
      for (let y = 0; y < 100; y++) {
        buckets[Math.floor(bgHash(x, y) * 10)]++
    }
    }
    // 10000 樣本 / 10 桶 期望各 ~1000；要求每桶 > 500（遠離空桶/全集中）
    for (const b of buckets) expect(b).toBeGreaterThan(500)
  })
})
```

- [ ] **Step 2：執行測試確認失敗**

Run: `npx vitest run src/engine/sprites.bg.test.ts`
Expected: FAIL（`bgHash` is not exported / not a function）

- [ ] **Step 3：實作 bgHash**

在 `src/engine/sprites.ts` 既有 `lighten` 之後新增：

```ts
/**
 * 確定性座標雜湊：整數格座標 → [0,1) 偽隨機值（純函式、無副作用）。
 * 供背景地貌決定每格是否有特徵與其外觀；同格永遠相同 → 無限捲動穩定重現。
 * 不使用 Math.random() 或模擬 rng（背景純呈現、與模擬解耦）。
 */
export function bgHash(gx: number, gy: number): number {
  let h = (Math.trunc(gx) * 374761393 + Math.trunc(gy) * 668265263) | 0
  h = (h ^ (h >>> 13)) | 0
  h = Math.imul(h, 1274126177) | 0
  h = (h ^ (h >>> 16)) >>> 0
  return (h % 100000) / 100000
}
```

- [ ] **Step 4：執行測試確認通過**

Run: `npx vitest run src/engine/sprites.bg.test.ts`
Expected: PASS（3 個測試全綠）

- [ ] **Step 5：commit**

```bash
git add src/engine/sprites.ts src/engine/sprites.bg.test.ts
git commit -m "$(cat <<'EOF'
[mvp][feat][art] 背景確定性座標雜湊 bgHash + 單元測試

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2：drawMapBackground（地面特徵 + 氛圍動畫）+ 接線

**Files:**
- Modify: `src/engine/sprites.ts`、`src/engine/World.ts`、`src/engine/PixiRenderer.ts`

**Interfaces:**
- Consumes: `bgHash(gx, gy)`（Task 1）、既有 `drawBackgroundGrid`、`dim`/`lighten`。
- Produces:
  - `export function drawMapBackground(g: Graphics, kind: MapKind, cx: number, cy: number, viewW: number, viewH: number, clock: number, gridColor: number, gridAlpha: number): void`
  - `World.mapKind: MapKind`（唯讀欄位）

- [ ] **Step 1：在 sprites.ts 匯入 MapKind 型別**

確認 `sprites.ts` 頂部 import 含 `MapKind`（與既有 `Entity` 同來源）：

```ts
import type { Entity, MapKind } from './types'
```

（若原本只 import `Entity`，改為上行。）

- [ ] **Step 2：新增私有 drawTerrain（地面特徵層，世界座標）**

在 `drawBackgroundGrid` 之後新增：

```ts
/** 地面特徵層：依 kind 在可視範圍格點散布專屬地貌（世界座標、隨鏡頭捲動）。 */
function drawTerrain(
  g: Graphics, kind: MapKind, cx: number, cy: number, viewW: number, viewH: number, clock: number,
): void {
  const TILE = 128
  const gx0 = Math.floor((cx - viewW / 2 - TILE) / TILE)
  const gy0 = Math.floor((cy - viewH / 2 - TILE) / TILE)
  const gx1 = Math.ceil((cx + viewW / 2 + TILE) / TILE)
  const gy1 = Math.ceil((cy + viewH / 2 + TILE) / TILE)
  for (let gx = gx0; gx <= gx1; gx++) {
    for (let gy = gy0; gy <= gy1; gy++) {
      if (bgHash(gx, gy) > 0.55) continue // ~45% 格子有特徵
      const px = gx * TILE + bgHash(gx + 31, gy + 17) * TILE
      const py = gy * TILE + bgHash(gx + 53, gy + 97) * TILE
      const v = bgHash(gx + 7, gy + 13)
      if (kind === 'lava') {
        if (v < 0.6) {
          g.moveTo(px - 10, py).lineTo(px - 2, py - 4).lineTo(px + 4, py + 3).lineTo(px + 12, py - 2)
          g.stroke({ width: 2, color: 0x4a1f1a, alpha: 0.7 })
        } else {
          const a = 0.4 + 0.35 * Math.sin(clock * 3 + v * 6.28)
          g.circle(px, py, 3).fill({ color: 0xff7043, alpha: a })
          g.circle(px, py, 1.5).fill({ color: 0xffd180, alpha: a })
        }
      } else if (kind === 'tundra') {
        if (v < 0.5) {
          g.moveTo(px - 10, py - 3).lineTo(px, py).lineTo(px + 3, py - 6).lineTo(px + 11, py + 2)
          g.stroke({ width: 2, color: 0x9fd8ff, alpha: 0.5 })
        } else {
          g.ellipse(px, py, 9, 4).fill({ color: 0xffffff, alpha: 0.18 })
        }
      } else {
        // plains
        if (v < 0.7) {
          for (let k = -1; k <= 1; k++) {
            const lean = (bgHash(gx + k, gy + 5) - 0.5) * 8
            g.moveTo(px + k * 4, py + 6).lineTo(px + k * 4 + lean, py - 9)
          }
          g.stroke({ width: 2, color: 0x3a7d4a, alpha: 0.5 })
        } else {
          g.circle(px, py, 4).fill({ color: 0x555555, alpha: 0.45 })
          g.circle(px - 1, py - 1, 2).fill({ color: 0x777777, alpha: 0.4 })
        }
      }
    }
  }
}
```

- [ ] **Step 3：新增私有 drawAmbient（氛圍粒子層，相對螢幕）**

接著新增：

```ts
/** 氛圍粒子層：依 kind 畫相對螢幕的飄動粒子（固定上限、靠 clock 動，不累積）。 */
function drawAmbient(
  g: Graphics, kind: MapKind, cx: number, cy: number, viewW: number, viewH: number, clock: number,
): void {
  const N = 50
  const L = cx - viewW / 2
  const T = cy - viewH / 2
  const wrap = (val: number, max: number): number => ((val % max) + max) % max
  for (let i = 0; i < N; i++) {
    const fx = bgHash(i, 101)
    const fy = bgHash(i, 202)
    if (kind === 'tundra') {
      const sx = L + wrap(fx * viewW + Math.sin(clock * 0.8 + i) * 14, viewW)
      const sy = T + wrap(fy * viewH + clock * (18 + fx * 22), viewH)
      g.circle(sx, sy, 1.4 + fx * 1.6).fill({ color: 0xffffff, alpha: 0.55 })
    } else if (kind === 'lava') {
      const sx = L + wrap(fx * viewW + Math.sin(clock + i) * 8, viewW)
      const sy = T + wrap(fy * viewH - clock * (20 + fx * 25), viewH) // 火星上升
      g.circle(sx, sy, 1 + fx * 1.4).fill({ color: 0xffab40, alpha: 0.5 })
    } else {
      // plains 草屑/光點
      const sx = L + wrap(fx * viewW + Math.sin(clock * 0.5 + i) * 20, viewW)
      const sy = T + wrap(fy * viewH + clock * (6 + fx * 8), viewH)
      g.circle(sx, sy, 1 + fx).fill({ color: 0xaed581, alpha: 0.35 })
    }
  }
}
```

- [ ] **Step 4：新增 export drawMapBackground（組合三層）**

接著新增：

```ts
/** 地圖背景：淡網格 + 地面特徵 + 氛圍粒子。取代 renderer 對 drawBackgroundGrid 的直接呼叫。 */
export function drawMapBackground(
  g: Graphics, kind: MapKind, cx: number, cy: number, viewW: number, viewH: number,
  clock: number, gridColor: number, gridAlpha: number,
): void {
  drawBackgroundGrid(g, cx, cy, viewW, viewH, gridColor, gridAlpha)
  drawTerrain(g, kind, cx, cy, viewW, viewH, clock)
  drawAmbient(g, kind, cx, cy, viewW, viewH, clock)
}
```

- [ ] **Step 5：World 新增唯讀 mapKind**

在 `World.ts` 既有 `mapBgColor = 0x0c0c12` 一行之前新增欄位：

```ts
  /** 所選地圖種類（供 renderer 決定背景地貌）。 */
  mapKind: MapKind = 'plains'
```

並在建構子既有 `const m = MAP_DEFS[map]` 之後新增賦值：

```ts
    this.mapKind = map
```

（`MapKind` 已於 World.ts 頂部 import，無需新增 import。）

- [ ] **Step 6：PixiRenderer.render() 改呼叫 drawMapBackground**

在 `PixiRenderer.ts`：把 import 的 `drawBackgroundGrid` 換成 `drawMapBackground`（第 12-13 行的 sprites import 清單），
並把 `render()` 內背景段（約第 98-103 行）：

```ts
    this.grid.clear()
    drawBackgroundGrid(
      this.grid, world.player.pos.x, world.player.pos.y,
      this.app.renderer.width, this.app.renderer.height,
      world.mapGridColor, world.mapGridAlpha,
    )
```

替換為：

```ts
    this.grid.clear()
    drawMapBackground(
      this.grid, world.mapKind, world.player.pos.x, world.player.pos.y,
      this.app.renderer.width, this.app.renderer.height,
      this.clock, world.mapGridColor, world.mapGridAlpha,
    )
```

- [ ] **Step 7：型別檢查 + build**

Run: `npm run typecheck && npm run build`
Expected: 乾淨（`drawBackgroundGrid` 仍被 `drawMapBackground` 使用，無未用匯入）

- [ ] **Step 8：實機驗證三張地圖**

Run: `npm run dev`，主選單分別選平原/熔岩/冰原進場：
- 平原：淡綠草叢 + 碎石；草屑/光點緩慢飄移。
- 熔岩：岩裂折線 + 餘燼脈動發光；火星上升。
- 冰原：冰裂折線 + 雪堆；雪點飄落。
- 朝一方向移動再折返，地面地貌一致（不閃爍/重排）；FPS 正常；0 功能相關 console error。

- [ ] **Step 9：commit**

```bash
git add src/engine/sprites.ts src/engine/World.ts src/engine/PixiRenderer.ts
git commit -m "$(cat <<'EOF'
[mvp][feat][art] 三地圖程式化地貌背景（地面特徵 + 氛圍動畫）+ World.mapKind 接線

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3：驗證與進度更新

**Files:**
- Modify: `progress.md`、`docs/superpowers/specs/map-background/acceptance.md`

- [ ] **Step 1：完整測試 + 型別 + build**

Run: `npm test && npm run typecheck && npm run build`
Expected: 全部測試（既有 + 新增 bgHash 3 項）全綠、型別乾淨、build 乾淨

- [ ] **Step 2：實機完整驗證**

Run: `npm run dev`，對照 `acceptance.md` 逐項目視（三圖地貌/氛圍動畫/捲動穩定/FPS），
玩一局確認玩法與碰撞不受影響；0 功能相關 console error。

- [ ] **Step 3：更新 acceptance.md 勾選 + progress.md**

依結果勾選 `acceptance.md` 全部項目並填驗證日期；在 `progress.md` 階段 4 美術記錄補一條
「地圖背景視覺強化（三地圖地貌 + 氛圍動畫）」、更新驗證快照測試數。

- [ ] **Step 4：commit**

```bash
git add progress.md docs/superpowers/specs/map-background/acceptance.md
git commit -m "$(cat <<'EOF'
[mvp][docs][meta] 地圖背景驗證通過，更新 progress 與 acceptance

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## 自我檢查（Self-Review）結果

- **Spec 覆蓋：** FR-1 drawMapBackground 進入點（Task2 Step4 + renderer 換呼叫 Step6）、
  FR-2 bgHash 純函式（Task1）、FR-3 地面特徵層三 kind（Task2 Step2 drawTerrain）、
  FR-4 氛圍動畫層三 kind（Task2 Step3 drawAmbient）、FR-5 World.mapKind（Task2 Step5）、
  FR-6 不變項（簽章/模擬不動，既有測試全綠 Task3）皆有對應。
- **簽章細化：** 實作上 `drawMapBackground` 需網格參數畫淡網格，故較 spec §6 多 `gridColor, gridAlpha`
  兩個視覺參數（無害細化，已同步更新 spec §3 FR-1 與 §6）。
- **型別一致：** `bgHash(gx,gy)`、`drawMapBackground(g,kind,cx,cy,viewW,viewH,clock,gridColor,gridAlpha)`、
  `drawTerrain`/`drawAmbient`（私有，同參數列 + clock）、`World.mapKind: MapKind` 跨 task 一致；
  沿用既有 `drawBackgroundGrid`/`dim`/`lighten`。
- **無 placeholder：** 所有步驟含實際程式碼與指令、預期輸出。
- **確定性：** `bgHash` 純整數運算（`Math.imul`/位元）；氛圍走 renderer clock；不碰模擬 rng。
- **相容：** `drawBackgroundGrid` 簽章不變、被內部沿用；store/Summary/MapDef 不變 → 既有測試全綠。
