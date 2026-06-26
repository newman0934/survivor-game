# final-boss-victory Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把單局改為有限關卡——撐到 15:00 生成終局 Boss（新敵種 finalboss），擊敗即通關（新增勝利結局、勝利畫面、存檔通關記錄）。

**Architecture:** 沿用既有 Boss/血條/結算/存檔機制。引擎在 15:00 生成 finalboss 並閘住 60s Boss 與事件排程；finalboss 死亡置 won 旗標，Game 迴圈偵測後切到新的 `'won'` phase；存檔加 `cleared`/`clears` 並向後相容；勝利畫面沿用 GameOver 變體。

**Tech Stack:** TypeScript、PixiJS（finalboss 造型）、Vue 3（勝利畫面/排行榜標記）、Pinia、Vitest。

## Global Constraints

- 文件/說明繁體中文（zh-TW）；程式碼/型別/commit 格式英文。
- 引擎（`src/engine/**`）純 TypeScript，執行期不得 import Vue/Pinia。
- 確定性：終局 Boss 於固定時間生成、閘門為時間判斷；模擬中不得呼叫 `Math.random()`。
- 固定步長 1/60。
- 新增 `EnemyKind` 成員後 `ENEMY_DEFS`（Record）必須補鍵，否則 typecheck 失敗。
- finalboss 數值定稿：`hp 4000`、`speed 26`、`damage 26`、`radius 60`、`xp 200`、`color 0xff1744`、`spawnWeight 0`。**finalboss hp 不套地圖 enemyHpMult**。
- `FINAL_BOSS_TIME = 900`。
- 存檔維持 `version: 1`；舊存檔缺 `cleared`/`clears` 正規化為 `false`/`0`。
- commit 格式：`[mvp][type][scope] 描述`，結尾含 `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`。

---

## 檔案結構（本案異動）

| 檔案 | 異動 | 責任 |
|------|------|------|
| `src/engine/types.ts` | Modify | `EnemyKind` 加 `'finalboss'` |
| `src/engine/systems/enemyDefs.ts` | Modify | `ENEMY_DEFS.finalboss` + `ENEMY_ORDER` |
| `src/engine/World.ts` | Modify | `FINAL_BOSS_TIME`、`finalBossSpawned`/`won`、`spawnFinalBossAt`、step 生成+閘門、killEnemy 置 won、`hasWon()`、summary boss 偵測 + isFinalBoss |
| `src/stores/game.ts` | Modify | `Phase 'won'`、`victory()`、`Summary.isFinalBoss` + state/updateSummary/reset |
| `src/engine/Game.ts` | Modify | 迴圈偵測 hasWon → victory |
| `src/persistence/saveStore.ts` | Modify | `RunRecord.cleared`、`CumulativeStats.clears`、loadSave 正規化、recordRun 累計 |
| `src/App.vue` | Modify | watch over\|won 記錄 cleared、render GameOver(won) |
| `src/ui/GameOver.vue` | Modify | `won?` prop + 標題變體 |
| `src/ui/Leaderboard.vue` | Modify | 通關 ★ 標記 |
| `src/engine/sprites.ts` | Modify | `drawEnemy` finalboss 造型 |
| `src/engine/World.test.ts` | Modify | 終局 Boss 生成/閘門/勝利/summary 測試 |
| `src/persistence/saveStore.test.ts` | Modify | cleared/clears/相容測試 |

四個 task：T1 終局 Boss 引擎；T2 勝利狀態機接線；T3 存檔 cleared/clears + App 記錄；T4 呈現層（勝利畫面/排行榜/造型）。

---

### Task 1: 終局 Boss 引擎（生成 + 閘門 + 勝利判定）

**Files:**
- Modify: `src/engine/types.ts`（`EnemyKind`，約 line 26-27）
- Modify: `src/engine/systems/enemyDefs.ts`（`ENEMY_ORDER` line 10-11、`ENEMY_DEFS` line 14-35）
- Modify: `src/engine/World.ts`（常數區 line 44-50、欄位區 line 124-145、step line 423-443、killEnemy line 746-776、isPlayerDead 旁 line 800）
- Test: `src/engine/World.test.ts`

**Interfaces:**
- Consumes：`createEnemy(pos, kind)`（依 ENEMY_DEFS 設 hp/maxHp/radius/…）；`spawnPositionAround`、`SPAWN_RADIUS`、`this.rng`、`this.elapsed`、`killEnemy(e)`。
- Produces：`EnemyKind` 含 `'finalboss'`；`World.FINAL_BOSS_TIME`（模組常數）、`finalBossSpawned`、`won`、`spawnFinalBossAt(pos)`、`hasWon()`。

- [ ] **Step 1: 寫失敗測試**

在 `src/engine/World.test.ts` 新增：

```ts
  it('15:00 生成終局 Boss 且只生一隻', () => {
    const w = new World(1)
    for (let i = 0; i < 900 * 60; i++) w.step(1 / 60)
    const finals = w.enemies.filter((e) => e.enemyKind === 'finalboss')
    expect(finals.length).toBe(1)
    for (let i = 0; i < 5 * 60; i++) w.step(1 / 60)
    expect(w.enemies.filter((e) => e.enemyKind === 'finalboss').length).toBe(1)
  })

  it('終局 Boss 出現後不再生 60s Boss', () => {
    const w = new World(1)
    for (let i = 0; i < 905 * 60; i++) w.step(1 / 60)
    const superbugsBefore = w.enemies.filter((e) => e.enemyKind === 'superbug').length
    for (let i = 0; i < 70 * 60; i++) w.step(1 / 60) // 再跑 70s（>1 個 boss 週期）
    const superbugsAfter = w.enemies.filter((e) => e.enemyKind === 'superbug').length
    expect(superbugsAfter).toBeLessThanOrEqual(superbugsBefore) // 無新增 boss
  })

  it('擊敗終局 Boss 觸發 hasWon', () => {
    const w = new World(1)
    expect(w.hasWon()).toBe(false)
    const b = w.spawnFinalBossAt({ x: 9999, y: 9999 })
    b.hp = 0
    w.step(1 / 60)
    expect(b.active).toBe(false)
    expect(w.hasWon()).toBe(true)
  })

  it('終局 Boss hp 為固定值、不套地圖倍率', () => {
    const w = new World(1, 'macrophage', 'stomach') // stomach enemyHpMult 1.25
    const b = w.spawnFinalBossAt({ x: 100, y: 0 })
    expect(b.maxHp).toBe(4000)
  })
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `npx vitest run src/engine/World.test.ts -t "終局 Boss|hasWon"`
Expected: FAIL（`'finalboss'` 不在 EnemyKind / `spawnFinalBossAt`/`hasWon` 不存在）。

- [ ] **Step 3: EnemyKind 加 finalboss（types.ts）**

把 `src/engine/types.ts`：

```ts
export type EnemyKind = 'virus' | 'bacteria' | 'spore' | 'spiral' | 'superbug'
  | 'spitter' | 'splitter' | 'exploder'
```

改為：

```ts
export type EnemyKind = 'virus' | 'bacteria' | 'spore' | 'spiral' | 'superbug'
  | 'spitter' | 'splitter' | 'exploder' | 'finalboss'
```

- [ ] **Step 4: ENEMY_DEFS.finalboss（enemyDefs.ts）**

`src/engine/systems/enemyDefs.ts`，`ENEMY_ORDER` 末端加 `'finalboss'`：

```ts
export const ENEMY_ORDER: EnemyKind[] = ['virus', 'bacteria', 'spore', 'spiral', 'superbug',
  'spitter', 'splitter', 'exploder', 'finalboss']
```

並在 `ENEMY_DEFS` 的 `exploder` 之後加入：

```ts
  finalboss: { kind: 'finalboss', hp: 4000, speed: 26, damage: 26, radius: 60, xp: 200, color: 0xff1744, unlockTime: 0, spawnWeight: 0 },
```

- [ ] **Step 5: World 常數、欄位、spawnFinalBossAt、step、killEnemy、hasWon**

`src/engine/World.ts`：

1) 在 `BOSS_INTERVAL`（line 48）附近新增：

```ts
/** 終局 Boss 出現時間（秒）。 */
const FINAL_BOSS_TIME = 900
```

2) 在 `bossCount` 欄位附近新增：

```ts
  /** 終局 Boss 是否已生成（確保只生一隻、並閘住 60s Boss 與事件）。 */
  private finalBossSpawned = false
  /** 是否已通關（擊敗終局 Boss）。 */
  private won = false
```

3) 新增 `spawnFinalBossAt`（放在 `spawnBossAt` 之後）：

```ts
  /**
   * 生成終局 Boss（固定數值、不套地圖 enemyHpMult、不參與 bossCount 縮放）。
   * @param pos 生成位置。
   * @returns 新建立的終局 Boss entity。
   */
  spawnFinalBossAt(pos: Vec2): Entity {
    const b = createEnemy(pos, 'finalboss')
    this.enemies.push(b)
    this.soundEventQueue.push('boss')
    return b
  }
```

4) 把 step 的 Boss(2b)+事件(2c) 區塊（line 423-443）用 `if (!this.finalBossSpawned)` 閘住，並在其後加 2d 生成終局 Boss：

```ts
    // 2b/2c) 終局 Boss 出現前才推進 60s Boss 與地圖事件。
    if (!this.finalBossSpawned) {
      // 2b) Boss：獨立計時器，到點在環上生成一隻（隨次數變強）。
      this.bossTimer -= dt
      if (this.bossTimer <= 0) {
        this.bossTimer = BOSS_INTERVAL
        const pos = spawnPositionAround(this.player.pos, SPAWN_RADIUS, this.rng.next())
        this.spawnBossAt(pos)
      }

      // 2c) 地圖事件：到預警窗鎖定事件並顯示警告；倒數歸零時觸發、重置計時。
      this.eventTimer -= dt
      if (this.eventTimer <= EVENT_WARNING_LEAD && this.eventTimer > 0) {
        if (!this.pendingEvent) this.pendingEvent = pickEvent(this.rng)
        this.eventWarning = GAME_EVENT_DEFS[this.pendingEvent].warning
      }
      if (this.eventTimer <= 0) {
        const kind = this.pendingEvent ?? pickEvent(this.rng)
        this.triggerEvent(kind)
        this.pendingEvent = undefined
        this.eventWarning = undefined
        this.eventTimer = EVENT_INTERVAL
      }
    }

    // 2d) 終局 Boss：到 FINAL_BOSS_TIME 生成一隻（只生一次），之後閘住上方 Boss/事件。
    if (this.elapsed >= FINAL_BOSS_TIME && !this.finalBossSpawned) {
      const pos = spawnPositionAround(this.player.pos, SPAWN_RADIUS, this.rng.next())
      this.spawnFinalBossAt(pos)
      this.finalBossSpawned = true
      this.eventWarning = undefined // 清掉殘留預警
    }
```

5) `killEnemy`（line 746）開頭 `this.kills += 1` 之後加入：

```ts
    if (e.enemyKind === 'finalboss') this.won = true
```

6) 在 `isPlayerDead()`（line 800）旁新增：

```ts
  /** @returns 是否已通關（擊敗終局 Boss）。 */
  hasWon(): boolean {
    return this.won
  }
```

- [ ] **Step 6: 跑測試確認通過**

Run: `npx vitest run src/engine/World.test.ts -t "終局 Boss|hasWon"`
Expected: PASS（4 筆）。

- [ ] **Step 7: 型別檢查 + 全測試**

Run: `npm run typecheck && npm test`
Expected: typecheck 無錯（ENEMY_DEFS 已補 finalboss 鍵；drawEnemy 的 default 分支暫時涵蓋 finalboss）；全測試綠。

- [ ] **Step 8: Commit**

```bash
git add src/engine/types.ts src/engine/systems/enemyDefs.ts src/engine/World.ts src/engine/World.test.ts
git commit -m "$(printf '%s\n\n%s' '[mvp][feat][engine] 終局 Boss 敵種 + 15:00 生成 + 60s Boss/事件閘門 + hasWon 勝利判定' 'Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

### Task 2: 勝利狀態機接線（store / summary / Game）

**Files:**
- Modify: `src/engine/World.ts`（`summary()` line ~736）
- Modify: `src/stores/game.ts`（`Phase` line 16、`Summary` line 19-33、state 初值 line ~67、`updateSummary` line ~102、`reset` line ~90、新增 `victory()`）
- Modify: `src/engine/Game.ts`（死亡檢查區 line 128-133）
- Test: `src/engine/World.test.ts`

**Interfaces:**
- Consumes：Task 1 的 `finalboss` 敵種、`World.hasWon()`、`spawnFinalBossAt`。
- Produces：`Summary.isFinalBoss: boolean`；`Phase 'won'`；`store.victory()`；`World.summary()` boss 偵測含 finalboss。

- [ ] **Step 1: 寫失敗測試（summary 偵測終局 Boss）**

在 `src/engine/World.test.ts` 新增：

```ts
  it('summary 偵測終局 Boss：bossActive + isFinalBoss', () => {
    const w = new World(1)
    expect(w.summary().isFinalBoss).toBe(false)
    const b = w.spawnFinalBossAt({ x: 100, y: 0 })
    const s = w.summary()
    expect(s.bossActive).toBe(true)
    expect(s.isFinalBoss).toBe(true)
    expect(s.bossMaxHp).toBe(b.maxHp)
  })
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `npx vitest run src/engine/World.test.ts -t "summary 偵測終局"`
Expected: FAIL — `isFinalBoss` 不存在 / boss 偵測未含 finalboss。

- [ ] **Step 3: World.summary 偵測含 finalboss（World.ts）**

把 `summary()`（line ~736）的 boss 偵測行與回傳改為：

```ts
  summary(): Summary {
    const boss = this.enemies.find((e) => e.active && (e.enemyKind === 'superbug' || e.enemyKind === 'finalboss'))
    return {
      hp: Math.max(0, Math.round(this.player.hp)),
      maxHp: this.player.maxHp,
      time: Math.floor(this.elapsed),
      level: this.level,
      kills: this.kills,
      xp: this.xp,
      xpNeeded: xpForLevel(this.level),
      bossActive: !!boss,
      bossHp: boss ? Math.round(boss.hp) : 0,
      bossMaxHp: boss ? boss.maxHp : 0,
      isFinalBoss: boss?.enemyKind === 'finalboss',
      eventWarning: this.eventWarning,
    }
  }
```

- [ ] **Step 4: store 接線（game.ts）**

`src/stores/game.ts`：

1) `Phase` 加 `'won'`：

```ts
export type Phase = 'menu' | 'playing' | 'upgrading' | 'over' | 'paused' | 'won'
```

2) `Summary` 介面 `bossMaxHp` 之後新增：

```ts
  /** 目前 Boss 是否為終局 Boss（HUD 標示用）。 */
  isFinalBoss: boolean
```

3) state 初值物件（含 `bossActive: false` 那段，約 line 67）加入 `isFinalBoss: false`。

4) `updateSummary`（line ~102）末端 `this.bossMaxHp = s.bossMaxHp` 之後加入：

```ts
      this.isFinalBoss = s.isFinalBoss
```

5) `reset`（清場那段，約 line 90，`this.bossMaxHp = 0` 附近）加入：

```ts
      this.isFinalBoss = false
```

6) 在 `gameOver()` 之後新增 `victory()`：

```ts
    /** 引擎 → store：擊敗終局 Boss，切到勝利畫面。 */
    victory() {
      this.phase = 'won'
    },
```

- [ ] **Step 5: Game 迴圈偵測 hasWon（Game.ts）**

`src/engine/Game.ts`，在死亡檢查（`if (this.world.isPlayerDead()) { … }`，line 128-133）**之前**插入勝利檢查：

```ts
        // 通關（擊敗終局 Boss）：勝利優先於死亡；推送最終 summary、播勝利音效、切勝利畫面並停迴圈。
        if (this.world.hasWon()) {
          this.store.updateSummary(this.world.summary())
          soundManager.play('chest')
          this.store.victory()
          this.stop()
          return
        }
        if (this.world.isPlayerDead()) {
```

- [ ] **Step 6: 跑測試確認通過**

Run: `npx vitest run src/engine/World.test.ts -t "summary 偵測終局"`
Expected: PASS。

- [ ] **Step 7: 型別檢查 + 全測試**

Run: `npm run typecheck && npm test`
Expected: typecheck 無錯（Summary.isFinalBoss 已於 World.summary、store state/updateSummary/reset 全補齊）；全測試綠。

- [ ] **Step 8: Commit**

```bash
git add src/engine/World.ts src/stores/game.ts src/engine/Game.ts src/engine/World.test.ts
git commit -m "$(printf '%s\n\n%s' '[mvp][feat][engine] 勝利狀態機：summary 偵測終局 Boss + isFinalBoss + Phase won + Game hasWon→victory' 'Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

### Task 3: 存檔 cleared/clears + App 記錄通關

**Files:**
- Modify: `src/persistence/saveStore.ts`（`RunRecord` line ~24、`CumulativeStats` line ~37、`emptySave` line ~58、`loadSave` line 71-93、`recordRun` line 101-128）
- Modify: `src/App.vue`（watch 記錄區 line 93-110）
- Test: `src/persistence/saveStore.test.ts`

**Interfaces:**
- Consumes：Task 2 的 `Phase 'won'`、`store.phase`。
- Produces：`RunRecord.cleared: boolean`、`CumulativeStats.clears: number`、loadSave 正規化、recordRun 累計 clears。

- [ ] **Step 1: 寫失敗測試（cleared/clears/相容）**

在 `src/persistence/saveStore.test.ts` 新增（沿用該檔既有 `memStorage(initial?)` helper——單值假儲存、`getItem` 忽略 key、可用 `initial` 參數預填舊存檔 JSON）：

```ts
  it('recordRun 記錄 cleared 並累計 clears', () => {
    const s = memStorage()
    recordRun({ time: 100, kills: 5, level: 3, character: 'macrophage', map: 'vessel', date: 1, cleared: true }, s)
    const save = loadSave(s)
    expect(save.runs[0].cleared).toBe(true)
    expect(save.stats.clears).toBe(1)
  })

  it('未通關不累計 clears', () => {
    const s = memStorage()
    recordRun({ time: 50, kills: 1, level: 1, character: 'macrophage', map: 'vessel', date: 1, cleared: false }, s)
    expect(loadSave(s).stats.clears).toBe(0)
  })

  it('舊存檔無 cleared/clears 正規化為 false/0', () => {
    const s = memStorage(JSON.stringify({
      version: 1,
      runs: [{ time: 100, kills: 5, level: 3, character: 'macrophage', map: 'vessel', date: 1 }],
      stats: { totalKills: 5, totalRuns: 1, bestTime: 100, bestKills: 5, maxLevel: 3 },
    }))
    const save = loadSave(s)
    expect(save.runs[0].cleared).toBe(false)
    expect(save.stats.clears).toBe(0)
  })
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `npx vitest run src/persistence/saveStore.test.ts -t "cleared|clears|正規化"`
Expected: FAIL — `RunRecord` 無 cleared / `stats.clears` 為 undefined。

- [ ] **Step 3: 型別 + emptySave（saveStore.ts）**

`src/persistence/saveStore.ts`：

1) `RunRecord` 介面新增（`date` 後）：

```ts
  /** 本場是否通關（擊敗終局 Boss）。 */
  cleared: boolean
```

2) `CumulativeStats` 介面新增（`maxLevel` 後）：

```ts
  /** 跨場通關次數。 */
  clears: number
```

3) `emptySave` 的 `stats` 物件加入 `clears: 0`。

- [ ] **Step 4: loadSave 正規化（saveStore.ts）**

把 `loadSave` 的回傳 `runs`/`stats` 改為正規化缺欄：

```ts
    const base = emptySave()
    return {
      version: 1,
      runs: (parsed.runs as unknown[])
        .filter((r): r is RunRecord => !!r && typeof (r as RunRecord).time === 'number')
        .map((r) => ({ ...r, cleared: (r as Partial<RunRecord>).cleared ?? false })),
      stats: { ...base.stats, ...parsed.stats },
    }
```

> `stats` 的 `{ ...base.stats, ...parsed.stats }`：base 含 `clears: 0`，舊存檔 stats 缺 clears 時自動補 0。

- [ ] **Step 5: recordRun 累計 clears（saveStore.ts）**

把 `recordRun` 的 `save.stats = { … }` 物件加入 `clears`：

```ts
  save.stats = {
    totalKills: save.stats.totalKills + run.kills,
    totalRuns: save.stats.totalRuns + 1,
    bestTime: Math.max(save.stats.bestTime, run.time),
    bestKills: Math.max(save.stats.bestKills, run.kills),
    maxLevel: Math.max(save.stats.maxLevel, run.level),
    clears: save.stats.clears + (run.cleared ? 1 : 0),
  }
```

- [ ] **Step 6: App 記錄通關（App.vue）**

`src/App.vue` 的 phase watch（line 93-110）：把記錄條件改為涵蓋 won，並帶入 cleared。將：

```ts
    if (phase === 'over' && prev !== 'over') {
      const res = recordRun({
        time: store.time,
        kills: store.kills,
        level: store.level,
        character: selected.character,
        map: selected.map,
        date: Date.now(),
      })
```

改為：

```ts
    if ((phase === 'over' || phase === 'won') && prev !== 'over' && prev !== 'won') {
      const res = recordRun({
        time: store.time,
        kills: store.kills,
        level: store.level,
        character: selected.character,
        map: selected.map,
        date: Date.now(),
        cleared: phase === 'won',
      })
```

- [ ] **Step 7: 跑測試確認通過 + 全測試**

Run: `npx vitest run src/persistence/saveStore.test.ts && npm run typecheck && npm test`
Expected: 新增 3 筆 PASS；typecheck 無錯（App.vue recordRun 已帶 cleared）；全測試綠。

- [ ] **Step 8: Commit**

```bash
git add src/persistence/saveStore.ts src/persistence/saveStore.test.ts src/App.vue
git commit -m "$(printf '%s\n\n%s' '[mvp][feat][persistence] 存檔 cleared/clears + 向後相容正規化 + App 記錄通關' 'Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

### Task 4: 呈現層（勝利畫面 + 排行榜標記 + 終局 Boss 造型）

**Files:**
- Modify: `src/ui/GameOver.vue`（props line 12-19、template line 36）
- Modify: `src/App.vue`（GameOver render line 142）
- Modify: `src/ui/Leaderboard.vue`（row template）
- Modify: `src/engine/sprites.ts`（`drawEnemy`）
- 驗證：`npm run typecheck` + `npm run build` + 實機目視。

**Interfaces:**
- Consumes：Task 2 的 `Phase 'won'`、Task 3 的 `RunRecord.cleared`、Task 1 的 finalboss 敵種與 `ENEMY_DEFS.finalboss.color`。

- [ ] **Step 1: GameOver won 變體（GameOver.vue）**

`src/ui/GameOver.vue` 的 `defineProps`（line 12-19）加入：

```ts
  /** 是否為通關（勝利）結局；true 顯示通關標題。 */
  won?: boolean
```

並把標題（line 36）改為：

```vue
      <h1>{{ won ? '通關！' : '你倒下了' }}</h1>
```

- [ ] **Step 2: App 渲染勝利畫面（App.vue）**

把 `src/App.vue`（line 142）的 GameOver 渲染改為涵蓋 won 並傳 won prop：

```vue
    <Transition name="fade"><GameOver v-if="store.phase === 'over' || store.phase === 'won'" :won="store.phase === 'won'" :best-time="lastRun.bestTime" :is-new-best-time="lastRun.isNewBestTime" :is-new-best-kills="lastRun.isNewBestKills" @restart="restart" @menu="toMenu" /></Transition>
```

- [ ] **Step 3: 排行榜通關標記（Leaderboard.vue）**

`src/ui/Leaderboard.vue` 的列模板，在存活時間欄顯示通關 ★。把時間 `<td>`（約 line 59）改為：

```vue
              <td>{{ fmtTime(r.time) }}<span v-if="r.cleared" class="cleared-mark"> ★</span></td>
```

並在 `<style scoped>` 加入：

```css
.cleared-mark { color: #ffd54a; }
```

- [ ] **Step 4: 終局 Boss 造型（sprites.ts）**

`src/engine/sprites.ts` 的 `drawEnemy(g, e)` switch 內，新增 `case 'finalboss'`（沿用既有 helper 風格；色取自 `ENEMY_DEFS.finalboss`）：

```ts
    case 'finalboss': {
      // 終局 Boss：超大體型 + 雙重發光光環 + 核（最終頭目威壓感）
      g.circle(0, 0, r * 1.35).fill({ color, alpha: 0.16 })
      g.circle(0, 0, r * 1.18).stroke({ width: 4, color, alpha: 0.85 })
      g.circle(0, 0, r).fill({ color, alpha: 0.9 })
      g.circle(0, 0, r).stroke({ width: 3, color: dim(color, 0.4) })
      g.circle(-r * 0.3, -r * 0.3, r * 0.4).fill({ color: lighten(color, 0.5), alpha: 0.3 })
      g.circle(0, 0, r * 0.42).fill(dim(color, 0.45))
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2
        g.circle(Math.cos(a) * r * 0.7, Math.sin(a) * r * 0.7, r * 0.1).fill({ color: lighten(color, 0.6), alpha: 0.8 })
      }
      break
    }
```

> 註：先確認 `drawEnemy` 內 `case` 是用 `e.enemyKind`、且 `dim`/`lighten` helper 在檔內可用（其他 case 已用）；color 變數沿用該函式開頭既有取法（`ENEMY_DEFS[e.enemyKind].color`）。

- [ ] **Step 5: 型別檢查 + build**

Run: `npm run typecheck && npm run build`
Expected: 皆乾淨。

- [ ] **Step 6: Commit**

```bash
git add src/ui/GameOver.vue src/App.vue src/ui/Leaderboard.vue src/engine/sprites.ts
git commit -m "$(printf '%s\n\n%s' '[mvp][feat][ui] 勝利畫面（GameOver won 變體）+ 排行榜通關★ + 終局 Boss 造型' 'Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

## 實機驗證（四 task 完成後）

依 `acceptance.md`「呈現層」與「驗證快照」：
- [ ] 暫時把 `FINAL_BOSS_TIME` 調小（如 20）跑 `npm run dev`，確認 15:00（縮短後）出現大體型終局 Boss + 光環、Boss 血條顯示。
- [ ] 擊敗終局 Boss → 顯示「通關！」勝利畫面；排行榜該局顯示 ★。
- [ ] 死亡仍顯示「你倒下了」、無 ★。
- [ ] **還原 `FINAL_BOSS_TIME = 900`**；`npm run build` 乾淨；更新 `acceptance.md` + `progress.md`。

---

## Self-Review（plan 對照 spec）

- **Spec coverage：** FR-1 敵種→T1 S3-4；FR-2 生成/閘門→T1 S5；FR-3 勝利判定→T1（killEnemy/hasWon）+T2（Game）；FR-4 狀態機/勝利畫面→T2（Phase/victory）+T4（GameOver/App）；FR-5 Boss 血條→T2（summary/isFinalBoss）；FR-6 存檔/排行榜→T3（saveStore/App）+T4（Leaderboard）。Edge cases：只生一隻（finalBossSpawned，T1 測試）、同幀勝利優先（T2 Game 先檢查 hasWon）、舊存檔相容（T3 測試）、不套地圖倍率（T1 測試）、暫停凍結（計時走 step）。
- **Placeholder scan：** 無 TBD；每改碼步驟含完整程式碼與路徑/指令。少數「確認 SAVE_KEY/helper/ color 取法」為對齊既有碼的查核點，已給確切預期值（`survivor-save-v1`）。
- **Type consistency：** 全程一致 `finalboss`、`FINAL_BOSS_TIME`、`spawnFinalBossAt`、`hasWon()`、`Summary.isFinalBoss`、`Phase 'won'`、`victory()`、`RunRecord.cleared`、`CumulativeStats.clears`；數值與 Global Constraints 一致。
