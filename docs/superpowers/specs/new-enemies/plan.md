# 新增三種敵人 — 實作計畫

> **For agentic workers:** 用 superpowers:subagent-driven-development 或 executing-plans 逐 task 實作。步驟用 `- [ ]` 追蹤。
> AI/生怪/死亡鉤走 **TDD**；造型/renderer 屬呈現層膠水不寫單元測試、實機驗證。既有 131 測試須維持全綠。每個 task 一個邏輯變更、各自 commit。

**Goal:** 新增噴吐病原（遠程吐彈）、分裂菌（死亡分裂）、膿疱自爆體（死亡爆炸）三種敵人，含敵方投射物子系統與資料驅動死亡鉤。

**Architecture:** 敵人定義走 `ENEMY_DEFS`（含新選用欄位 spit/splitInto/explode）；噴吐 AI 為 `enemyAI` 純函式；敵彈複用 `projectile` kind（`projShape:'toxin'`）存於 `World.enemyProjectiles`（與玩家彈分離），每格飛行並與玩家碰撞扣血；分裂/爆炸於 `World.killEnemy` 資料驅動處理。

**Tech Stack:** TypeScript、Vitest、PixiJS v8。

## Global Constraints（每個 task 隱含適用）

- 既有五種敵人（virus/bacteria/spore/spiral/superbug）數值/行為/平衡**完全不變**；不改武器/玩家彈/升級/store/地圖。
- 確定性：AI/生怪/分裂偏移/spitter 開火皆固定或走 seeded rng；模擬內**不得 `Math.random()`**。
- 玩家受傷一律 `player.hp -= Math.max(0, dmg - this.stats.armor)`（敵彈與爆炸為即時扣血，非 ×dt）。
- 敵彈與玩家彈分離：`enemyProjectiles` 獨立陣列，不與敵人碰撞、不被武器影響。
- 子體不再分裂（splitInto 子體為一般該 kind，無 splitInto 欄位）。
- 驗證：受影響單元測試 + `npm run typecheck` + `npm run build` 乾淨；既有 131 測試維持全綠。
- commit 格式 `[mvp][type][scope] 描述`，含 `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`。

---

## 檔案結構（建立/修改一覽）

| 檔案 | 責任 | 動作 |
|------|------|------|
| `src/engine/types.ts` | `EnemyKind`+3、`EnemyDef`+3 選用欄位、`projShape`+'toxin' | 修改 |
| `src/engine/systems/enemyDefs.ts` | `ENEMY_DEFS`+3、`ENEMY_ORDER` | 修改 |
| `src/engine/systems/spawn.test.ts` | 視需要同步斷言 | 修改 |
| `src/engine/entities/factory.ts` | `createProjectile` 接受 'toxin' + `createEnemyProjectile` | 修改 |
| `src/engine/entities/factory.test.ts` | createEnemyProjectile 測試 | 修改 |
| `src/engine/systems/enemyAI.ts` | `steerSpitter` + `spitterTick` + dispatch | 修改 |
| `src/engine/systems/enemyAI.test.ts` | 噴吐 AI 測試 | 修改 |
| `src/engine/World.ts` | enemyProjectiles + spitter 開火 + 敵彈 flight/碰撞 + killEnemy 死亡鉤 | 修改 |
| `src/engine/World.test.ts` | 分裂/爆炸/敵彈命中測試 | 修改 |
| `src/engine/sprites.ts` | drawEnemy 3 case + drawProjectile toxin | 修改 |
| `src/engine/PixiRenderer.ts` | render 納入 enemyProjectiles | 修改 |
| `progress.md`、`acceptance.md` | 進度與驗收 | 修改 |

---

## Task 1：敵人定義 + 型別

**Files:** `types.ts`、`enemyDefs.ts`（+ 視需要 `spawn.test.ts`）

- [ ] **Step 1：types.ts 擴充**

`EnemyKind`：
```ts
export type EnemyKind = 'virus' | 'bacteria' | 'spore' | 'spiral' | 'superbug'
  | 'spitter' | 'splitter' | 'exploder'
```
`Entity.projShape`（找到既有 `projShape?: 'antibody' | 'perforin'`）改為：
```ts
  projShape?: 'antibody' | 'perforin' | 'toxin'
```
`EnemyDef` 介面（在 `dashTime?` 之後）新增：
```ts
  /** 噴吐病原：開火間隔(秒)/彈速/彈傷/偏好距離。 */
  spit?: { interval: number; projSpeed: number; projDamage: number; range: number }
  /** 死亡分裂：在死亡位置生 count 隻 kind 子體。 */
  splitInto?: { kind: EnemyKind; count: number }
  /** 死亡爆炸：玩家在 radius 內扣 damage。 */
  explode?: { radius: number; damage: number }
```

- [ ] **Step 2：enemyDefs.ts 三筆 + ORDER**

`ENEMY_ORDER`：
```ts
export const ENEMY_ORDER: EnemyKind[] = ['virus', 'bacteria', 'spore', 'spiral', 'superbug',
  'spitter', 'splitter', 'exploder']
```
在 `ENEMY_DEFS` 內（superbug 之後）新增：
```ts
  spitter: {
    kind: 'spitter', hp: 22, speed: 50, damage: 4, radius: 13, xp: 4, color: 0xc0ca33,
    unlockTime: 60, spawnWeight: 10, spit: { interval: 2.2, projSpeed: 180, projDamage: 8, range: 220 },
  },
  splitter: {
    kind: 'splitter', hp: 30, speed: 55, damage: 8, radius: 16, xp: 4, color: 0x26a69a,
    unlockTime: 75, spawnWeight: 9, splitInto: { kind: 'bacteria', count: 2 },
  },
  exploder: {
    kind: 'exploder', hp: 16, speed: 95, damage: 6, radius: 14, xp: 3, color: 0xfdd835,
    unlockTime: 50, spawnWeight: 12, explode: { radius: 90, damage: 18 },
  },
```

- [ ] **Step 3：型別 + 生怪測試**

Run: `npm run typecheck`
Run: `npx vitest run src/engine/systems/spawn.test.ts`
Expected: 乾淨、全綠。**若**有測試斷言「某時間點可生成的敵種集合」而因新增三種失敗，依新增敵種與其 unlockTime 同步更新（行為不變、僅資料變多）；若沒失敗就不要動測試。

- [ ] **Step 4：commit**
```bash
git add src/engine/types.ts src/engine/systems/enemyDefs.ts src/engine/systems/spawn.test.ts
git commit -m "$(cat <<'EOF'
[mvp][feat][content] 新增三種敵人定義（噴吐病原/分裂菌/膿疱自爆體）+ EnemyDef 死亡鉤欄位 + toxin projShape

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2：敵彈 factory + 噴吐 AI 純函式（TDD）

**Files:** `entities/factory.ts`、`entities/factory.test.ts`、`systems/enemyAI.ts`、`systems/enemyAI.test.ts`

**Interfaces:**
- Produces：`createEnemyProjectile(pos,dir,speed,damage)`、`steerSpitter(e,target)`、`spitterTick(e,dt,interval)`。

- [ ] **Step 1：寫失敗測試**

`factory.test.ts` 追加（import 補 `createEnemyProjectile`）：
```ts
  it('createEnemyProjectile 為 toxin 投射物、帶傷害', () => {
    const p = createEnemyProjectile({ x: 0, y: 0 }, { x: 1, y: 0 }, 180, 8)
    expect(p.kind).toBe('projectile')
    expect(p.projShape).toBe('toxin')
    expect(p.damage).toBe(8)
    expect(p.vel.x).toBeCloseTo(180, 5)
  })
```
`enemyAI.test.ts` 追加（import 補 `steerSpitter, spitterTick`、`ENEMY_DEFS`、`createEnemy`）：
```ts
  it('steerSpitter 太遠靠近、太近後退、區間停步', () => {
    const range = ENEMY_DEFS.spitter.spit!.range
    const e1 = createEnemy({ x: 0, y: 0 }, 'spitter'); steerSpitter(e1, { x: range + 100, y: 0 })
    expect(e1.vel.x).toBeGreaterThan(0) // 太遠 → 朝 +x 靠近
    const e2 = createEnemy({ x: 0, y: 0 }, 'spitter'); steerSpitter(e2, { x: range - 100, y: 0 })
    expect(e2.vel.x).toBeLessThan(0)    // 太近 → 朝 -x 後退
    const e3 = createEnemy({ x: 0, y: 0 }, 'spitter'); steerSpitter(e3, { x: range, y: 0 })
    expect(e3.vel).toEqual({ x: 0, y: 0 }) // 區間內停步
  })

  it('spitterTick 達 interval 開火並扣回', () => {
    const e = createEnemy({ x: 0, y: 0 }, 'spitter'); e.behaviorTimer = 0
    expect(spitterTick(e, 1, 2.2)).toBe(false)
    expect(spitterTick(e, 1.5, 2.2)).toBe(true) // 累計 2.5 ≥ 2.2
    expect(e.behaviorTimer).toBeCloseTo(0.3, 5)
  })
```

- [ ] **Step 2：跑測試確認失敗**

Run: `npx vitest run src/engine/entities/factory.test.ts src/engine/systems/enemyAI.test.ts`
Expected: FAIL（函式未定義）。

- [ ] **Step 3：實作 factory**

`factory.ts`：把 `createProjectile` 的 shape 參數型別由 `'antibody' | 'perforin'` 放寬為 `'antibody' | 'perforin' | 'toxin'`（預設仍 `'antibody'`）。檔尾新增：
```ts
/** 建立敵方投射物（毒液彈）：複用 projectile，projShape 'toxin'，命中玩家扣血。 */
export function createEnemyProjectile(pos: Vec2, dir: Vec2, speed: number, damage: number): Entity {
  return createProjectile(pos, dir, speed, damage, 'toxin')
}
```

- [ ] **Step 4：實作 AI**

`enemyAI.ts`：頂部 import 補 `distance` 不需要（用 Math.hypot）。新增常數與函式、並在 `steerEnemy` 加 dispatch：
```ts
/** 噴吐病原維持距離的容差（±margin 內視為到位、停步）。 */
const SPITTER_MARGIN = 40

/** 噴吐病原：維持偏好距離——太遠靠近、太近後退、區間停步。 */
export function steerSpitter(e: Entity, target: Vec2): void {
  const def = ENEMY_DEFS.spitter
  const range = def.spit!.range
  const dx = target.x - e.pos.x, dy = target.y - e.pos.y
  const d = Math.hypot(dx, dy)
  if (d === 0) { e.vel = { x: 0, y: 0 }; return }
  if (d > range + SPITTER_MARGIN) e.vel = scale(normalize(sub(target, e.pos)), def.speed)
  else if (d < range - SPITTER_MARGIN) e.vel = scale(normalize(sub(e.pos, target)), def.speed)
  else e.vel = { x: 0, y: 0 }
}

/** 噴吐開火節流：以 behaviorTimer 累計，達 interval 回 true 並扣回。 */
export function spitterTick(e: Entity, dt: number, interval: number): boolean {
  e.behaviorTimer = (e.behaviorTimer ?? 0) + dt
  if (e.behaviorTimer >= interval) { e.behaviorTimer -= interval; return true }
  return false
}
```
在 `steerEnemy` 內（`spiral` 分支之後）新增：
```ts
  if (e.enemyKind === 'spitter') { steerSpitter(e, target); return }
```

- [ ] **Step 5：跑測試確認通過**

Run: `npx vitest run src/engine/entities/factory.test.ts src/engine/systems/enemyAI.test.ts`
Expected: PASS。

- [ ] **Step 6：commit**
```bash
git add src/engine/entities/factory.ts src/engine/entities/factory.test.ts src/engine/systems/enemyAI.ts src/engine/systems/enemyAI.test.ts
git commit -m "$(cat <<'EOF'
[mvp][feat][engine] 敵彈 factory + 噴吐病原 AI（steerSpitter/spitterTick）+ 單元測試（TDD）

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3：World 接線（敵彈子系統 + 死亡鉤）

**Files:** Modify `src/engine/World.ts`、`src/engine/World.test.ts`

**Interfaces:**
- Consumes：Task 2 `createEnemyProjectile`/`spitterTick`、Task 1 defs。
- Produces：`World.enemyProjectiles: Entity[]`。

- [ ] **Step 1：import + 欄位**

`World.ts`：weapons/factory import 區補上：
```ts
import { createPlayer, createEnemy, createGem, createOrbit, createChest, createEnemyProjectile } from './entities/factory'
import { steerEnemy } from './systems/enemyAI' // 既有；改為：
import { steerEnemy, spitterTick } from './systems/enemyAI'
```
在 `projectiles` 欄位附近新增：
```ts
  /** 場上所有敵方投射物（毒液彈）；與玩家 projectiles 分離。 */
  enemyProjectiles: Entity[] = []
```

- [ ] **Step 2：spitter 開火（敵人 AI 迴圈內）**

把既有「3) 敵人 AI」迴圈：
```ts
    for (const e of this.enemies) {
      if (!e.active) continue
      steerEnemy(e, this.player.pos, dt)
      applyVelocity(e, dt)
    }
```
替換為：
```ts
    for (const e of this.enemies) {
      if (!e.active) continue
      steerEnemy(e, this.player.pos, dt)
      applyVelocity(e, dt)
      // 噴吐病原：固定間隔朝玩家當前位置吐一發毒液彈。
      if (e.enemyKind === 'spitter') {
        const spit = ENEMY_DEFS.spitter.spit!
        if (spitterTick(e, dt, spit.interval)) {
          const dx = this.player.pos.x - e.pos.x, dy = this.player.pos.y - e.pos.y
          const len = Math.hypot(dx, dy) || 1
          this.enemyProjectiles.push(
            createEnemyProjectile(e.pos, { x: dx / len, y: dy / len }, spit.projSpeed, spit.projDamage),
          )
          this.soundEventQueue.push('shoot')
        }
      }
    }
```

- [ ] **Step 3：敵彈飛行與命中玩家（新增 5b 段）**

在「5) 子彈飛行」玩家投射物迴圈結束（`}` 之後、「6) 寶石」之前）新增：
```ts
    // 5b) 敵方投射物：飛行 + 壽命；與玩家重疊即扣血（套護甲）後消耗。
    for (const p of this.enemyProjectiles) {
      if (!p.active) continue
      applyVelocity(p, dt)
      p.life -= dt
      if (p.life <= 0) { p.active = false; continue }
      if (circlesOverlap(p, this.player)) {
        this.player.hp -= Math.max(0, p.damage - this.stats.armor)
        this.soundEventQueue.push('hurt')
        p.active = false
      }
    }
```

- [ ] **Step 4：清理段加 enemyProjectiles**

把「8) 清理」段：
```ts
    this.enemies = this.enemies.filter((e) => e.active)
    this.projectiles = this.projectiles.filter((p) => p.active)
```
之後補一行：
```ts
    this.enemyProjectiles = this.enemyProjectiles.filter((p) => p.active)
```

- [ ] **Step 5：killEnemy 死亡鉤（分裂 / 爆炸）**

把 `killEnemy`：
```ts
  private killEnemy(e: Entity): void {
    e.active = false
    this.kills += 1
    this.gemEntities.push(createGem(e.pos, e.xp))
    if (e.enemyKind === 'superbug') this.chestEntities.push(createChest(e.pos))
    this.soundEventQueue.push('kill')
  }
```
替換為：
```ts
  private killEnemy(e: Entity): void {
    e.active = false
    this.kills += 1
    this.gemEntities.push(createGem(e.pos, e.xp))
    if (e.enemyKind === 'superbug') this.chestEntities.push(createChest(e.pos))
    this.soundEventQueue.push('kill')
    const def = e.enemyKind ? ENEMY_DEFS[e.enemyKind] : undefined
    // 死亡分裂：在原地生 count 隻子體（小角度錯位，確定性）。
    if (def?.splitInto) {
      const { kind, count } = def.splitInto
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2
        this.spawnEnemyAt({ x: e.pos.x + Math.cos(a) * 14, y: e.pos.y + Math.sin(a) * 14 }, kind)
      }
    }
    // 死亡爆炸：玩家在半徑內扣血（套護甲）+ 推爆裂視覺與音效。
    if (def?.explode) {
      const { radius, damage } = def.explode
      if (distance(e.pos, this.player.pos) <= radius) {
        this.player.hp -= Math.max(0, damage - this.stats.armor)
        this.soundEventQueue.push('hit')
      }
      this.fxEventQueue.push({ kind: 'nova', x: e.pos.x, y: e.pos.y, radius })
    }
  }
```
（`spawnEnemyAt`/`distance`/`fxEventQueue`/`ENEMY_DEFS` 皆既有。）

- [ ] **Step 6：World.test 追加測試**

```ts
  it('分裂菌死亡生成 2 隻細菌', () => {
    const w = new World(1)
    const s = w.spawnEnemyAt({ x: 100, y: 0 }, 'splitter')
    const before = w.activeEnemies().filter((e) => e.enemyKind === 'bacteria').length
    s.hp = 0
    w.step(1 / 60) // checkKills → 分裂
    const after = w.activeEnemies().filter((e) => e.enemyKind === 'bacteria').length
    expect(after - before).toBe(2)
  })

  it('膿疱自爆體死亡時玩家在半徑內扣血、半徑外不扣', () => {
    const near = new World(1)
    near.player.hp = 100
    const e1 = near.spawnEnemyAt({ x: 30, y: 0 }, 'exploder'); e1.hp = 0
    near.step(1 / 60)
    expect(near.player.hp).toBeLessThan(100)

    const far = new World(1)
    far.player.hp = 100
    const e2 = far.spawnEnemyAt({ x: 500, y: 0 }, 'exploder'); e2.hp = 0
    far.step(1 / 60)
    expect(far.player.hp).toBe(100)
  })

  it('敵方毒液彈命中玩家扣血後消失', () => {
    const w = new World(1)
    w.player.hp = 100
    w.enemyProjectiles.push(createEnemyProjectile(w.player.pos, { x: 1, y: 0 }, 0, 8))
    w.step(1 / 60) // 速度 0 → 與玩家重疊
    expect(w.player.hp).toBeLessThan(100)
    expect(w.enemyProjectiles.length).toBe(0) // 命中後消耗並清理
  })
```
（World.test 頂部 import 補 `createEnemyProjectile`。）

- [ ] **Step 7：型別 + 測試**

Run: `npm run typecheck`
Run: `npx vitest run src/engine/World.test.ts`
Expected: 乾淨、全綠。

- [ ] **Step 8：commit**
```bash
git add src/engine/World.ts src/engine/World.test.ts
git commit -m "$(cat <<'EOF'
[mvp][feat][engine] World 接敵彈子系統 + spitter 開火 + 分裂/爆炸死亡鉤

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4：造型 + renderer

**Files:** Modify `src/engine/sprites.ts`、`src/engine/PixiRenderer.ts`

> 呈現層：不寫單元測試，實機驗證。

- [ ] **Step 1：drawEnemy 三新 case（sprites.ts）**

在 `drawEnemy` 的 `switch (e.enemyKind)` 內新增三 case（沿用 `shaded`/`dim`/`lighten`/`groundShadow`，色取 `ENEMY_DEFS[kind].color`）：
```ts
    case 'spitter': {
      // 噴吐病原：囊狀體 + 朝 +x 噴口短管 + 毒斑
      shaded(g, 0, 0, r, color)
      g.roundRect(r * 0.6, -r * 0.28, r * 0.7, r * 0.56, 3).fill(dim(color, 0.5)) // 噴口
      g.circle(r * 1.15, 0, r * 0.18).fill(dim(color, 0.3))
      for (const [px, py] of [[-r * 0.3, -r * 0.2], [r * 0.1, r * 0.3], [-r * 0.1, r * 0.05]] as const) {
        g.circle(px, py, r * 0.12).fill(dim(color, 0.35))
      }
      break
    }
    case 'splitter': {
      // 分裂菌：分裂中雙葉（兩交疊圓 + 中央縊縮）
      shaded(g, -r * 0.45, 0, r * 0.7, color)
      shaded(g, r * 0.45, 0, r * 0.7, color)
      g.ellipse(0, 0, r * 0.18, r * 0.62).fill(dim(color, 0.4)) // 中央縊縮
      g.circle(-r * 0.45, -r * 0.15, r * 0.16).fill(lighten(color, 0.3))
      g.circle(r * 0.45, -r * 0.15, r * 0.16).fill(lighten(color, 0.3))
      break
    }
    case 'exploder': {
      // 膿疱自爆體：鼓脹膿包 + 外凸瘤 + 緊繃描邊
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2
        g.circle(Math.cos(a) * r * 0.85, Math.sin(a) * r * 0.85, r * 0.32).fill(dim(color, 0.7))
      }
      shaded(g, 0, 0, r, color)
      g.circle(0, 0, r).stroke({ width: 2, color: lighten(color, 0.3) })
      g.circle(-r * 0.2, -r * 0.2, r * 0.22).fill({ color: lighten(color, 0.6), alpha: 0.7 })
      break
    }
```

- [ ] **Step 2：drawProjectile toxin 分支（sprites.ts）**

在 `drawProjectile` 的 `if (e.projShape === 'perforin') { … } else { … }` 之前插入毒液彈分支：
```ts
  if (e.projShape === 'toxin') {
    // 敵方毒液彈：毒綠小球 + 淡綠暈
    g.circle(0, 0, r * 1.8).fill({ color: 0xc0ca33, alpha: 0.22 })
    g.circle(0, 0, r).fill(0xd4e157)
    g.circle(0, 0, r * 0.5).fill(0xf0f4c3)
    return
  }
```

- [ ] **Step 3：renderer 納入 enemyProjectiles（PixiRenderer.ts）**

把 `render()` 內 `all` 陣列：
```ts
    const all: Entity[] = [
      ...world.gems(),
      ...world.activeEnemies(),
      ...world.projectiles.filter((p) => p.active),
      ...world.orbits(),
      ...world.chests(),
      world.player,
    ]
```
改為（加入敵彈）：
```ts
    const all: Entity[] = [
      ...world.gems(),
      ...world.activeEnemies(),
      ...world.projectiles.filter((p) => p.active),
      ...world.enemyProjectiles.filter((p) => p.active),
      ...world.orbits(),
      ...world.chests(),
      world.player,
    ]
```

- [ ] **Step 4：型別 + build + 實機驗證**

Run: `npm run typecheck && npm run build`（乾淨）。
`npm run dev`：時間到後出現噴吐病原（吐毒綠彈）、分裂菌（死亡裂 2 隻）、膿疱自爆體（死亡爆裂環）；造型可辨；0 console error。

- [ ] **Step 5：commit**
```bash
git add src/engine/sprites.ts src/engine/PixiRenderer.ts
git commit -m "$(cat <<'EOF'
[mvp][feat][art] 三敵造型（噴吐囊體/分裂雙葉/膿疱）+ 毒液彈 toxin 造型 + renderer 接敵彈

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5：驗證與進度更新

**Files:** Modify `progress.md`、`docs/superpowers/specs/new-enemies/acceptance.md`

- [ ] **Step 1：完整測試 + 型別 + build**

Run: `npm test && npm run typecheck && npm run build`
Expected: 既有 131 + 新增測試全綠、型別乾淨、build 乾淨。

- [ ] **Step 2：模擬無 Math.random 確認**

Run: `grep -n "Math.random" src/engine/systems/enemyAI.ts src/engine/systems/spawn.ts src/engine/World.ts`
Expected: 0（敵彈/AI/死亡鉤皆固定或走 seeded rng）。

- [ ] **Step 3：實機完整驗證**

`npm run dev`：三敵種依時間解鎖登場、機制如設計（吐彈/分裂 2 隻/範圍爆炸）、敵彈命中玩家扣血、造型可辨、收集/升級不受影響；FPS 正常、0 功能相關 console error。

- [ ] **Step 4：更新 acceptance.md 勾選 + progress.md**

依結果勾選 `acceptance.md` 填驗證日期；`progress.md` 階段 2 內容補一條「新增三種敵人（噴吐/分裂/自爆）+ 敵方投射物子系統」與更新測試數。

- [ ] **Step 5：commit**
```bash
git add progress.md docs/superpowers/specs/new-enemies/acceptance.md
git commit -m "$(cat <<'EOF'
[mvp][docs][meta] 新增三種敵人驗證通過，更新 progress 與 acceptance

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## 自我檢查（Self-Review）結果

- **Spec 覆蓋：** FR-1 定義（T1）、FR-2 敵彈子系統（factory T2 + World flight T3 + renderer T4）、FR-3 噴吐 AI（T2 函式 + T3 開火）、FR-4 死亡鉤（T3）、FR-5 造型（T4）、FR-6 不變項（既有測試全綠 T5）皆有對應。
- **無 placeholder：** 各 task 含完整型別/資料/函式/測試碼與插入點、指令、預期輸出。
- **型別一致：** `createEnemyProjectile`/`steerSpitter`/`spitterTick`/`enemyProjectiles`/`spit`/`splitInto`/`explode`/`projShape:'toxin'` 跨 task 一致。
- **確定性：** AI/開火固定計時、分裂偏移固定角度；模擬無 `Math.random()`（T5 Step2 grep 確認）。
- **相容：** 既有五敵種與數值不動；敵彈與玩家彈分離；既有 131 測試全綠。
