# 打擊頓挫 + 震屏（hit-stop-shake）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development 或 superpowers:executing-plans 逐 task 實作。**建議 inline 執行**（需瀏覽器打 Boss 看震屏/頓挫微調）。Steps use checkbox (`- [ ]`) 語法。

**Goal:** 把震屏擴展到擊殺/Boss/nova 並分級，新增大時刻 hit-stop 頓挫（受全域冷卻節流），尊重 reduced-motion。

**Architecture:** 抽純邏輯 `HitStop` 計時器（可測、無 Pixi）；`EffectsLayer` 組合它並新增 `shake()`（既有 `hurt()` 改呼叫）、`hitStop()`、`isHitStopped()`、reduced-motion 旗標；`PixiRenderer` 既有命中/擊殺/nova 偵測處依 `enemyKind` 分級觸發；`Game` 迴圈頓挫時不推進、續渲染。World/模擬/確定性零改動（Boss 即 superbug，用 enemyKind 分級）。

**Tech Stack:** TypeScript、PixiJS（呈現）、Vitest（HitStop 純邏輯）。

## Global Constraints

- 繁體中文註解；型別/程式名稱英文；commit `[mvp][type][scope] 描述` + `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`。
- 只動 `engine/core/hitStop.ts`(新+測試)、`engine/effects.ts`、`engine/PixiRenderer.ts`、`engine/Game.ts`、`progress.md`、acceptance.md。**不碰** World/system/factory/模擬計算/RNG/確定性、store/Vue。
- 頓挫只跳過本地 wall-clock 推進（同 pause 概念），模擬內容/RNG 不變。
- 震屏沿用既有 `shakeIntensity` 上限（≤12）與衰減；`EffectsLayer.update()` 簽章不變；`hurt()` 行為不變。
- `prefers-reduced-motion: reduce` → shake/hitStop 皆 no-op。
- 既有 193 測試維持全綠。

---

### Task 1: HitStop 純邏輯計時器 + 單元測試（TDD）

**Files:**
- Create: `src/engine/core/hitStop.ts`
- Create: `src/engine/core/hitStop.test.ts`

**Interfaces:**
- Produces: `class HitStop { trigger(seconds); advance(dt); get stopped }`。供 Task 2 `EffectsLayer` 組合。

- [ ] **Step 1: 寫失敗測試 `src/engine/core/hitStop.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { HitStop } from './hitStop'

describe('HitStop', () => {
  it('trigger 後 stopped 為真', () => {
    const h = new HitStop()
    h.trigger(0.1)
    expect(h.stopped).toBe(true)
  })
  it('advance 推進到期後 stopped 轉假', () => {
    const h = new HitStop()
    h.trigger(0.05)
    h.advance(0.03)
    expect(h.stopped).toBe(true)
    h.advance(0.03)
    expect(h.stopped).toBe(false)
  })
  it('冷卻內第二次 trigger 被忽略', () => {
    const h = new HitStop()
    h.trigger(0.05)
    h.advance(0.06) // 凍結到期，但冷卻(0.35)未到
    expect(h.stopped).toBe(false)
    h.trigger(0.05) // 冷卻內 → 忽略
    expect(h.stopped).toBe(false)
  })
  it('冷卻過後可再次 trigger', () => {
    const h = new HitStop()
    h.trigger(0.05)
    h.advance(0.4) // 超過冷卻 0.35
    h.trigger(0.05)
    expect(h.stopped).toBe(true)
  })
})
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `npx vitest run src/engine/core/hitStop.test.ts`
Expected: FAIL（找不到模組/`HitStop`）。

- [ ] **Step 3: 實作 `src/engine/core/hitStop.ts`**

```ts
/**
 * 頓挫計時器（純邏輯、無 DOM/Pixi 依賴）。
 * trigger 設定凍結時間（受全域冷卻節流），advance 每幀遞減，stopped 查詢是否凍結中。
 */
const COOLDOWN = 0.35

export class HitStop {
  private remaining = 0
  private cooldown = 0

  /** 觸發頓挫凍結 seconds 秒；若冷卻未過則忽略（避免連發卡頓）。 */
  trigger(seconds: number): void {
    if (this.cooldown > 0) return
    this.remaining = Math.max(this.remaining, seconds)
    this.cooldown = COOLDOWN
  }

  /** 推進計時（每幀 dt 秒）。 */
  advance(dt: number): void {
    this.remaining = Math.max(0, this.remaining - dt)
    this.cooldown = Math.max(0, this.cooldown - dt)
  }

  /** 是否處於頓挫凍結中。 */
  get stopped(): boolean {
    return this.remaining > 0
  }
}
```

- [ ] **Step 4: 跑測試確認通過**

Run: `npx vitest run src/engine/core/hitStop.test.ts` → PASS（4 it 全綠）

- [ ] **Step 5: Commit**

```bash
git add src/engine/core/hitStop.ts src/engine/core/hitStop.test.ts
git commit -m "[mvp][feat][engine] HitStop 純邏輯頓挫計時器 + 測試（頓挫震屏 1）

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: EffectsLayer 整合 shake/hitStop/reduced-motion

**Files:**
- Modify: `src/engine/effects.ts`

**Interfaces:**
- Consumes: `HitStop`（Task 1）。
- Produces: `EffectsLayer.shake(intensity)`、`hitStop(seconds)`、`isHitStopped()`。供 Task 3 使用。

- [ ] **Step 1: import HitStop**

在檔頭 import 區（`import type { EnemyKind }` 附近）加：

```ts
import { HitStop } from './core/hitStop'
```

- [ ] **Step 2: 加欄位與 reduced-motion 旗標**

把：

```ts
  private vignetteAlpha = 0
  private shakeIntensity = 0
```

改為：

```ts
  private vignetteAlpha = 0
  private shakeIntensity = 0
  private hitStopTimer = new HitStop()
  // 暈動症友善：啟動時查一次系統偏好，reduced 時關閉震屏與頓挫。
  private readonly reducedMotion =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
```

- [ ] **Step 3: 加 `shake`、改 `hurt`、加 `hitStop`/`isHitStopped`**

把：

```ts
  /** 受傷：拉高紅暈與震動強度（intensity 越大越強，boss 撞擊較大）。 */
  hurt(intensity: number): void {
    this.vignetteAlpha = Math.min(0.55, this.vignetteAlpha + 0.3 + intensity * 0.3)
    this.shakeIntensity = Math.min(12, this.shakeIntensity + 4 + intensity * 8)
  }
```

改為：

```ts
  /** 觸發鏡頭震動（amount 直接加到震動強度，沿用既有上限；reduced-motion 時略過）。 */
  shake(amount: number): void {
    if (this.reducedMotion) return
    this.shakeIntensity = Math.min(12, this.shakeIntensity + amount)
  }

  /** 觸發頓挫凍結（受全域冷卻節流；reduced-motion 時略過）。 */
  hitStop(seconds: number): void {
    if (this.reducedMotion) return
    this.hitStopTimer.trigger(seconds)
  }

  /** 是否處於頓挫凍結（供 Game 迴圈決定是否暫停推進）。 */
  isHitStopped(): boolean {
    return this.hitStopTimer.stopped
  }

  /** 受傷：拉高紅暈與震動強度（intensity 越大越強，boss 撞擊較大）。 */
  hurt(intensity: number): void {
    this.vignetteAlpha = Math.min(0.55, this.vignetteAlpha + 0.3 + intensity * 0.3)
    this.shake(4 + intensity * 8)
  }
```

- [ ] **Step 4: `update()` 推進頓挫計時**

在 `update()` 內（既有震屏衰減 `this.shakeIntensity = Math.max(0, this.shakeIntensity - DT * 60)` 之前）加：

```ts
    this.hitStopTimer.advance(DT)
```

- [ ] **Step 5: 驗證 typecheck + build + 既有測試**

Run: `npm run typecheck` → 乾淨
Run: `npm test` → 既有 + Task 1 HitStop 測試全綠（`hurt` 行為不變、`update` 簽章不變）
Run: `npm run build` → 乾淨

- [ ] **Step 6: Commit**

```bash
git add src/engine/effects.ts
git commit -m "[mvp][feat][art] EffectsLayer 整合 shake/hitStop/reduced-motion（頓挫震屏 2）

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: PixiRenderer 分級觸發 + Game 凍結 + 驗證 + 文件

**Files:**
- Modify: `src/engine/PixiRenderer.ts`
- Modify: `src/engine/Game.ts`
- Modify: `docs/superpowers/specs/hit-stop-shake/acceptance.md`
- Modify: `progress.md`

**Interfaces:**
- Consumes: `EffectsLayer.shake`/`hitStop`/`isHitStopped`（Task 2）。
- Produces: `PixiRenderer.isHitStopped()`（委派 effects）供 `Game` 讀取。

- [ ] **Step 1: `applyHitFlash` Boss 受擊震屏 + 頓挫**

把（敵人 hp 下降分支）：

```ts
      if (e.kind === 'enemy') {
        this.effects.spawnDamage(e.pos.x, e.pos.y, prev - e.hp)
        const col = e.enemyKind ? ENEMY_DEFS[e.enemyKind].color : 0xff5252
        this.effects.spawnHit(e.pos.x, e.pos.y, col)
      } else if (e.kind === 'player') {
```

改為（superbug＝Boss 受擊大震 + 短頓挫；一般敵人受擊不震）：

```ts
      if (e.kind === 'enemy') {
        this.effects.spawnDamage(e.pos.x, e.pos.y, prev - e.hp)
        const col = e.enemyKind ? ENEMY_DEFS[e.enemyKind].color : 0xff5252
        this.effects.spawnHit(e.pos.x, e.pos.y, col)
        if (e.enemyKind === 'superbug') { this.effects.shake(7); this.effects.hitStop(0.05) }
      } else if (e.kind === 'player') {
```

- [ ] **Step 2: 擊殺回收處分級震屏 + 頓挫**

把（敵人消失分支）：

```ts
        if (e.kind === 'enemy') {
          const color = e.enemyKind ? ENEMY_DEFS[e.enemyKind].color : 0xff5252
          this.effects.spawnKill(e.pos.x, e.pos.y, color, e.enemyKind)
        } else if (e.kind === 'gem') {
```

改為：

```ts
        if (e.kind === 'enemy') {
          const color = e.enemyKind ? ENEMY_DEFS[e.enemyKind].color : 0xff5252
          this.effects.spawnKill(e.pos.x, e.pos.y, color, e.enemyKind)
          // 分級震屏/頓挫：superbug(Boss) 最大、exploder 大型死亡、其餘微震
          if (e.enemyKind === 'superbug') { this.effects.shake(10); this.effects.hitStop(0.09) }
          else if (e.enemyKind === 'exploder') { this.effects.shake(6); this.effects.hitStop(0.05) }
          else this.effects.shake(2)
        } else if (e.kind === 'gem') {
```

- [ ] **Step 3: nova fx 中震**

把 `applyFxEvents`：

```ts
      if (ev.kind === 'sweep') this.effects.spawnSweep(ev.x, ev.y, ev.angle, ev.radius, ev.halfAngle)
      else if (ev.kind === 'chain') this.effects.spawnChain(ev.points)
      else this.effects.spawnNova(ev.x, ev.y, ev.radius)
```

改為（nova 爆發中震）：

```ts
      if (ev.kind === 'sweep') this.effects.spawnSweep(ev.x, ev.y, ev.angle, ev.radius, ev.halfAngle)
      else if (ev.kind === 'chain') this.effects.spawnChain(ev.points)
      else { this.effects.spawnNova(ev.x, ev.y, ev.radius); this.effects.shake(4) }
```

- [ ] **Step 4: `PixiRenderer` 加 `isHitStopped` 委派**

在 `applyFxEvents` 方法附近加：

```ts
  /** 是否處於頓挫凍結（供 Game 迴圈決定是否暫停推進）。 */
  isHitStopped(): boolean {
    return this.effects.isHitStopped()
  }
```

- [ ] **Step 5: `Game` 迴圈頓挫時不推進**

把（`loop` 內）：

```ts
    if (!this.paused) {
      const tdir = this.touch.direction()
```

改為（頓挫凍結時亦不推進，但下方 render 仍會跑使頓挫計時前進）：

```ts
    if (!this.paused && !this.renderer.isHitStopped()) {
      const tdir = this.touch.direction()
```

- [ ] **Step 6: 驗證 typecheck + 測試 + build + 瀏覽器**

Run: `npm run typecheck` → 乾淨
Run: `npm test` → 193 + Task 1 HitStop 測試全綠（World/模擬零影響）
Run: `npm run build` → 乾淨
瀏覽器：（a）打 Boss——受擊大震 + 短頓挫、死亡最大震 + 稍長頓挫、Boss 高頻受擊**不連抖**（冷卻生效）；
（b）自爆體/超級死亡頓挫；（c）一般小怪大量擊殺只微震、不卡頓掉幀；（d）玩家受傷紅暈+震屏不變；
（e）DevTools 模擬 `prefers-reduced-motion: reduce` → 不震不頓。微調震屏量/頓挫秒數/冷卻。

- [ ] **Step 7: 更新 acceptance.md 與 progress.md**

- acceptance.md：勾選所有項目、填驗證日期。
- progress.md：階段 4 美術處補一行「打擊頓挫 + 震屏：震屏分級(擊殺/Boss/nova) + hit-stop 頓挫(Boss/大型死亡，冷卻節流，reduced-motion 關閉) → specs/hit-stop-shake/」。

- [ ] **Step 8: Commit**

```bash
git add src/engine/PixiRenderer.ts src/engine/Game.ts docs/superpowers/specs/hit-stop-shake/acceptance.md progress.md
git commit -m "[mvp][feat][art] 分級震屏觸發 + Game 頓挫凍結（頓挫震屏完成）

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-Review（plan 對 spec 的覆蓋檢查）

- **FR-1 shake 抽出**：Task 2 Step 3（`shake()` + `hurt` 改呼叫、行為不變）。✅
- **FR-2 hitStop + 冷卻**：Task 1 `HitStop`（冷卻於 helper）+ Task 2 `hitStop()`/`isHitStopped()`/update advance。✅
- **FR-3 Game 凍結**：Task 3 Step 5（`!isHitStopped()` gating）+ Step 4 委派；render 在區塊外仍跑。✅
- **FR-4 震屏分級**：Task 3 Step 1/2/3（Boss 受擊/各死亡/nova）。✅
- **FR-5 頓挫觸發**：Task 3 Step 1/2（superbug 受擊、superbug/exploder 死亡）。✅
- **FR-6 reduced-motion**：Task 2 Step 2/3（旗標 + shake/hitStop no-op）。✅
- **邊界**：冷卻節流（Task 1 測試 + Step 6 驗）、上限夾擠（既有）、確定性（gating 同 pause）、reduced-motion。✅
- **不變項**：World/模擬未動；用 enemyKind 分級（Boss=superbug）；`hurt`/`update` 不變；Task 3 Step 6 驗 193+新測試。✅
- **Placeholder 掃描**：無 TBD；完整程式碼/指令；數值為起始值（inline 微調）。✅
- **型別/命名一致**：`HitStop`/`shake`/`hitStop`/`isHitStopped` 跨 Task 一致。✅
