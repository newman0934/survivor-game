# 地圖背景精修（map-background-polish）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **執行建議：Inline 執行**——本功能為純美術視覺，需以瀏覽器實機截圖邊看邊微調參數（數值僅為起始值），subagent 無法操作瀏覽器。

**Goal:** 全面精修血管/胃/肺泡背景：新增結構深度層 + 暖核漸層 + 細節變體 + 背景緩動，提升沉浸感與精緻度。

**Architecture:** 全部擴充 `src/engine/sprites.ts`：新增 `drawMapStructure`/`warmCore` helper、增強 `groundPatches`/`drawTerrain`，`drawMapBackground` 依序呼叫。確定性（`bgHash` + `clock`，無 `Math.random`），純呈現層。

**Tech Stack:** PixiJS v8 `Graphics`、TypeScript。

## Global Constraints

- 繁體中文註解；型別/程式名稱英文。
- 純呈現層：只動 `src/engine/sprites.ts`；不碰引擎模擬/`World`/store/確定性。
- 確定性：地貌位置走 `bgHash`、動畫走 `clock`，**零 `Math.random`**。
- 效能：背景每幀重畫；結構層用少量大形狀、細節受可視格點上限約束。
- 既有 173 單元測試維持全綠；繪製屬呈現層不寫單元測試（`bgHash` 既有測試保留）。
- 數值為起始值，inline 執行時以瀏覽器截圖微調。
- Commit 格式：`[mvp][type][scope] 描述` + `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`。

---

### Task 1: 結構深度層 + 暖核漸層 + 色斑增強 + 繪製順序

**Files:**
- Modify: `src/engine/sprites.ts`

- [ ] **Step 1: 新增結構/暖核色表（接在 `PATCH_COLORS` 之後）**

```ts
/** 結構深度層色（大尺度、低 alpha）。 */
const STRUCT_COLORS: Record<MapKind, number> = {
  vessel: 0x5a1620, stomach: 0x5a3010, lung: 0x1e4a5e,
}
/** 暖核漸層色（視野中心略亮略暖）。 */
const CORE_COLORS: Record<MapKind, number> = {
  vessel: 0x6e1822, stomach: 0x6e3c12, lung: 0x1d5066,
}
```

並把 `PATCH_COLORS` 各場景補第三個中間色階：

```ts
const PATCH_COLORS: Record<MapKind, readonly [number, number, number]> = {
  vessel:  [0x3a0d12, 0x2a0a0e, 0x4a1118],
  stomach: [0x3a1c0a, 0x2c1408, 0x4a2410],
  lung:    [0x16303f, 0x102330, 0x1c3e52],
}
```

- [ ] **Step 2: 暖核漸層 `warmCore`（新增）**

```ts
/** 暖核漸層：以視野中心為核，大圓由外而內疊加，中央略亮略暖、減死黑。 */
function warmCore(g: Graphics, kind: MapKind, cx: number, cy: number, viewW: number, viewH: number): void {
  const col = CORE_COLORS[kind]
  const maxR = Math.hypot(viewW, viewH) * 0.6
  for (let i = 0; i < 5; i++) {
    const r = maxR * (1 - i / 5)
    g.circle(cx, cy, r).fill({ color: col, alpha: 0.028 })
  }
}
```

- [ ] **Step 3: 結構深度層 `drawMapStructure`（新增）**

```ts
/** 結構深度層：大尺度地貌（血管流紋/血管壁、胃皺褶脊、肺泡囊+支氣管），含 clock 緩動。 */
function drawMapStructure(
  g: Graphics, kind: MapKind, cx: number, cy: number, viewW: number, viewH: number, clock: number,
): void {
  const col = STRUCT_COLORS[kind]
  if (kind === 'vessel') {
    // 斜向血漿流紋寬帶（隨血流緩慢漂移）
    const BAND = 300
    const drift = ((clock * 16) % BAND)
    const k0 = Math.floor((cx - viewW) / BAND) - 1
    const k1 = Math.ceil((cx + viewW) / BAND) + 1
    for (let k = k0; k <= k1; k++) {
      const base = k * BAND + drift
      g.moveTo(base - viewH, cy - viewH).lineTo(base + viewH, cy + viewH)
      g.stroke({ width: 64 + 36 * bgHash(k, 7), color: col, alpha: 0.06 })
    }
  } else if (kind === 'stomach') {
    // 大尺度黏膜皺褶脊（橫向粗皺脊 + 蠕動波）
    const RIDGE = 160
    const r0 = Math.floor((cy - viewH / 2 - RIDGE) / RIDGE)
    const r1 = Math.ceil((cy + viewH / 2 + RIDGE) / RIDGE)
    const L = cx - viewW / 2 - 80, R = cx + viewW / 2 + 80
    for (let r = r0; r <= r1; r++) {
      const yb = r * RIDGE + Math.sin(clock * 0.8 + r) * 12 // 蠕動
      for (let s = 0; s <= 10; s++) {
        const x = L + (R - L) * (s / 10)
        const y = yb + Math.sin(x * 0.009 + r * 1.7) * 24
        if (s === 0) g.moveTo(x, y); else g.lineTo(x, y)
      }
      g.stroke({ width: 28, color: col, alpha: 0.07 })
    }
  } else {
    // 肺泡：大肺泡囊輪廓（呼吸縮放）
    const SAC = 280
    const breath = 1 + 0.05 * Math.sin(clock * 0.9)
    const gx0 = Math.floor((cx - viewW / 2 - SAC) / SAC), gx1 = Math.ceil((cx + viewW / 2 + SAC) / SAC)
    const gy0 = Math.floor((cy - viewH / 2 - SAC) / SAC), gy1 = Math.ceil((cy + viewH / 2 + SAC) / SAC)
    for (let gx = gx0; gx <= gx1; gx++) {
      for (let gy = gy0; gy <= gy1; gy++) {
        const px = gx * SAC + bgHash(gx + 5, gy + 9) * SAC * 0.5
        const py = gy * SAC + bgHash(gx + 13, gy + 21) * SAC * 0.5
        const rad = (74 + bgHash(gx, gy) * 52) * breath
        g.circle(px, py, rad).fill({ color: col, alpha: 0.05 })
        g.circle(px, py, rad).stroke({ width: 2, color: 0x3a7c92, alpha: 0.1 })
      }
    }
  }
}
```

- [ ] **Step 4: `groundPatches` 用第三色階 + 略提 alpha**

把 `groundPatches` 內取色與填色：

```ts
      const col = colors[h < 0.5 ? 0 : 1]
      g.circle(px, py, rad).fill({ color: col, alpha: 0.05 })
      g.circle(px, py, rad * 0.66).fill({ color: col, alpha: 0.05 })
      g.circle(px, py, rad * 0.33).fill({ color: col, alpha: 0.05 })
```

改為（三色階輪替、alpha 略提）：

```ts
      const col = colors[h < 0.34 ? 0 : h < 0.67 ? 1 : 2]
      g.circle(px, py, rad).fill({ color: col, alpha: 0.06 })
      g.circle(px, py, rad * 0.66).fill({ color: col, alpha: 0.06 })
      g.circle(px, py, rad * 0.33).fill({ color: col, alpha: 0.06 })
```

- [ ] **Step 5: `drawMapBackground` 接線順序（結構 → 暖核 → 色斑 → 特徵 → 粒子）**

```ts
export function drawMapBackground(
  g: Graphics, kind: MapKind, cx: number, cy: number, viewW: number, viewH: number, clock: number,
): void {
  drawMapStructure(g, kind, cx, cy, viewW, viewH, clock)
  warmCore(g, kind, cx, cy, viewW, viewH)
  groundPatches(g, kind, cx, cy, viewW, viewH)
  drawTerrain(g, kind, cx, cy, viewW, viewH, clock)
  drawAmbient(g, kind, cx, cy, viewW, viewH, clock)
}
```

- [ ] **Step 6: typecheck + build + 瀏覽器截圖驗證三場景**

Run: `npm run typecheck` → 乾淨
Run: `npm run build` → 乾淨
啟動 dev、用瀏覽器分別進血管/胃/肺泡，截圖確認結構層/暖核/色斑質感；依觀感微調 STRUCT/CORE 色與 alpha、漂移/蠕動/呼吸幅度（克制不暈眩、不過曝）。

- [ ] **Step 7: Commit**

```bash
git add src/engine/sprites.ts
git commit -m "[mvp][feat][art] 地圖背景結構深度層 + 暖核漸層 + 色斑增強（三場景緩動）

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: 細節密度（drawTerrain 變體）+ 驗證 + 進度更新

**Files:**
- Modify: `src/engine/sprites.ts`
- Modify: `progress.md`
- Modify: `docs/superpowers/specs/map-background-polish/acceptance.md`

- [ ] **Step 1: `drawTerrain` 每場景新增一種特徵變體**

在 `drawTerrain` 各 kind 分支加入第三種特徵（利用既有 `v` 區間細分；既有特徵保留）。範例：

vessel 分支末（既有 `v < 0.68` 紅血球 / else 血小板）改為三段：

```ts
      } else {
        // vessel
        if (v < 0.55) {
          // 漂浮紅血球（既有）
          const rw = 9 + v * 5
          const rh = rw * 0.55
          g.ellipse(px, py, rw, rh).fill({ color: 0xc62828, alpha: 0.55 })
          g.ellipse(px, py, rw * 0.6, rh * 0.6).fill({ color: 0x7b1010, alpha: 0.6 })
          g.ellipse(px, py, rw, rh).stroke({ width: 1, color: 0xe57373, alpha: 0.35 })
        } else if (v < 0.8) {
          // 纖維蛋白絲：細淡網絲（兩段折線）
          const a = bgHash(gx + 3, gy + 5) * Math.PI
          const len = 10 + v * 8
          const mx = px + Math.cos(a) * len, my = py + Math.sin(a) * len
          g.moveTo(px, py).lineTo(mx, my)
            .lineTo(mx + Math.cos(a + 1) * len * 0.6, my + Math.sin(a + 1) * len * 0.6)
          g.stroke({ width: 1, color: 0xd98a8a, alpha: 0.28 })
        } else {
          // 血小板（既有）
          g.circle(px, py, 2.5).fill({ color: 0xef9a9a, alpha: 0.5 })
          g.circle(px - 1, py - 0.8, 1).fill({ color: 0xffcdd2, alpha: 0.5 })
        }
      }
```

stomach 分支加「胃小凹」（暗點凹陷），lung 分支加「微血管網」（淡紅細線），比照在既有 `v` 區間細分插入：

```ts
      // stomach：在既有 v<0.6 皺褶 / else 酸泡 之間或之外插入第三段（依 v 細分）
      // 胃小凹：暗點凹陷（小暗圓 + 內更暗）
      // 例：把 else（酸泡）改為 v<0.8 酸泡、else 胃小凹
      // 胃小凹繪法：
      //   g.circle(px, py, 3.5).fill({ color: 0x2a1206, alpha: 0.5 })
      //   g.circle(px, py, 1.6).fill({ color: 0x140702, alpha: 0.6 })

      // lung：把 else（氣孔）改為 v<0.8 氣孔、else 微血管網
      // 微血管網：兩條交織淡紅細線
      //   const a2 = bgHash(gx + 9, gy + 4) * Math.PI
      //   g.moveTo(px - 8, py).lineTo(px + 8, py + Math.sin(a2) * 4)
      //   g.moveTo(px, py - 8).lineTo(px + Math.cos(a2) * 4, py + 8)
      //   g.stroke({ width: 0.8, color: 0xb05a5a, alpha: 0.22 })
```

（實作時把上述註解的繪法落為實際 if/else 分段，沿用既有 kind 分支結構；既有特徵保留。）

- [ ] **Step 2: typecheck + build + 瀏覽器截圖驗證**

Run: `npm run typecheck` → 乾淨
Run: `npm test` → 173 全綠（確認模擬零影響）
Run: `npm run build` → 乾淨
瀏覽器三場景截圖確認細節密度提升、無破圖、不過密；確認模擬無 `Math.random`（本檔背景僅用 bgHash/clock）。

- [ ] **Step 3: 更新 acceptance.md 與 progress.md**

勾選 acceptance 各項並填驗證日期；progress.md 階段 4 美術處補一行「地圖背景精修：結構深度層 + 暖核漸層 + 細節變體 + 背景緩動 → specs/map-background-polish/」。

- [ ] **Step 4: Commit**

```bash
git add src/engine/sprites.ts progress.md docs/superpowers/specs/map-background-polish/acceptance.md
git commit -m "[mvp][feat][art] 地圖背景細節變體（纖維蛋白/胃小凹/微血管網）+ 驗收/進度更新

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-Review（plan 對 spec 的覆蓋檢查）

- **FR-1 結構深度層**：Task 1 `drawMapStructure`（三場景大尺度 + clock 緩動）。✅
- **FR-2 色調氛圍**：Task 1 `warmCore` + groundPatches 三色階/alpha。✅
- **FR-3 細節密度**：Task 2 drawTerrain 三場景各加一變體。✅
- **FR-4 動態生命感**：Task 1 結構層 clock 緩動（漂移/蠕動/呼吸）。✅
- **FR-5 繪製順序**：Task 1 Step 5 結構→暖核→色斑→特徵→粒子。✅
- **不變項**：只動 sprites.ts；無 Math.random（bgHash/clock）；173 測試於 Task 2 Step 2 驗證。✅
- **Placeholder 掃描**：Task 2 Step 1 的 stomach/lung 變體以註解示意繪法，實作時落為實際 if/else（已明確指示與繪法數值）；其餘步驟完整程式碼。
