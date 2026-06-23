# 程式化美術 — 實作計畫

> **給執行者：** 本 feature 屬呈現層，依 CLAUDE.md 不寫單元測試，以**實機截圖**驗證；
> 既有 99 單元測試須維持全綠（引擎不動）。每個 task 一個邏輯變更、各自 commit。

**目標：** 用 PixiJS `Graphics` 程式化繪製，把佔位單色圓 + 純背景升級為捲動網格、辨識造型、
物件美術與輕量動畫/命中閃白；引擎與 entity 完全不動。

**架構：** 新增 `src/engine/sprites.ts`（純繪製函式）；`PixiRenderer` 改為每個 entity 用一個
`Container{ body, flash }`，呼叫繪製函式畫一次靜態造型，每幀只更新 position + 動畫 transform，
並重畫背景網格。Pixi v8 Graphics API（`circle/rect/roundRect/poly/ellipse/moveTo/lineTo/fill/stroke`）。

**技術棧：** TypeScript、PixiJS v8、Vitest（僅跑既有測試確認不退化）。

---

## 檔案結構（建立/修改一覽）

| 檔案 | 責任 | 動作 |
|------|------|------|
| `src/engine/sprites.ts` | 純繪製函式（角色/敵人/物件/網格/光環）+ dim helper | 建立 |
| `src/engine/PixiRenderer.ts` | 改 Container 化 sprite、網格、clock、動畫、命中閃白 | 修改 |
| `progress.md` | 更新進度 | 修改 |

---

## Task 1：繪製函式（sprites.ts）

**Files:**
- Create: `src/engine/sprites.ts`

> 純呈現層繪製函式，不寫單元測試（畫到 PixiJS Graphics）；正確性於 Task 2/3 實機驗證。

- [ ] **Step 1：建立 sprites.ts**

```ts
/**
 * 程式化美術繪製函式（呈現層）。
 *
 * 每個函式把某種 entity 的造型用 PixiJS Graphics 畫出（畫一次靜態幾何）；動畫（旋轉/脈動/
 * 閃白）由 PixiRenderer 以 transform 每幀套用。純繪製、不修改模擬狀態。
 */
import { Graphics } from 'pixi.js'
import type { Entity } from './types'
import { ENEMY_DEFS } from './systems/enemyDefs'

/** 把顏色各通道乘上係數 f（<1 變暗），用來產生描邊/陰影色。 */
function dim(color: number, f: number): number {
  const r = (color >> 16) & 0xff
  const g = (color >> 8) & 0xff
  const b = color & 0xff
  return (Math.round(r * f) << 16) | (Math.round(g * f) << 8) | Math.round(b * f)
}

/** 玩家：柔光圈 + 圓身 + 描邊 + 朝 +x 的槍口三角（由 PixiRenderer 依 lastMoveDir 旋轉整體）。 */
export function drawPlayer(g: Graphics, e: Entity): void {
  const r = e.radius
  g.circle(0, 0, r * 1.8).fill({ color: 0x4aa3ff, alpha: 0.15 })
  g.circle(0, 0, r).fill(0x4aa3ff)
  g.circle(0, 0, r).stroke({ width: 2, color: 0xcfe8ff })
  g.poly([r - 1, -5, r + 7, 0, r - 1, 5]).fill(0xcfe8ff)
}

/** 敵人：依 enemyKind 畫不同造型，顏色取自 ENEMY_DEFS。 */
export function drawEnemy(g: Graphics, e: Entity): void {
  const r = e.radius
  const color = e.enemyKind ? ENEMY_DEFS[e.enemyKind].color : 0xff5252
  const dark = dim(color, 0.6)
  switch (e.enemyKind) {
    case 'swarm': {
      g.circle(0, 0, r).fill(color)
      for (let i = 0; i < 4; i++) {
        const a = (i * Math.PI) / 2
        g.poly([
          Math.cos(a) * r, Math.sin(a) * r,
          Math.cos(a) * (r + 5), Math.sin(a) * (r + 5),
          Math.cos(a + 0.4) * r, Math.sin(a + 0.4) * r,
        ]).fill(dark)
      }
      break
    }
    case 'tank': {
      g.circle(0, 0, r).fill(dark)
      g.circle(0, 0, r).stroke({ width: 4, color })
      g.circle(0, 0, r * 0.4).fill(color)
      break
    }
    case 'charger': {
      g.poly([r, 0, 0, r * 0.8, -r * 0.7, 0, 0, -r * 0.8]).fill(color)
      g.poly([r, 0, 0, r * 0.8, -r * 0.7, 0, 0, -r * 0.8]).stroke({ width: 2, color: dark })
      break
    }
    case 'boss': {
      g.circle(0, 0, r).fill(color)
      for (let i = 0; i < 10; i++) {
        const a = (i * Math.PI) / 5
        g.poly([
          Math.cos(a) * r, Math.sin(a) * r,
          Math.cos(a + 0.15) * (r + 10), Math.sin(a + 0.15) * (r + 10),
          Math.cos(a + 0.3) * r, Math.sin(a + 0.3) * r,
        ]).fill(dark)
      }
      g.circle(0, 0, r * 0.5).fill(dark)
      break
    }
    default: {
      // basic
      g.circle(0, 0, r).fill(color)
      g.circle(0, 0, r).stroke({ width: 2, color: dark })
      g.circle(-r * 0.3, -r * 0.2, r * 0.18).fill(0xffffff)
      g.circle(r * 0.3, -r * 0.2, r * 0.18).fill(0xffffff)
    }
  }
}

/** 經驗寶石：旋轉菱形 + 亮心（旋轉由 PixiRenderer 套用）。 */
export function drawGem(g: Graphics, e: Entity): void {
  const r = e.radius
  g.poly([0, -r, r, 0, 0, r, -r, 0]).fill(0x6bff6b)
  g.poly([0, -r, r, 0, 0, r, -r, 0]).stroke({ width: 1.5, color: 0xd6ffd6 })
  g.circle(0, 0, r * 0.35).fill(0xffffff)
}

/** 投射物：亮核 + 柔光暈（拉長方向由 PixiRenderer 依 vel 旋轉）。 */
export function drawProjectile(g: Graphics, e: Entity): void {
  const r = e.radius
  g.circle(0, 0, r * 2.2).fill({ color: 0xffe27a, alpha: 0.25 })
  g.ellipse(0, 0, r * 1.8, r * 0.8).fill(0xfff3b0)
}

/** 聖經環繞物：書本造型（旋轉由 PixiRenderer 套用）。 */
export function drawOrbit(g: Graphics, e: Entity): void {
  const r = e.radius
  g.roundRect(-r, -r * 0.8, r * 2, r * 1.6, 2).fill(0x8d6e63)
  g.rect(-r * 0.85, -r * 0.65, r * 1.7, r * 1.3).fill(0xfff8e1)
  g.moveTo(0, -r * 0.65).lineTo(0, r * 0.65).stroke({ width: 1.5, color: 0x8d6e63 })
}

/** 背景網格：在世界座標、玩家可視範圍內畫間距 64 的細線（無限捲動）。 */
export function drawBackgroundGrid(g: Graphics, cx: number, cy: number, viewW: number, viewH: number): void {
  const step = 64
  const left = cx - viewW / 2 - step
  const right = cx + viewW / 2 + step
  const top = cy - viewH / 2 - step
  const bottom = cy + viewH / 2 + step
  const x0 = Math.floor(left / step) * step
  const y0 = Math.floor(top / step) * step
  for (let x = x0; x <= right; x += step) {
    g.moveTo(x, top).lineTo(x, bottom)
  }
  for (let y = y0; y <= bottom; y += step) {
    g.moveTo(left, y).lineTo(right, y)
  }
  g.stroke({ width: 1, color: 0xffffff, alpha: 0.04 })
}

/** 大蒜光環：環形（描邊 + 極淡填充），半徑/alpha 隨時鐘 t 呼吸。 */
export function drawGarlicAura(g: Graphics, cx: number, cy: number, radius: number, t: number): void {
  const pr = radius * (1 + 0.04 * Math.sin(t * 3))
  const a = 0.12 + 0.05 * Math.sin(t * 3)
  g.circle(cx, cy, pr).fill({ color: 0x9b59b6, alpha: a })
  g.circle(cx, cy, pr).stroke({ width: 2, color: 0x9b59b6, alpha: 0.4 })
}
```

- [ ] **Step 2：型別檢查**

Run: `npm run typecheck`
Expected: 乾淨（sprites.ts 為純函式、被匯出，不會觸發 unused；尚未被引用也合法）

- [ ] **Step 3：commit**

```bash
git add src/engine/sprites.ts
git commit -m "$(cat <<'EOF'
[mvp][feat][art] 新增 sprites.ts：程式化繪製函式（角色/敵人/物件/網格/光環）

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2：PixiRenderer 接靜態造型 + 背景網格 + 大蒜光環

**Files:**
- Modify: `src/engine/PixiRenderer.ts`

> 本 task 換上造型與網格（尚不加動畫/閃白），實機截圖驗證造型與網格捲動。

- [ ] **Step 1：改寫 PixiRenderer（import、容器、sprite 結構、靜態繪製）**

把 `PixiRenderer.ts` 全檔替換為：

```ts
/**
 * PixiJS 渲染器。
 *
 * 把 World 的 entity 狀態畫到畫面：每個 entity 對應一個 Container（body 造型 + flash 白色覆蓋層），
 * 每格更新位置與動畫 transform；背景網格每格依可視範圍重畫；相機平移實作跟隨玩家。
 * 純呈現層——不修改模擬狀態，只讀取 World。造型繪製委派給 sprites.ts。
 */
import { Application, Container, Graphics } from 'pixi.js'
import type { World } from './World'
import type { Entity } from './types'
import {
  drawPlayer, drawEnemy, drawGem, drawProjectile, drawOrbit,
  drawBackgroundGrid, drawGarlicAura,
} from './sprites'

/** 每個 entity 的顯示物件：body（造型）+ flash（命中閃白用的白色覆蓋圓）。 */
interface Sprite {
  root: Container
  flash: Graphics
}

export class PixiRenderer {
  readonly app: Application
  /** 鏡頭容器：所有東西畫在此容器內，靠平移它實作鏡頭跟隨。 */
  private world: Container
  /** 背景網格（世界座標，每格重畫）。 */
  private grid: Graphics
  /** 大蒜場域光環。 */
  private garlicAura: Graphics
  /** entity → 顯示物件對照表。 */
  private sprites = new Map<Entity, Sprite>()
  /** 上一幀各 entity 的 hp，用來偵測命中以觸發閃白。 */
  private lastHp = new Map<Entity, number>()
  /** 動畫時鐘（每幀累加約 1/60；純視覺）。 */
  private clock = 0
  /** 是否已銷毀，用來讓 destroy() 冪等。 */
  private destroyed = false

  private constructor(app: Application) {
    this.app = app
    this.world = new Container()
    app.stage.addChild(this.world)
    // 底層：網格 → 大蒜光環 → （之後）各 entity
    this.grid = new Graphics()
    this.world.addChild(this.grid)
    this.garlicAura = new Graphics()
    this.world.addChild(this.garlicAura)
  }

  static async create(canvasParent: HTMLElement): Promise<PixiRenderer> {
    const app = new Application()
    await app.init({ resizeTo: canvasParent, background: 0x0c0c12, antialias: true })
    canvasParent.appendChild(app.canvas)
    return new PixiRenderer(app)
  }

  /** 取得（必要時建立）某 entity 的顯示物件；首次建立時依種類畫一次靜態造型。 */
  private spriteFor(e: Entity): Sprite {
    let s = this.sprites.get(e)
    if (!s) {
      const root = new Container()
      const body = new Graphics()
      switch (e.kind) {
        case 'player': drawPlayer(body, e); break
        case 'enemy': drawEnemy(body, e); break
        case 'gem': drawGem(body, e); break
        case 'projectile': drawProjectile(body, e); break
        case 'orbit': drawOrbit(body, e); break
      }
      // 命中閃白用的白色覆蓋圓（平時透明）
      const flash = new Graphics()
      flash.circle(0, 0, e.radius).fill(0xffffff)
      flash.alpha = 0
      root.addChild(body, flash)
      this.world.addChild(root)
      s = { root, flash }
      this.sprites.set(e, s)
      this.lastHp.set(e, e.hp)
    }
    return s
  }

  render(world: World): void {
    this.clock += 1 / 60

    // 背景網格：依玩家可視範圍重畫（世界座標，隨容器平移捲動）。
    this.grid.clear()
    drawBackgroundGrid(this.grid, world.player.pos.x, world.player.pos.y, this.app.renderer.width, this.app.renderer.height)

    // 大蒜光環：持有時呼吸脈動。
    this.garlicAura.clear()
    const gr = world.garlicRadius()
    if (gr > 0) drawGarlicAura(this.garlicAura, world.player.pos.x, world.player.pos.y, gr, this.clock)

    const all: Entity[] = [
      ...world.gems(),
      ...world.activeEnemies(),
      ...world.projectiles.filter((p) => p.active),
      ...world.orbits(),
      world.player,
    ]
    const seen = new Set<Entity>()
    for (const e of all) {
      const s = this.spriteFor(e)
      s.root.position.set(e.pos.x, e.pos.y)
      s.root.visible = true
      seen.add(e)
    }
    // 回收：本格未出現者銷毀並移出對照表，避免洩漏。
    for (const [e, s] of this.sprites) {
      if (!seen.has(e)) {
        s.root.destroy({ children: true })
        this.sprites.delete(e)
        this.lastHp.delete(e)
      }
    }

    // 鏡頭跟隨：玩家恆在畫面中央。
    this.world.position.set(
      this.app.renderer.width / 2 - world.player.pos.x,
      this.app.renderer.height / 2 - world.player.pos.y,
    )
  }

  destroy(): void {
    if (this.destroyed) return
    this.destroyed = true
    this.app.destroy(true, { children: true })
    this.sprites.clear()
    this.lastHp.clear()
  }
}
```

- [ ] **Step 2：型別檢查 + build**

Run: `npm run typecheck && npm run build`
Expected: 乾淨

- [ ] **Step 3：實機截圖驗證（造型 + 網格）**

Run: `npm run dev`，開始遊戲、移動，截圖確認：背景方格捲動、玩家造型+槍口、敵人各造型、寶石菱形、
投射物光彈、（升級取得後）聖經書本與大蒜光環。動畫尚未加。

- [ ] **Step 4：commit**

```bash
git add src/engine/PixiRenderer.ts
git commit -m "$(cat <<'EOF'
[mvp][feat][art] PixiRenderer 接程式化造型與背景網格（Container 化 sprite）

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3：動畫 transform + 命中閃白

**Files:**
- Modify: `src/engine/PixiRenderer.ts`

- [ ] **Step 1：在 render 的 entity 迴圈加入動畫與閃白**

把 Task 2 中 `render()` 內的 entity 迴圈
```ts
    for (const e of all) {
      const s = this.spriteFor(e)
      s.root.position.set(e.pos.x, e.pos.y)
      s.root.visible = true
      seen.add(e)
    }
```
替換為：
```ts
    for (const e of all) {
      const s = this.spriteFor(e)
      s.root.position.set(e.pos.x, e.pos.y)
      s.root.visible = true
      this.animate(e, s, world)
      this.applyHitFlash(e, s)
      seen.add(e)
    }
```

- [ ] **Step 2：新增 animate 與 applyHitFlash 私有方法**

在 `render` 方法之後新增：

```ts
  /** 依 entity 種類套用每幀動畫 transform（純視覺）。 */
  private animate(e: Entity, s: Sprite, world: World): void {
    switch (e.kind) {
      case 'gem':
        s.root.rotation = this.clock * 1.5
        s.root.scale.set(1 + 0.08 * Math.sin(this.clock * 4))
        break
      case 'orbit':
        s.root.rotation = this.clock * 3
        break
      case 'projectile':
        s.root.rotation = Math.atan2(e.vel.y, e.vel.x)
        break
      case 'player':
        s.root.rotation = Math.atan2(world.lastMoveDir.y, world.lastMoveDir.x)
        break
      case 'enemy':
        if (e.enemyKind === 'boss') s.root.scale.set(1 + 0.04 * Math.sin(this.clock * 4))
        else if (e.enemyKind === 'charger') s.root.rotation = Math.atan2(e.vel.y, e.vel.x)
        break
    }
  }

  /** 偵測 hp 下降觸發白色覆蓋層，並每幀衰減回透明。 */
  private applyHitFlash(e: Entity, s: Sprite): void {
    const prev = this.lastHp.get(e)
    if (prev !== undefined && e.hp < prev) s.flash.alpha = 0.8
    else s.flash.alpha = Math.max(0, s.flash.alpha - 0.16)
    this.lastHp.set(e, e.hp)
  }
```

- [ ] **Step 3：型別檢查 + build**

Run: `npm run typecheck && npm run build`
Expected: 乾淨

- [ ] **Step 4：實機截圖驗證（動畫 + 閃白）**

Run: `npm run dev`，確認：寶石旋轉脈動、聖經書本旋轉、投射物朝飛行方向、玩家朝移動方向、
Boss 脈動、charger 朝移動方向、敵人被打到時短暫閃白。

- [ ] **Step 5：commit**

```bash
git add src/engine/PixiRenderer.ts
git commit -m "$(cat <<'EOF'
[mvp][feat][art] 加入動畫 transform（旋轉/脈動/朝向）與命中閃白

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4：驗證與進度更新

**Files:**
- Modify: `progress.md`、`docs/superpowers/specs/procedural-art/acceptance.md`

- [ ] **Step 1：完整測試 + 型別 + build**

Run: `npm test && npm run typecheck && npm run build`
Expected: 既有 99 測試全綠、型別乾淨、build 乾淨

- [ ] **Step 2：實機完整煙霧測試**

Run: `npm run dev`，逐項對照 acceptance.md 的目視項目（背景/玩家/五敵種/物件/動畫/閃白），
玩一局確認移動/攻擊/擊殺/撿寶/升級/Boss/死亡結算與美術升級前一致；檢查 0 功能相關 console error。

- [ ] **Step 3：更新 acceptance.md 勾選 + progress.md**

依實際結果勾選 `acceptance.md`，把 `progress.md` 階段 4「把佔位幾何圖形換成 sprite 美術」標記為
「程式化美術已完成」、更新驗證快照。

- [ ] **Step 4：commit**

```bash
git add progress.md docs/superpowers/specs/procedural-art/acceptance.md
git commit -m "$(cat <<'EOF'
[mvp][docs][meta] 程式化美術驗證通過，更新 progress 與 acceptance

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## 自我檢查（Self-Review）結果

- **Spec 覆蓋：** FR-1（sprites.ts=Task1）、FR-2（容器分層 + clock=Task2）、FR-3（靜態畫一次/每幀
  transform + 網格重畫=Task2/3）、FR-4（各造型=Task1 繪製 + Task2 接線）、FR-5（命中閃白=Task3）、
  FR-6（相機/回收/destroy 冪等 + 清 lastHp=Task2）皆有對應。
- **型別一致：** `Sprite{root,flash}`、`spriteFor`、`animate`、`applyHitFlash`、`clock`、`grid`、
  `lastHp`、sprites.ts 匯出函式名在各 task 一致；Pixi v8 API（fill/stroke/poly/roundRect/ellipse）。
- **無 placeholder：** 所有步驟含實際程式碼與指令。
- **驗證：** 呈現層無單元測試，以實機截圖 + 既有 99 測試維持綠為準（已於 spec/acceptance 載明）。
