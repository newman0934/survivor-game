# 隊伍造型材質 + 發光（cast-material-polish / B1）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans（建議 inline，含瀏覽器截圖微調）或 superpowers:subagent-driven-development。Steps use checkbox (`- [ ]`) syntax.
>
> **執行建議：Inline**——純美術，需瀏覽器截圖邊看邊調光影/發光強度（數值僅起始值）。

**Goal:** 為全隊伍（4 角色 + 8 病原 + 投射物）疊加共用材質光影 + 發光核，既有輪廓保留、質感躍升。

**Architecture:** `sprites.ts` 新增 5 個材質 helper（固定左上光源），於各 draw 函式底層造型後套用；發光核接新 bloom。純呈現層、不碰模擬。

**Tech Stack:** PixiJS v8 `Graphics`、TypeScript。

## Global Constraints

- 繁體中文註解；型別/程式名稱英文。
- 純呈現層：只動 `src/engine/sprites.ts`；不碰 World/模擬/store/確定性。
- 既有輪廓保留、只疊材質；發光克制（僅核/能量點發光、膜身不發光、不過曝）。
- 既有 181 測試維持全綠；材質為 sprite 建立時一次性繪製、不影響 FPS。
- 數值為起始值，inline 以瀏覽器截圖微調。
- Commit 格式：`[mvp][type][scope] 描述` + `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`。

---

### Task 1: 材質 helper + 套用 4 角色

**Files:**
- Modify: `src/engine/sprites.ts`

- [ ] **Step 1: 新增 5 個材質 helper（放在既有 `shaded` 之後）**

```ts
/** 固定光源方向（左上，單位向量）；高光朝光源、陰影背光源。 */
const LIGHT = { x: -0.5, y: -0.6 }

/** 膜透光：外圈一層極淡同色暈（半透明膜感）。 */
function membrane(g: Graphics, r: number, color: number): void {
  g.circle(0, 0, r * 1.18).fill({ color: lighten(color, 0.25), alpha: 0.08 })
}

/** 形體陰影：背光側（右下）柔暗，增立體。 */
function innerShade(g: Graphics, r: number, color: number): void {
  g.circle(-LIGHT.x * r * 0.42, -LIGHT.y * r * 0.42, r * 0.92).fill({ color: dim(color, 0.25), alpha: 0.26 })
}

/** 邊光：受光側（左上）緣一道亮細弧，使輪廓跳出背景。 */
function rimLight(g: Graphics, r: number, color: number): void {
  const a = Math.atan2(LIGHT.y, LIGHT.x)
  g.arc(0, 0, r * 0.98, a - 0.9, a + 0.9).stroke({ width: r * 0.13, color: lighten(color, 0.6), alpha: 0.5 })
}

/** 高光點：受光側小亮斑（濕潤反光）。 */
function specular(g: Graphics, r: number): void {
  g.circle(LIGHT.x * r * 0.45, LIGHT.y * r * 0.45, r * 0.18).fill({ color: 0xffffff, alpha: 0.5 })
}

/** 發光核：柔光暈 + 亮核 + 亮心（亮到被 bloom 暈染）。 */
function emissiveCore(g: Graphics, x: number, y: number, r: number, color: number): void {
  g.circle(x, y, r * 1.9).fill({ color, alpha: 0.22 })
  g.circle(x, y, r).fill(lighten(color, 0.35))
  g.circle(x, y, r * 0.5).fill(lighten(color, 0.75))
}
```

- [ ] **Step 2: 套用到 `drawPlayer` 四角色（膜身材質 + 細胞核冷光）**

各 case 在既有膜身/核繪製**之後**、break 之前插入材質與發光核。免疫細胞核發冷光（青）用 `CELL_CORE = 0x9be8ff`。範例（macrophage default，其餘比照各自核位置）：

```ts
    default: {
      // ... 既有 macrophage 偽足/膜身/核繪製 ...
      innerShade(g, r, color)
      rimLight(g, r, color)
      specular(g, r)
      emissiveCore(g, r * 0.08, 0, r * 0.26, 0x9be8ff) // 細胞核冷光
      membrane(g, r, color)
    }
```

四角色套用要點（核位置沿用各自既有核座標、半徑約 r*0.22~0.3）：
- macrophage：核在 `(r*0.08, 0)`。
- neutrophil：多分葉核中心 `(0,0)` 附近，emissiveCore 半徑略小 `r*0.2`。
- nkcell：偏側核 `(-r*0.25, r*0.08)`。
- dendritic：中央核 `(0,0)`。
膜身材質（innerShade/rimLight/specular/membrane）以該角色膜身半徑為 r（樹突用 `r*0.72`、嗜中性球用橢圓近似 `r*0.9`）。

- [ ] **Step 3: typecheck + build + 瀏覽器驗證四角色**

Run: `npm run typecheck` → 乾淨
Run: `npm run build` → 乾淨
啟動 dev，主選單分別選四角色開局，截圖確認膜身立體、細胞核發冷光被 bloom 暈染、輪廓清晰不過曝。微調光影/發光強度。

- [ ] **Step 4: Commit**

```bash
git add src/engine/sprites.ts
git commit -m "[mvp][feat][art] 材質光影 helper（膜/內陰影/邊光/高光/發光核）+ 四角色細胞核冷光

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: 套用 8 病原 + 投射物 + 拾取物 + 驗證 + 進度

**Files:**
- Modify: `src/engine/sprites.ts`
- Modify: `progress.md`
- Modify: `docs/superpowers/specs/cast-material-polish/acceptance.md`

- [ ] **Step 1: 套用 `drawEnemy` 八病原（膜身材質 + 毒核/感染核發光）**

各 case 在既有造型後插入材質；病原核以病原色發光（`emissiveCore(g, cx, cy, r*0.3, lighten(color,0.1))`）。要點：
- virus：核 `(0,0)`，棘突保留；body 半徑 r。
- bacteria：膠囊身，rimLight/specular 以前端半球為中心（`specular` 可手動畫於 `(bw*0.2,-r*0.25)`）；核可省（桿菌），加 membrane 即可。
- spore：內體核 `(0,0)` 發光（孢子內體）。
- spiral：細長體，沿身加數個小 emissiveCore 亮點或省略，重點加 rimLight 於頭部。
- spitter：囊體核 `(0,0)` 毒核發光、噴口暗。
- splitter：雙葉各加小 emissiveCore。
- exploder：**蓄爆核更亮** `emissiveCore(g,0,0,r*0.4, lighten(color,0.2))`（更大更亮）。
- superbug：把既有兩發光亮點改用 `emissiveCore`（更強），暗核保留。
膜身材質視造型以主體半徑套用；不規則造型（spiral/splitter/exploder/superbug）以近似主圓半徑套，過曝就降 alpha。

- [ ] **Step 2: 套用投射物 + 拾取物**

`drawProjectile`：抗體叉端兩亮球改/加 `emissiveCore(g, r*1.2, ±r*1.05, r*0.3, 0x9be8ff)`；穿孔素針尖 `emissiveCore(g, r*2.7, 0, r*0.35, 0xffd54a)`；毒液彈毒核加亮（`emissiveCore(g,0,0,r*0.7, 0xc6ff5a)`）。
`drawGem`/`drawOrbit`/`drawChest`：已偏發光，輕度以 `emissiveCore` 統一核（非重點，過亮則略）。

- [ ] **Step 3: typecheck + 測試 + build + 瀏覽器驗證**

Run: `npm run typecheck` → 乾淨
Run: `npm test` → 181 全綠（引擎零影響）
Run: `npm run build` → 乾淨
瀏覽器玩一場，截圖確認病原毒核發光、投射物亮點、自爆體蓄爆核、輪廓清晰不過曝、FPS 正常。微調。

- [ ] **Step 4: 更新 acceptance.md 與 progress.md**

勾選 acceptance 各項並填驗證日期；progress.md 階段 4 美術處補一行「隊伍造型材質+發光（B1）：共用 rim/陰影/高光/膜/發光核套全隊伍 → specs/cast-material-polish/」。

- [ ] **Step 5: Commit**

```bash
git add src/engine/sprites.ts progress.md docs/superpowers/specs/cast-material-polish/acceptance.md
git commit -m "[mvp][feat][art] 八病原 + 投射物 + 拾取物 材質光影 + 發光核（B1 完成）

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-Review（plan 對 spec 的覆蓋檢查）

- **FR-1 helper**：Task 1 Step 1 五 helper + LIGHT。✅
- **FR-2 套用全隊伍**：Task 1（4 角色）+ Task 2（8 病原 + 投射物 + 拾取物）。✅
- **FR-3 發光克制**：僅核發光、膜身不發光；過曝則降 alpha（各步驟註明）。✅
- **不變項**：只動 sprites.ts；181 測試於 Task 2 Step 3 驗證；材質為建立時一次性。✅
- **Placeholder 掃描**：helper 完整程式碼；套用以「既有核座標 + emissiveCore」明確慣例描述（inline 執行依各 case 既有座標套用）。
