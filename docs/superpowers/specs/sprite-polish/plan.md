# 玩家/敵人造型精緻化 — 實作計畫

> **給執行者：** 呈現層改動，依 CLAUDE.md 不寫單元測試，以實機截圖驗證；既有 119 測試須維持全綠
> （引擎不動）。每個 task 一個邏輯變更、各自 commit。

**目標：** 用分層疊畫（落地陰影/暗底/主色/高光/描邊）+ 多部件輪廓，讓玩家與五種敵人更立體精緻。

**架構：** 只動 `src/engine/sprites.ts`：新增 `lighten`/`shaded`/`groundShadow` 私有 helper，重寫
`drawPlayer` 與 `drawEnemy`；簽章不變、引擎不動。

**技術棧：** TypeScript、PixiJS v8 Graphics。

---

## 檔案結構（修改一覽）

| 檔案 | 責任 | 動作 |
|------|------|------|
| `src/engine/sprites.ts` | helper + drawPlayer + drawEnemy 重繪 | 修改 |
| `progress.md` | 更新進度 | 修改 |

---

## Task 1：立體感 helper + 玩家造型

**Files:**
- Modify: `src/engine/sprites.ts`

- [ ] **Step 1：新增 lighten / groundShadow / shaded helper**

在既有 `dim` 函式之後新增：

```ts
/** 把顏色各通道朝白色混合 f（0..1，越大越亮），用來產生高光色。 */
function lighten(color: number, f: number): number {
  const r = (color >> 16) & 0xff
  const g = (color >> 8) & 0xff
  const b = color & 0xff
  const lr = Math.round(r + (255 - r) * f)
  const lg = Math.round(g + (255 - g) * f)
  const lb = Math.round(b + (255 - b) * f)
  return (lr << 16) | (lg << 8) | lb
}

/** 落地陰影：壓扁的半透明深色橢圓，墊在造型最底，讓單位「站」在地上。 */
function groundShadow(g: Graphics, rad: number): void {
  g.ellipse(0, rad * 0.85, rad * 0.9, rad * 0.4).fill({ color: 0x000000, alpha: 0.25 })
}

/** 立體圓身：暗部底（略下偏）+ 主色 + 描邊 + 左上高光。 */
function shaded(g: Graphics, cx: number, cy: number, rad: number, color: number): void {
  g.circle(cx, cy + rad * 0.12, rad).fill(dim(color, 0.55))
  g.circle(cx, cy, rad).fill(color)
  g.circle(cx, cy, rad).stroke({ width: 2, color: dim(color, 0.45) })
  g.circle(cx - rad * 0.32, cy - rad * 0.34, rad * 0.42).fill({ color: lighten(color, 0.5), alpha: 0.6 })
}
```

- [ ] **Step 2：重寫 drawPlayer**

把現有 `drawPlayer` 整段替換為：

```ts
/** 玩家：機尾雙鰭 + 立體圓身 + 駕駛艙 + 朝 +x 槍口（顏色為角色色；由 renderer 依 lastMoveDir 旋轉）。 */
export function drawPlayer(g: Graphics, e: Entity, color: number): void {
  const r = e.radius
  groundShadow(g, r)
  // 機尾雙鰭（後方 -x）
  g.poly([-r * 0.6, -r * 0.7, -r * 1.15, 0, -r * 0.6, r * 0.7]).fill(dim(color, 0.5))
  // 立體圓身
  shaded(g, 0, 0, r, color)
  // 駕駛艙（前偏）
  g.circle(r * 0.15, 0, r * 0.4).fill(dim(color, 0.4))
  g.circle(r * 0.05, -r * 0.12, r * 0.18).fill({ color: lighten(color, 0.6), alpha: 0.85 })
  // 前方槍口
  g.poly([r - 1, -5, r + 8, 0, r - 1, 5]).fill(0xffffff)
}
```

- [ ] **Step 3：型別檢查 + build**

Run: `npm run typecheck && npm run build`
Expected: 乾淨（lighten/groundShadow/shaded 已被 drawPlayer 使用；shaded 亦供 Task 2 用）

- [ ] **Step 4：commit**

```bash
git add src/engine/sprites.ts
git commit -m "$(cat <<'EOF'
[mvp][feat][art] sprites 立體感 helper（lighten/shaded/groundShadow）+ 玩家造型精緻化

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2：五種敵人造型重繪

**Files:**
- Modify: `src/engine/sprites.ts`

- [ ] **Step 1：重寫 drawEnemy**

把現有 `drawEnemy` 整段替換為：

```ts
/** 敵人：依 enemyKind 畫多部件立體造型，顏色取自 ENEMY_DEFS。 */
export function drawEnemy(g: Graphics, e: Entity): void {
  const r = e.radius
  const color = e.enemyKind ? ENEMY_DEFS[e.enemyKind].color : 0xff5252
  const dark = dim(color, 0.5)
  groundShadow(g, r)
  switch (e.enemyKind) {
    case 'swarm': {
      // 蜘蛛：6 條腿 + 立體小身 + 兩眼
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2
        g.moveTo(0, 0).lineTo(Math.cos(a) * (r + 6), Math.sin(a) * (r + 6))
      }
      g.stroke({ width: 2, color: dark })
      shaded(g, 0, 0, r, color)
      g.circle(-r * 0.3, -r * 0.1, r * 0.18).fill(0xffffff)
      g.circle(r * 0.3, -r * 0.1, r * 0.18).fill(0xffffff)
      break
    }
    case 'tank': {
      // 重甲：立體身 + 厚裝甲環 + 4 鉚釘 + 深核心
      shaded(g, 0, 0, r, color)
      g.circle(0, 0, r).stroke({ width: 5, color: dim(color, 0.4) })
      for (let i = 0; i < 4; i++) {
        const a = i * (Math.PI / 2) + Math.PI / 4
        g.circle(Math.cos(a) * r * 0.82, Math.sin(a) * r * 0.82, r * 0.1).fill(lighten(color, 0.3))
      }
      g.circle(0, 0, r * 0.42).fill(dim(color, 0.3))
      g.circle(0, 0, r * 0.42).stroke({ width: 2, color: lighten(color, 0.2) })
      break
    }
    case 'charger': {
      // 尖角衝刺：水滴身（前尖 +x）+ 雙角 + 單眼（renderer 依 vel 旋轉）
      g.poly([r * 1.1, 0, 0, r * 0.8, -r * 0.8, 0, 0, -r * 0.8]).fill(dim(color, 0.55))
      g.poly([r * 1.0, 0, 0, r * 0.7, -r * 0.7, 0, 0, -r * 0.7]).fill(color)
      g.poly([r * 1.1, 0, 0, r * 0.8, -r * 0.8, 0, 0, -r * 0.8]).stroke({ width: 2, color: dim(color, 0.4) })
      g.circle(-r * 0.1, -r * 0.2, r * 0.3).fill({ color: lighten(color, 0.5), alpha: 0.4 })
      g.poly([r * 0.5, -r * 0.45, r * 1.1, -r * 0.7, r * 0.7, -r * 0.15]).fill(dim(color, 0.4))
      g.poly([r * 0.5, r * 0.45, r * 1.1, r * 0.7, r * 0.7, r * 0.15]).fill(dim(color, 0.4))
      g.circle(r * 0.25, 0, r * 0.16).fill(0xffffff)
      g.circle(r * 0.32, 0, r * 0.08).fill(0x222222)
      break
    }
    case 'boss': {
      // 巨獸：鋸齒尖冠 + 立體身 + 內核 + 兩發光眼
      for (let i = 0; i < 10; i++) {
        const a = (i * Math.PI) / 5
        g.poly([
          Math.cos(a) * r, Math.sin(a) * r,
          Math.cos(a + 0.15) * (r + 12), Math.sin(a + 0.15) * (r + 12),
          Math.cos(a + 0.3) * r, Math.sin(a + 0.3) * r,
        ]).fill(dim(color, 0.5))
      }
      shaded(g, 0, 0, r, color)
      g.circle(0, 0, r * 0.5).fill(dim(color, 0.35))
      g.circle(-r * 0.3, -r * 0.1, r * 0.16).fill(0xfff176)
      g.circle(r * 0.3, -r * 0.1, r * 0.16).fill(0xfff176)
      break
    }
    default: {
      // basic（黏液）：立體身 + 兩眼（含瞳）+ 嘴/獠牙
      shaded(g, 0, 0, r, color)
      g.circle(-r * 0.3, -r * 0.15, r * 0.2).fill(0xffffff)
      g.circle(-r * 0.26, -r * 0.1, r * 0.1).fill(0x222222)
      g.circle(r * 0.3, -r * 0.15, r * 0.2).fill(0xffffff)
      g.circle(r * 0.34, -r * 0.1, r * 0.1).fill(0x222222)
      g.poly([-r * 0.22, r * 0.32, 0, r * 0.55, r * 0.22, r * 0.32]).fill(dim(color, 0.4))
    }
  }
}
```

- [ ] **Step 2：型別檢查 + build**

Run: `npm run typecheck && npm run build`
Expected: 乾淨

- [ ] **Step 3：實機截圖驗證**

Run: `npm run dev`（可暫調 ENEMY_DEFS 的 unlockTime/BOSS_INTERVAL 以快速見齊五敵種；驗證後還原）。
逐一確認：玩家立體+朝向、basic 黏液眼/嘴、swarm 蜘蛛腿、tank 裝甲環/鉚釘、charger 尖角朝向、
boss 尖冠/發光眼；陰影/高光/描邊到位；命中閃白與動畫正常；無 console error。

- [ ] **Step 4：commit**

```bash
git add src/engine/sprites.ts
git commit -m "$(cat <<'EOF'
[mvp][feat][art] 五種敵人造型精緻化（黏液/蜘蛛/重甲/尖角/巨獸 + 立體感）

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3：驗證與進度更新

**Files:**
- Modify: `progress.md`、`docs/superpowers/specs/sprite-polish/acceptance.md`

- [ ] **Step 1：完整測試 + 型別 + build**

Run: `npm test && npm run typecheck && npm run build`
Expected: 既有 119 測試全綠、型別乾淨、build 乾淨

- [ ] **Step 2：實機完整截圖驗證**

Run: `npm run dev`，對照 acceptance.md 的目視項目（玩家 + 五敵種立體感/新輪廓/陰影/高光、
動畫與閃白），玩一局確認玩法不受影響；0 功能相關 console error。

- [ ] **Step 3：更新 acceptance.md 勾選 + progress.md**

依結果勾選 `acceptance.md`，在 `progress.md` 的程式化美術記錄補一條「玩家/敵人造型精緻化」、
更新驗證快照。

- [ ] **Step 4：commit**

```bash
git add progress.md docs/superpowers/specs/sprite-polish/acceptance.md
git commit -m "$(cat <<'EOF'
[mvp][docs][meta] 造型精緻化驗證通過，更新 progress 與 acceptance

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## 自我檢查（Self-Review）結果

- **Spec 覆蓋：** FR-1（lighten/shaded/groundShadow + 陰影/暗底/高光/描邊=Task1）、FR-2（玩家=Task1）、
  FR-3（五敵種=Task2）、FR-4（簽章/閃白/動畫/碰撞不變=不動既有介面）皆有對應。
- **型別一致：** `lighten(color,f)`、`shaded(g,cx,cy,rad,color)`、`groundShadow(g,rad)`、
  `drawPlayer(g,e,color)`、`drawEnemy(g,e)` 跨 task 一致；沿用既有 `dim`。
- **無 placeholder：** 所有步驟含實際程式碼與指令。
- **相容：** 簽章不變，PixiRenderer/動畫/閃白/碰撞不受影響；引擎不動 → 既有測試全綠。
