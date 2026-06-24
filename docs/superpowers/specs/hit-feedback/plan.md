# 打擊反饋特效強化（hit-feedback / B3）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans（建議 inline，含瀏覽器打怪看特效微調）或 superpowers:subagent-driven-development。Steps use checkbox (`- [ ]`) syntax.
>
> **執行建議：Inline**——特效需瀏覽器實機打怪看效果邊調粒子數/速度/壽命（數值僅起始值）。

**Goal:** 命中噴火花+主題色濺紅；敵人死亡依病原種類差異化（細菌體液/病毒碎殼/孢子爆孢/自爆大爆/超級加大）。

**Architecture:** `EffectsLayer`（effects.ts）加 `spawnHit` + 粒子 helper、`spawnKill` 依 `enemyKind` 分支；PixiRenderer 在命中/死亡事件偵測處接線。純呈現層、不碰引擎/模擬。

**Tech Stack:** PixiJS v8 `Graphics` 粒子、TypeScript。

## Global Constraints

- 繁體中文註解；型別/程式名稱英文。
- 純呈現層：只動 `src/engine/effects.ts` + `src/engine/PixiRenderer.ts`；不碰 World/模擬/store/sprites.ts/確定性。
- 粒子數克制、靠既有 `MAX_PARTICLES=200` 上限保護；effects 既有用 `Math.random`（呈現層）。
- 既有 181 測試維持全綠；數值為起始值，inline 以瀏覽器微調。
- Commit 格式：`[mvp][type][scope] 描述` + `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`。

---

### Task 1: 命中火花/濺紅（spawnHit + 接線）

**Files:**
- Modify: `src/engine/effects.ts`
- Modify: `src/engine/PixiRenderer.ts`

- [ ] **Step 1: effects.ts 加粒子 helper `addDot`（放在 `addExpand` 之前或之後）**

```ts
  /** 內部：新增一顆圓點粒子（走既有粒子系統；達上限略過）。 */
  private addDot(
    x: number, y: number, vx: number, vy: number, gravity: number, life: number, color: number, r: number,
  ): void {
    if (this.particles.length >= MAX_PARTICLES) return
    const g = new Graphics()
    g.circle(0, 0, r).fill(color)
    g.position.set(x, y)
    this.worldFx.addChild(g)
    this.particles.push({ g, vx, vy, gravity, life, maxLife: life })
  }
```

- [ ] **Step 2: effects.ts 加 `spawnHit`（放在 `spawnDamage` 附近）**

```ts
  /** 命中：撞擊點噴亮火花（快、短壽）+ 主題色體液滴（輕重力）。 */
  spawnHit(x: number, y: number, color: number): void {
    for (let i = 0; i < 3; i++) {
      const a = Math.random() * TAU, spd = 90 + Math.random() * 140
      this.addDot(x, y, Math.cos(a) * spd, Math.sin(a) * spd, 40, 0.18, i === 0 ? 0xffffff : 0xfff3c4, 1 + Math.random() * 1.4)
    }
    for (let i = 0; i < 2; i++) {
      const a = Math.random() * TAU, spd = 50 + Math.random() * 80
      this.addDot(x, y, Math.cos(a) * spd, Math.sin(a) * spd, 180, 0.3, color, 1.4 + Math.random() * 1.6)
    }
  }
```

- [ ] **Step 3: PixiRenderer.applyHitFlash 接線（敵人 hp 下降加噴火花）**

把：

```ts
    if (prev !== undefined && e.hp < prev) {
      s.flash.alpha = 0.8
      if (e.kind === 'enemy') this.effects.spawnDamage(e.pos.x, e.pos.y, prev - e.hp)
      else if (e.kind === 'player') this.effects.hurt(Math.min(1, (prev - e.hp) / 15))
    } else {
```

改為（敵人加 spawnHit）：

```ts
    if (prev !== undefined && e.hp < prev) {
      s.flash.alpha = 0.8
      if (e.kind === 'enemy') {
        this.effects.spawnDamage(e.pos.x, e.pos.y, prev - e.hp)
        const col = e.enemyKind ? ENEMY_DEFS[e.enemyKind].color : 0xff5252
        this.effects.spawnHit(e.pos.x, e.pos.y, col)
      } else if (e.kind === 'player') {
        this.effects.hurt(Math.min(1, (prev - e.hp) / 15))
      }
    } else {
```

（`ENEMY_DEFS` 已於 PixiRenderer import；確認存在，否則補 `import { ENEMY_DEFS } from './systems/enemyDefs'`。）

- [ ] **Step 4: typecheck + build + 瀏覽器驗證命中**

Run: `npm run typecheck` → 乾淨
Run: `npm run build` → 乾淨
啟動 dev 打怪，確認命中有亮火花 + 主題色濺紅、與 bloom 呼應、傷害數字仍在、高頻不爆量。微調粒子數/速度/壽命。

- [ ] **Step 5: Commit**

```bash
git add src/engine/effects.ts src/engine/PixiRenderer.ts
git commit -m "[mvp][feat][art] 命中火花 + 主題色體液濺紅（spawnHit + 接線）（B3-1）

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: 逐病原死亡特效（spawnKill 依 kind）+ 驗證 + 進度

**Files:**
- Modify: `src/engine/effects.ts`
- Modify: `src/engine/PixiRenderer.ts`
- Modify: `progress.md`
- Modify: `docs/superpowers/specs/hit-feedback/acceptance.md`

- [ ] **Step 1: effects.ts 加碎片 helper `addShard` + 型別 import**

檔頭 import 加：

```ts
import type { EnemyKind } from './types'
```

加 helper（`addDot` 之後）：

```ts
  /** 內部：新增一片小三角碎片粒子（隨機初始旋轉）。 */
  private addShard(
    x: number, y: number, vx: number, vy: number, gravity: number, life: number, color: number, size: number,
  ): void {
    if (this.particles.length >= MAX_PARTICLES) return
    const g = new Graphics()
    g.poly([0, -size, size * 0.8, size * 0.6, -size * 0.8, size * 0.6]).fill(color)
    g.rotation = Math.random() * TAU
    g.position.set(x, y)
    this.worldFx.addChild(g)
    this.particles.push({ g, vx, vy, gravity, life, maxLife: life })
  }
```

- [ ] **Step 2: effects.ts 改寫 `spawnKill` 依 kind 差異化**

把整個 `spawnKill` 改為：

```ts
  /** 擊殺：環波 + 依病原種類差異化死亡碎屑/濺射（達粒子上限時自動略過）。 */
  spawnKill(x: number, y: number, color: number, kind?: EnemyKind): void {
    const big = kind === 'superbug' || kind === 'exploder'
    this.addExpand(x, y, color, big ? 10 : 6, big ? 72 : 40, big ? 4 : 3, big ? 0.45 : 0.35)
    switch (kind) {
      case 'bacteria': // 體液大濺射
        for (let i = 0; i < 12; i++) {
          const a = Math.random() * TAU, spd = 50 + Math.random() * 120
          this.addDot(x, y, Math.cos(a) * spd, Math.sin(a) * spd, 140, 0.42, color, 1.5 + Math.random() * 2.2)
        }
        break
      case 'virus': // 外殼碎裂（碎片）
        for (let i = 0; i < 8; i++) {
          const a = Math.random() * TAU, spd = 70 + Math.random() * 150
          this.addShard(x, y, Math.cos(a) * spd, Math.sin(a) * spd, 160, 0.45, color, 2.5 + Math.random() * 2)
        }
        break
      case 'spore': // 爆孢（一圈放射小點）
        for (let i = 0; i < 14; i++) {
          const a = (i / 14) * TAU
          this.addDot(x, y, Math.cos(a) * 95, Math.sin(a) * 95, 40, 0.5, color, 1.6)
        }
        break
      case 'exploder': // 大爆裂碎屑（死亡另觸發 nova fx）
        for (let i = 0; i < 16; i++) {
          const a = Math.random() * TAU, spd = 100 + Math.random() * 190
          this.addShard(x, y, Math.cos(a) * spd, Math.sin(a) * spd, 120, 0.5, color, 2 + Math.random() * 2.5)
        }
        break
      case 'superbug': // 加大版
        for (let i = 0; i < 18; i++) {
          const a = Math.random() * TAU, spd = 80 + Math.random() * 170
          this.addDot(x, y, Math.cos(a) * spd, Math.sin(a) * spd, 160, 0.5, color, 2 + Math.random() * 2.5)
        }
        break
      default: // 螺旋/噴吐/分裂/其餘：既有基礎爆裂
        for (let i = 0; i < 9; i++) {
          const a = Math.random() * TAU, spd = 60 + Math.random() * 130
          this.addDot(x, y, Math.cos(a) * spd, Math.sin(a) * spd, 200, 0.4, color, 1.5 + Math.random() * 2)
        }
    }
  }
```

- [ ] **Step 3: PixiRenderer 死亡接線傳入 enemyKind**

把（render 回收迴圈）：

```ts
        if (e.kind === 'enemy') {
          const color = e.enemyKind ? ENEMY_DEFS[e.enemyKind].color : 0xff5252
          this.effects.spawnKill(e.pos.x, e.pos.y, color)
        } else if (e.kind === 'gem') {
```

改為（傳 kind）：

```ts
        if (e.kind === 'enemy') {
          const color = e.enemyKind ? ENEMY_DEFS[e.enemyKind].color : 0xff5252
          this.effects.spawnKill(e.pos.x, e.pos.y, color, e.enemyKind)
        } else if (e.kind === 'gem') {
```

- [ ] **Step 4: typecheck + 測試 + build + 瀏覽器驗證**

Run: `npm run typecheck` → 乾淨
Run: `npm test` → 181 全綠（引擎零影響）
Run: `npm run build` → 乾淨
瀏覽器打各病原，確認死法不同（細菌濺射/病毒碎片/孢子爆孢/自爆大爆/超級加大）、高頻不爆量掉幀、重開無殘留。微調。

- [ ] **Step 5: 更新 acceptance.md 與 progress.md**

勾選 acceptance 各項並填驗證日期；progress.md 階段 4 美術處補一行「打擊反饋強化（B3）：命中火花+主題色濺紅 + 逐病原差異化死亡特效 → specs/hit-feedback/」。

- [ ] **Step 6: Commit**

```bash
git add src/engine/effects.ts src/engine/PixiRenderer.ts progress.md docs/superpowers/specs/hit-feedback/acceptance.md
git commit -m "[mvp][feat][art] 逐病原差異化死亡特效（spawnKill 依 kind）（B3 完成）

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-Review（plan 對 spec 的覆蓋檢查）

- **FR-1 命中火花/濺紅**：Task 1 `spawnHit`（火花 + 體液）+ `addDot`。✅
- **FR-2 接線**：Task 1 applyHitFlash 加 spawnHit（保留傷害數字）。✅
- **FR-3 逐病原死亡**：Task 2 `spawnKill` 依 kind（細菌/病毒/孢子/自爆/超級 + default）+ `addShard`；PixiRenderer 傳 enemyKind。✅
- **FR-4 效能克制**：helper 內 `MAX_PARTICLES` 守門。✅
- **不變項**：只動 effects.ts + PixiRenderer；引擎/模擬零改動；181 測試於 Task 2 Step 4 驗證；destroy 清既有粒子系統含新粒子。✅
- **Placeholder 掃描**：無 TBD；完整程式碼/指令。✅
