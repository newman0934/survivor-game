# coop-multiplayer-world (1A) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 `World` 從單一玩家重構為 `players: PlayerState[]` 多玩家共享一個世界，所有 system 對 N 玩家運作，難度依人數放大；N=1 行為與現況完全一致。

**Architecture:** 先以「PlayerState + players[0] + 指向 players[0] 的相容存取器」做純內部重構（step 不動、既有測試全綠），再逐 system 把 `this.<單人欄位>` 換成「對 livingPlayers 迴圈、用 `p.<欄位>`」。因相容存取器讓 `world.player/stats/weapons/moveInput/summary/isPlayerDead` 仍回 players[0]，`Game.ts`/`PixiRenderer` 無需改動。

**Tech Stack:** TypeScript、Vitest（引擎單元測試）。

## Global Constraints

- 文件繁中；程式碼/型別/commit 英文。
- 引擎 `src/engine/**` 純 TS、執行期不得 import Vue/Pinia；模擬中不得 `Math.random()`；固定步長 1/60。
- **N=1 零退化**：每個 task 結束時**既有 `World.test.ts` 不得修改且全綠**（行為等同保證）；`npm run typecheck`、`npm run build` 乾淨。
- 玩家以固定 index 升冪迭代，確保確定性。
- 機制定稿：敵人追最近存活玩家；難度＝生怪間隔 ÷ playerCount、Boss/終局 Boss hp × playerCount；vacuum 吸向觸發玩家；mercy 回血門檻＝任一存活玩家 <50%；經驗/撿取歸「碰到的玩家」。
- 升級在 1A 僅做引擎層 per-player；非阻塞 UX 屬 1B。多鏡頭/HUD 屬 SP3；網路屬 SP4。
- commit 格式 `[mvp][type][scope] 描述` + 結尾 `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`。

---

## 檔案結構（本案異動）

| 檔案 | 異動 | 責任 |
|------|------|------|
| `src/engine/types.ts` | Modify | `PlayerState` 介面 |
| `src/engine/World.ts` | Modify | players[]、相容 proxy、建構子、各 system 逐玩家化、難度、死亡、helper |
| `src/engine/World.test.ts` | Modify | **既有保留不動**；新增 N>1 測試 |

> `Game.ts`/`PixiRenderer`/`stores`：因相容存取器回 players[0]，預期**零改動**；若任一 task typecheck 顯示破裂，於該 task 內以最小改動對齊（記錄於報告）。

八個 task，每個結束時 N=1 全綠：
T1 PlayerState + players[0] + proxy（step 不動）→ T2 多玩家建構 + helper → T3 移動 → T4 武器/聖經 → T5 敵人 AI/接觸傷害 → T6 經驗/撿取 → T7 難度依人數 → T8 死亡/觀戰 + 收尾。

---

### Task 1: PlayerState + players[0] + 相容存取器（純內部重構、零測試改動）

**Files:**
- Modify: `src/engine/types.ts`（新增 `PlayerState`）
- Modify: `src/engine/World.ts`（欄位 66-173、建構子 179-202）
- Test: `src/engine/World.test.ts`（**不改**，作為回歸護欄）

**Interfaces:**
- Produces：`PlayerState`；`World.players: PlayerState[]`（長度 1）；相容存取器 `player/stats/weapons/passives/playerColor/playerCharacter/level/xp/pendingLevelUps/lastMoveDir/moveInput/vacuumTimer/bibleAngle/orbitEntities/bibleHitTimers` 皆 get/set 至 `players[0]`。

- [ ] **Step 1: 新增 `PlayerState`（types.ts）**

在 `src/engine/types.ts` `PlayerStats` 介面之後新增：

```ts
/** 單一玩家的完整狀態（多玩家 World 每位玩家一份）。 */
export interface PlayerState {
  entity: Entity
  character: CharacterKind
  /** 玩家圓顏色（取自角色）。 */
  color: number
  stats: PlayerStats
  weapons: Weapon[]
  passives: Passive[]
  level: number
  xp: number
  pendingLevelUps: number
  lastMoveDir: Vec2
  moveInput: Vec2
  vacuumTimer: number
  alive: boolean
  /** 聖經環繞 per-player 執行期狀態。 */
  bibleAngle: number
  orbitEntities: Entity[]
  bibleHitTimers: Map<Entity, number>
}
```

確認 `types.ts` 頂部已 import/具備 `Entity`、`PlayerStats`、`Weapon`、`Passive`、`CharacterKind`、`Vec2`（多數已存在；`Vec2` 來自 `./core/vector`，若無則 `import type { Vec2 } from './core/vector'`）。

- [ ] **Step 2: 建立 PlayerState 工廠 + players[]（World.ts）**

`src/engine/World.ts`：import 補 `PlayerState`（`import type { …, PlayerState } from './types'`）。新增私有工廠（放在建構子之前）：

```ts
  /** 依角色建立一位玩家的初始 PlayerState（起始武器/數值/血/被動/顏色）。 */
  private static makePlayerState(character: CharacterKind): PlayerState {
    const def = CHARACTER_DEFS[character]
    const entity = createPlayer({ x: 0, y: 0 })
    entity.maxHp = def.maxHp
    entity.hp = def.maxHp
    const stats: PlayerStats = {
      moveSpeed: 200, pickupRadius: 120, damageMult: 1, cooldownMult: 1,
      projectileSpeedMult: 1, areaMult: 1, regen: 0, armor: 0, xpGain: 1,
    }
    Object.assign(stats, def.statMods)
    return {
      entity, character, color: def.color, stats,
      weapons: [{ kind: def.startWeapon, level: 1, cooldownTimer: 0 }],
      passives: [], level: 1, xp: 0, pendingLevelUps: 0,
      lastMoveDir: { x: 1, y: 0 }, moveInput: { x: 0, y: 0 }, vacuumTimer: 0, alive: true,
      bibleAngle: 0, orbitEntities: [], bibleHitTimers: new Map(),
    }
  }
```

- [ ] **Step 3: 欄位改 players[] + 相容存取器（World.ts）**

把 World 中這些**實例欄位**移除：`player`(68)、`stats`(82-93)、`weapons`(96)、`passives`(98)、`playerColor`(100)、`playerCharacter`(102)、`lastMoveDir`(116)、`moveInput`(125)、`vacuumTimer`(137)、`bibleAngle`(118)、`orbitEntities`(120)、`bibleHitTimers`(122)、`level`(161)、`xp`(169)、`pendingLevelUps`(173)。改為：

```ts
  /** 全部玩家（index 0 為單人/本地玩家）。 */
  players: PlayerState[] = []

  // ── 相容存取器：一律作用於 players[0]，使既有單人呼叫端/測試零改動 ──
  get player(): Entity { return this.players[0].entity }
  get stats(): PlayerStats { return this.players[0].stats }
  get weapons(): Weapon[] { return this.players[0].weapons }
  get passives(): Passive[] { return this.players[0].passives }
  get playerColor(): number { return this.players[0].color }
  get playerCharacter(): CharacterKind { return this.players[0].character }
  get moveInput(): Vec2 { return this.players[0].moveInput }
  set moveInput(v: Vec2) { this.players[0].moveInput = v }
  private get lastMoveDir(): Vec2 { return this.players[0].lastMoveDir }
  private set lastMoveDir(v: Vec2) { this.players[0].lastMoveDir = v }
  private get vacuumTimer(): number { return this.players[0].vacuumTimer }
  private set vacuumTimer(v: number) { this.players[0].vacuumTimer = v }
  private get bibleAngle(): number { return this.players[0].bibleAngle }
  private set bibleAngle(v: number) { this.players[0].bibleAngle = v }
  private get orbitEntities(): Entity[] { return this.players[0].orbitEntities }
  private set orbitEntities(v: Entity[]) { this.players[0].orbitEntities = v }
  private get bibleHitTimers(): Map<Entity, number> { return this.players[0].bibleHitTimers }
  private get level(): number { return this.players[0].level }
  private set level(v: number) { this.players[0].level = v }
  private get xp(): number { return this.players[0].xp }
  private set xp(v: number) { this.players[0].xp = v }
  private get pendingLevelUps(): number { return this.players[0].pendingLevelUps }
  private set pendingLevelUps(v: number) { this.players[0].pendingLevelUps = v }
```

> `currentLevel` getter（164）保留不動（讀 `this.level` 即 proxy）。`mapKind/mapBgColor/...`、`kills`、計時器、`enemies/gems/...` 等共享欄位**維持原樣**。

- [ ] **Step 4: 建構子建立 players[0]（World.ts）**

把建構子（179-202）的玩家初始化（183-194）改為建立 players[0]，地圖段不變：

```ts
  constructor(seed: number, character: CharacterKind = 'macrophage', map: MapKind = 'vessel', finalBossTime: number = FINAL_BOSS_TIME) {
    this.rng = createRng(seed)
    this.finalBossTime = finalBossTime
    this.pickupRng = createRng(seed ^ 0x5bd1e995)
    this.players = [World.makePlayerState(character)]
    // 起始被動套用（沿用既有：建好玩家後逐一 apply）
    const p0 = this.players[0]
    for (const pk of CHARACTER_DEFS[character].startPassives) {
      p0.passives.push({ kind: pk, level: 1 })
      PASSIVE_DEFS[pk].apply(this.upgradeContext())
    }
    const m = MAP_DEFS[map]
    this.mapKind = map
    this.mapBgColor = m.bgColor
    this.mapGridColor = m.gridColor
    this.mapGridAlpha = m.gridAlpha
    this.mapSpawnIntervalMult = m.spawnIntervalMult
    this.mapEnemyHpMult = m.enemyHpMult
  }
```

> 注意 `makePlayerState` 已設 entity hp/maxHp、stats、weapons；此處只補 startPassives（沿用 `upgradeContext()` 作用於 players[0]）。`step()`、`upgradeContext()`、`grantXp()`、`summary()` 等方法**本步不改**——它們透過 proxy 仍正確讀寫 players[0]。

- [ ] **Step 5: 型別檢查 + 全測試（回歸護欄）**

Run: `npm run typecheck && npm test`
Expected: typecheck 無錯；**既有測試全數通過、無需修改任何測試**（N=1 行為等同）。若有測試紅，表示 proxy/建構子未完全等價——修到全綠為止，不得改測試期望值。

- [ ] **Step 6: Commit**

```bash
git add src/engine/types.ts src/engine/World.ts
git commit -m "$(printf '%s\n\n%s' '[mvp][refactor][engine] World 引入 PlayerState + players[0] + 相容存取器（行為不變、N=1 全綠）' 'Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

### Task 2: 多玩家建構 + playerCount / setMoveInput / hasLost / livingPlayers

**Files:**
- Modify: `src/engine/World.ts`（建構子、新增方法）
- Test: `src/engine/World.test.ts`（新增 N>1 建構測試）

**Interfaces:**
- Consumes：T1 的 `players`、`makePlayerState`。
- Produces：建構子 `character: CharacterKind | CharacterKind[]`；`get playerCount`、`setMoveInput(i, dir)`、`hasLost()`、私有 `livingPlayers()`、`nearestLivingPlayer(pos)`。

- [ ] **Step 1: 寫失敗測試**

在 `src/engine/World.test.ts` 新增：

```ts
  it('陣列角色建立多名玩家、各自起始武器', () => {
    const w = new World(1, ['macrophage', 'neutrophil'])
    expect(w.playerCount).toBe(2)
    expect(w.players[0].weapons[0].kind).toBe('antibody')
    expect(w.players[1].weapons[0].kind).toBe('perforin')
    expect(w.players[1].entity.maxHp).toBe(80) // neutrophil
  })

  it('單一角色與省略仍為 N=1', () => {
    expect(new World(1).playerCount).toBe(1)
    expect(new World(1, 'nkcell').playerCount).toBe(1)
  })

  it('全員存活時 hasLost 為 false', () => {
    const w = new World(1, ['macrophage', 'neutrophil'])
    expect(w.hasLost()).toBe(false)
  })
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `npx vitest run src/engine/World.test.ts -t "陣列角色|hasLost"`
Expected: FAIL — 建構子不接受陣列 / `playerCount`/`hasLost` 不存在。

- [ ] **Step 3: 建構子接受陣列 + 新方法（World.ts）**

把建構子簽章與玩家建立改為支援陣列：

```ts
  constructor(seed: number, character: CharacterKind | CharacterKind[] = 'macrophage', map: MapKind = 'vessel', finalBossTime: number = FINAL_BOSS_TIME) {
    this.rng = createRng(seed)
    this.finalBossTime = finalBossTime
    this.pickupRng = createRng(seed ^ 0x5bd1e995)
    const characters = Array.isArray(character) ? character : [character]
    this.players = characters.map((c) => World.makePlayerState(c))
    for (const p of this.players) {
      for (const pk of CHARACTER_DEFS[p.character].startPassives) {
        p.passives.push({ kind: pk, level: 1 })
        PASSIVE_DEFS[pk].apply(this.upgradeContextFor(p))
      }
    }
    const m = MAP_DEFS[map]
    this.mapKind = map; this.mapBgColor = m.bgColor; this.mapGridColor = m.gridColor
    this.mapGridAlpha = m.gridAlpha; this.mapSpawnIntervalMult = m.spawnIntervalMult; this.mapEnemyHpMult = m.enemyHpMult
  }
```

新增 per-player 版 `upgradeContextFor(p)`（供起始被動與後續升級用），並讓既有 `upgradeContext()` 委派 players[0]：

```ts
  /** 指定玩家的升級上下文（leveling/passive 就地修改）。 */
  upgradeContextFor(p: PlayerState): UpgradeContext {
    return {
      stats: p.stats, weapons: p.weapons, passives: p.passives, player: p.entity,
      heal: (amount: number) => { p.entity.hp = Math.min(p.entity.maxHp, p.entity.hp + amount) },
    }
  }
  /** 相容：players[0] 的升級上下文。 */
  upgradeContext(): UpgradeContext { return this.upgradeContextFor(this.players[0]) }
```

新增方法：

```ts
  /** 玩家數。 */
  get playerCount(): number { return this.players.length }
  /** 設定指定玩家的移動輸入方向。 */
  setMoveInput(playerIndex: number, dir: Vec2): void {
    const p = this.players[playerIndex]
    if (p) p.moveInput = dir
  }
  /** 全部玩家皆不存活（hp<=0）＝本局失敗。 */
  hasLost(): boolean { return this.players.every((p) => p.entity.hp <= 0) }
  /** 目前存活玩家（hp>0），固定 index 升冪。 */
  private livingPlayers(): PlayerState[] { return this.players.filter((p) => p.entity.hp > 0) }
  /** 離指定座標最近的存活玩家（無存活玩家時回 players[0]）。 */
  private nearestLivingPlayer(pos: Vec2): PlayerState {
    const living = this.livingPlayers()
    if (living.length === 0) return this.players[0]
    let best = living[0], bestD = distance(best.entity.pos, pos)
    for (let i = 1; i < living.length; i++) {
      const d = distance(living[i].entity.pos, pos)
      if (d < bestD) { bestD = d; best = living[i] }
    }
    return best
  }
```

> 既有 `upgradeContext()` 原定義（若存在於 270 附近）以上面委派版取代。`UpgradeContext` 型別已 import。

- [ ] **Step 4: 跑測試確認通過 + 全測試**

Run: `npx vitest run src/engine/World.test.ts && npm run typecheck`
Expected: 新增 3 筆 PASS；既有全綠（step 仍只實際驅動 players[0]，players[1+] 暫為惰性）；typecheck 乾淨。

- [ ] **Step 5: Commit**

```bash
git add src/engine/World.ts src/engine/World.test.ts
git commit -m "$(printf '%s\n\n%s' '[mvp][feat][engine] World 建構子支援多角色 + playerCount/setMoveInput/hasLost/livingPlayers/nearestLivingPlayer' 'Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

### Task 3: 逐玩家移動 + lastMoveDir

**Files:** Modify `src/engine/World.ts`（step 區段 1，line 423-431）；Test `src/engine/World.test.ts`

**Interfaces:** Consumes `livingPlayers()`、`PlayerState.moveInput/lastMoveDir/stats/entity`。

- [ ] **Step 1: 寫失敗測試**

```ts
  it('各玩家依自己輸入移動', () => {
    const w = new World(1, ['macrophage', 'neutrophil'])
    const x0 = w.players[0].entity.pos.x, x1 = w.players[1].entity.pos.x
    w.setMoveInput(0, { x: 1, y: 0 })
    w.setMoveInput(1, { x: -1, y: 0 })
    for (let i = 0; i < 30; i++) w.step(1 / 60)
    expect(w.players[0].entity.pos.x).toBeGreaterThan(x0)
    expect(w.players[1].entity.pos.x).toBeLessThan(x1)
  })
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `npx vitest run src/engine/World.test.ts -t "各玩家依自己輸入移動"`
Expected: FAIL — players[1] 不動（step 只動 players[0]）。

- [ ] **Step 3: 逐玩家移動（World.ts）**

把 step 區段 1（423-431）改為對存活玩家迴圈：

```ts
    // 1) 玩家移動：每位存活玩家依自己輸入位移、更新各自 lastMoveDir。
    for (const p of this.livingPlayers()) {
      p.entity.vel = { x: p.moveInput.x * p.stats.moveSpeed, y: p.moveInput.y * p.stats.moveSpeed }
      applyVelocity(p.entity, dt)
      if (p.moveInput.x !== 0 || p.moveInput.y !== 0) {
        const len = Math.hypot(p.moveInput.x, p.moveInput.y) || 1
        p.lastMoveDir = { x: p.moveInput.x / len, y: p.moveInput.y / len }
      }
    }
```

- [ ] **Step 4: 跑測試 + 全測試**

Run: `npx vitest run src/engine/World.test.ts && npm run typecheck`
Expected: 新測試 PASS；既有 N=1 全綠（單一玩家迴圈等價原碼）。

- [ ] **Step 5: Commit**

```bash
git add src/engine/World.ts src/engine/World.test.ts
git commit -m "$(printf '%s\n\n%s' '[mvp][feat][engine] 逐玩家移動 + 各自 lastMoveDir' 'Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

### Task 4: 逐玩家武器 + 聖經 per-player

**Files:** Modify `src/engine/World.ts`（step 區段 4，line 506-597；`updateBible` 714-；`orbits()` getter）；Test `src/engine/World.test.ts`

**Interfaces:** Consumes `livingPlayers()`、`PlayerState.weapons/stats/lastMoveDir/entity/bibleAngle/orbitEntities/bibleHitTimers`。

- [ ] **Step 1: 寫失敗測試**

```ts
  it('各玩家武器各自開火（兩玩家分處兩地各自產生子彈）', () => {
    const w = new World(1, ['macrophage', 'macrophage'])
    w.players[1].entity.pos = { x: 2000, y: 0 }
    // 在兩玩家附近各放一隻敵人，讓 antibody 有目標
    w.spawnEnemyAt({ x: w.players[0].entity.pos.x + 40, y: 0 })
    w.spawnEnemyAt({ x: 2040, y: 0 })
    w.forceFire()
    w.step(1 / 60)
    const near0 = w.projectiles.some((p) => Math.abs(p.pos.x - w.players[0].entity.pos.x) < 60)
    const near1 = w.projectiles.some((p) => Math.abs(p.pos.x - 2000) < 60)
    expect(near0).toBe(true)
    expect(near1).toBe(true)
  })
```

> `forceFire()` 需重置所有玩家武器冷卻——見 Step 3 一併更新。

- [ ] **Step 2: 跑測試確認失敗**

Run: `npx vitest run src/engine/World.test.ts -t "各玩家武器各自開火"`
Expected: FAIL — 只有 players[0] 開火。

- [ ] **Step 3: 逐玩家武器迴圈（World.ts）**

把 step 區段 4（`for (const weapon of this.weapons) { … }`，506-597）整段外層包一層玩家迴圈，並把內部 `this.weapons`→`p.weapons`、`this.stats`→`p.stats`、`this.player`→`p.entity`、`this.lastMoveDir`→`p.lastMoveDir`、`this.effectiveLevel`→沿用（吃 weapon 參數，不變）。形如：

```ts
    // 4) 武器：每位存活玩家各自的武器，瞄準離自己最近的敵人、用自己 stats 開火。
    for (const p of this.livingPlayers()) {
      for (const weapon of p.weapons) {
        const def = WEAPON_DEFS[weapon.kind]
        const lvl = this.effectiveLevel(weapon)
        const evo = weapon.evolved ? def.evolution : undefined
        const damage = lvl.damage * p.stats.damageMult
        // …（原 513-595 內容，將 this.player→p.entity、this.stats→p.stats、this.lastMoveDir→p.lastMoveDir）…
      }
    }
```

逐一替換對照（原行→新）：
- `fireWand(this.player.pos, this.enemies, …)` → `fireWand(p.entity.pos, this.enemies, …)`
- `fireKnife(this.player.pos, this.lastMoveDir, …)` → `fireKnife(p.entity.pos, p.lastMoveDir, …)`
- inflammation/phagocyte/cascade/nova 內所有 `this.player.pos`→`p.entity.pos`、`this.stats.*`→`p.stats.*`、`this.lastMoveDir`→`p.lastMoveDir`、`this.player.hp/maxHp`（fieldRegen）→`p.entity.hp/maxHp`。
- `this.checkKills()`、`this.soundEventQueue.push`、`this.fxEventQueue.push`、`this.enemyGrid.queryRadius`、`MAX_ENEMY_RADIUS` 維持（共享）。

把 `4b) this.updateBible(dt)`（600）改為逐玩家：

```ts
    // 4b) 聖經：每位存活玩家各自的環繞物。
    for (const p of this.livingPlayers()) this.updateBibleFor(p, dt)
```

把 `updateBible(dt)`（714-）改名為 `updateBibleFor(p: PlayerState, dt: number)`，內部 `this.weapons`→`p.weapons`、`this.stats`→`p.stats`、`this.player`→`p.entity`、`this.bibleAngle`→`p.bibleAngle`、`this.orbitEntities`→`p.orbitEntities`、`this.bibleHitTimers`→`p.bibleHitTimers`。保留相容 `private updateBible(dt){ this.updateBibleFor(this.players[0], dt) }` 非必要（已無呼叫端），可移除。

更新 `forceFire()` 與 `orbits()`：

```ts
  /** 強制下一格立即開火（重置所有玩家所有武器計時）。 */
  forceFire(): void { for (const p of this.players) for (const w of p.weapons) w.cooldownTimer = 0 }
  /** 全部玩家的聖經環繞物（供 renderer）。 */
  orbits(): Entity[] { return this.players.flatMap((p) => p.orbitEntities) }
```

> `effectiveLevel(weapon)` 不變（只吃 weapon）。

- [ ] **Step 4: 跑測試 + 全測試**

Run: `npx vitest run src/engine/World.test.ts && npm run typecheck`
Expected: 新測試 PASS；既有 N=1 全綠。

- [ ] **Step 5: Commit**

```bash
git add src/engine/World.ts src/engine/World.test.ts
git commit -m "$(printf '%s\n\n%s' '[mvp][feat][engine] 逐玩家武器開火 + 聖經 per-player（updateBibleFor/forceFire/orbits）' 'Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

### Task 5: 敵人 AI 追最近玩家 + spitter + 逐玩家接觸傷害/敵彈/回復

**Files:** Modify `src/engine/World.ts`（step 區段 3 line 481-501、5b 628-639、7 680-690、7b 692-695）；Test `src/engine/World.test.ts`

**Interfaces:** Consumes `nearestLivingPlayer(pos)`、`livingPlayers()`。

- [ ] **Step 1: 寫失敗測試**

```ts
  it('敵人追最近的存活玩家', () => {
    const w = new World(1, ['macrophage', 'macrophage'])
    w.players[0].entity.pos = { x: -500, y: 0 }
    w.players[1].entity.pos = { x: 500, y: 0 }
    const e = w.spawnEnemyAt({ x: 480, y: 0 }) // 靠近玩家 1
    const dBefore = Math.abs(e.pos.x - 500)
    for (let i = 0; i < 30; i++) w.step(1 / 60)
    expect(Math.abs(e.pos.x - 500)).toBeLessThan(dBefore) // 朝玩家 1 靠近
  })

  it('接觸傷害只打到重疊的玩家', () => {
    const w = new World(1, ['macrophage', 'macrophage'])
    w.players[0].entity.pos = { x: -500, y: 0 }
    w.players[1].entity.pos = { x: 500, y: 0 }
    const hp0 = w.players[0].entity.hp, hp1 = w.players[1].entity.hp
    w.spawnEnemyAt({ x: 500, y: 0 }) // 與玩家 1 重疊
    w.step(1 / 60)
    expect(w.players[1].entity.hp).toBeLessThan(hp1)
    expect(w.players[0].entity.hp).toBe(hp0)
  })
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `npx vitest run src/engine/World.test.ts -t "敵人追最近|接觸傷害只打到"`
Expected: FAIL — 敵人只追 players[0] / 只有 players[0] 受傷。

- [ ] **Step 3: 逐玩家化敵人 AI 與傷害（World.ts）**

**區段 3（481-501）**：敵人 AI 改追最近玩家：

```ts
    // 3) 敵人 AI：每隻朝最近的存活玩家轉向後位移。
    for (const e of this.enemies) {
      if (!e.active) continue
      if (e.affix === 'regen') {
        e.hp = Math.min(e.maxHp, e.hp + e.maxHp * ELITE_AFFIX_DEFS.regen.regenPerSec * dt)
      }
      const target = this.nearestLivingPlayer(e.pos).entity
      steerEnemy(e, target.pos, dt)
      applyVelocity(e, dt)
      if (e.enemyKind === 'spitter') {
        const spit = ENEMY_DEFS.spitter.spit!
        if (spitterTick(e, dt, spit.interval)) {
          const dx = target.pos.x - e.pos.x, dy = target.pos.y - e.pos.y
          const len = Math.hypot(dx, dy) || 1
          this.enemyProjectiles.push(createEnemyProjectile(e.pos, { x: dx / len, y: dy / len }, spit.projSpeed, spit.projDamage))
          this.soundEventQueue.push('shoot')
        }
      }
    }
```

**區段 5b（628-639）** 敵彈命中：對每位存活玩家判定：

```ts
    for (const proj of this.enemyProjectiles) {
      if (!proj.active) continue
      applyVelocity(proj, dt)
      proj.life -= dt
      if (proj.life <= 0) { proj.active = false; continue }
      for (const p of this.livingPlayers()) {
        if (circlesOverlap(proj, p.entity)) {
          p.entity.hp -= Math.max(0, proj.damage - p.stats.armor)
          this.soundEventQueue.push('hurt')
          proj.active = false
          break
        }
      }
    }
```

**區段 7（680-690）** 接觸傷害：逐玩家：

```ts
    // 7) 敵人接觸傷害：對每位存活玩家，與其重疊的敵人持續扣血（套該玩家護甲）。
    for (const p of this.livingPlayers()) {
      const contactCands = this.enemyGrid.queryRadius(p.entity.pos.x, p.entity.pos.y, p.entity.radius + MAX_ENEMY_RADIUS)
      for (const e of contactCands) {
        if (!e.active) continue
        if (circlesOverlap(e, p.entity)) {
          p.entity.hp -= Math.max(0, e.damage - p.stats.armor) * dt * 10
          this.soundEventQueue.push('hurt')
        }
      }
    }
```

**區段 7b（692-695）** 回復：逐玩家：

```ts
    for (const p of this.livingPlayers()) {
      if (p.entity.hp > 0 && p.stats.regen > 0) {
        p.entity.hp = Math.min(p.entity.maxHp, p.entity.hp + p.stats.regen * dt)
      }
    }
```

- [ ] **Step 4: 跑測試 + 全測試**

Run: `npx vitest run src/engine/World.test.ts && npm run typecheck`
Expected: 新測試 PASS；既有 N=1 全綠（最近玩家＝唯一玩家、逐玩家迴圈等價）。

- [ ] **Step 5: Commit**

```bash
git add src/engine/World.ts src/engine/World.test.ts
git commit -m "$(printf '%s\n\n%s' '[mvp][feat][engine] 敵人追最近存活玩家 + spitter/敵彈/接觸傷害/回復逐玩家化' 'Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

### Task 6: 逐玩家經驗/寶石/撿取物/寶箱 + grantXp(playerIndex)

**Files:** Modify `src/engine/World.ts`（step 區段 6 line 641-655、6b 657-667、6c 669-678；`grantXp` 377-；`applyPickup` 788-；`maybeDropPickup` 779-）；Test `src/engine/World.test.ts`

**Interfaces:** Consumes `livingPlayers()`、`PlayerState.*`。Produces `grantXpTo(p, amount)`、`applyPickupTo(p, kind)`；相容 `grantXp(amount)`/`consumeLevelUp()`/`applyUpgrade(id)` → players[0]。

- [ ] **Step 1: 寫失敗測試**

```ts
  it('寶石只給碰到它的玩家經驗（各自升級）', () => {
    const w = new World(1, ['macrophage', 'macrophage'])
    w.players[0].entity.pos = { x: -1000, y: 0 }
    w.players[1].entity.pos = { x: 1000, y: 0 }
    w.players[0].stats.pickupRadius = 0
    w.players[1].stats.pickupRadius = 0
    // 在玩家 1 腳下放一顆大經驗寶石
    w.gemEntities.push({ ...w.spawnEnemyAt({ x: 5000, y: 5000 }), kind: 'gem', enemyKind: undefined } as never) // 佔位避免誤用
    w.gemEntities.length = 0
    const before1 = w.players[1].xp + w.players[1].level
    w.spawnGemForTest({ x: 1000, y: 0 }, 100) // 見 Step 3 測試輔助
    w.step(1 / 60)
    expect(w.players[1].xp + w.players[1].level).toBeGreaterThan(before1)
    expect(w.players[0].xp).toBe(0)
    expect(w.players[0].level).toBe(1)
  })
```

> 為可控測試，Step 3 加一個測試輔助 `spawnGemForTest(pos, xp)`（建立經驗寶石進 `gemEntities`）。

- [ ] **Step 2: 跑測試確認失敗**

Run: `npx vitest run src/engine/World.test.ts -t "寶石只給碰到"`
Expected: FAIL — 無 `spawnGemForTest` / 經驗記到 players[0]。

- [ ] **Step 3: 逐玩家撿取（World.ts）**

新增測試輔助與 per-player grantXp：

```ts
  /** 測試輔助：在指定位置放一顆經驗寶石。 */
  spawnGemForTest(pos: Vec2, xp: number): Entity {
    const g = createGem(pos, xp)
    this.gemEntities.push(g)
    return g
  }

  /** 對指定玩家加經驗、必要時升級（per-player）。 */
  private grantXpTo(p: PlayerState, amount: number): void {
    p.xp += amount
    while (p.xp >= xpForLevel(p.level)) {
      p.xp -= xpForLevel(p.level)
      p.level += 1
      p.pendingLevelUps += 1
      this.soundEventQueue.push('levelup')
    }
  }
  /** 相容：players[0] 加經驗。 */
  grantXp(amount: number): void { this.grantXpTo(this.players[0], amount) }
```

> 對照既有 `grantXp`（377-）邏輯搬進 `grantXpTo`（把 `this.xp/level/pendingLevelUps`→`p.*`），確保升級判定一致。

**區段 6（641-655）** 寶石：逐玩家收取（固定 index 順序，先到先得）：

```ts
    // 6) 寶石：每位存活玩家依自己 pickupRadius/vacuum 吸取並收取；同幀以 index 升冪先到先得。
    for (const p of this.livingPlayers()) {
      if (p.vacuumTimer > 0) p.vacuumTimer = Math.max(0, p.vacuumTimer - dt)
      const gemRadius = p.vacuumTimer > 0 ? Infinity : p.stats.pickupRadius
      const gemPull = p.vacuumTimer > 0 ? VACUUM_PULL_SPEED : GEM_PULL_SPEED
      for (const g of this.gemEntities) {
        if (!g.active) continue
        attractGem(g, p.entity.pos, gemRadius, gemPull)
        applyVelocity(g, dt)
        if (distance(g.pos, p.entity.pos) <= p.entity.radius) {
          g.active = false
          this.grantXpTo(p, g.xp * p.stats.xpGain)
        }
      }
    }
```

> 注意：原本每幀對每顆寶石只 `applyVelocity` 一次；多玩家下若每位玩家都 `applyVelocity` 會多次位移。為維持單顆寶石每幀一次位移且確定性，改為：**先讓「最近且在範圍內的玩家」決定吸引向量並位移一次，再判收取**。實作改為對每顆寶石找最近的「吸引者」：

```ts
    // 6) 寶石：每顆找最近的存活玩家為吸引者，位移一次後若進入其半徑則由其收取。
    for (const p of this.livingPlayers()) {
      if (p.vacuumTimer > 0) p.vacuumTimer = Math.max(0, p.vacuumTimer - dt)
    }
    for (const g of this.gemEntities) {
      if (!g.active) continue
      const p = this.nearestLivingPlayer(g.pos)
      const vac = p.vacuumTimer > 0
      attractGem(g, p.entity.pos, vac ? Infinity : p.stats.pickupRadius, vac ? VACUUM_PULL_SPEED : GEM_PULL_SPEED)
      applyVelocity(g, dt)
      if (distance(g.pos, p.entity.pos) <= p.entity.radius) {
        g.active = false
        this.grantXpTo(p, g.xp * p.stats.xpGain)
      }
    }
```

> 採用後者（每顆寶石單一吸引者＝最近玩家），確定且每幀一次位移；vacuum 由「最近玩家」是否啟動決定，與「吸向觸發玩家」語意一致（觸發者通常即最近者）。N=1 完全等價原碼。

**區段 6b 寶箱（657-667）**：碰到的玩家 pendingLevelUps +1：

```ts
    for (const c of this.chestEntities) {
      if (!c.active) continue
      const p = this.nearestLivingPlayer(c.pos)
      attractGem(c, p.entity.pos, p.stats.pickupRadius, GEM_PULL_SPEED)
      applyVelocity(c, dt)
      if (distance(c.pos, p.entity.pos) <= p.entity.radius) {
        c.active = false
        p.pendingLevelUps += 1
        this.soundEventQueue.push('chest')
      }
    }
```

**區段 6c 撿取物（669-678）**：

```ts
    for (const pk of this.pickupEntities) {
      if (!pk.active) continue
      const p = this.nearestLivingPlayer(pk.pos)
      attractGem(pk, p.entity.pos, p.stats.pickupRadius, GEM_PULL_SPEED)
      applyVelocity(pk, dt)
      if (distance(pk.pos, p.entity.pos) <= p.entity.radius) {
        pk.active = false
        this.applyPickupTo(p, pk.pickupKind!)
      }
    }
```

`applyPickup`（788-）改為 `applyPickupTo(p, kind)`（`this.player`→`p.entity`、`this.vacuumTimer`→`p.vacuumTimer`），相容 `applyPickup(kind)` 委派 players[0]。`maybeDropPickup`（779-）的 mercy 門檻改為任一存活玩家：

```ts
  private maybeDropPickup(pos: Vec2): void {
    const r = this.pickupRng.next()
    const anyLow = this.players.some((p) => p.entity.hp > 0 && p.entity.hp < p.entity.maxHp * HEAL_DROP_HP_FRAC)
    if (anyLow && r < HEAL_DROP_CHANCE) {
      this.pickupEntities.push(createPickup(pos, 'heal'))
    } else if (r >= HEAL_DROP_CHANCE && r < HEAL_DROP_CHANCE + VACUUM_DROP_CHANCE) {
      this.pickupEntities.push(createPickup(pos, 'vacuum'))
    }
  }
```

> 既有 `applyUpgrade(id)`/`consumeLevelUp()` 維持作用 players[0]（相容）；N>1 的逐玩家升級編排屬 1B，本 task 僅確保 per-player 經驗/升級計數正確累積。

- [ ] **Step 4: 跑測試 + 全測試**

Run: `npx vitest run src/engine/World.test.ts && npm run typecheck`
Expected: 新測試 PASS；既有 N=1 全綠（最近玩家＝唯一玩家、grantXpTo 等價原 grantXp）。

- [ ] **Step 5: Commit**

```bash
git add src/engine/World.ts src/engine/World.test.ts
git commit -m "$(printf '%s\n\n%s' '[mvp][feat][engine] 逐玩家經驗/寶石/寶箱/撿取（grantXpTo + 最近玩家吸引 + mercy 任一玩家）' 'Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

### Task 7: 難度依人數（生怪 ÷N、Boss/終局 Boss hp ×N）

**Files:** Modify `src/engine/World.ts`（step 區段 2 line 435-436、`spawnBossAt` 274-、`spawnFinalBossAt`）；Test `src/engine/World.test.ts`

**Interfaces:** Consumes `playerCount`。

- [ ] **Step 1: 寫失敗測試**

```ts
  it('生怪間隔依人數縮短（2 人為一半）', () => {
    const w1 = new World(1)
    const w2 = new World(1, ['macrophage', 'macrophage'])
    // 直接比較重置後的 spawnTimer：跑一格使其重置
    w1.step(1 / 60); w2.step(1 / 60)
    // 私有計時器無法直接讀，改以「固定時間內生怪數」近似：
    let c1 = 0, c2 = 0
    const w1b = new World(2), w2b = new World(2, ['macrophage', 'macrophage'])
    for (let i = 0; i < 10 * 60; i++) { w1b.step(1 / 60); w2b.step(1 / 60) }
    c1 = w1b.enemies.length; c2 = w2b.enemies.length
    expect(c2).toBeGreaterThan(c1) // 2 人生怪更多
  })

  it('Boss 與終局 Boss hp 依人數放大', () => {
    const w1 = new World(1)
    const w2 = new World(1, ['macrophage', 'macrophage'])
    const b1 = w1.spawnBossAt({ x: 100, y: 0 })
    const b2 = w2.spawnBossAt({ x: 100, y: 0 })
    expect(b2.maxHp).toBeCloseTo(b1.maxHp * 2, 5)
    const f1 = w1.spawnFinalBossAt({ x: 100, y: 0 })
    const f2 = w2.spawnFinalBossAt({ x: 100, y: 0 })
    expect(f2.maxHp).toBe(f1.maxHp * 2)
  })
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `npx vitest run src/engine/World.test.ts -t "生怪間隔依人數|Boss 與終局 Boss hp 依"`
Expected: FAIL — 生怪/Boss hp 未依人數。

- [ ] **Step 3: 難度依人數（World.ts）**

step 區段 2 生怪間隔（436）改：

```ts
      this.spawnTimer = (spawnInterval(this.elapsed) * this.mapSpawnIntervalMult) / this.playerCount
```

`spawnBossAt`（274-，目前 `b.hp = ENEMY_DEFS.superbug.hp * scale; b.maxHp = b.hp; this.scaleEnemyHp(b)`）在 `scaleEnemyHp` 後再乘人數：

```ts
  spawnBossAt(pos: Vec2): Entity {
    const b = createEnemy(pos, 'superbug')
    const scale = 1 + 0.5 * this.bossCount
    b.hp = ENEMY_DEFS.superbug.hp * scale
    b.maxHp = b.hp
    this.scaleEnemyHp(b)
    b.hp *= this.playerCount; b.maxHp *= this.playerCount
    this.bossCount += 1
    this.enemies.push(b)
    this.soundEventQueue.push('boss')
    return b
  }
```

`spawnFinalBossAt`（finalboss 固定 4000）乘人數：

```ts
  spawnFinalBossAt(pos: Vec2): Entity {
    const b = createEnemy(pos, 'finalboss')
    b.hp = ENEMY_DEFS.finalboss.hp * this.playerCount
    b.maxHp = b.hp
    this.enemies.push(b)
    this.soundEventQueue.push('boss')
    return b
  }
```

> 一般敵人個體數值不變。N=1：÷1、×1，行為等同現況。

- [ ] **Step 4: 跑測試 + 全測試**

Run: `npx vitest run src/engine/World.test.ts && npm run typecheck`
Expected: 新測試 PASS；既有 N=1 全綠（含既有「胃 Boss hp 疊乘地圖倍率」「終局 Boss hp 固定 4000」測試仍綠，因 N=1 ×1）。

- [ ] **Step 5: Commit**

```bash
git add src/engine/World.ts src/engine/World.test.ts
git commit -m "$(printf '%s\n\n%s' '[mvp][feat][engine] 難度依人數：生怪間隔 ÷N、Boss/終局 Boss hp ×N' 'Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

### Task 8: 死亡/觀戰 + hasLost 收尾 + 確定性測試

**Files:** Modify `src/engine/World.ts`（step 死亡/alive 維護；`isPlayerDead`）；Test `src/engine/World.test.ts`

**Interfaces:** Consumes 全部前置；Produces 維護 `PlayerState.alive`、`isPlayerDead()` 對 players[0]。

- [ ] **Step 1: 寫失敗測試**

```ts
  it('一名玩家死亡仍續跑、敵人改追存活者', () => {
    const w = new World(1, ['macrophage', 'macrophage'])
    w.players[0].entity.pos = { x: -500, y: 0 }
    w.players[1].entity.pos = { x: 500, y: 0 }
    w.players[0].entity.hp = 0
    w.step(1 / 60)
    expect(w.players[0].alive).toBe(false)
    expect(w.hasLost()).toBe(false)
    const e = w.spawnEnemyAt({ x: 0, y: 0 })
    for (let i = 0; i < 30; i++) w.step(1 / 60)
    expect(e.pos.x).toBeGreaterThan(0) // 朝存活的玩家 1（+500）移動
  })

  it('全員死亡 hasLost 為 true；N=1 與 isPlayerDead 等價', () => {
    const w = new World(1, ['macrophage', 'macrophage'])
    w.players[0].entity.hp = 0; w.players[1].entity.hp = 0
    w.step(1 / 60)
    expect(w.hasLost()).toBe(true)
    const s = new World(1)
    s.player.hp = 0
    s.step(1 / 60)
    expect(s.isPlayerDead()).toBe(true)
    expect(s.hasLost()).toBe(true)
  })

  it('相同 seed + 相同角色陣列 + 相同輸入 → 兩局一致', () => {
    const run = () => {
      const w = new World(42, ['macrophage', 'neutrophil'])
      for (let i = 0; i < 300; i++) {
        w.setMoveInput(0, { x: 1, y: 0 }); w.setMoveInput(1, { x: 0, y: 1 })
        w.step(1 / 60)
      }
      return [w.enemies.length, Math.round(w.players[0].entity.pos.x), Math.round(w.players[1].entity.pos.y), w.players[0].level]
    }
    expect(run()).toEqual(run())
  })
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `npx vitest run src/engine/World.test.ts -t "一名玩家死亡|全員死亡 hasLost|兩局一致"`
Expected: FAIL — `alive` 未維護（死亡後仍可能被視為目標）。

- [ ] **Step 3: 維護 alive + isPlayerDead（World.ts）**

在 step 結尾 entity 篩除（700-706）之前，加入 alive 同步：

```ts
    // 7d) 同步玩家存活旗標（hp<=0 即觀戰，不再參與 living 計算）。
    for (const p of this.players) p.alive = p.entity.hp > 0
```

`livingPlayers()` 改用 `alive`（與 hp>0 一致，但語意明確）：

```ts
  private livingPlayers(): PlayerState[] { return this.players.filter((p) => p.alive) }
```

> `alive` 初始 true（makePlayerState）。`isPlayerDead()` 既有定義改為：

```ts
  isPlayerDead(): boolean { return this.players[0].entity.hp <= 0 }
```

> N=1：玩家死 → isPlayerDead 與 hasLost 皆 true（Game 結束時機不變）。注意 step 一開頭 livingPlayers 於本格仍可能含剛死玩家（alive 上格更新）——可接受（死亡當格不再移動/開火於下一格生效），N=1 行為與現況一致（原碼死亡當格 Game 迴圈即偵測結束）。

- [ ] **Step 4: 跑測試 + 全測試 + build**

Run: `npx vitest run src/engine/World.test.ts && npm run typecheck && npm test && npm run build`
Expected: 全 PASS、乾淨；既有 N=1 全綠。

- [ ] **Step 5: Game/renderer 健全檢查（World.ts proxy 應已覆蓋）**

確認 `Game.ts`/`PixiRenderer` 編譯通過、單人實機行為不變（proxy 回 players[0]）。若 typecheck 報任何破裂，於此最小修正並記錄；預期零改動。

- [ ] **Step 6: Commit**

```bash
git add src/engine/World.ts src/engine/World.test.ts
git commit -m "$(printf '%s\n\n%s' '[mvp][feat][engine] 玩家死亡/觀戰 alive 維護 + hasLost 收尾 + 多玩家確定性測試' 'Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

## 實機驗證（八 task 完成後）

- [ ] `npm run dev`：單人遊玩**行為與現況無差異**（移動/開火/升級/撿取/Boss/結算）。
- [ ] `npm test` 全綠、`npm run build` 乾淨；更新 `acceptance.md` + `progress.md`。
- [ ]（可選）暫時在 dev 以 `new World(seed, ['macrophage','neutrophil'])` 手動構造，於 console 驗 2 玩家模擬推進（多鏡頭/HUD 屬 SP3，不在本份驗收）。

---

## Self-Review（plan 對照 spec）

- **Spec coverage：** FR-1 PlayerState→T1；FR-2 重載+proxy→T1/T2；FR-3 setMoveInput→T2/T3；FR-4 各 system：移動 T3、武器 T4、敵人 AI/接觸 T5、經驗/撿取 T6；FR-5 難度→T7；FR-6 死亡/hasLost→T2/T8；FR-7 summary/Game/renderer→proxy（T1）+ T8 健全檢查。Edge cases：N=1 等價（每 task gate）、同幀多玩家寶石（T6 最近玩家單一吸引者）、全員死亡（T8）、死者排除（T5/T8）、mercy 任一玩家（T6）。
- **Placeholder scan：** 無 TBD；結構性程式碼（PlayerState/proxy/建構子/helper/各區段逐玩家化）皆給完整碼；逐段轉換附原行號與替換規則 + 新碼。
- **Type consistency：** 全程一致 `PlayerState`、`players[]`、`livingPlayers()`、`nearestLivingPlayer()`、`grantXpTo()`、`upgradeContextFor()`、`updateBibleFor()`、`hasLost()`、`playerCount`、`setMoveInput()`、相容存取器；機制數值與 Global Constraints 一致。
- **N=1 護欄：** 每個 task Step 都要求既有 World 測試**不改且全綠**；T1/T2 額外要求 typecheck 乾淨。
