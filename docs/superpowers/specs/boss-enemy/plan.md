# Boss 敵人 — 實作計畫

> **給執行者：** 本計畫以 TDD、bite-sized 步驟撰寫，逐 task 執行。引擎純邏輯先寫失敗測試再實作；
> renderer / 迴圈 / Vue 元件為整合膠水層，不寫單元測試（依 CLAUDE.md 慣例），靠實跑驗證。
> 每完成一個邏輯變更就 commit（CLAUDE.md commit 格式）。

**目標：** 加入週期性出現（每 60s）、隨次數變強、巨型直線追擊的 Boss，擊殺掉大量經驗，並在畫面頂部
顯示 Boss 血條。

**架構：** Boss = 特化敵種（`EnemyKind: 'boss'`，`spawnWeight: 0` 排除於一般生怪），複用 factory /
enemyAI / renderer 路徑；`World` 以獨立 `bossTimer` 生成並依 `bossCount` 縮放 hp；血條透過擴充
`Summary` 三欄 + 新 `BossBar.vue` 呈現。

**技術棧：** TypeScript、Vitest、Vue 3 `<script setup>`、PixiJS。

---

## 檔案結構（建立/修改一覽）

| 檔案 | 責任 | 動作 |
|------|------|------|
| `src/engine/types.ts` | `EnemyKind` 加 'boss' | 修改 |
| `src/engine/systems/enemyDefs.ts` | 新增 boss 條目（spawnWeight 0） | 修改 |
| `src/engine/systems/spawn.ts` | `pickEnemyKind` 過濾 spawnWeight>0 | 修改 |
| `src/engine/systems/spawn.test.ts` | 排除 boss 測試 | 修改 |
| `src/stores/game.ts` | `Summary` + state + start + updateSummary 加 boss 三欄 | 修改 |
| `src/engine/World.ts` | bossTimer/bossCount、spawnBossAt、step boss 段、summary boss 三欄 | 修改 |
| `src/engine/World.test.ts` | boss 生成/成長/summary 測試 | 修改 |
| `src/ui/BossBar.vue` | Boss 血條（純呈現，讀 store） | 建立 |
| `src/App.vue` | playing 階段渲染 BossBar | 修改 |
| `progress.md` | 更新進度 | 修改 |

---

## Task 1：EnemyKind 加 'boss' + Boss 定義（types.ts、enemyDefs.ts）

**Files:**
- Modify: `src/engine/types.ts`
- Modify: `src/engine/systems/enemyDefs.ts`

- [ ] **Step 1：types.ts 擴充 EnemyKind**

把
```ts
export type EnemyKind = 'basic' | 'swarm' | 'tank' | 'charger'
```
改為
```ts
export type EnemyKind = 'basic' | 'swarm' | 'tank' | 'charger' | 'boss'
```

- [ ] **Step 2：enemyDefs.ts 新增 boss 條目**

在 `ENEMY_ORDER` 末尾加入 `'boss'`：

```ts
export const ENEMY_ORDER: EnemyKind[] = ['basic', 'swarm', 'tank', 'charger', 'boss']
```

在 `ENEMY_DEFS` 物件內（charger 之後）新增：

```ts
  boss: { kind: 'boss', hp: 220, speed: 30, damage: 20, radius: 34, xp: 50, color: 0x9c27b0, unlockTime: 0, spawnWeight: 0 },
```

- [ ] **Step 3：型別檢查**

Run: `npm run typecheck`
Expected: 乾淨（boss 為合法 EnemyKind；ENEMY_DEFS 完整覆蓋）

- [ ] **Step 4：commit**

```bash
git add src/engine/types.ts src/engine/systems/enemyDefs.ts
git commit -m "$(cat <<'EOF'
[mvp][feat][engine] 新增 boss 敵種定義（spawnWeight 0，排除於一般生怪）

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2：pickEnemyKind 排除 Boss（spawn.ts）

**Files:**
- Modify: `src/engine/systems/spawn.ts`
- Test: `src/engine/systems/spawn.test.ts`

- [ ] **Step 1：寫失敗測試**

在 `spawn.test.ts` 的 `describe('pickEnemyKind', ...)` 內新增：

```ts
  it('一般生怪永不選到 boss（即使時間極大）', () => {
    const rng = createRng(3)
    for (let i = 0; i < 500; i++) {
      expect(pickEnemyKind(100000, rng)).not.toBe('boss')
    }
  })
```

- [ ] **Step 2：執行確認失敗**

Run: `npm test -- spawn`
Expected: FAIL（目前 boss spawnWeight 0 但仍在候選中；視浮點可能偶爾回傳 boss，或為求穩健需明確過濾）

- [ ] **Step 3：修改 pickEnemyKind 明確過濾 spawnWeight>0**

把
```ts
  const unlocked = ENEMY_ORDER.filter((k) => elapsed >= ENEMY_DEFS[k].unlockTime)
```
改為
```ts
  const unlocked = ENEMY_ORDER.filter((k) => ENEMY_DEFS[k].spawnWeight > 0 && elapsed >= ENEMY_DEFS[k].unlockTime)
```

- [ ] **Step 4：執行確認通過**

Run: `npm test -- spawn`
Expected: PASS（全部 spawn 測試）

- [ ] **Step 5：commit**

```bash
git add src/engine/systems/spawn.ts src/engine/systems/spawn.test.ts
git commit -m "$(cat <<'EOF'
[mvp][fix][engine] pickEnemyKind 以 spawnWeight>0 過濾，排除 boss 等非一般敵種

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3：Summary 擴充 Boss 三欄（stores/game.ts）

**Files:**
- Modify: `src/stores/game.ts`

> 此 task 先擴充 store 型別與 action，讓 Task 4 的 `World.summary()` 能回傳 boss 欄位且型別吻合。
> Vue 元件不寫單元測試。

- [ ] **Step 1：Summary 介面新增三欄**

在 `Summary` interface 末尾（`xpNeeded` 之後）新增：

```ts
  /** 場上是否有存活 Boss（決定血條顯示）。 */
  bossActive: boolean
  /** Boss 目前 hp（取整）；無 Boss 時為 0。 */
  bossHp: number
  /** Boss 最大 hp；無 Boss 時為 0。 */
  bossMaxHp: number
```

- [ ] **Step 2：state 初始值新增三欄**

在 `state` 的回傳物件中（`xpNeeded: 0,` 之後、`upgradeOptions` 之前）新增：

```ts
    bossActive: false,
    bossHp: 0,
    bossMaxHp: 0,
```

- [ ] **Step 3：start() 重置三欄**

在 `start()` 內（`this.xpNeeded = 0` 之後）新增：

```ts
      this.bossActive = false
      this.bossHp = 0
      this.bossMaxHp = 0
```

- [ ] **Step 4：updateSummary() 複製三欄**

在 `updateSummary(s)` 內（`this.xpNeeded = s.xpNeeded` 之後）新增：

```ts
      this.bossActive = s.bossActive
      this.bossHp = s.bossHp
      this.bossMaxHp = s.bossMaxHp
```

- [ ] **Step 5：型別檢查（World.summary 尚未回傳三欄，預期紅）**

Run: `npm run typecheck`
Expected: `World.ts` 的 `summary()` 回傳型別缺三欄而報錯——這是預期的，Task 4 修。先不 commit。

---

## Task 4：World — Boss 計時器、生成、成長、summary（World.ts）

**Files:**
- Modify: `src/engine/World.ts`
- Test: `src/engine/World.test.ts`

- [ ] **Step 1：寫失敗測試**

在 `World.test.ts` 既有頂層 describe 內新增：

```ts
  it('spawnBossAt 生成一隻 boss', () => {
    const w = new World(1)
    const b = w.spawnBossAt({ x: 100, y: 0 })
    expect(b.enemyKind).toBe('boss')
    expect(w.enemies.includes(b)).toBe(true)
  })

  it('第二隻 Boss 的 maxHp 大於第一隻（隨 bossCount 成長）', () => {
    const w = new World(1)
    const b1 = w.spawnBossAt({ x: 100, y: 0 })
    const b2 = w.spawnBossAt({ x: 100, y: 0 })
    expect(b2.maxHp).toBeGreaterThan(b1.maxHp)
  })

  it('Boss 於 60s 里程碑出現', () => {
    const w = new World(1)
    for (let i = 0; i < 61 * 60; i++) w.step(1 / 60)
    expect(w.enemies.some((e) => e.enemyKind === 'boss')).toBe(true)
  })

  it('summary 在有 Boss 時回報血條資料、無 Boss 時歸零', () => {
    const w = new World(1)
    expect(w.summary().bossActive).toBe(false)
    expect(w.summary().bossHp).toBe(0)
    const b = w.spawnBossAt({ x: 100, y: 0 })
    const s = w.summary()
    expect(s.bossActive).toBe(true)
    expect(s.bossHp).toBe(Math.round(b.hp))
    expect(s.bossMaxHp).toBe(b.maxHp)
  })
```

- [ ] **Step 2：執行確認失敗**

Run: `npm test -- World`
Expected: FAIL（`spawnBossAt` 不存在 / summary 無 boss 欄位）

- [ ] **Step 3：新增 Boss 常數與欄位**

在 `World.ts` 頂部常數區（`GEM_PULL_SPEED` 之後）新增：

```ts
/** Boss 生成週期（秒）。 */
const BOSS_INTERVAL = 60
```

在 `private spawnTimer = 0` 附近新增兩個私有欄位：

```ts
  /** Boss 生成倒數計時器（秒）。 */
  private bossTimer = BOSS_INTERVAL
  /** 已生成的 Boss 數量；用來讓每隻 Boss 比前一隻硬。 */
  private bossCount = 0
```

- [ ] **Step 4：新增 spawnBossAt 方法**

在 `spawnSwarmAt` 之後新增：

```ts
  /**
   * 在指定位置生成一隻 Boss，hp 依目前 bossCount 縮放（每隻比前一隻硬），並遞增 bossCount。
   * @param pos 生成位置。
   * @returns 新建立的 Boss entity。
   */
  spawnBossAt(pos: Vec2): Entity {
    const b = createEnemy(pos, 'boss')
    const scale = 1 + 0.5 * this.bossCount
    b.hp = ENEMY_DEFS.boss.hp * scale
    b.maxHp = b.hp
    this.bossCount += 1
    this.enemies.push(b)
    return b
  }
```

> 註：`ENEMY_DEFS` 已於既有 import；若無，於檔頭 `import { WEAPON_DEFS } ...` 附近確認
> `import { ENEMY_DEFS } from './systems/enemyDefs'` 存在（Task 不需重複加，World 既有渲染/查詢未用到時才補）。
> 實際上 World 目前尚未 import ENEMY_DEFS，需新增此 import。

於檔頭 import 區新增（若尚未存在）：

```ts
import { ENEMY_DEFS } from './systems/enemyDefs'
```

- [ ] **Step 5：step() 新增 Boss 計時器段**

在生怪段（`this.spawnTimer -= dt ... }`）之後、敵人 AI 迴圈之前，新增：

```ts
    // 2b) Boss：獨立計時器，到點在環上生成一隻（隨次數變強）。
    this.bossTimer -= dt
    if (this.bossTimer <= 0) {
      this.bossTimer = BOSS_INTERVAL
      const pos = spawnPositionAround(this.player.pos, SPAWN_RADIUS, this.rng.next())
      this.spawnBossAt(pos)
    }
```

- [ ] **Step 6：summary() 加入 boss 三欄**

把 `summary()` 的 return 改為：

```ts
  summary(): Summary {
    const boss = this.enemies.find((e) => e.active && e.enemyKind === 'boss')
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
    }
  }
```

- [ ] **Step 7：執行全部測試 + 型別檢查**

Run: `npm test && npm run typecheck`
Expected: 測試全綠（含新 Boss 測試）、型別乾淨

> 既有測試 `spawns enemies over time` 等不受影響（Boss 計時器獨立、首隻 60s 才出）。

- [ ] **Step 8：commit**

```bash
git add src/stores/game.ts src/engine/World.ts src/engine/World.test.ts
git commit -m "$(cat <<'EOF'
[mvp][feat][engine] World 週期生成 Boss（隨次數變強）+ summary 回報血條資料

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5：Boss 血條 UI（BossBar.vue、App.vue）

**Files:**
- Create: `src/ui/BossBar.vue`
- Modify: `src/App.vue`

- [ ] **Step 1：建立 BossBar.vue**

```vue
<script setup lang="ts">
/**
 * BossBar.vue — Boss 血條（純讀取元件）。
 * Boss 存在時於畫面頂部顯示一條紫色血條，寬度隨剩餘 hp 變化；不存在時隱藏。
 * 只從 store 讀 summary 資料，不送事件、不碰引擎。
 */
import { computed } from 'vue'
import { useGameStore } from '../stores/game'

const store = useGameStore()
const pct = computed(() => (store.bossMaxHp ? (store.bossHp / store.bossMaxHp) * 100 : 0))
</script>

<template>
  <div v-if="store.bossActive" class="bossbar">
    <div class="label">BOSS</div>
    <div class="bar"><div class="fill" :style="{ width: pct + '%' }" /></div>
  </div>
</template>

<style scoped>
.bossbar { position: absolute; top: 3rem; left: 50%; transform: translateX(-50%);
  width: min(80%, 640px); pointer-events: none; color: #fff; font-family: sans-serif;
  text-align: center; }
.label { font-size: 0.9rem; font-weight: bold; letter-spacing: 0.2em;
  text-shadow: 0 1px 2px #000; margin-bottom: 2px; }
.bar { height: 14px; background: rgba(255, 255, 255, 0.15); border-radius: 7px; overflow: hidden; }
.fill { background: #9c27b0; height: 100%; border-radius: 7px; transition: width 0.1s linear; }
</style>
```

- [ ] **Step 2：App.vue 匯入並渲染 BossBar**

在 `import GameOver ...` 之後新增 import：

```ts
import BossBar from './ui/BossBar.vue'
```

在 template 中 `<Hud v-if="store.phase !== 'menu'" />` 之後新增：

```html
    <BossBar v-if="store.phase === 'playing' || store.phase === 'upgrading'" />
```

- [ ] **Step 3：型別檢查 + build**

Run: `npm run typecheck && npm run build`
Expected: 乾淨

- [ ] **Step 4：commit**

```bash
git add src/ui/BossBar.vue src/App.vue
git commit -m "$(cat <<'EOF'
[mvp][feat][ui] 新增 Boss 血條（BossBar）並於遊玩時渲染

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 6：驗證與進度更新

**Files:**
- Modify: `progress.md`、`docs/superpowers/specs/boss-enemy/acceptance.md`

- [ ] **Step 1：完整測試 + 型別 + build**

Run: `npm test && npm run typecheck && npm run build`
Expected: 測試全綠、型別乾淨、build 乾淨

- [ ] **Step 2：瀏覽器煙霧測試**

Run: `npm run dev`。為快速驗證可暫時把 `BOSS_INTERVAL` 調小（如 5）以提早見到 Boss，
確認：巨型深紫色 Boss 出現、頂部出現紫色 Boss 血條並隨扣血縮短、擊殺後血條消失且掉大經驗寶石、
無功能相關 console error。確認後將 `BOSS_INTERVAL` 還原為 60。

- [ ] **Step 3：更新 acceptance.md 勾選 + progress.md**

依實際結果勾選 `acceptance.md`，並把 `progress.md` 階段 2「Boss 敵人」標記完成、更新驗證快照
（測試數）。

- [ ] **Step 4：commit**

```bash
git add progress.md docs/superpowers/specs/boss-enemy/acceptance.md
git commit -m "$(cat <<'EOF'
[mvp][docs][meta] Boss 功能驗證通過，更新 progress 與 acceptance

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## 自我檢查（Self-Review）結果

- **Spec 覆蓋：** FR-1（boss 敵種=Task1）、FR-2（pickEnemyKind 過濾=Task2）、FR-3（bossTimer/
  成長/spawnBossAt=Task4）、FR-4（xp50 複用掉寶=Task1 數值 + 既有 checkKills/投射物命中）、
  FR-5（Summary 三欄=Task3、summary 計算=Task4、BossBar=Task5）皆有對應 task。
- **型別一致：** `EnemyKind` 含 'boss'、`spawnBossAt(pos):Entity`、`bossActive/bossHp/bossMaxHp`、
  `BOSS_INTERVAL`、`bossTimer`/`bossCount` 在各 task 間命名一致；Summary 三欄在 store 與
  World.summary 對齊。
- **無 placeholder：** 所有步驟皆含實際程式碼與指令。
- **順序正確：** store Summary（Task3）先於 World.summary 回傳三欄（Task4），確保型別吻合。
