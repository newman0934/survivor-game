# 武器進化（weapon-evolution）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 為 7 把武器加入「滿級 + 指定被動 → 升級卡進化」機制：進化後改名、套用進化層數值與招牌行為加成。

**Architecture:** 資料驅動——`WeaponDef.evolution` 持有進化層數值與行為旗標；`leveling` 在條件滿足時提供 `evolve:` 候選卡並於套用時設 `Weapon.evolved`；`World.step` 依 `evolved` 取進化層數值並讀旗標套招牌行為。沿用既有握手與分派，不新增 UI 流程。

**Tech Stack:** TypeScript 純引擎、Vitest、Vue 3 `<script setup>`（僅 UpgradeModal 視覺強調）。

## Global Constraints

- 繁體中文（zh-TW）：所有註解、UI 文案；程式碼/型別名稱維持英文。
- 引擎純度：`src/engine/**` 不引入 Vue/Pinia 執行期依賴。
- 確定性：模擬無 `Math.random()`；進化卡走既有 seeded rng 抽選。
- 既有 154 單元測試維持全綠；未進化時所有武器數值/行為/平衡與現況完全一致。
- `evolved` 為局內狀態，**不入存檔**（不改 `Summary`/store/saveStore）。
- 進化條件：武器 `level >= maxLevel` 且 持有 `evolution.requires` 被動（level≥1）且 `evolved !== true`。
- 進化生效值仍乘全域乘區（damageMult/cooldownMult/areaMult/projectileSpeedMult）。
- 七把進化數值與所需被動如 spec FR-3（逐字採用）。
- Commit 格式：`[mvp][type][scope] 描述` + `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`。

---

### Task 1: 型別 + 進化資料表

**Files:**
- Modify: `src/engine/types.ts`
- Modify: `src/engine/systems/weaponDefs.ts`
- Test: `src/engine/systems/weaponDefs.test.ts`（新建）

**Interfaces:**
- Produces:
  - `interface WeaponEvolution { requires: PassiveKind; label: string; level: WeaponLevelStats; pierce?: number; noFalloff?: boolean; halfAngle?: number; fieldRegen?: number }`
  - `WeaponDef.evolution?: WeaponEvolution`
  - `Weapon.evolved?: boolean`
  - `Entity.pierce?: number`、`Entity.evolved?: boolean`
  - `WEAPON_DEFS[kind].evolution`（七把）

- [ ] **Step 1: 改 `src/engine/types.ts` — Entity / Weapon / WeaponEvolution / WeaponDef**

在 `Entity` 介面末尾（`projShape?` 之後）新增兩欄：

```ts
  /** 投射物剩餘穿透敵數（進化穿孔素用）；命中後 >0 則續飛、否則失效。其他忽略。 */
  pierce?: number
  /** 是否為進化武器產生的投射物（純視覺：drawProjectile 進化上色）。 */
  evolved?: boolean
```

在 `Weapon` 介面末尾（`cooldownTimer` 之後）新增：

```ts
  /** 是否已進化（局內狀態，不入存檔）；進化後 World 改用 evolution 數值與招牌行為。 */
  evolved?: boolean
```

在 `WeaponDef` 介面之前新增 `WeaponEvolution`：

```ts
/**
 * 武器進化定義（純資料）。進化層數值 + 招牌行為旗標；沿用既有分派，由 World 依 `Weapon.evolved` 取用。
 */
export interface WeaponEvolution {
  /** 進化所需被動（持有 level≥1 即可）。 */
  requires: PassiveKind
  /** 進化後顯示名（繁中）。 */
  label: string
  /** 進化層生效數值（取代滿級 levels[maxLevel-1]）。 */
  level: WeaponLevelStats
  /** 穿孔素：投射物穿透敵數。 */
  pierce?: number
  /** 補體級聯：取消每跳傷害衰減。 */
  noFalloff?: boolean
  /** 吞噬偽足：環掃半角（弧度，覆寫 PHAGOCYTE_HALF_ANGLE）。 */
  halfAngle?: number
  /** 發炎場：場域存在時每秒替玩家回血量。 */
  fieldRegen?: number
}
```

在 `WeaponDef` 介面末尾（`levels` 之後）新增：

```ts
  /** 進化定義（選用）；滿足條件時可進化。 */
  evolution?: WeaponEvolution
```

`WeaponDef` 需匯入 `PassiveKind`——確認 `types.ts` 內 `PassiveKind` 已於同檔定義（是，於 PassiveDef 區段），故 `WeaponEvolution` 直接引用同檔型別即可，無需新 import。

- [ ] **Step 2: 改 `src/engine/systems/weaponDefs.ts` — 七筆 evolution**

在 `WEAPON_DEFS` 各武器物件內、`levels` 陣列之後加 `evolution`（數值逐字如下）：

antibody（`levels` 後）：
```ts
    evolution: {
      requires: 'tome', label: '抗體風暴',
      level: { cooldown: 0.12, damage: 12, count: 5, projectileSpeed: 500 },
    },
```
perforin：
```ts
    evolution: {
      requires: 'bracer', label: '千刃穿孔',
      level: { cooldown: 0.12, damage: 8, count: 5, projectileSpeed: 750 },
      pierce: 3,
    },
```
complement：
```ts
    evolution: {
      requires: 'spinach', label: '終末補體複合體',
      level: { damage: 12, count: 6, radius: 150, angularSpeed: 4.5 },
    },
```
inflammation：
```ts
    evolution: {
      requires: 'tomato', label: '自體炎症風暴',
      level: { damage: 16, radius: 170 },
      fieldRegen: 1.5,
    },
```
phagocyte：
```ts
    evolution: {
      requires: 'wings', label: '巨噬吞噬漩渦',
      level: { cooldown: 0.3, damage: 30, radius: 130 },
      halfAngle: Math.PI,
    },
```
cascade：
```ts
    evolution: {
      requires: 'candle', label: '補體爆發級聯',
      level: { cooldown: 0.45, damage: 24, count: 9, radius: 260 },
      noFalloff: true,
    },
```
nova：
```ts
    evolution: {
      requires: 'magnet', label: '抗原超載脈衝',
      level: { cooldown: 0.8, damage: 40, radius: 300 },
    },
```

- [ ] **Step 3: 寫測試 `src/engine/systems/weaponDefs.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { WEAPON_DEFS, WEAPON_ORDER } from './weaponDefs'

describe('武器進化資料表', () => {
  it('七把武器皆有 evolution 且 requires 對應正確', () => {
    const expected: Record<string, string> = {
      antibody: 'tome', perforin: 'bracer', complement: 'spinach',
      inflammation: 'tomato', phagocyte: 'wings', cascade: 'candle', nova: 'magnet',
    }
    for (const kind of WEAPON_ORDER) {
      const evo = WEAPON_DEFS[kind].evolution
      expect(evo, `${kind} 應有 evolution`).toBeDefined()
      expect(evo!.requires).toBe(expected[kind])
      expect(evo!.label.length).toBeGreaterThan(0)
      expect(evo!.level.damage).toBeGreaterThan(0)
    }
  })
  it('招牌旗標掛在正確武器上', () => {
    expect(WEAPON_DEFS.perforin.evolution!.pierce).toBe(3)
    expect(WEAPON_DEFS.cascade.evolution!.noFalloff).toBe(true)
    expect(WEAPON_DEFS.phagocyte.evolution!.halfAngle).toBeCloseTo(Math.PI)
    expect(WEAPON_DEFS.inflammation.evolution!.fieldRegen).toBe(1.5)
  })
})
```

- [ ] **Step 4: 執行測試 + 型別檢查**

Run: `npx vitest run src/engine/systems/weaponDefs.test.ts`
Expected: PASS（2 tests）

Run: `npm run typecheck`
Expected: 乾淨

- [ ] **Step 5: Commit**

```bash
git add src/engine/types.ts src/engine/systems/weaponDefs.ts src/engine/systems/weaponDefs.test.ts
git commit -m "[mvp][feat][engine] 武器進化型別 + 七把 evolution 資料表

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: leveling 進化候選 + 套用（TDD）

**Files:**
- Modify: `src/engine/systems/leveling.ts`
- Test: `src/engine/systems/leveling.test.ts`

**Interfaces:**
- Consumes: `WEAPON_DEFS[kind].evolution`、`Weapon.evolved`（Task 1）。
- Produces: `buildCandidates` 產出 `evolve:<kind>` 卡；`applyUpgradeById('evolve:<kind>')` 設 `evolved=true`（含條件再驗證）。

- [ ] **Step 1: 寫失敗測試（加到 `src/engine/systems/leveling.test.ts`）**

先確認檔頭已 import 需要的東西；於檔案 describe 區塊內新增（沿用既有測試風格，自行補齊既有 import：`buildCandidates`/`applyUpgradeById` 來自 `./leveling`）：

```ts
import { buildCandidates, applyUpgradeById } from './leveling'
import type { UpgradeContext, Weapon, Passive } from '../types'

/** 組一個最小 UpgradeContext（只放本測試需要的欄位）。 */
function ctxWith(weapons: Weapon[], passives: Passive[]): UpgradeContext {
  return {
    weapons, passives,
    stats: {} as never,
    player: { hp: 100, maxHp: 100 } as never,
    heal: () => {},
  }
}

describe('武器進化候選與套用', () => {
  it('滿級 + 持有所需被動 + 未進化 → 提供 evolve 卡', () => {
    const ctx = ctxWith(
      [{ kind: 'antibody', level: 5, cooldownTimer: 0 }],
      [{ kind: 'tome', level: 1 }],
    )
    const ids = buildCandidates(ctx).map((o) => o.id)
    expect(ids).toContain('evolve:antibody')
  })
  it('未滿級不提供 evolve 卡', () => {
    const ctx = ctxWith(
      [{ kind: 'antibody', level: 3, cooldownTimer: 0 }],
      [{ kind: 'tome', level: 1 }],
    )
    expect(buildCandidates(ctx).map((o) => o.id)).not.toContain('evolve:antibody')
  })
  it('未持有所需被動不提供 evolve 卡', () => {
    const ctx = ctxWith([{ kind: 'antibody', level: 5, cooldownTimer: 0 }], [])
    expect(buildCandidates(ctx).map((o) => o.id)).not.toContain('evolve:antibody')
  })
  it('已進化武器不再提供 evolve 或 levelup 卡', () => {
    const ctx = ctxWith(
      [{ kind: 'antibody', level: 5, cooldownTimer: 0, evolved: true }],
      [{ kind: 'tome', level: 1 }],
    )
    const ids = buildCandidates(ctx).map((o) => o.id)
    expect(ids).not.toContain('evolve:antibody')
    expect(ids).not.toContain('levelup:antibody')
  })
  it('applyUpgradeById 條件成立時設 evolved', () => {
    const w: Weapon = { kind: 'antibody', level: 5, cooldownTimer: 0 }
    const ctx = ctxWith([w], [{ kind: 'tome', level: 1 }])
    applyUpgradeById('evolve:antibody', ctx)
    expect(w.evolved).toBe(true)
  })
  it('applyUpgradeById 條件不成立（未滿級）時不設 evolved、不丟例外', () => {
    const w: Weapon = { kind: 'antibody', level: 3, cooldownTimer: 0 }
    const ctx = ctxWith([w], [{ kind: 'tome', level: 1 }])
    expect(() => applyUpgradeById('evolve:antibody', ctx)).not.toThrow()
    expect(w.evolved).toBeFalsy()
  })
})
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `npx vitest run src/engine/systems/leveling.test.ts`
Expected: FAIL（`evolve:antibody` 候選不存在 / applyUpgradeById 未處理 evolve）

- [ ] **Step 3: 改 `src/engine/systems/leveling.ts`**

新增 `evolveOption`（放在 `levelUpPassiveOption` 之後）：

```ts
/** 產生「進化某武器」選項（選到時若條件仍成立則設 evolved=true）。 */
function evolveOption(kind: WeaponKind): UpgradeOption {
  const evo = WEAPON_DEFS[kind].evolution!
  return {
    id: `evolve:${kind}`,
    label: `⭐ 進化：${evo.label}`,
    apply: (c) => {
      const w = c.weapons.find((x) => x.kind === kind)
      if (
        w && !w.evolved &&
        w.level >= WEAPON_DEFS[kind].maxLevel &&
        c.passives.some((p) => p.kind === evo.requires)
      ) {
        w.evolved = true
      }
    },
  }
}
```

在 `buildCandidates` 內、武器 levelup 迴圈之後（被動候選之前）新增進化候選：

```ts
  for (const w of ctx.weapons) {
    const evo = WEAPON_DEFS[w.kind].evolution
    if (
      evo && !w.evolved &&
      w.level >= WEAPON_DEFS[w.kind].maxLevel &&
      ctx.passives.some((p) => p.kind === evo.requires)
    ) {
      out.push(evolveOption(w.kind))
    }
  }
```

在 `applyUpgradeById` 內、`levelup:` 分支之後新增：

```ts
  if (id.startsWith('evolve:')) return evolveOption(id.slice(7) as WeaponKind).apply(ctx)
```

- [ ] **Step 4: 執行測試確認通過**

Run: `npx vitest run src/engine/systems/leveling.test.ts`
Expected: PASS（既有 16 + 新 6）

- [ ] **Step 5: Commit**

```bash
git add src/engine/systems/leveling.ts src/engine/systems/leveling.test.ts
git commit -m "[mvp][feat][engine] 升級握手支援武器進化候選與套用（TDD）

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: World 進化效果 — 數值與招牌行為（TDD）

**Files:**
- Modify: `src/engine/World.ts`
- Test: `src/engine/World.test.ts`

**Interfaces:**
- Consumes: `WEAPON_DEFS.evolution`、`Weapon.evolved`、`Entity.pierce/evolved`（Task 1）。
- Produces: 進化武器以 `evolution.level` 開火並套招牌行為；進化投射物帶 `evolved`/`pierce`。

- [ ] **Step 1: 寫失敗測試（加到 `src/engine/World.test.ts`）**

沿用該檔既有 import 與輔助（`new World(seed)`、`world.forceFire()`、`world.step()`、`world.weapons`、`world.projectiles`、`world.enemies`、`world.spawnEnemyAt` 等）。新增：

```ts
import { WEAPON_DEFS } from './systems/weaponDefs'

describe('武器進化效果', () => {
  it('進化抗體用進化層數值開火（count 5、投射物標記 evolved、冷卻 0.12）', () => {
    const w = new World(1)
    // 抗體鎖定最近 count 隻；需有足夠敵人才會發滿 5 發（fireWand 受 findNearestN 限制）
    for (let i = 0; i < 6; i++) w.spawnEnemyAt({ x: 60 + i * 20, y: 0 }, 'virus')
    const ab = w.weapons.find((x) => x.kind === 'antibody')!
    ab.level = WEAPON_DEFS.antibody.maxLevel
    ab.evolved = true
    w.forceFire()
    w.step(1 / 60)
    const shots = w.projectiles.filter((p) => p.active)
    expect(shots.length).toBe(5)            // 進化 count
    expect(shots.every((p) => p.evolved)).toBe(true)
    expect(ab.cooldownTimer).toBeCloseTo(0.12, 5) // 進化低冷卻（cooldownMult 預設 1）
  })

  it('進化穿孔素子彈命中後續飛（pierce）', () => {
    const w = new World(1)
    // 兩隻沿 +x 排列的敵人，飛鏢朝右
    w.spawnEnemyAt({ x: 40, y: 0 }, 'virus')
    w.spawnEnemyAt({ x: 80, y: 0 }, 'virus')
    w.weapons = [{ kind: 'perforin', level: WEAPON_DEFS.perforin.maxLevel, cooldownTimer: 0, evolved: true }]
    w.lastMoveDir = { x: 1, y: 0 }
    w.forceFire()
    // 推進數格讓子彈穿過第一隻、續命中第二隻
    for (let i = 0; i < 20; i++) w.step(1 / 60)
    const killed = w.enemies.filter((e) => !e.active).length
    expect(killed).toBeGreaterThanOrEqual(2) // 穿透命中至少兩隻
  })

  it('進化補體級聯每跳全額傷害（noFalloff）', () => {
    const w = new World(1)
    const a = w.spawnEnemyAt({ x: 30, y: 0 }, 'virus')
    const b = w.spawnEnemyAt({ x: 60, y: 0 }, 'virus')
    a.hp = 1000; a.maxHp = 1000; b.hp = 1000; b.maxHp = 1000
    w.weapons = [{ kind: 'cascade', level: WEAPON_DEFS.cascade.maxLevel, cooldownTimer: 0, evolved: true }]
    w.forceFire()
    w.step(1 / 60)
    const dmgA = 1000 - a.hp, dmgB = 1000 - b.hp
    expect(dmgB).toBeCloseTo(dmgA, 5) // 第二跳與第一跳等傷（無衰減）
  })

  it('進化發炎場場域存在時回血（fieldRegen）', () => {
    const w = new World(1)
    w.spawnEnemyAt({ x: 1000, y: 0 }, 'virus') // 遠處敵人，不接觸玩家
    w.weapons = [{ kind: 'inflammation', level: WEAPON_DEFS.inflammation.maxLevel, cooldownTimer: 0, evolved: true }]
    w.player.hp = 50
    w.step(1 / 60)
    expect(w.player.hp).toBeGreaterThan(50) // 場域回血
  })
})
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `npx vitest run src/engine/World.test.ts`
Expected: FAIL（進化武器仍用 levels[level-1]、無 pierce/noFalloff/fieldRegen）

- [ ] **Step 3: 改 `src/engine/World.ts`**

(a) 在 class 內新增取生效數值的 helper（放在 `step` 之前或 private 區）：

```ts
  /** 取武器的生效數值：進化則用 evolution.level，否則用當前等級值。 */
  private effectiveLevel(weapon: Weapon): WeaponLevelStats {
    const def = WEAPON_DEFS[weapon.kind]
    return weapon.evolved && def.evolution ? def.evolution.level : def.levels[weapon.level - 1]
  }
```

確認檔頭已從 `./types` 匯入 `WeaponLevelStats`（若無則加入 import）。

(b) 在 `step` 的武器迴圈，把：

```ts
    for (const weapon of this.weapons) {
      const lvl = WEAPON_DEFS[weapon.kind].levels[weapon.level - 1]
      const damage = lvl.damage * this.stats.damageMult
```

改為：

```ts
    for (const weapon of this.weapons) {
      const def = WEAPON_DEFS[weapon.kind]
      const lvl = this.effectiveLevel(weapon)
      const evo = weapon.evolved ? def.evolution : undefined
      const damage = lvl.damage * this.stats.damageMult
```

(c) antibody/perforin 分支：建立投射物後，若進化則標記 evolved 與 pierce。把：

```ts
          const projs =
            weapon.kind === 'antibody'
              ? fireWand(this.player.pos, this.enemies, count, damage, speed)
              : fireKnife(this.player.pos, this.lastMoveDir, count, damage, speed)
          this.projectiles.push(...projs)
```

改為：

```ts
          const projs =
            weapon.kind === 'antibody'
              ? fireWand(this.player.pos, this.enemies, count, damage, speed)
              : fireKnife(this.player.pos, this.lastMoveDir, count, damage, speed)
          if (evo) {
            for (const p of projs) {
              p.evolved = true
              if (evo.pierce) p.pierce = evo.pierce
            }
          }
          this.projectiles.push(...projs)
```

(d) inflammation 分支：在 `garlicTick(...)` 與 `this.checkKills()` 之間（或之後）加場域回血：

```ts
        garlicTick(this.player.pos, cands, radius, damage, dt)
        if (evo?.fieldRegen && this.player.hp > 0) {
          this.player.hp = Math.min(this.player.maxHp, this.player.hp + evo.fieldRegen * dt)
        }
        this.checkKills()
```

(e) phagocyte 分支：半角改用進化覆寫。把該分支內：

```ts
          const hits = phagocyteSweep(this.player.pos, this.lastMoveDir, cands, radius, PHAGOCYTE_HALF_ANGLE, damage)
```

改為：

```ts
          const halfAngle = evo?.halfAngle ?? PHAGOCYTE_HALF_ANGLE
          const hits = phagocyteSweep(this.player.pos, this.lastMoveDir, cands, radius, halfAngle, damage)
```

並把同分支稍後 fx 事件中的 `halfAngle: PHAGOCYTE_HALF_ANGLE` 改為 `halfAngle`。

(f) cascade 分支：每跳係數依 noFalloff。把：

```ts
            for (let k = 0; k < targets.length; k++) targets[k].hp -= damage * Math.pow(CASCADE_FALLOFF, k)
```

改為：

```ts
            const falloff = evo?.noFalloff ? 1 : CASCADE_FALLOFF
            for (let k = 0; k < targets.length; k++) targets[k].hp -= damage * Math.pow(falloff, k)
```

(g) 投射物命中迴圈支援 pierce。把：

```ts
        if (circlesOverlap(p, e)) {
          e.hp -= p.damage
          this.soundEventQueue.push('hit')
          p.active = false // 子彈單體命中即消耗
          if (e.hp <= 0) this.killEnemy(e)
          break // 一發子彈只命中一隻敵人
        }
```

改為：

```ts
        if (circlesOverlap(p, e)) {
          e.hp -= p.damage
          this.soundEventQueue.push('hit')
          if (e.hp <= 0) this.killEnemy(e)
          // 穿透：仍有 pierce 額度則續飛，否則消耗
          if (p.pierce && p.pierce > 0) p.pierce -= 1
          else p.active = false
          break // 每幀單發最多命中一隻
        }
```

(h) updateBible（complement）：進化時用進化層數值與較短命中冷卻。在 `updateBible` 內，把取得 `lvl` 的那行與命中冷卻 0.5 改為依 `bible.evolved`：

把：

```ts
    const lvl = WEAPON_DEFS.complement.levels[bible.level - 1]
```

改為：

```ts
    const evo = bible.evolved ? WEAPON_DEFS.complement.evolution : undefined
    const lvl = evo ? evo.level : WEAPON_DEFS.complement.levels[bible.level - 1]
    const hitCooldown = evo ? 0.25 : 0.5
```

並把該函式稍後：

```ts
          this.bibleHitTimers.set(e, 0.5) // 0.5 秒內不再被同武器扣血
```

改為：

```ts
          this.bibleHitTimers.set(e, hitCooldown) // 進化縮短命中冷卻
```

- [ ] **Step 4: 執行測試確認通過**

Run: `npx vitest run src/engine/World.test.ts`
Expected: PASS（既有 47 + 新 4）

Run: `npx vitest run`（全套）
Expected: PASS（既有 154 + Task1 2 + Task2 6 + Task3 4 = 166）

- [ ] **Step 5: 確認模擬無 Math.random**

Run: `npm run typecheck`
Expected: 乾淨

（檢視本 task 改動：`Math.PI`/`Math.pow`/`Math.min` 為計算用，無 `Math.random()`。）

- [ ] **Step 6: Commit**

```bash
git add src/engine/World.ts src/engine/World.test.ts
git commit -m "[mvp][feat][engine] World 套用武器進化：進化層數值 + 招牌行為（穿透/無衰減/環掃/場域回血/補體冷卻）（TDD）

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: 視覺/UI 強調 + 驗證 + 進度更新

**Files:**
- Modify: `src/engine/sprites.ts`
- Modify: `src/ui/UpgradeModal.vue`
- Modify: `progress.md`
- Modify: `docs/superpowers/specs/weapon-evolution/acceptance.md`

**Interfaces:**
- Consumes: `Entity.evolved`（Task 1/3）。
- Produces: 無下游（最終任務）。

- [ ] **Step 1: 改 `src/engine/sprites.ts` — drawProjectile 進化光暈**

在 `drawProjectile` 內、toxin 早退之後、`if (e.projShape === 'perforin')` 之前，插入：

```ts
  // 進化投射物：抗原黃光暈（畫在造型底層）
  if (e.evolved) g.circle(0, 0, r * 3.0).fill({ color: 0xffd54a, alpha: 0.25 })
```

- [ ] **Step 2: 改 `src/ui/UpgradeModal.vue` — 進化卡強調**

把卡片按鈕改為依 id 加 `evolve` class：

```vue
      <button v-for="(opt, i) in store.upgradeOptions" :key="opt.id" class="card"
        :class="{ evolve: opt.id.startsWith('evolve:') }"
        :style="{ animationDelay: 0.06 * i + 's' }"
        @click="store.pickUpgrade(opt.id)">
        {{ opt.label }}
      </button>
```

在 `<style scoped>` 既有 `.card:hover` 規則之後新增：

```css
.card.evolve { border-color: var(--antigen); box-shadow: 0 0 12px rgba(255, 213, 74, 0.6); }
```

- [ ] **Step 3: 全套驗證**

Run: `npm run typecheck`
Expected: 乾淨

Run: `npm test`
Expected: PASS（166）

Run: `npm run build`
Expected: 乾淨

- [ ] **Step 4: 實機驗證**

Run: `npm run dev`，於瀏覽器：
1. 升滿某武器（例如抗體）並取得其所需被動（干擾素）→ 升級三選一出現星標「⭐ 進化：抗體風暴」卡。
2. 選取 → 該武器立即以進化數值開火（更密集），投射物有黃色進化光暈。
3. 驗證招牌行為：千刃穿孔可穿透多敵、補體爆發級聯每跳不衰減、巨噬漩渦近 360° 掃、自體炎症場回血。
4. 未滿級或未持有被動時不出現進化卡；已進化武器不再出現其升級/進化卡。
5. console 無功能相關錯誤。

- [ ] **Step 5: 更新 acceptance.md 與 progress.md**

勾選 `docs/superpowers/specs/weapon-evolution/acceptance.md` 各項並填驗證日期 2026-06-24（「實機驗證」項保持未勾、標註待玩家）；
在 `progress.md` 階段 2 武器項下補一行「武器進化（滿級 + 指定被動 → 升級卡進化，7 把各有進化層 + 招牌行為）→ specs/weapon-evolution/」，並更新測試數（154→166）與煙霧測試列入武器進化。

- [ ] **Step 6: Commit**

```bash
git add src/engine/sprites.ts src/ui/UpgradeModal.vue progress.md docs/superpowers/specs/weapon-evolution/acceptance.md
git commit -m "[mvp][feat][ui] 進化投射物光暈 + 升級彈窗進化卡強調；驗收/進度更新

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-Review（plan 對 spec 的覆蓋檢查）

- **FR-1 條件與觸發**：Task 2 `buildCandidates`/`evolveOption`/`applyUpgradeById` 含三條件 + 再驗證。✅
- **FR-2 進化後效果**：Task 3 `effectiveLevel` 取進化層、仍乘全域乘區；evolved 留原位、被動保留。✅
- **FR-3 七把數值**：Task 1 evolution 表逐字。✅
- **FR-4 招牌行為**：Task 3 pierce（投射物迴圈 + factory 標記）、noFalloff、halfAngle、fieldRegen、complement 命中冷卻。✅
- **FR-5 視覺**：Task 4 drawProjectile evolved 光暈、UpgradeModal evolve 強調。✅
- **Edge Cases**：未滿級/無被動/已進化不出卡（Task 2 測試）；applyUpgradeById 再驗證（Task 2 測試）；pierce 跨幀重複命中接受（spec 已述）。✅
- **資料模型**：Task 1 `Entity.pierce/evolved`、`Weapon.evolved`、`WeaponEvolution`、`WeaponDef.evolution`。✅
- **不變項**：未進化路徑完全沿用 `def.levels[level-1]`；確定性無 Math.random（Task 3 Step 5）；不改 Summary/store/saveStore。✅
- **型別一致性**：`effectiveLevel`/`evolution.level`/`pierce`/`evolved`/`evolve:` 前綴跨 task 一致。✅
- **Placeholder 掃描**：無 TBD；每步含完整程式碼。✅
