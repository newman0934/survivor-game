# 打擊反饋特效（A 批）— 實作計畫

> **給執行者：** `effects.ts` 與 PixiRenderer 接線屬呈現層膠水，依 CLAUDE.md **不寫單元測試**、以實機驗證；
> 既有 122 測試須維持全綠（引擎模擬不動）。每個 task 一個邏輯變更、各自 commit。

**目標：** 為畫面加入擊殺粒子/環波、收集閃光、升級光環、傷害數字、受傷紅暈 + 鏡頭震動。

**架構：** 新增 `engine/effects.ts`（`EffectsLayer`，管理特效生命週期）；`PixiRenderer` 自行偵測事件
（敵人/寶石 sprite 消失、hp 下降、`world.currentLevel` 上升沿）後 spawn，每幀 `update()` 並把鏡頭震動偏移
加到鏡頭 position。引擎僅 `World` 加一個唯讀 `get currentLevel()`。

**技術棧：** TypeScript、PixiJS v8（Container / Graphics / Text）。

## Global Constraints（全域約束，每個 task 隱含適用）

- 特效純呈現層：不修改模擬狀態；走固定 `DT = 1/60`；`Math.random()` 僅用於視覺（不進 sim、不影響確定性）。
- 架構邊界：只動 `effects.ts`（新增）、`PixiRenderer`（接線）、`World`（一個唯讀 getter）；
  store / Summary / 型別契約 / entity 造型不變。
- 效能：粒子全域上限 `MAX_PARTICLES = 200`、傷害數字同時上限 `MAX_DAMAGE_TEXTS = 24`、壽命自動回收。
- 資源清理：`EffectsLayer.destroy()` 與 `PixiRenderer.destroy()` 冪等。
- commit 格式 `[mvp][type][scope] 描述`，含 `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`。

---

## 檔案結構（建立/修改一覽）

| 檔案 | 責任 | 動作 |
|------|------|------|
| `src/engine/effects.ts` | `EffectsLayer`：特效 spawn/update/回收 | 建立 |
| `src/engine/PixiRenderer.ts` | 偵測事件接線 + 鏡頭震動偏移 | 修改 |
| `src/engine/World.ts` | 新增唯讀 `get currentLevel()` | 修改 |
| `progress.md`、`acceptance.md` | 進度與驗收勾選 | 修改 |

---

## Task 1：EffectsLayer 模組 + 擊殺特效 + 鏡頭震動接線

**Files:**
- Create: `src/engine/effects.ts`
- Modify: `src/engine/PixiRenderer.ts`

**Interfaces:**
- Produces:
  - `class EffectsLayer`，方法 `spawnKill(x,y,color)` / `spawnPickup(x,y)` / `spawnLevelUp(x,y)` /
    `spawnDamage(x,y,amount)` / `hurt(intensity)` / `update(): {shakeX,shakeY}` / `resize(w,h)` / `destroy()`。

- [ ] **Step 1：建立完整 `effects.ts`**

建立 `src/engine/effects.ts`：

```ts
/**
 * 呈現層視覺特效。EffectsLayer 管理短生命週期特效的 spawn → 每幀 update 推進壽命 → 自動回收：
 * 擊殺粒子/環波、收集閃光、升級光環、傷害數字、受傷紅暈、鏡頭震動。純呈現、不碰模擬、走固定 dt。
 */
import { Container, Graphics, Text } from 'pixi.js'

const DT = 1 / 60
const TAU = Math.PI * 2
const MAX_PARTICLES = 200
const MAX_DAMAGE_TEXTS = 24

/** 噴射粒子（擊殺碎屑/升級光點）：速度 + 重力 + 壽命淡出縮小。 */
interface Particle {
  g: Graphics
  vx: number
  vy: number
  gravity: number
  life: number
  maxLife: number
}

/** 擴張環（環波/光圈/光環）：每幀依進度重畫描邊圓、淡出。 */
interface Expand {
  g: Graphics
  baseR: number
  growR: number
  width: number
  color: number
  life: number
  maxLife: number
}

/** 飄字（傷害數字）：上飄 + 淡出。 */
interface FloatText {
  t: Text
  vy: number
  life: number
  maxLife: number
}

export class EffectsLayer {
  private worldFx: Container
  private screenRoot: Container
  private vignette: Graphics
  private particles: Particle[] = []
  private expands: Expand[] = []
  private texts: FloatText[] = []
  private vignetteAlpha = 0
  private shakeIntensity = 0
  private screenW: number
  private screenH: number
  private destroyed = false

  constructor(worldContainer: Container, screenContainer: Container, screenW: number, screenH: number) {
    this.worldFx = new Container()
    worldContainer.addChild(this.worldFx)
    this.screenRoot = new Container()
    screenContainer.addChild(this.screenRoot)
    this.screenW = screenW
    this.screenH = screenH
    this.vignette = new Graphics()
    this.screenRoot.addChild(this.vignette)
    this.drawVignette()
  }

  /** 擊殺：環形衝擊波 + 敵色碎屑粒子（達粒子上限時只出環波）。 */
  spawnKill(x: number, y: number, color: number): void {
    this.addExpand(x, y, color, 6, 40, 3, 0.35)
    for (let i = 0; i < 9; i++) {
      if (this.particles.length >= MAX_PARTICLES) break
      const ang = Math.random() * TAU
      const spd = 60 + Math.random() * 130
      const pr = 1.5 + Math.random() * 2
      const g = new Graphics()
      g.circle(0, 0, pr).fill(color)
      g.position.set(x, y)
      this.worldFx.addChild(g)
      this.particles.push({
        g, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd, gravity: 200, life: 0.4, maxLife: 0.4,
      })
    }
  }

  /** 收集：亮綠光圈 + 白星閃光。 */
  spawnPickup(x: number, y: number): void {
    this.addExpand(x, y, 0x8bff8b, 3, 18, 2, 0.25)
    this.addExpand(x, y, 0xffffff, 1, 8, 2, 0.2)
  }

  /** 升級：金色大光環 + 上升金光點。 */
  spawnLevelUp(x: number, y: number): void {
    this.addExpand(x, y, 0xffd54f, 20, 70, 4, 0.6)
    for (let i = 0; i < 6; i++) {
      if (this.particles.length >= MAX_PARTICLES) break
      const g = new Graphics()
      g.circle(0, 0, 2).fill(0xffe082)
      g.position.set(x + (Math.random() - 0.5) * 30, y)
      this.worldFx.addChild(g)
      this.particles.push({
        g, vx: (Math.random() - 0.5) * 20, vy: -50 - Math.random() * 40, gravity: 0, life: 0.6, maxLife: 0.6,
      })
    }
  }

  /** 傷害數字：白字上飄淡出（達同時上限不生成）。 */
  spawnDamage(x: number, y: number, amount: number): void {
    if (this.texts.length >= MAX_DAMAGE_TEXTS) return
    const t = new Text({
      text: String(Math.round(amount)),
      style: { fill: 0xffffff, fontSize: 14, fontWeight: 'bold', stroke: { color: 0x000000, width: 3 } },
    })
    t.anchor.set(0.5)
    t.position.set(x, y - 12)
    this.worldFx.addChild(t)
    this.texts.push({ t, vy: -42, life: 0.5, maxLife: 0.5 })
  }

  /** 受傷：拉高紅暈與震動強度（intensity 越大越強，boss 撞擊較大）。 */
  hurt(intensity: number): void {
    this.vignetteAlpha = Math.min(0.55, this.vignetteAlpha + 0.3 + intensity * 0.3)
    this.shakeIntensity = Math.min(12, this.shakeIntensity + 4 + intensity * 8)
  }

  /** 每幀推進所有特效，回傳鏡頭震動偏移。 */
  update(): { shakeX: number; shakeY: number } {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]
      p.life -= DT
      if (p.life <= 0) {
        p.g.destroy()
        this.particles.splice(i, 1)
        continue
      }
      p.vy += p.gravity * DT
      p.g.x += p.vx * DT
      p.g.y += p.vy * DT
      const k = p.life / p.maxLife
      p.g.alpha = k
      p.g.scale.set(k)
    }
    for (let i = this.expands.length - 1; i >= 0; i--) {
      const e = this.expands[i]
      e.life -= DT
      if (e.life <= 0) {
        e.g.destroy()
        this.expands.splice(i, 1)
        continue
      }
      const k = 1 - e.life / e.maxLife
      const r = e.baseR + e.growR * k
      e.g.clear()
      e.g.circle(0, 0, r).stroke({ width: e.width, color: e.color, alpha: 1 - k })
    }
    for (let i = this.texts.length - 1; i >= 0; i--) {
      const ft = this.texts[i]
      ft.life -= DT
      if (ft.life <= 0) {
        ft.t.destroy()
        this.texts.splice(i, 1)
        continue
      }
      ft.t.y += ft.vy * DT
      ft.t.alpha = ft.life / ft.maxLife
    }
    this.vignetteAlpha = Math.max(0, this.vignetteAlpha - DT * 1.5)
    this.vignette.alpha = this.vignetteAlpha
    this.shakeIntensity = Math.max(0, this.shakeIntensity - DT * 60)
    const s = this.shakeIntensity
    return { shakeX: (Math.random() - 0.5) * s * 2, shakeY: (Math.random() - 0.5) * s * 2 }
  }

  /** 視窗尺寸變更：重畫紅暈。 */
  resize(screenW: number, screenH: number): void {
    this.screenW = screenW
    this.screenH = screenH
    this.drawVignette()
  }

  destroy(): void {
    if (this.destroyed) return
    this.destroyed = true
    for (const p of this.particles) p.g.destroy()
    for (const e of this.expands) e.g.destroy()
    for (const ft of this.texts) ft.t.destroy()
    this.particles = []
    this.expands = []
    this.texts = []
  }

  /** 內部：新增一個擴張環特效。 */
  private addExpand(
    x: number, y: number, color: number, baseR: number, growR: number, width: number, maxLife: number,
  ): void {
    const g = new Graphics()
    g.position.set(x, y)
    this.worldFx.addChild(g)
    this.expands.push({ g, baseR, growR, width, color, life: maxLife, maxLife })
  }

  /** 內部：畫螢幕邊緣紅色 vignette（整體 alpha 由 update 控制）。 */
  private drawVignette(): void {
    this.vignette.clear()
    const layers = 6
    const band = 18
    for (let i = 0; i < layers; i++) {
      const inset = i * band
      const a = 0.16 * (1 - i / layers)
      this.vignette
        .rect(inset, inset, this.screenW - 2 * inset, this.screenH - 2 * inset)
        .stroke({ width: band, color: 0xff1f1f, alpha: a })
    }
    this.vignette.alpha = this.vignetteAlpha
  }
}
```

- [ ] **Step 2：PixiRenderer import + 欄位**

在 `PixiRenderer.ts`：頂部 import 區加入：

```ts
import { EffectsLayer } from './effects'
import { ENEMY_DEFS } from './systems/enemyDefs'
```

在 class 欄位區（`private clock = 0` 附近）新增：

```ts
  /** 視覺特效層（擊殺/收集/升級/傷害數字/受傷紅暈/鏡頭震動）。 */
  private effects!: EffectsLayer
  /** 上一幀玩家等級，用來偵測升級上升沿。 */
  private lastLevel = 1
  /** 上一幀畫面尺寸，用來偵測 resize 重畫紅暈。 */
  private lastW = 0
  private lastH = 0
```

- [ ] **Step 3：constructor 建立 EffectsLayer**

在 constructor 末尾（`this.ui.addChild(this.joystickGfx)` 之後）新增：

```ts
    this.effects = new EffectsLayer(this.world, app.stage, app.renderer.width, app.renderer.height)
    this.lastW = app.renderer.width
    this.lastH = app.renderer.height
```

- [ ] **Step 4：render() 接擊殺偵測 + 鏡頭震動 + resize**

在 `render()` 回收迴圈，把：

```ts
    for (const [e, s] of this.sprites) {
      if (!seen.has(e)) {
        s.root.destroy({ children: true })
        this.sprites.delete(e)
        this.lastHp.delete(e)
      }
    }
```

替換為：

```ts
    for (const [e, s] of this.sprites) {
      if (!seen.has(e)) {
        if (e.kind === 'enemy') {
          const color = e.enemyKind ? ENEMY_DEFS[e.enemyKind].color : 0xff5252
          this.effects.spawnKill(e.pos.x, e.pos.y, color)
        }
        s.root.destroy({ children: true })
        this.sprites.delete(e)
        this.lastHp.delete(e)
      }
    }
```

然後把 `render()` 末尾鏡頭跟隨：

```ts
    // 鏡頭跟隨：玩家恆在畫面中央。
    this.world.position.set(
      this.app.renderer.width / 2 - world.player.pos.x,
      this.app.renderer.height / 2 - world.player.pos.y,
    )
```

替換為：

```ts
    // resize 偵測：重畫螢幕固定的紅暈。
    if (this.app.renderer.width !== this.lastW || this.app.renderer.height !== this.lastH) {
      this.lastW = this.app.renderer.width
      this.lastH = this.app.renderer.height
      this.effects.resize(this.lastW, this.lastH)
    }
    // 推進特效並取得鏡頭震動偏移。
    const shake = this.effects.update()
    // 鏡頭跟隨：玩家恆在畫面中央（加上震動偏移）。
    this.world.position.set(
      this.app.renderer.width / 2 - world.player.pos.x + shake.shakeX,
      this.app.renderer.height / 2 - world.player.pos.y + shake.shakeY,
    )
```

- [ ] **Step 5：destroy() 接 effects**

把 `destroy()` 內：

```ts
    this.destroyed = true
    this.app.destroy(true, { children: true })
```

替換為：

```ts
    this.destroyed = true
    this.effects.destroy()
    this.app.destroy(true, { children: true })
```

- [ ] **Step 6：型別檢查 + build**

Run: `npm run typecheck && npm run build`
Expected: 乾淨（`spawnPickup`/`spawnLevelUp`/`spawnDamage`/`hurt` 雖未接線，屬 public 方法，不報未使用）

- [ ] **Step 7：實機驗證擊殺**

Run: `npm run dev`，遊玩擊殺敵人：應在死亡位置迸發敵色碎屑粒子 + 擴張環波，約 0.4s 淡出；
大量擊殺不卡頓；0 功能相關 console error。

- [ ] **Step 8：commit**

```bash
git add src/engine/effects.ts src/engine/PixiRenderer.ts
git commit -m "$(cat <<'EOF'
[mvp][feat][art] EffectsLayer 特效模組 + 擊殺粒子/環波 + 鏡頭震動接線

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2：收集閃光 + 升級光環 + World.currentLevel

**Files:**
- Modify: `src/engine/World.ts`、`src/engine/PixiRenderer.ts`

**Interfaces:**
- Consumes: `EffectsLayer.spawnPickup`、`spawnLevelUp`（Task 1 已實作）。
- Produces: `World.currentLevel`（唯讀）。

- [ ] **Step 1：World 加唯讀 currentLevel**

在 `World.ts` 既有 `private level = 1` 之後（或 `consumeLevelUp` 附近）新增唯讀 getter：

```ts
  /** 目前玩家等級（唯讀，供 renderer 偵測升級上升沿）。 */
  get currentLevel(): number {
    return this.level
  }
```

- [ ] **Step 2：PixiRenderer 接收集閃光**

在 `render()` 回收迴圈的擊殺判斷之後，加入寶石分支：

```ts
        if (e.kind === 'enemy') {
          const color = e.enemyKind ? ENEMY_DEFS[e.enemyKind].color : 0xff5252
          this.effects.spawnKill(e.pos.x, e.pos.y, color)
        } else if (e.kind === 'gem') {
          this.effects.spawnPickup(e.pos.x, e.pos.y)
        }
```

- [ ] **Step 3：PixiRenderer 接升級光環**

在 `render()` 開頭（`this.clock += 1 / 60` 之後）新增升級上升沿偵測：

```ts
    // 升級上升沿：玩家身上爆發光環。
    if (world.currentLevel > this.lastLevel) {
      this.effects.spawnLevelUp(world.player.pos.x, world.player.pos.y)
    }
    this.lastLevel = world.currentLevel
```

- [ ] **Step 4：型別檢查 + build**

Run: `npm run typecheck && npm run build`
Expected: 乾淨

- [ ] **Step 5：實機驗證**

Run: `npm run dev`：吸取寶石出現亮綠光圈 + 白星；升級瞬間玩家身上金色光環擴張 + 上升金光點。

- [ ] **Step 6：commit**

```bash
git add src/engine/World.ts src/engine/PixiRenderer.ts
git commit -m "$(cat <<'EOF'
[mvp][feat][art] 收集閃光 + 升級光環 + World.currentLevel 唯讀曝露

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3：傷害數字跳字 + 節流

**Files:**
- Modify: `src/engine/PixiRenderer.ts`

**Interfaces:**
- Consumes: `EffectsLayer.spawnDamage`（Task 1 已實作，含 MAX_DAMAGE_TEXTS 節流）。

- [ ] **Step 1：applyHitFlash 接敵人傷害數字**

把 `applyHitFlash` 整段：

```ts
  private applyHitFlash(e: Entity, s: Sprite): void {
    const prev = this.lastHp.get(e)
    if (prev !== undefined && e.hp < prev) s.flash.alpha = 0.8
    else s.flash.alpha = Math.max(0, s.flash.alpha - 0.16)
    this.lastHp.set(e, e.hp)
  }
```

替換為：

```ts
  private applyHitFlash(e: Entity, s: Sprite): void {
    const prev = this.lastHp.get(e)
    if (prev !== undefined && e.hp < prev) {
      s.flash.alpha = 0.8
      if (e.kind === 'enemy') this.effects.spawnDamage(e.pos.x, e.pos.y, prev - e.hp)
    } else {
      s.flash.alpha = Math.max(0, s.flash.alpha - 0.16)
    }
    this.lastHp.set(e, e.hp)
  }
```

- [ ] **Step 2：型別檢查 + build**

Run: `npm run typecheck && npm run build`
Expected: 乾淨

- [ ] **Step 3：實機驗證**

Run: `npm run dev`：命中敵人時上方飄出傷害值並向上淡出；大量命中時數字達上限不再新增、不卡頓。

- [ ] **Step 4：commit**

```bash
git add src/engine/PixiRenderer.ts
git commit -m "$(cat <<'EOF'
[mvp][feat][art] 命中傷害數字跳字 + 同時上限節流

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4：受傷紅暈 + 鏡頭震動觸發

**Files:**
- Modify: `src/engine/PixiRenderer.ts`

**Interfaces:**
- Consumes: `EffectsLayer.hurt`（Task 1 已實作 vignette + shake）。

- [ ] **Step 1：applyHitFlash 接玩家受傷**

把 Task 3 完成後的 `applyHitFlash` 內判斷：

```ts
    if (prev !== undefined && e.hp < prev) {
      s.flash.alpha = 0.8
      if (e.kind === 'enemy') this.effects.spawnDamage(e.pos.x, e.pos.y, prev - e.hp)
    } else {
```

替換為：

```ts
    if (prev !== undefined && e.hp < prev) {
      s.flash.alpha = 0.8
      if (e.kind === 'enemy') this.effects.spawnDamage(e.pos.x, e.pos.y, prev - e.hp)
      else if (e.kind === 'player') this.effects.hurt(Math.min(1, (prev - e.hp) / 15))
    } else {
```

- [ ] **Step 2：型別檢查 + build**

Run: `npm run typecheck && npm run build`
Expected: 乾淨

- [ ] **Step 3：實機驗證**

Run: `npm run dev`：玩家被敵人接觸扣血時，螢幕邊緣浮現紅暈 + 輕微鏡頭震動；
被 boss（高傷）撞擊時震動/紅暈更強；無受傷時畫面穩定無殘留抖動。

- [ ] **Step 4：commit**

```bash
git add src/engine/PixiRenderer.ts
git commit -m "$(cat <<'EOF'
[mvp][feat][art] 玩家受傷紅暈 + 鏡頭震動（依扣血量、boss 更強）

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5：驗證與進度更新

**Files:**
- Modify: `progress.md`、`docs/superpowers/specs/effects-feedback/acceptance.md`

- [ ] **Step 1：完整測試 + 型別 + build**

Run: `npm test && npm run typecheck && npm run build`
Expected: 既有 122 測試全綠、型別乾淨、build 乾淨

- [ ] **Step 2：實機完整驗證 + 重新開始**

Run: `npm run dev`，對照 `acceptance.md` 逐項目視（擊殺/收集/升級/傷害數字/受傷紅暈+震動 + 節流）；
死亡後重新開始一局，確認無殘留特效、玩法不受影響、0 功能相關 console error。

- [ ] **Step 3：更新 acceptance.md 勾選 + progress.md**

依結果勾選 `acceptance.md` 並填驗證日期；在 `progress.md` 階段 4 美術記錄補一條
「打擊反饋特效（A 批）」、確認驗證快照測試數（仍 122）。

- [ ] **Step 4：commit**

```bash
git add progress.md docs/superpowers/specs/effects-feedback/acceptance.md
git commit -m "$(cat <<'EOF'
[mvp][docs][meta] 打擊反饋特效驗證通過，更新 progress 與 acceptance

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## 自我檢查（Self-Review）結果

- **Spec 覆蓋：** FR-1 EffectsLayer（Task1 Step1）、FR-2 事件偵測（擊殺=T1、收集+升級=T2、傷害=T3、受傷=T4）、
  FR-3 擊殺（T1）、FR-4 收集（T1 方法 + T2 接線）、FR-5 升級+getter（T1 方法 + T2 getter/接線）、
  FR-6 傷害+節流（T1 方法 + T3 接線）、FR-7 紅暈+震動（T1 方法 + T4 接線）、FR-8 效能節流（T1 常數）、
  FR-9 不變項（不動既有介面，既有測試全綠 T5）皆有對應。
- **型別一致：** `spawnKill(x,y,color)`、`spawnPickup(x,y)`、`spawnLevelUp(x,y)`、`spawnDamage(x,y,amount)`、
  `hurt(intensity)`、`update():{shakeX,shakeY}`、`resize(w,h)`、`destroy()`、`World.currentLevel` 跨 task 一致。
- **無 placeholder：** 所有步驟含實際程式碼與指令、預期輸出。
- **確定性：** 特效走固定 DT + renderer 觸發；`Math.random()` 僅視覺；不碰模擬 rng。
- **相容：** 只新增 effects.ts + PixiRenderer 接線 + World 唯讀 getter；store/Summary/型別/造型不變 → 既有測試全綠。
