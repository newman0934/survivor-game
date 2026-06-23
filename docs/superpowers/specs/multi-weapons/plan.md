# 多種武器 + 武器專屬升級 — 實作計畫

> **給執行者：** 本計畫以 TDD、bite-sized 步驟撰寫，逐 task 執行。引擎純邏輯先寫失敗測試再實作；
> renderer / 迴圈 / UI 為整合膠水層，不寫單元測試（依 CLAUDE.md 慣例），靠實跑驗證。
> 每完成一個邏輯變更就 commit（conventional + CLAUDE.md commit 格式）。

**目標：** 把寫死的單一武器抽象成「可共存、可獨立升級」的 4 把武器（魔杖／飛刀／聖經／大蒜），
並以升級卡解鎖／升級，全域被動改為乘區並影響所有武器。

**架構：** 武器 = 純資料（`Weapon{kind,level,cooldownTimer}`）＋常數等級表（`WEAPON_DEFS`）＋
無狀態行為函式（`systems/weapons.ts`）。`World` 持有 `weapons[]`，`step()` 遍歷各武器自行倒數冷卻
並結算。升級候選由 `leveling.ts` 依當前 `World` 狀態動態產生。

**技術棧：** TypeScript、Vitest、PixiJS、Vue 3 / Pinia（僅 UI 層）。

---

## 檔案結構（建立/修改一覽）

| 檔案 | 責任 | 動作 |
|------|------|------|
| `src/engine/types.ts` | 型別：Weapon / WeaponLevelStats / WeaponDef / UpgradeContext；PlayerStats 改乘區；EntityKind +orbit | 修改 |
| `src/engine/systems/weaponDefs.ts` | `WEAPON_DEFS` 常數等級表 + `WEAPON_ORDER` | 建立 |
| `src/engine/systems/weapons.ts` | 武器行為純函式（fireWand/fireKnife/orbitPositions/garlicTick） | 建立 |
| `src/engine/systems/weapons.test.ts` | weapons.ts 單元測試 | 建立 |
| `src/engine/systems/combat.ts` | 新增 `findNearestN` | 修改 |
| `src/engine/systems/combat.test.ts` | findNearestN 測試 | 修改 |
| `src/engine/systems/leveling.ts` | 乘區被動、動態候選、applyUpgradeById、heal fallback、rollUpgrades(ctx) | 修改 |
| `src/engine/systems/leveling.test.ts` | 更新並擴充測試 | 修改 |
| `src/engine/entities/factory.ts` | 新增 `createOrbit` | 修改 |
| `src/engine/World.ts` | weapons[]、lastMoveDir、bibleAngle、orbits、step() 武器迴圈、upgradeContext()、applyUpgrade 改寫 | 修改 |
| `src/engine/World.test.ts` | 武器整合測試 | 修改 |
| `src/engine/Game.ts` | rollUpgrades 傳入 ctx | 修改 |
| `src/engine/PixiRenderer.ts` | orbit 顏色 + 大蒜場域圓 | 修改 |
| `progress.md` | 更新進度 | 修改 |

---

## Task 1：型別基礎（types.ts）

**Files:**
- Modify: `src/engine/types.ts`

- [ ] **Step 1：擴充 EntityKind 並新增武器型別**

在 `EntityKind` 加入 `'orbit'`，並在檔案末尾新增武器相關型別：

```ts
export type EntityKind = 'player' | 'enemy' | 'projectile' | 'gem' | 'orbit'

/** 武器種類。 */
export type WeaponKind = 'wand' | 'knife' | 'bible' | 'garlic'

/** 一把武器的執行期狀態（純資料，存於 World.weapons）。 */
export interface Weapon {
  kind: WeaponKind
  level: number          // 1..maxLevel
  cooldownTimer: number  // 各自的開火倒數（秒）
}

/** 某把武器某一等級的生效參數（離散，逐級固定）。 */
export interface WeaponLevelStats {
  cooldown?: number          // 開火冷卻（秒）；garlic/bible 省略
  damage: number             // 單次/單發傷害
  count?: number             // 投射物或環繞物數量
  projectileSpeed?: number   // wand/knife
  radius?: number            // bible 環繞半徑 / garlic 場域半徑
  angularSpeed?: number      // bible 角速度（弧度/秒）
}

/** 一把武器的定義：等級上限與逐級數值表。 */
export interface WeaponDef {
  kind: WeaponKind
  label: string
  maxLevel: number
  levels: WeaponLevelStats[] // 長度 = maxLevel；levels[level-1] 為生效值
}
```

- [ ] **Step 2：PlayerStats 改為乘區並新增 UpgradeContext**

把 `PlayerStats` 改成：

```ts
export interface PlayerStats {
  /** 玩家移動速度（單位／秒）。 */
  moveSpeed: number
  /** 經驗寶石被吸取的感應半徑。 */
  pickupRadius: number
  /** 全域傷害乘區（預設 1）。 */
  damageMult: number
  /** 全域冷卻乘區（預設 1，越小攻速越快）。 */
  cooldownMult: number
  /** 全域彈速乘區（預設 1）。 */
  projectileSpeedMult: number
  /** 全域範圍乘區（預設 1，影響 bible/garlic 半徑）。 */
  areaMult: number
}
```

把 `UpgradeOption` 改為吃 `UpgradeContext`，並新增該型別：

```ts
/** 升級套用時可讀寫的上下文（由 World 提供）。 */
export interface UpgradeContext {
  stats: PlayerStats
  weapons: Weapon[]
  /** 補血保底卡用；就地調整玩家 hp（夾上限）。 */
  heal: (amount: number) => void
}

export interface UpgradeOption {
  id: string
  label: string
  apply: (ctx: UpgradeContext) => void
}
```

- [ ] **Step 3：型別檢查（會因下游未更新而紅，預期）**

Run: `npm run typecheck`
Expected: 出現 World.ts / leveling.ts / factory 等檔案的型別錯誤（PlayerStats 欄位、apply 簽章變更所致）。這是預期的——後續 task 會逐一修正。先不 commit。

---

## Task 2：武器等級表（weaponDefs.ts）

**Files:**
- Create: `src/engine/systems/weaponDefs.ts`

- [ ] **Step 1：建立等級表常數**

```ts
/**
 * 武器定義表（純資料）。每把武器的等級上限與逐級生效數值。
 * levels[level-1] 為該等級生效值；新增武器或調數值都從這裡下手。
 */
import type { WeaponDef, WeaponKind } from '../types'

/** 解鎖時提供候選的順序（wand 為起始武器，恆持有）。 */
export const WEAPON_ORDER: WeaponKind[] = ['wand', 'knife', 'bible', 'garlic']

export const WEAPON_DEFS: Record<WeaponKind, WeaponDef> = {
  wand: {
    kind: 'wand', label: '魔杖', maxLevel: 5,
    levels: [
      { cooldown: 0.5, damage: 5, count: 1, projectileSpeed: 400 },
      { cooldown: 0.5, damage: 8, count: 1, projectileSpeed: 400 },
      { cooldown: 0.5, damage: 8, count: 2, projectileSpeed: 400 },
      { cooldown: 0.4, damage: 8, count: 2, projectileSpeed: 400 },
      { cooldown: 0.4, damage: 8, count: 3, projectileSpeed: 400 },
    ],
  },
  knife: {
    kind: 'knife', label: '飛刀', maxLevel: 5,
    levels: [
      { cooldown: 0.35, damage: 4, count: 1, projectileSpeed: 600 },
      { cooldown: 0.35, damage: 4, count: 2, projectileSpeed: 600 },
      { cooldown: 0.35, damage: 6, count: 2, projectileSpeed: 600 },
      { cooldown: 0.28, damage: 6, count: 2, projectileSpeed: 600 },
      { cooldown: 0.28, damage: 6, count: 3, projectileSpeed: 600 },
    ],
  },
  bible: {
    kind: 'bible', label: '聖經', maxLevel: 5,
    levels: [
      { damage: 6, count: 1, radius: 90, angularSpeed: 2.5 },
      { damage: 6, count: 2, radius: 90, angularSpeed: 2.5 },
      { damage: 6, count: 2, radius: 120, angularSpeed: 2.5 },
      { damage: 6, count: 3, radius: 120, angularSpeed: 2.5 },
      { damage: 6, count: 3, radius: 120, angularSpeed: 3.25 },
    ],
  },
  garlic: {
    kind: 'garlic', label: '大蒜', maxLevel: 5,
    levels: [
      { damage: 3, radius: 70 },
      { damage: 3, radius: 90 },
      { damage: 5, radius: 90 },
      { damage: 5, radius: 110 },
      { damage: 8, radius: 110 },
    ],
  },
}
```

- [ ] **Step 2：commit**

```bash
git add src/engine/types.ts src/engine/systems/weaponDefs.ts
git commit -m "$(cat <<'EOF'
[mvp][feat][engine] 新增武器型別與等級表 + PlayerStats 改為乘區

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3：findNearestN（combat.ts）

**Files:**
- Modify: `src/engine/systems/combat.ts`
- Test: `src/engine/systems/combat.test.ts`

- [ ] **Step 1：寫失敗測試**

在 `combat.test.ts` 末尾（最後一個 `})` 之前，於 `describe` 內新增：

```ts
  it('finds the nearest N active enemies in order', () => {
    const player = createPlayer({ x: 0, y: 0 })
    const e1 = createEnemy({ x: 10, y: 0 })
    const e2 = createEnemy({ x: 50, y: 0 })
    const e3 = createEnemy({ x: 200, y: 0 })
    const got = findNearestN(player.pos, [e3, e1, e2], 2)
    expect(got).toEqual([e1, e2])
  })
  it('findNearestN returns fewer when not enough enemies', () => {
    const player = createPlayer({ x: 0, y: 0 })
    const e1 = createEnemy({ x: 10, y: 0 })
    expect(findNearestN(player.pos, [e1], 3)).toEqual([e1])
  })
```

並把 import 改為：`import { findNearest, findNearestN } from './combat'`

- [ ] **Step 2：執行確認失敗**

Run: `npm test -- combat`
Expected: FAIL（`findNearestN is not a function`）

- [ ] **Step 3：實作**

在 `combat.ts` 末尾新增：

```ts
/**
 * 找出距離 from 最近的 n 隻存活敵人，由近到遠排序。
 * @param from    量測起點（玩家座標）。
 * @param enemies 候選敵人。
 * @param n       要取的數量。
 * @returns 最多 n 隻、由近到遠的存活敵人。
 */
export function findNearestN(from: Vec2, enemies: Entity[], n: number): Entity[] {
  return enemies
    .filter((e) => e.active)
    .map((e) => ({ e, d: distance(from, e.pos) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, n)
    .map((x) => x.e)
}
```

- [ ] **Step 4：執行確認通過**

Run: `npm test -- combat`
Expected: PASS（全部 combat 測試）

- [ ] **Step 5：commit**

```bash
git add src/engine/systems/combat.ts src/engine/systems/combat.test.ts
git commit -m "$(cat <<'EOF'
[mvp][feat][engine] combat 新增 findNearestN（多目標鎖定）

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4：武器行為函式（weapons.ts）

**Files:**
- Create: `src/engine/systems/weapons.ts`
- Test: `src/engine/systems/weapons.test.ts`

行為函式皆為純函式：wand/knife 回傳要新增的 projectile entity 清單；bible 提供環繞位置計算；
garlic 就地對範圍內敵人扣血。傳入的 `damage`/`count`/`speed`/`radius` 皆為**已套用全域乘區後的最終值**
（由 World 計算後傳入），讓本檔不需碰 PlayerStats。

- [ ] **Step 1：寫失敗測試**

```ts
import { describe, it, expect } from 'vitest'
import { fireWand, fireKnife, orbitPositions, garlicTick } from './weapons'
import { createEnemy } from '../entities/factory'

describe('weapons', () => {
  it('fireWand 朝最近 count 隻各射一發', () => {
    const near = createEnemy({ x: 30, y: 0 })
    const far = createEnemy({ x: 300, y: 0 })
    const projs = fireWand({ x: 0, y: 0 }, [far, near], 1, 5, 400)
    expect(projs).toHaveLength(1)
    expect(projs[0].kind).toBe('projectile')
    expect(projs[0].vel.x).toBeGreaterThan(0) // 朝 +x 的最近敵人
    expect(projs[0].damage).toBe(5)
  })

  it('fireWand 無敵人時不發射', () => {
    expect(fireWand({ x: 0, y: 0 }, [], 2, 5, 400)).toHaveLength(0)
  })

  it('fireKnife 依 count 產生對應數量、朝指定方向', () => {
    const projs = fireKnife({ x: 0, y: 0 }, { x: 1, y: 0 }, 3, 4, 600)
    expect(projs).toHaveLength(3)
    // 中央那發朝正右方
    const speeds = projs.map((p) => Math.hypot(p.vel.x, p.vel.y))
    speeds.forEach((s) => expect(s).toBeCloseTo(600, 0))
    expect(projs.some((p) => Math.abs(p.vel.y) < 1e-6)).toBe(true)
  })

  it('orbitPositions 在圓上等分 count 個點', () => {
    const pts = orbitPositions({ x: 0, y: 0 }, 2, 100, 0)
    expect(pts).toHaveLength(2)
    expect(Math.hypot(pts[0].x, pts[0].y)).toBeCloseTo(100, 5)
    // 兩點相隔 180 度
    expect(pts[1].x).toBeCloseTo(-pts[0].x, 5)
    expect(pts[1].y).toBeCloseTo(-pts[0].y, 5)
  })

  it('garlicTick 只對半徑內敵人扣 dmg*dt', () => {
    const inside = createEnemy({ x: 20, y: 0 })
    const outside = createEnemy({ x: 500, y: 0 })
    inside.hp = 10; outside.hp = 10
    garlicTick({ x: 0, y: 0 }, [inside, outside], 70, 3, 1)
    expect(inside.hp).toBeCloseTo(7, 5) // 10 - 3*1
    expect(outside.hp).toBe(10)
  })
})
```

- [ ] **Step 2：執行確認失敗**

Run: `npm test -- weapons`
Expected: FAIL（模組不存在）

- [ ] **Step 3：實作 weapons.ts**

```ts
/**
 * 武器行為 system（weapons）。
 *
 * 每種武器一組無狀態純函式：wand/knife 回傳要新增的 projectile；bible 計算環繞物位置；
 * garlic 就地對範圍內敵人扣傷。傳入的數值皆為「已套用全域乘區」的最終值（由 World 計算）。
 * 不依賴 Vue/Pinia。
 */
import type { Entity } from '../types'
import type { Vec2 } from '../core/vector'
import { distance } from '../core/vector'
import { createProjectile } from '../entities/factory'
import { findNearestN } from './combat'

/**
 * 魔杖：鎖定最近 count 隻敵人，朝各自方向發射一發。
 * @returns 要加入場上的 projectile（無敵人時為空陣列）。
 */
export function fireWand(
  origin: Vec2, enemies: Entity[], count: number, damage: number, speed: number,
): Entity[] {
  const targets = findNearestN(origin, enemies, count)
  return targets.map((t) => {
    const dx = t.pos.x - origin.x
    const dy = t.pos.y - origin.y
    const len = Math.hypot(dx, dy) || 1
    return createProjectile(origin, { x: dx / len, y: dy / len }, speed, damage)
  })
}

/**
 * 飛刀：朝 dir 方向發射 count 發，多發時以小角度扇形展開。
 * @param dir 已正規化的方向；count 為奇數時中央那發正對 dir。
 */
export function fireKnife(
  origin: Vec2, dir: Vec2, count: number, damage: number, speed: number,
): Entity[] {
  const baseAngle = Math.atan2(dir.y, dir.x)
  const spread = 0.18 // 相鄰兩發間隔弧度（約 10 度）
  const out: Entity[] = []
  for (let i = 0; i < count; i++) {
    // 以中央對稱展開：i 對應的偏移量
    const offset = (i - (count - 1) / 2) * spread
    const a = baseAngle + offset
    out.push(createProjectile(origin, { x: Math.cos(a), y: Math.sin(a) }, speed, damage))
  }
  return out
}

/**
 * 聖經：計算 count 個環繞物在以 center 為圓心、半徑 radius 的圓上的等分位置。
 * @param baseAngle 目前旋轉基準角（由 World 隨時間累加）。
 */
export function orbitPositions(center: Vec2, count: number, radius: number, baseAngle: number): Vec2[] {
  const pts: Vec2[] = []
  for (let i = 0; i < count; i++) {
    const a = baseAngle + (i * 2 * Math.PI) / count
    pts.push({ x: center.x + Math.cos(a) * radius, y: center.y + Math.sin(a) * radius })
  }
  return pts
}

/**
 * 大蒜：對 center 半徑內的存活敵人扣 dmg*dt 連續傷害（就地修改 hp）。
 * 命中判定採「敵人中心距離 <= radius」。
 */
export function garlicTick(center: Vec2, enemies: Entity[], radius: number, dps: number, dt: number): void {
  for (const e of enemies) {
    if (!e.active) continue
    if (distance(center, e.pos) <= radius) {
      e.hp -= dps * dt
    }
  }
}
```

- [ ] **Step 4：執行確認通過**

Run: `npm test -- weapons`
Expected: PASS

- [ ] **Step 5：commit**

```bash
git add src/engine/systems/weapons.ts src/engine/systems/weapons.test.ts
git commit -m "$(cat <<'EOF'
[mvp][feat][engine] 新增 weapons system（魔杖/飛刀/聖經/大蒜行為）

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5：環繞物工廠（factory.ts）

**Files:**
- Modify: `src/engine/entities/factory.ts`

- [ ] **Step 1：新增 createOrbit**

在 `factory.ts` 末尾新增：

```ts
/**
 * 建立聖經環繞物 entity。位置由 weapons.orbitPositions 每格重算後寫入，
 * 不走 movement system（vel 恆為 0）。
 * @param pos    初始位置。
 * @param damage 接觸敵人時的傷害。
 * @returns 新的 orbit entity。
 */
export function createOrbit(pos: Vec2, damage: number): Entity {
  return { ...base(), kind: 'orbit', pos: { ...pos }, radius: 12, damage }
}
```

- [ ] **Step 2：型別檢查（仍會因 World 未改而紅，預期）**

Run: `npm run typecheck`
Expected: 仍有 World.ts / leveling.ts 的錯誤（下一 task 修）。`factory.ts` 本身不應新增錯誤。
先不 commit（與 Task 6 一起）。

---

## Task 6：升級系統改寫（leveling.ts）

**Files:**
- Modify: `src/engine/systems/leveling.ts`
- Test: `src/engine/systems/leveling.test.ts`

- [ ] **Step 1：改寫 leveling.test.ts（先寫期望行為）**

將 `leveling.test.ts` 全檔替換為：

```ts
import { describe, it, expect } from 'vitest'
import { xpForLevel, rollUpgrades, buildCandidates, applyUpgradeById } from './leveling'
import { createRng } from '../core/rng'
import type { PlayerStats, UpgradeContext, Weapon } from '../types'

function makeStats(): PlayerStats {
  return { moveSpeed: 200, pickupRadius: 120, damageMult: 1, cooldownMult: 1, projectileSpeedMult: 1, areaMult: 1 }
}
function makeCtx(weapons: Weapon[]): UpgradeContext {
  return { stats: makeStats(), weapons, heal: () => {} }
}

describe('leveling', () => {
  it('xp 需求隨等級遞增', () => {
    expect(xpForLevel(2)).toBeGreaterThan(xpForLevel(1))
  })

  it('只持有魔杖時候選含解鎖其他武器與升級魔杖', () => {
    const ctx = makeCtx([{ kind: 'wand', level: 1, cooldownTimer: 0 }])
    const ids = buildCandidates(ctx).map((o) => o.id)
    expect(ids).toContain('unlock:knife')
    expect(ids).toContain('unlock:bible')
    expect(ids).toContain('unlock:garlic')
    expect(ids).toContain('levelup:wand')
    expect(ids).toContain('damage')
  })

  it('武器滿級後不再出現該武器的升級候選', () => {
    const ctx = makeCtx([{ kind: 'wand', level: 5, cooldownTimer: 0 }])
    const ids = buildCandidates(ctx).map((o) => o.id)
    expect(ids).not.toContain('levelup:wand')
  })

  it('持有四把武器後不再出現解鎖候選', () => {
    const ctx = makeCtx([
      { kind: 'wand', level: 1, cooldownTimer: 0 },
      { kind: 'knife', level: 1, cooldownTimer: 0 },
      { kind: 'bible', level: 1, cooldownTimer: 0 },
      { kind: 'garlic', level: 1, cooldownTimer: 0 },
    ])
    const ids = buildCandidates(ctx).map((o) => o.id)
    expect(ids.some((id) => id.startsWith('unlock:'))).toBe(false)
  })

  it('rollUpgrades 回傳 3 張不重複候選', () => {
    const ctx = makeCtx([{ kind: 'wand', level: 1, cooldownTimer: 0 }])
    const opts = rollUpgrades(createRng(1), 3, ctx)
    expect(opts).toHaveLength(3)
    expect(new Set(opts.map((o) => o.id)).size).toBe(3)
  })

  it('候選不足時以 heal 保底補滿', () => {
    // 四把皆滿級 → 合法候選只剩 5 張被動，仍夠 3 張；
    // 改用空 weapons 也會有被動。為觸發 fallback，要求超量。
    const ctx = makeCtx([{ kind: 'wand', level: 1, cooldownTimer: 0 }])
    const opts = rollUpgrades(createRng(2), 50, ctx)
    expect(opts.length).toBe(50)
    expect(opts.some((o) => o.id === 'heal')).toBe(true)
  })

  it('applyUpgradeById: unlock 加入新武器（Lv1）', () => {
    const ctx = makeCtx([{ kind: 'wand', level: 1, cooldownTimer: 0 }])
    applyUpgradeById('unlock:knife', ctx)
    expect(ctx.weapons.find((w) => w.kind === 'knife')?.level).toBe(1)
  })

  it('applyUpgradeById: levelup 提升既有武器等級', () => {
    const ctx = makeCtx([{ kind: 'wand', level: 1, cooldownTimer: 0 }])
    applyUpgradeById('levelup:wand', ctx)
    expect(ctx.weapons.find((w) => w.kind === 'wand')?.level).toBe(2)
  })

  it('applyUpgradeById: 被動套用乘區', () => {
    const ctx = makeCtx([{ kind: 'wand', level: 1, cooldownTimer: 0 }])
    applyUpgradeById('damage', ctx)
    expect(ctx.stats.damageMult).toBeCloseTo(1.15, 5)
  })

  it('applyUpgradeById: 未知 id 安靜略過', () => {
    const ctx = makeCtx([{ kind: 'wand', level: 1, cooldownTimer: 0 }])
    expect(() => applyUpgradeById('nope', ctx)).not.toThrow()
    expect(ctx.weapons).toHaveLength(1)
  })

  it('確定性：相同 seed 產生相同候選 id 序列', () => {
    const a = rollUpgrades(createRng(7), 3, makeCtx([{ kind: 'wand', level: 1, cooldownTimer: 0 }]))
    const b = rollUpgrades(createRng(7), 3, makeCtx([{ kind: 'wand', level: 1, cooldownTimer: 0 }]))
    expect(a.map((o) => o.id)).toEqual(b.map((o) => o.id))
  })
})
```

- [ ] **Step 2：執行確認失敗**

Run: `npm test -- leveling`
Expected: FAIL（`buildCandidates` / `applyUpgradeById` 不存在、簽章不符）

- [ ] **Step 3：改寫 leveling.ts**

將 `leveling.ts` 的 `ALL_UPGRADES` 與 `rollUpgrades` 段落替換為以下（`xpForLevel` 保留不動）：

```ts
import type { UpgradeOption, UpgradeContext, WeaponKind } from '../types'
import type { Rng } from '../core/rng'
import { WEAPON_DEFS, WEAPON_ORDER } from './weaponDefs'

/** 武器持有上限（本階段共 4 種）。 */
const WEAPON_CAP = 4

/** 全域被動升級（改為乘區，影響所有武器）。 */
export const PASSIVE_UPGRADES: UpgradeOption[] = [
  { id: 'damage', label: '傷害 +15%', apply: (c) => { c.stats.damageMult *= 1.15 } },
  { id: 'firerate', label: '攻速 +15%', apply: (c) => { c.stats.cooldownMult *= 0.85 } },
  { id: 'projspeed', label: '彈速 +20%', apply: (c) => { c.stats.projectileSpeedMult *= 1.2 } },
  { id: 'movespeed', label: '移速 +12%', apply: (c) => { c.stats.moveSpeed *= 1.12 } },
  { id: 'pickup', label: '吸取範圍 +25%', apply: (c) => { c.stats.pickupRadius *= 1.25 } },
]

/** 保底卡：候選不足時補滿用。 */
const HEAL: UpgradeOption = { id: 'heal', label: '補血 +20', apply: (c) => c.heal(20) }

/** 產生「解鎖某武器」選項。 */
function unlockOption(kind: WeaponKind): UpgradeOption {
  return {
    id: `unlock:${kind}`,
    label: `新武器：${WEAPON_DEFS[kind].label}`,
    apply: (c) => {
      if (!c.weapons.some((w) => w.kind === kind) && c.weapons.length < WEAPON_CAP) {
        c.weapons.push({ kind, level: 1, cooldownTimer: 0 })
      }
    },
  }
}

/** 產生「升級某武器」選項（label 顯示當前→下一級）。 */
function levelUpOption(kind: WeaponKind, curLevel: number): UpgradeOption {
  const def = WEAPON_DEFS[kind]
  return {
    id: `levelup:${kind}`,
    label: `${def.label} Lv${curLevel}→Lv${curLevel + 1}`,
    apply: (c) => {
      const w = c.weapons.find((x) => x.kind === kind)
      if (w && w.level < def.maxLevel) w.level += 1
    },
  }
}

/**
 * 依當前 World 狀態動態組出所有合法升級候選：
 * 解鎖未持有武器（未達上限）＋升級未滿級武器＋全域被動。
 */
export function buildCandidates(ctx: UpgradeContext): UpgradeOption[] {
  const out: UpgradeOption[] = []
  const owned = new Set(ctx.weapons.map((w) => w.kind))
  if (ctx.weapons.length < WEAPON_CAP) {
    for (const kind of WEAPON_ORDER) {
      if (!owned.has(kind)) out.push(unlockOption(kind))
    }
  }
  for (const w of ctx.weapons) {
    if (w.level < WEAPON_DEFS[w.kind].maxLevel) out.push(levelUpOption(w.kind, w.level))
  }
  out.push(...PASSIVE_UPGRADES)
  return out
}

/**
 * 從合法候選中不重複抽出 count 張；不足時以 heal 保底補滿。
 * 確定性：一律走傳入的 seeded rng。
 */
export function rollUpgrades(rng: Rng, count: number, ctx: UpgradeContext): UpgradeOption[] {
  const pool = buildCandidates(ctx)
  const chosen: UpgradeOption[] = []
  while (chosen.length < count && pool.length > 0) {
    const i = Math.floor(rng.next() * pool.length)
    chosen.push(pool.splice(i, 1)[0])
  }
  while (chosen.length < count) chosen.push(HEAL)
  return chosen
}

/**
 * 依 id 套用升級效果（升級握手最後一步）。找不到對應 id 時安靜略過。
 */
export function applyUpgradeById(id: string, ctx: UpgradeContext): void {
  if (id === 'heal') return HEAL.apply(ctx)
  const passive = PASSIVE_UPGRADES.find((p) => p.id === id)
  if (passive) return passive.apply(ctx)
  if (id.startsWith('unlock:')) return unlockOption(id.slice(7) as WeaponKind).apply(ctx)
  if (id.startsWith('levelup:')) {
    const kind = id.slice(8) as WeaponKind
    const w = ctx.weapons.find((x) => x.kind === kind)
    return levelUpOption(kind, w ? w.level : 1).apply(ctx)
  }
  // 未知 id：安靜略過
}
```

> 注意：移除舊的 `ALL_UPGRADES` export 與舊 `rollUpgrades`。`xpForLevel` 與其註解保留。
> 舊 import（`UpgradeOption`、`Rng`）保留並依上方調整。

- [ ] **Step 4：執行確認通過**

Run: `npm test -- leveling`
Expected: PASS

- [ ] **Step 5：commit**

```bash
git add src/engine/systems/leveling.ts src/engine/systems/leveling.test.ts src/engine/entities/factory.ts
git commit -m "$(cat <<'EOF'
[mvp][feat][engine] 升級系統改為動態候選（解鎖/升級武器/乘區被動 + heal 保底）

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 7：World 整合（World.ts）

**Files:**
- Modify: `src/engine/World.ts`
- Test: `src/engine/World.test.ts`

- [ ] **Step 1：寫失敗測試**

在 `World.test.ts` 適當的 `describe` 內新增（若檔案結構不同，放進既有頂層 describe）：

```ts
  it('起始只持有魔杖', () => {
    const w = new World(1)
    expect(w.weapons.map((x) => x.kind)).toEqual(['wand'])
  })

  it('套用 unlock 後新增武器並共存', () => {
    const w = new World(1)
    w.applyUpgrade('unlock:knife')
    expect(w.weapons.map((x) => x.kind).sort()).toEqual(['knife', 'wand'])
  })

  it('魔杖在有敵人時會產生投射物', () => {
    const w = new World(1)
    w.spawnEnemyAt({ x: 50, y: 0 })
    // 推進足夠步數讓魔杖冷卻歸零並開火
    for (let i = 0; i < 40; i++) w.step(1 / 60)
    expect(w.projectiles.length).toBeGreaterThan(0)
  })

  it('大蒜對靠近的敵人造成傷害', () => {
    const w = new World(1)
    w.applyUpgrade('unlock:garlic')
    const e = w.spawnEnemyAt({ x: 20, y: 0 }) // 在大蒜半徑內
    const hp0 = e.hp
    w.step(1 / 60)
    expect(e.hp).toBeLessThan(hp0)
  })

  it('持有聖經時 orbits 數量等於聖經等級的 count', () => {
    const w = new World(1)
    w.applyUpgrade('unlock:bible') // Lv1 → count 1
    w.step(1 / 60)
    expect(w.orbits().length).toBe(1)
  })
```

- [ ] **Step 2：執行確認失敗**

Run: `npm test -- World`
Expected: FAIL（`weapons` / `orbits` 不存在等）

- [ ] **Step 3：改寫 World.ts**

變更點（逐項）：

(a) import 調整：

```ts
import { createPlayer, createEnemy, createGem, createOrbit } from './entities/factory'
import { findNearest } from './systems/combat'
import { fireWand, fireKnife, orbitPositions, garlicTick } from './systems/weapons'
import { WEAPON_DEFS } from './systems/weaponDefs'
import { xpForLevel, rollUpgrades, applyUpgradeById } from './systems/leveling'
import type { Entity, PlayerStats, Weapon, UpgradeContext } from './types'
```
（移除 `createProjectile`、`ALL_UPGRADES` 的 import；`rollUpgrades` 仍由 Game 呼叫，World 用 `applyUpgradeById`。）

(b) `stats` 初始值改乘區：

```ts
  stats: PlayerStats = {
    moveSpeed: 200,
    pickupRadius: 120,
    damageMult: 1,
    cooldownMult: 1,
    projectileSpeedMult: 1,
    areaMult: 1,
  }
```

(c) 新增欄位（在 stats 附近）：

```ts
  /** 玩家持有的武器（起始只有魔杖）。 */
  weapons: Weapon[] = [{ kind: 'wand', level: 1, cooldownTimer: 0 }]
  /** 玩家最後一次非零移動方向（飛刀用）；預設朝右。 */
  lastMoveDir: Vec2 = { x: 1, y: 0 }
  /** 聖經環繞基準角（每格隨角速度累加）。 */
  private bibleAngle = 0
  /** 聖經環繞物 entity（每格依等級重建/更新位置）。 */
  private orbitEntities: Entity[] = []
  /** 聖經 per-enemy 命中冷卻（秒）；避免每幀重複扣血。 */
  private bibleHitTimers = new Map<Entity, number>()
```

移除舊的 `private fireTimer = 0`（改用各武器自己的 `cooldownTimer`）。

(d) 新增存取器：

```ts
  /** @returns 目前的聖經環繞物（供 renderer 顯示）。 */
  orbits(): Entity[] {
    return this.orbitEntities
  }

  /** 建立升級套用所需的上下文（stats + weapons + heal）。 */
  upgradeContext(): UpgradeContext {
    return {
      stats: this.stats,
      weapons: this.weapons,
      heal: (amount: number) => {
        this.player.hp = Math.min(this.player.maxHp, this.player.hp + amount)
      },
    }
  }
```

(e) `applyUpgrade` 改寫：

```ts
  /**
   * 套用指定 id 的升級（升級握手最後一步）。委派給 leveling.applyUpgradeById。
   * @param id 升級選項 id；未知 id 安靜略過。
   */
  applyUpgrade(id: string): void {
    applyUpgradeById(id, this.upgradeContext())
  }
```

(f) `step()` 中替換「步驟 4 自動開火」整段為「遍歷武器各自結算」，並在敵人接觸傷害前更新 `lastMoveDir`。具體：

在步驟 1（玩家移動）後，記錄移動方向：

```ts
    // 記錄最後非零移動方向（飛刀發射方向用）。
    if (this.moveInput.x !== 0 || this.moveInput.y !== 0) {
      const len = Math.hypot(this.moveInput.x, this.moveInput.y) || 1
      this.lastMoveDir = { x: this.moveInput.x / len, y: this.moveInput.y / len }
    }
```

把原步驟 4（`this.fireTimer -= dt ...` 整段）替換為：

```ts
    // 4) 武器：遍歷每把武器，各自倒數冷卻並結算行為。
    for (const weapon of this.weapons) {
      const lvl = WEAPON_DEFS[weapon.kind].levels[weapon.level - 1]
      const damage = lvl.damage * this.stats.damageMult

      if (weapon.kind === 'wand' || weapon.kind === 'knife') {
        weapon.cooldownTimer -= dt
        if (weapon.cooldownTimer <= 0) {
          weapon.cooldownTimer = (lvl.cooldown ?? 0.5) * this.stats.cooldownMult
          const speed = (lvl.projectileSpeed ?? 400) * this.stats.projectileSpeedMult
          const count = lvl.count ?? 1
          const projs = weapon.kind === 'wand'
            ? fireWand(this.player.pos, this.enemies, count, damage, speed)
            : fireKnife(this.player.pos, this.lastMoveDir, count, damage, speed)
          this.projectiles.push(...projs)
        }
      } else if (weapon.kind === 'garlic') {
        const radius = (lvl.radius ?? 70) * this.stats.areaMult
        garlicTick(this.player.pos, this.enemies, radius, damage, dt)
        this.checkKills()
      }
      // bible 的位置與命中在下方步驟 4b 統一處理
    }

    // 4b) 聖經：依目前持有的聖經（若有）重建環繞物、更新位置並結算命中。
    this.updateBible(dt)
```

> 註：`fireWand`/`fireKnife` 不需鎖定回傳值即可（wand 無敵人回空陣列）。原本步驟 4 用到的
> `findNearest` 已移入 weapons.ts，World 不再直接呼叫；若 lint 報未使用 import，移除 `findNearest`。

(g) 新增私有方法 `updateBible` 與 `checkKills`（放在 `step` 之後）：

```ts
  /** 聖經：重建/更新環繞物位置並結算對敵人的命中（含 per-enemy 命中冷卻）。 */
  private updateBible(dt: number): void {
    const bible = this.weapons.find((w) => w.kind === 'bible')
    if (!bible) {
      this.orbitEntities = []
      return
    }
    const lvl = WEAPON_DEFS.bible.levels[bible.level - 1]
    const count = lvl.count ?? 1
    const radius = (lvl.radius ?? 90) * this.stats.areaMult
    const damage = lvl.damage * this.stats.damageMult
    this.bibleAngle += (lvl.angularSpeed ?? 2.5) * dt

    // 重建環繞物數量以對齊 count，並更新位置。
    const pts = orbitPositions(this.player.pos, count, radius, this.bibleAngle)
    if (this.orbitEntities.length !== count) {
      this.orbitEntities = pts.map((p) => createOrbit(p, damage))
    } else {
      for (let i = 0; i < count; i++) {
        this.orbitEntities[i].pos = pts[i]
        this.orbitEntities[i].damage = damage
      }
    }

    // 命中冷卻倒數。
    for (const [e, t] of this.bibleHitTimers) {
      const nt = t - dt
      if (nt <= 0 || !e.active) this.bibleHitTimers.delete(e)
      else this.bibleHitTimers.set(e, nt)
    }
    // 環繞物對重疊敵人扣血（冷卻外才扣）。
    for (const orb of this.orbitEntities) {
      for (const e of this.enemies) {
        if (!e.active) continue
        if (this.bibleHitTimers.has(e)) continue
        const dx = orb.pos.x - e.pos.x
        const dy = orb.pos.y - e.pos.y
        if (Math.hypot(dx, dy) <= orb.radius + e.radius) {
          e.hp -= orb.damage
          this.bibleHitTimers.set(e, 0.5) // 0.5 秒內不再被同武器扣血
        }
      }
    }
    this.checkKills()
  }

  /** 掃描敵人，凡 hp<=0 者記擊殺、掉寶並失效（供場域型武器命中後結算）。 */
  private checkKills(): void {
    for (const e of this.enemies) {
      if (e.active && e.hp <= 0) {
        e.active = false
        this.kills += 1
        this.gemEntities.push(createGem(e.pos, e.xp))
      }
    }
  }
```

> 投射物命中（原步驟 5）已有自己的擊殺/掉寶邏輯，維持不動。`checkKills` 只處理場域/環繞造成的死亡。

(h) 確認步驟 8（清理）維持；orbitEntities 不需篩除（每格重建/對齊）。

- [ ] **Step 4：執行全部測試**

Run: `npm test`
Expected: PASS（含新 World 測試與既有測試）

- [ ] **Step 5：型別檢查**

Run: `npm run typecheck`
Expected: 乾淨（若 Game.ts 仍紅，於 Task 8 修）

- [ ] **Step 6：commit**

```bash
git add src/engine/World.ts src/engine/World.test.ts
git commit -m "$(cat <<'EOF'
[mvp][feat][engine] World 接入多武器：weapons 迴圈、聖經環繞、大蒜場域

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 8：Game 迴圈接線（Game.ts）

**Files:**
- Modify: `src/engine/Game.ts`

- [ ] **Step 1：rollUpgrades 傳入 context**

把 `loop` 內：

```ts
          const opts = rollUpgrades(this.upgradeRng, 3)
```

改為：

```ts
          const opts = rollUpgrades(this.upgradeRng, 3, this.world.upgradeContext())
```

- [ ] **Step 2：型別檢查**

Run: `npm run typecheck`
Expected: 乾淨

- [ ] **Step 3：commit**

```bash
git add src/engine/Game.ts
git commit -m "$(cat <<'EOF'
[mvp][fix][engine] Game 升級抽選傳入 World 上下文

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 9：渲染（PixiRenderer.ts）

**Files:**
- Modify: `src/engine/PixiRenderer.ts`

- [ ] **Step 1：orbit 顏色 + 收集 orbits**

`COLORS` 新增一列：

```ts
const COLORS: Record<Entity['kind'], number> = {
  player: 0x4aa3ff,
  enemy: 0xff5252,
  projectile: 0xffe27a,
  gem: 0x6bff6b,
  orbit: 0xffd700,
}
```

在 `render()` 收集 `all` 的陣列中加入 orbits：

```ts
    const all: Entity[] = [
      ...world.gems(),
      ...world.activeEnemies(),
      ...world.projectiles.filter((p) => p.active),
      ...world.orbits(),
      world.player,
    ]
```

- [ ] **Step 2：大蒜場域圓（半透明）**

在 `PixiRenderer` 新增一個 garlic 場域用的 Graphics，於建構子建立並加到 `world` 容器最底層：

在建構子（`this.world = new Container(); app.stage.addChild(this.world)` 之後）加入：

```ts
    this.garlicAura = new Graphics()
    this.world.addChildAt(this.garlicAura, 0) // 置於最底層
```

並在類別欄位宣告：

```ts
  /** 大蒜場域的半透明圓（持有大蒜時顯示）。 */
  private garlicAura: Graphics
```

在 `render()` 結尾（鏡頭平移之前）依 World 暴露的大蒜資訊重畫光環。先在 World 增加一個輔助
查詢（若尚未有）：於 `World.ts` 新增：

```ts
  /** @returns 目前大蒜場域半徑；未持有大蒜則回 0。 */
  garlicRadius(): number {
    const g = this.weapons.find((w) => w.kind === 'garlic')
    if (!g) return 0
    const lvl = WEAPON_DEFS.garlic.levels[g.level - 1]
    return (lvl.radius ?? 0) * this.stats.areaMult
  }
```

renderer `render()` 內：

```ts
    const gr = world.garlicRadius()
    this.garlicAura.clear()
    if (gr > 0) {
      this.garlicAura.circle(world.player.pos.x, world.player.pos.y, gr).fill({ color: 0x9b59b6, alpha: 0.15 })
    }
```

> 註：garlicAura 直接畫在世界座標（與其他 entity 同一容器），故用 player 世界座標、隨鏡頭平移自然
> 對齊。`garlicRadius()` 屬讀取查詢，需要時在 Task 7 一併加入亦可。

- [ ] **Step 3：型別檢查 + build**

Run: `npm run typecheck && npm run build`
Expected: 乾淨

- [ ] **Step 4：commit**

```bash
git add src/engine/PixiRenderer.ts src/engine/World.ts
git commit -m "$(cat <<'EOF'
[mvp][feat][engine] 渲染聖經環繞物與大蒜場域圓

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 10：驗證與進度更新

**Files:**
- Modify: `progress.md`

- [ ] **Step 1：完整測試 + 型別 + build**

Run: `npm test && npm run typecheck && npm run build`
Expected: 測試全綠、型別乾淨、build 乾淨

- [ ] **Step 2：lint**

Run: `npm run lint`
Expected: 無錯誤（或自動修正後乾淨）

- [ ] **Step 3：瀏覽器煙霧測試**

Run: `npm run dev`，於瀏覽器逐項確認 acceptance.md 中「瀏覽器煙霧測試」相關項目：
解鎖四把武器、各自開火、升級卡顯示三類、被動生效、0 console error。

- [ ] **Step 4：更新 acceptance.md 勾選 + progress.md**

依實際結果勾選 `acceptance.md`，並把 `progress.md` 的「階段 2」項目「多種武器（以及武器專屬的
升級）」標記完成、更新驗證快照。

- [ ] **Step 5：commit**

```bash
git add progress.md docs/superpowers/specs/multi-weapons/acceptance.md
git commit -m "$(cat <<'EOF'
[mvp][docs][meta] 多武器功能驗證通過，更新 progress 與 acceptance

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## 自我檢查（Self-Review）結果

- **Spec 覆蓋：** FR-1〜FR-6 與所有 acceptance 項目皆有對應 task（武器共存=Task7；行為=Task4/7；
  升級候選=Task6；乘區被動=Task6；渲染=Task9；確定性=Task6 測試）。
- **型別一致：** `Weapon{kind,level,cooldownTimer}`、`UpgradeContext{stats,weapons,heal}`、
  `applyUpgradeById`、`buildCandidates`、`rollUpgrades(rng,count,ctx)`、`fireWand/fireKnife/
  orbitPositions/garlicTick`、`findNearestN`、`createOrbit`、`orbits()`、`upgradeContext()`、
  `garlicRadius()` 在各 task 間命名一致。
- **無 placeholder：** 所有步驟皆含實際程式碼與指令。
