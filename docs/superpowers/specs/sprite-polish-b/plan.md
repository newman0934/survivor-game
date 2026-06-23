# 掉落物/環繞物造型精緻化（B 批）— 實作計畫

> **For agentic workers:** 用 superpowers:subagent-driven-development 或 executing-plans 逐 task 實作。步驟用 `- [ ]` 追蹤。
> 全部屬呈現層膠水，依 CLAUDE.md **不寫單元測試**、以實機目視驗證；既有 122 測試須維持全綠（引擎不動）。每個 task 一個邏輯變更、各自 commit。

**Goal:** 把寶箱、抗原碎片、補體環繞物、發炎場四個造型精緻化到與免疫主題同級，純呈現、數值/平衡不變。

**Architecture:** 只重寫 `src/engine/sprites.ts` 的 `drawChest`/`drawGem`/`drawOrbit`/`drawGarlicAura` 四個繪製函式，簽章不變；沿用既有 `dim`/`lighten`/`groundShadow` 輔助與 renderer 的旋轉/脈動/clock 鉤。

**Tech Stack:** TypeScript、PixiJS v8（Graphics）。

## Global Constraints（每個 task 隱含適用）

- 只動 `src/engine/sprites.ts` 四個繪製函式；**簽章不變**、不新增/改其他函式、型別、引擎、store。
- 模擬/碰撞/數值/平衡/確定性不變；發炎場傷害半徑與機制（`World.garlicRadius()`）不動，只改視覺。
- 發炎場動畫只用傳入的 `t`（renderer clock）；**不得呼叫 `Math.random()`**。
- 沿用 `dim`/`lighten`/`groundShadow` 輔助；造型與半徑等比。
- 驗證：`npm run typecheck` + `npm run build` 乾淨；不寫單元測試；既有 122 測試維持全綠。
- commit 格式 `[mvp][type][scope] 描述`，含 `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`。

---

## 檔案結構（修改一覽）

| 檔案 | 責任 | 動作 |
|------|------|------|
| `src/engine/sprites.ts` | `drawChest`/`drawGem`/`drawOrbit`/`drawGarlicAura` 四造型 | 修改 |
| `progress.md`、`acceptance.md` | 進度與驗收 | 修改 |

---

## Task 1：寶箱 → 補給囊泡（drawChest）

**Files:** Modify `src/engine/sprites.ts`（`drawChest`）

- [ ] **Step 1：重寫 drawChest**

```ts
/** 寶箱 → 補給囊泡：半透明金膜 + 內部金色發光核 + 高光點。 */
export function drawChest(g: Graphics, e: Entity): void {
  const r = e.radius
  groundShadow(g, r)
  // 金色外暈（獎勵感）
  g.circle(0, 0, r * 1.25).fill({ color: 0xffd54a, alpha: 0.18 })
  // 半透明金膜囊泡
  g.circle(0, 0, r).fill({ color: 0xffe9a8, alpha: 0.55 })
  g.circle(0, 0, r).stroke({ width: 2, color: dim(0xffd54a, 0.7) })
  // 內部金色發光核
  g.circle(0, 0, r * 0.5).fill(0xffd54a)
  g.circle(0, 0, r * 0.28).fill({ color: 0xfff3c4, alpha: 0.95 })
  // 膜面高光點
  g.circle(-r * 0.35, -r * 0.4, r * 0.18).fill({ color: 0xffffff, alpha: 0.5 })
}
```

- [ ] **Step 2：typecheck + build**

Run: `npm run typecheck && npm run build`
Expected: 乾淨。

- [ ] **Step 3：實機驗證 + commit**

`npm run dev` 殺 Boss 掉寶箱：應呈金膜囊泡 + 發光核，非木箱；撿取仍觸發免費升級。
```bash
git add src/engine/sprites.ts
git commit -m "$(cat <<'EOF'
[mvp][feat][art] 寶箱改補給囊泡（金膜 + 發光核 + 高光）

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2：抗原碎片結晶化 + 補體複合體（drawGem、drawOrbit）

**Files:** Modify `src/engine/sprites.ts`（`drawGem`、`drawOrbit`）

- [ ] **Step 1：重寫 drawGem（結晶切面）**

```ts
/** 抗原碎片：結晶菱形（四切面明暗）+ 外發光暈 + 亮核。 */
export function drawGem(g: Graphics, e: Entity): void {
  const r = e.radius
  const base = 0xffd54a
  // 外發光暈
  g.circle(0, 0, r * 1.5).fill({ color: base, alpha: 0.18 })
  // 四切面分明暗（上亮下暗）
  g.poly([0, -r, r, 0, 0, 0]).fill(lighten(base, 0.4))   // 右上 亮
  g.poly([0, -r, -r, 0, 0, 0]).fill(lighten(base, 0.15)) // 左上
  g.poly([0, r, r, 0, 0, 0]).fill(dim(base, 0.75))       // 右下 暗
  g.poly([0, r, -r, 0, 0, 0]).fill(dim(base, 0.55))      // 左下
  // 描邊 + 亮核
  g.poly([0, -r, r, 0, 0, r, -r, 0]).stroke({ width: 1.2, color: 0xfff3c4 })
  g.circle(0, 0, r * 0.22).fill(0xffffff)
}
```

- [ ] **Step 2：重寫 drawOrbit（補體複合體）**

```ts
/** 補體複合體：外柔光暈 + 主球 + 數個小亞基瓣 + 亮核。 */
export function drawOrbit(g: Graphics, e: Entity): void {
  const r = e.radius
  const base = 0xbfeaff
  // 外柔光暈
  g.circle(0, 0, r * 1.6).fill({ color: base, alpha: 0.2 })
  // 5 個小亞基瓣（環繞主球）
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2
    g.circle(Math.cos(a) * r * 0.72, Math.sin(a) * r * 0.72, r * 0.4).fill({ color: base, alpha: 0.85 })
  }
  // 主球 + 描邊
  g.circle(0, 0, r * 0.85).fill(lighten(base, 0.15))
  g.circle(0, 0, r * 0.85).stroke({ width: 1.5, color: dim(base, 0.55) })
  // 亮核
  g.circle(0, 0, r * 0.34).fill(0xffffff)
}
```

- [ ] **Step 3：typecheck + build**

Run: `npm run typecheck && npm run build`
Expected: 乾淨。

- [ ] **Step 4：實機驗證 + commit**

`npm run dev`：抗原碎片呈結晶立體 + 發光暈；補體環繞物呈帶亞基瓣的複合體（旋轉照舊）。
```bash
git add src/engine/sprites.ts
git commit -m "$(cat <<'EOF'
[mvp][feat][art] 抗原碎片結晶化 + 補體複合體（亞基瓣）造型精緻化

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3：發炎場湍流優化（drawGarlicAura）

**Files:** Modify `src/engine/sprites.ts`（`drawGarlicAura`）

**Interfaces:**
- 簽章不變：`drawGarlicAura(g: Graphics, cx: number, cy: number, radius: number, t: number): void`。

- [ ] **Step 1：重寫 drawGarlicAura（多層暈染 + 抖動邊界 + ROS 熱點，無 Math.random）**

```ts
/** 發炎場（ROS）：多層徑向暈染 + 有機抖動邊界 + 漂動 ROS 熱點；呼吸脈動隨 t，無 Math.random。 */
export function drawGarlicAura(g: Graphics, cx: number, cy: number, radius: number, t: number): void {
  const R = radius * (1 + 0.04 * Math.sin(t * 3))
  // 多層徑向暈染（由外而內 alpha 漸增的熱核感；外橙紅、內琥珀）
  const layers = 5
  for (let i = 0; i < layers; i++) {
    const lr = R * (1 - i / (layers + 1))
    const a = (0.05 + 0.03 * i) * (0.85 + 0.15 * Math.sin(t * 3))
    g.circle(cx, cy, lr).fill({ color: i < 2 ? 0xff6e40 : 0xffa040, alpha: a })
  }
  // 有機抖動邊界（半徑以 t 驅動的正弦擾動）
  const seg = 28
  for (let i = 0; i <= seg; i++) {
    const a = (i / seg) * Math.PI * 2
    const wob = 1 + 0.06 * Math.sin(a * 4 + t * 2) + 0.04 * Math.sin(a * 7 - t * 1.3)
    const px = cx + Math.cos(a) * R * wob
    const py = cy + Math.sin(a) * R * wob
    if (i === 0) g.moveTo(px, py)
    else g.lineTo(px, py)
  }
  g.stroke({ width: 2, color: 0xff7a3c, alpha: 0.5 })
  // 漂動 ROS 熱點（角度 + t 決定位置，確定性）
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + t * 0.6
    const rr = R * (0.55 + 0.3 * Math.sin(t * 2 + i))
    g.circle(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, 2 + Math.sin(t * 4 + i)).fill({ color: 0xffd180, alpha: 0.5 })
  }
}
```

- [ ] **Step 2：typecheck + build + 確認無 Math.random**

Run: `npm run typecheck && npm run build`
Run: `grep -n "Math.random" src/engine/sprites.ts`
Expected: 乾淨；`Math.random` 僅出現在檔頭 `bgHash` 的說明註解（無實際呼叫）。

- [ ] **Step 3：實機驗證 + commit**

`npm run dev`：持有發炎場時光環呈多層熱區 + 抖動邊界 + 漂動熱點，呼吸脈動照舊；未持有時無殘留。
```bash
git add src/engine/sprites.ts
git commit -m "$(cat <<'EOF'
[mvp][feat][art] 發炎場湍流優化（多層暈染 + 抖動邊界 + ROS 熱點）

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4：驗證與進度更新

**Files:** Modify `progress.md`、`docs/superpowers/specs/sprite-polish-b/acceptance.md`

- [ ] **Step 1：完整測試 + 型別 + build**

Run: `npm test && npm run typecheck && npm run build`
Expected: 122 全綠、型別乾淨、build 乾淨。

- [ ] **Step 2：實機完整驗證**

`npm run dev`：寶箱（補給囊泡）、抗原碎片（結晶）、補體複合體、發炎場（湍流）皆如設計；
撿寶箱/吸抗原/補體環繞/發炎傷害行為不變；FPS 正常、0 功能相關 console error。

- [ ] **Step 3：更新 acceptance.md 勾選 + progress.md**

依結果勾選 `acceptance.md` 填驗證日期；`progress.md` 階段 4 美術補一條「造型精緻化 B 批」。

- [ ] **Step 4：commit**

```bash
git add progress.md docs/superpowers/specs/sprite-polish-b/acceptance.md
git commit -m "$(cat <<'EOF'
[mvp][docs][meta] 造型精緻化 B 批驗證通過，更新 progress 與 acceptance

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## 自我檢查（Self-Review）結果

- **Spec 覆蓋：** FR-1 寶箱（Task1）、FR-2 抗原碎片（Task2）、FR-3 補體複合體（Task2）、FR-4 發炎場（Task3）、
  FR-5 不變項（簽章不變 + 全程 typecheck/build/122 測試，Task4）皆有對應。
- **無 placeholder：** 四造型均給出完整繪製碼與指令、預期輸出。
- **型別一致：** 四函式簽章與既有相同；沿用 `dim`/`lighten`/`groundShadow`。
- **確定性：** 發炎場動畫只用 `t`；Task3 Step2 明確 grep 確認無 `Math.random()` 呼叫。
- **相容：** 只動 sprites.ts 四函式 → 引擎不動、既有 122 測試全綠。
