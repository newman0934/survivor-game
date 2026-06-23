# 新增三把武器 — 實作計畫

> **For agentic workers:** 用 superpowers:subagent-driven-development 或 executing-plans 逐 task 實作。步驟用 `- [ ]` 追蹤。
> 武器邏輯走 **TDD**（weapons.ts 純函式）；World 接線以 World.test 補測；視覺屬呈現層膠水不寫單元測試、實機驗證。既有 122 測試須維持全綠。每個 task 一個邏輯變更、各自 commit。

**Goal:** 新增吞噬偽足（近戰扇掃）、補體級聯（連鎖彈跳）、抗原脈衝（範圍爆發）三把冷卻觸發即時武器，含視覺事件佇列。

**Architecture:** 三把武器為 `weapons.ts` 純函式（命中判定/連鎖序列），`World.step()` 冷卻觸發後套全域乘區扣血並推一筆 `fxEventQueue` 視覺事件（仿 `soundEventQueue`）；`Game` 每幀排空交 `PixiRenderer`→`EffectsLayer` 繪製。升級/解鎖走既有 `WEAPON_ORDER`，並把 `WEAPON_CAP` 由 4 改 7 解除上限。

**Tech Stack:** TypeScript、Vitest、PixiJS v8。

## Global Constraints（每個 task 隱含適用）

- 既有四把武器（antibody/perforin/complement/inflammation）數值/行為/平衡**完全不變**；不改 store/Summary/被動/敵人/角色/地圖。
- 武器邏輯純函式、確定性：最近選擇以距離排序、平手以陣列順序；**不呼叫 `Math.random()`**。
- 傷害套 `damageMult`、半徑套 `areaMult`、冷卻套 `cooldownMult`（與既有一致）。
- `fxEventQueue` 比照 `soundEventQueue`：純呈現資料、每幀排空、不回饋模擬。
- 常數：扇形半角 `PHAGOCYTE_HALF_ANGLE = 70°`、連鎖遞減 `CASCADE_FALLOFF = 0.75`（定義於 `weapons.ts` 並 export）。
- 驗證：受影響單元測試 + `npm run typecheck` + `npm run build` 乾淨；既有 122 測試維持全綠。
- commit 格式 `[mvp][type][scope] 描述`，含 `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`。

---

## 檔案結構（建立/修改一覽）

| 檔案 | 責任 | 動作 |
|------|------|------|
| `src/engine/types.ts` | `WeaponKind` 增三成員、新增 `FxEvent` | 修改 |
| `src/engine/systems/weaponDefs.ts` | `WEAPON_DEFS` 三筆 + `WEAPON_ORDER` | 修改 |
| `src/engine/systems/leveling.ts` | `WEAPON_CAP` 4→7 | 修改 |
| `src/engine/systems/weapons.ts` | 三純函式 + 常數 | 修改 |
| `src/engine/systems/weapons.test.ts` | 三函式單元測試 | 修改 |
| `src/engine/World.ts` | step 接線 + `fxEventQueue` + `consumeFxEvents` | 修改 |
| `src/engine/World.test.ts` | 三武器接線測試 | 修改 |
| `src/engine/effects.ts` | `spawnSweep`/`spawnChain`/`spawnNova` + flashes 回收 | 修改 |
| `src/engine/PixiRenderer.ts` | `applyFxEvents` | 修改 |
| `src/engine/Game.ts` | 每幀排空 fx 事件 | 修改 |
| `progress.md`、`acceptance.md` | 進度與驗收 | 修改 |

---

## Task 1：型別 + 武器定義 + 解除上限

**Files:** `types.ts`、`weaponDefs.ts`、`leveling.ts`（+ 視需要 `leveling.test.ts`）

**Interfaces:**
- Produces: `WeaponKind` 含 `'phagocyte'|'cascade'|'nova'`；`FxEvent` 型別；`WEAPON_DEFS` 三筆；`WEAPON_CAP=7`。

- [ ] **Step 1：types.ts 擴充 WeaponKind 並新增 FxEvent**

把 `WeaponKind` 改為：
```ts
export type WeaponKind = 'antibody' | 'perforin' | 'complement' | 'inflammation'
  | 'phagocyte' | 'cascade' | 'nova'
```
在 `SoundEvent` 附近新增：
```ts
/** 武器視覺事件（呈現層用；由 World 推、Game 每幀排空交特效層繪製）。 */
export type FxEvent =
  | { kind: 'sweep'; x: number; y: number; angle: number; radius: number; halfAngle: number }
  | { kind: 'chain'; points: { x: number; y: number }[] }
  | { kind: 'nova'; x: number; y: number; radius: number }
```

- [ ] **Step 2：weaponDefs.ts 新增三筆 + 追加 ORDER**

`WEAPON_ORDER` 改為：
```ts
export const WEAPON_ORDER: WeaponKind[] = ['antibody', 'perforin', 'complement', 'inflammation',
  'phagocyte', 'cascade', 'nova']
```
在 `WEAPON_DEFS` 物件內（`inflammation` 之後）新增：
```ts
  phagocyte: {
    kind: 'phagocyte', label: '吞噬偽足', maxLevel: 5,
    levels: [
      { cooldown: 0.7, damage: 8, radius: 70 },
      { cooldown: 0.7, damage: 12, radius: 70 },
      { cooldown: 0.6, damage: 12, radius: 85 },
      { cooldown: 0.6, damage: 16, radius: 85 },
      { cooldown: 0.5, damage: 20, radius: 100 },
    ],
  },
  cascade: {
    kind: 'cascade', label: '補體級聯', maxLevel: 5,
    levels: [
      { cooldown: 1.0, damage: 10, count: 3, radius: 160 },
      { cooldown: 1.0, damage: 10, count: 4, radius: 160 },
      { cooldown: 0.85, damage: 14, count: 4, radius: 180 },
      { cooldown: 0.85, damage: 14, count: 5, radius: 180 },
      { cooldown: 0.7, damage: 18, count: 6, radius: 200 },
    ],
  },
  nova: {
    kind: 'nova', label: '抗原脈衝', maxLevel: 5,
    levels: [
      { cooldown: 1.6, damage: 12, radius: 120 },
      { cooldown: 1.6, damage: 12, radius: 150 },
      { cooldown: 1.4, damage: 18, radius: 150 },
      { cooldown: 1.4, damage: 18, radius: 180 },
      { cooldown: 1.2, damage: 26, radius: 210 },
    ],
  },
```

- [ ] **Step 3：leveling.ts 解除武器上限**

把 `const WEAPON_CAP = 4` 改為 `const WEAPON_CAP = 7`，並把其註解改為「共 7 種武器，可全數收齊」。

- [ ] **Step 4：型別檢查 + 受影響測試**

Run: `npm run typecheck`
Run: `npx vitest run src/engine/systems/leveling.test.ts`
Expected: 乾淨、全綠。**若**有測試斷言「候選含全部武器」或「達上限不再解鎖」而因新增三把失敗，依新武器集合同步更新該斷言（行為不變、僅資料變多）。

- [ ] **Step 5：commit**
```bash
git add src/engine/types.ts src/engine/systems/weaponDefs.ts src/engine/systems/leveling.ts src/engine/systems/leveling.test.ts
git commit -m "$(cat <<'EOF'
[mvp][feat][content] 新增三把武器定義（吞噬偽足/補體級聯/抗原脈衝）+ FxEvent 型別 + 解除武器上限至 7

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2：武器行為純函式 + 單元測試（TDD）

**Files:** Modify `src/engine/systems/weapons.ts`、`src/engine/systems/weapons.test.ts`

**Interfaces:**
- Produces：`phagocyteSweep`、`chainTargets`、`novaBurst`、常數 `PHAGOCYTE_HALF_ANGLE`、`CASCADE_FALLOFF`。

- [ ] **Step 1：寫失敗測試（weapons.test.ts 追加）**

在 `import` 行補上新函式，並在 `describe` 內追加：
```ts
// 於頂部 import 改為：
// import { fireWand, fireKnife, orbitPositions, garlicTick, phagocyteSweep, chainTargets, novaBurst, PHAGOCYTE_HALF_ANGLE } from './weapons'

  it('phagocyteSweep 只打前方扇形半徑內的敵人', () => {
    const front = createEnemy({ x: 40, y: 0 }); front.hp = 20
    const behind = createEnemy({ x: -40, y: 0 }); behind.hp = 20
    const farFront = createEnemy({ x: 300, y: 0 }); farFront.hp = 20
    const hits = phagocyteSweep({ x: 0, y: 0 }, { x: 1, y: 0 }, [front, behind, farFront], 70, PHAGOCYTE_HALF_ANGLE, 8)
    expect(hits).toContain(front)
    expect(hits).not.toContain(behind)   // 背後不中
    expect(hits).not.toContain(farFront) // 超出半徑不中
    expect(front.hp).toBe(12)            // 20 - 8
    expect(behind.hp).toBe(20)
  })

  it('chainTargets 從最近起連跳、受跳數與範圍限制、依序回傳', () => {
    const a = createEnemy({ x: 30, y: 0 })
    const b = createEnemy({ x: 70, y: 0 })
    const c = createEnemy({ x: 110, y: 0 })
    const far = createEnemy({ x: 900, y: 0 })
    const seq = chainTargets({ x: 0, y: 0 }, [c, far, a, b], 3, 60)
    expect(seq).toEqual([a, b, c]) // 0→a(30)→b(+40)→c(+40)，far 超範圍不接
  })

  it('chainTargets 跳數上限封頂', () => {
    const a = createEnemy({ x: 20, y: 0 })
    const b = createEnemy({ x: 40, y: 0 })
    const c = createEnemy({ x: 60, y: 0 })
    expect(chainTargets({ x: 0, y: 0 }, [a, b, c], 2, 60)).toEqual([a, b])
  })

  it('novaBurst 對半徑內全體扣血', () => {
    const inside = createEnemy({ x: 50, y: 0 }); inside.hp = 20
    const outside = createEnemy({ x: 500, y: 0 }); outside.hp = 20
    const hits = novaBurst({ x: 0, y: 0 }, [inside, outside], 120, 12)
    expect(hits).toEqual([inside])
    expect(inside.hp).toBe(8) // 20 - 12
    expect(outside.hp).toBe(20)
  })
```

- [ ] **Step 2：跑測試確認失敗**

Run: `npx vitest run src/engine/systems/weapons.test.ts`
Expected: FAIL（`phagocyteSweep`/`chainTargets`/`novaBurst` 未定義）。

- [ ] **Step 3：實作三純函式（weapons.ts 追加）**

在檔尾新增：
```ts
/** 吞噬偽足扇形半角（弧度，70°）。 */
export const PHAGOCYTE_HALF_ANGLE = (Math.PI * 70) / 180
/** 補體級聯每跳傷害遞減係數。 */
export const CASCADE_FALLOFF = 0.75

/**
 * 吞噬偽足：對 center 半徑內、且與 dir 夾角 ≤ halfAngle 的存活敵人扣 damage（就地改 hp）。
 * @returns 被命中的敵人（供結算/視覺）。
 */
export function phagocyteSweep(
  center: Vec2, dir: Vec2, enemies: Entity[], radius: number, halfAngle: number, damage: number,
): Entity[] {
  const base = Math.atan2(dir.y, dir.x)
  const hits: Entity[] = []
  for (const e of enemies) {
    if (!e.active) continue
    const dx = e.pos.x - center.x
    const dy = e.pos.y - center.y
    const d = Math.hypot(dx, dy)
    if (d > radius) continue
    if (d > 0) {
      let diff = Math.abs(Math.atan2(dy, dx) - base)
      if (diff > Math.PI) diff = 2 * Math.PI - diff
      if (diff > halfAngle) continue
    }
    e.hp -= damage
    hits.push(e)
  }
  return hits
}

/**
 * 補體級聯：從距 origin 最近的存活敵人起跳，之後每次跳到距上一命中點最近、未命中過、
 * 且距離 ≤ jumpRange 的敵人，最多 maxJumps 個。不在此扣血（由 World 套遞減）。
 * @returns 依序命中的敵人（確定性：距離排序、平手以陣列順序）。
 */
export function chainTargets(origin: Vec2, enemies: Entity[], maxJumps: number, jumpRange: number): Entity[] {
  const hits: Entity[] = []
  const used = new Set<Entity>()
  let from = origin
  while (hits.length < maxJumps) {
    let best: Entity | null = null
    let bestD = Infinity
    for (const e of enemies) {
      if (!e.active || used.has(e)) continue
      const d = distance(from, e.pos)
      if (d <= jumpRange && d < bestD) { bestD = d; best = e }
    }
    if (!best) break
    used.add(best)
    hits.push(best)
    from = best.pos
  }
  return hits
}

/**
 * 抗原脈衝：對 center 半徑內所有存活敵人扣 damage（就地改 hp）。
 * @returns 被命中的敵人。
 */
export function novaBurst(center: Vec2, enemies: Entity[], radius: number, damage: number): Entity[] {
  const hits: Entity[] = []
  for (const e of enemies) {
    if (!e.active) continue
    if (distance(center, e.pos) <= radius) { e.hp -= damage; hits.push(e) }
  }
  return hits
}
```

- [ ] **Step 4：跑測試確認通過**

Run: `npx vitest run src/engine/systems/weapons.test.ts`
Expected: PASS（全部）。

- [ ] **Step 5：commit**
```bash
git add src/engine/systems/weapons.ts src/engine/systems/weapons.test.ts
git commit -m "$(cat <<'EOF'
[mvp][feat][engine] 三武器純函式 phagocyteSweep/chainTargets/novaBurst + 單元測試（TDD）

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3：World.step 接線 + fxEventQueue

**Files:** Modify `src/engine/World.ts`、`src/engine/World.test.ts`

**Interfaces:**
- Consumes：Task 2 三函式與常數、Task 1 `FxEvent`。
- Produces：`World.consumeFxEvents(): FxEvent[]`。

- [ ] **Step 1：World import 與欄位**

`World.ts` 頂部 weapons import 改為：
```ts
import { fireWand, fireKnife, orbitPositions, garlicTick,
  phagocyteSweep, chainTargets, novaBurst, PHAGOCYTE_HALF_ANGLE, CASCADE_FALLOFF } from './systems/weapons'
```
`types` import 補上 `FxEvent`（與既有型別同一行或新增）：
```ts
import type { /* …既有… */ FxEvent } from './types'
```
在 `soundEventQueue` 欄位附近新增：
```ts
  /** 本格累積的武器視覺事件；由上層每幀 consumeFxEvents 排空。 */
  private fxEventQueue: FxEvent[] = []
```

- [ ] **Step 2：新增 consumeFxEvents（緊鄰 consumeSoundEvents）**

```ts
  /** 取走並清空本格累積的武器視覺事件（供上層交給特效層繪製）。 */
  consumeFxEvents(): FxEvent[] {
    const out = this.fxEventQueue
    this.fxEventQueue = []
    return out
  }
```

- [ ] **Step 3：step 武器迴圈接三把新武器**

在武器遍歷迴圈內、`inflammation` 分支之後（`// bible 的位置…` 註解之前）插入：
```ts
      } else if (weapon.kind === 'phagocyte') {
        weapon.cooldownTimer -= dt
        if (weapon.cooldownTimer <= 0) {
          weapon.cooldownTimer = (lvl.cooldown ?? 0.7) * this.stats.cooldownMult
          const radius = (lvl.radius ?? 70) * this.stats.areaMult
          const cands = this.enemyGrid.queryRadius(
            this.player.pos.x, this.player.pos.y, radius + MAX_ENEMY_RADIUS,
          )
          const hits = phagocyteSweep(this.player.pos, this.lastMoveDir, cands, radius, PHAGOCYTE_HALF_ANGLE, damage)
          if (hits.length > 0) {
            this.checkKills()
            this.soundEventQueue.push('hit')
            this.fxEventQueue.push({
              kind: 'sweep', x: this.player.pos.x, y: this.player.pos.y,
              angle: Math.atan2(this.lastMoveDir.y, this.lastMoveDir.x), radius, halfAngle: PHAGOCYTE_HALF_ANGLE,
            })
          }
        }
      } else if (weapon.kind === 'cascade') {
        weapon.cooldownTimer -= dt
        if (weapon.cooldownTimer <= 0) {
          weapon.cooldownTimer = (lvl.cooldown ?? 1.0) * this.stats.cooldownMult
          const jumps = lvl.count ?? 3
          const range = (lvl.radius ?? 160) * this.stats.areaMult
          const targets = chainTargets(this.player.pos, this.enemies, jumps, range)
          if (targets.length > 0) {
            for (let k = 0; k < targets.length; k++) targets[k].hp -= damage * Math.pow(CASCADE_FALLOFF, k)
            this.checkKills()
            this.soundEventQueue.push('hit')
            this.fxEventQueue.push({
              kind: 'chain',
              points: [{ x: this.player.pos.x, y: this.player.pos.y }, ...targets.map((t) => ({ x: t.pos.x, y: t.pos.y }))],
            })
          }
        }
      } else if (weapon.kind === 'nova') {
        weapon.cooldownTimer -= dt
        if (weapon.cooldownTimer <= 0) {
          weapon.cooldownTimer = (lvl.cooldown ?? 1.6) * this.stats.cooldownMult
          const radius = (lvl.radius ?? 120) * this.stats.areaMult
          const cands = this.enemyGrid.queryRadius(
            this.player.pos.x, this.player.pos.y, radius + MAX_ENEMY_RADIUS,
          )
          const hits = novaBurst(this.player.pos, cands, radius, damage)
          if (hits.length > 0) {
            this.checkKills()
            this.soundEventQueue.push('hit')
            this.fxEventQueue.push({ kind: 'nova', x: this.player.pos.x, y: this.player.pos.y, radius })
          }
        }
      }
```

- [ ] **Step 4：World.test.ts 追加接線測試**

```ts
  it('吞噬偽足對前方敵人扣血並推 sweep fx', () => {
    const w = new World(1)
    w.weapons = [{ kind: 'phagocyte', level: 1, cooldownTimer: 0 }]
    w.lastMoveDir = { x: 1, y: 0 }
    const e = w.spawnEnemyAt({ x: 30, y: 0 })
    const hp0 = e.hp
    w.step(1 / 60)
    expect(e.hp).toBeLessThan(hp0)
    expect(w.consumeFxEvents().some((f) => f.kind === 'sweep')).toBe(true)
  })

  it('抗原脈衝對範圍內敵人扣血並推 nova fx', () => {
    const w = new World(1)
    w.weapons = [{ kind: 'nova', level: 1, cooldownTimer: 0 }]
    const e = w.spawnEnemyAt({ x: 60, y: 0 })
    const hp0 = e.hp
    w.step(1 / 60)
    expect(e.hp).toBeLessThan(hp0)
    expect(w.consumeFxEvents().some((f) => f.kind === 'nova')).toBe(true)
  })

  it('補體級聯連鎖命中並推 chain fx', () => {
    const w = new World(1)
    w.weapons = [{ kind: 'cascade', level: 1, cooldownTimer: 0 }]
    const a = w.spawnEnemyAt({ x: 40, y: 0 })
    const hp0 = a.hp
    w.step(1 / 60)
    expect(a.hp).toBeLessThan(hp0)
    expect(w.consumeFxEvents().some((f) => f.kind === 'chain')).toBe(true)
  })
```

- [ ] **Step 5：型別 + 測試**

Run: `npm run typecheck`
Run: `npx vitest run src/engine/World.test.ts`
Expected: 乾淨、全綠。

- [ ] **Step 6：commit**
```bash
git add src/engine/World.ts src/engine/World.test.ts
git commit -m "$(cat <<'EOF'
[mvp][feat][engine] World 接三武器（扇掃/連鎖遞減/範圍爆發）+ fxEventQueue 視覺事件

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4：視覺繪製（EffectsLayer + PixiRenderer + Game）

**Files:** Modify `src/engine/effects.ts`、`src/engine/PixiRenderer.ts`、`src/engine/Game.ts`

> 呈現層：不寫單元測試，實機驗證。

- [ ] **Step 1：EffectsLayer 加 flashes 清單 + 三 spawn**

在 `effects.ts` 的 `EffectsLayer` 內，於 `texts` 欄位附近新增欄位：
```ts
  private flashes: { g: Graphics; life: number; maxLife: number }[] = []
```
新增三方法（可置於 `hurt` 之後）：
```ts
  /** 吞噬偽足：前方扇形閃光（短壽命淡出）。 */
  spawnSweep(x: number, y: number, angle: number, radius: number, halfAngle: number): void {
    const g = new Graphics()
    g.moveTo(0, 0)
    g.arc(0, 0, radius, angle - halfAngle, angle + halfAngle)
    g.closePath()
    g.fill({ color: 0xff7043, alpha: 0.32 })
    g.position.set(x, y)
    this.worldFx.addChild(g)
    this.flashes.push({ g, life: 0.22, maxLife: 0.22 })
  }

  /** 補體級聯：相鄰命中點間的連鎖閃電（世界座標、短壽命淡出）。 */
  spawnChain(points: { x: number; y: number }[]): void {
    if (points.length < 2) return
    const g = new Graphics()
    g.moveTo(points[0].x, points[0].y)
    for (let i = 1; i < points.length; i++) g.lineTo(points[i].x, points[i].y)
    g.stroke({ width: 3, color: 0x8be9ff, alpha: 0.9 })
    this.worldFx.addChild(g)
    this.flashes.push({ g, life: 0.2, maxLife: 0.2 })
  }

  /** 抗原脈衝：擴張衝擊環（沿用 addExpand）。 */
  spawnNova(x: number, y: number, radius: number): void {
    this.addExpand(x, y, 0x4dd0c0, 4, radius, 4, 0.4)
  }
```
在 `update()` 內、處理 `texts` 之後新增 flashes 推進（在回傳 shake 之前）：
```ts
    for (let i = this.flashes.length - 1; i >= 0; i--) {
      const f = this.flashes[i]
      f.life -= DT
      if (f.life <= 0) { f.g.destroy(); this.flashes.splice(i, 1); continue }
      f.g.alpha = f.life / f.maxLife
    }
```
在 `destroy()` 內加入清理：
```ts
    for (const f of this.flashes) f.g.destroy()
    this.flashes = []
```

- [ ] **Step 2：PixiRenderer 加 applyFxEvents**

`PixiRenderer.ts` 頂部 type import 補上 `FxEvent`：
```ts
import type { Entity, CharacterKind, FxEvent } from './types'
```
新增公開方法（可置於 `render` 之後）：
```ts
  /** 把本幀武器視覺事件交給特效層繪製。 */
  applyFxEvents(events: FxEvent[]): void {
    for (const ev of events) {
      if (ev.kind === 'sweep') this.effects.spawnSweep(ev.x, ev.y, ev.angle, ev.radius, ev.halfAngle)
      else if (ev.kind === 'chain') this.effects.spawnChain(ev.points)
      else this.effects.spawnNova(ev.x, ev.y, ev.radius)
    }
  }
```

- [ ] **Step 3：Game 每幀排空 fx 事件**

在 `Game.ts` 主迴圈 `for (const ev of this.world.consumeSoundEvents()) soundManager.play(ev)` 之後新增：
```ts
      // 排空本幀武器視覺事件交特效層繪製。
      this.renderer.applyFxEvents(this.world.consumeFxEvents())
```

- [ ] **Step 4：型別 + build + 實機驗證**

Run: `npm run typecheck && npm run build`（乾淨）。
`npm run dev`：解鎖三把武器——吞噬偽足前方扇掃閃光、補體級聯連鎖閃電、抗原脈衝擴張環；0 console error。

- [ ] **Step 5：commit**
```bash
git add src/engine/effects.ts src/engine/PixiRenderer.ts src/engine/Game.ts
git commit -m "$(cat <<'EOF'
[mvp][feat][art] 三武器視覺：扇掃閃光/連鎖閃電/擴張環（fx 事件排空繪製）

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5：驗證與進度更新

**Files:** Modify `progress.md`、`docs/superpowers/specs/new-weapons/acceptance.md`

- [ ] **Step 1：完整測試 + 型別 + build**

Run: `npm test && npm run typecheck && npm run build`
Expected: 既有 122 + 新增測試全綠、型別乾淨、build 乾淨。

- [ ] **Step 2：實機完整驗證**

`npm run dev`：升級時可解鎖吞噬偽足/補體級聯/抗原脈衝並逐級升級；機制如設計（扇掃/連鎖遞減/範圍爆發）；
視覺正確；可收齊 7 把武器；FPS 正常、0 功能相關 console error。

- [ ] **Step 3：更新 acceptance.md 勾選 + progress.md**

依結果勾選 `acceptance.md` 填驗證日期；`progress.md` 階段 2 內容補一條「新增三把武器（吞噬偽足/補體級聯/抗原脈衝）+ 解除武器上限」與更新測試數。

- [ ] **Step 4：commit**
```bash
git add progress.md docs/superpowers/specs/new-weapons/acceptance.md
git commit -m "$(cat <<'EOF'
[mvp][docs][meta] 新增三把武器驗證通過，更新 progress 與 acceptance

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## 自我檢查（Self-Review）結果

- **Spec 覆蓋：** FR-1 定義（T1）、FR-2 純函式+測試（T2）、FR-3 World 接線（T3）、FR-4 fxEventQueue（T3）、FR-5 視覺繪製（T4）、FR-6 解除上限（T1）、FR-7 不變項（既有測試全綠，T5）皆有對應。
- **無 placeholder：** 各 task 含完整型別/資料/函式/測試碼與指令、預期輸出。
- **型別一致：** `phagocyteSweep`/`chainTargets`/`novaBurst`/`PHAGOCYTE_HALF_ANGLE`/`CASCADE_FALLOFF`/`FxEvent`/`consumeFxEvents`/`applyFxEvents`/`spawnSweep|Chain|Nova` 跨 task 一致。
- **確定性：** 三函式不用 `Math.random()`；連鎖以距離排序、平手陣列順序；fx 僅呈現資料。
- **相容：** 既有四把武器與數值不動；只新增 WeaponKind 成員 + 一條 fx 佇列 + 視覺；既有 122 測試全綠。
