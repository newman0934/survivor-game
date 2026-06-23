# 空間網格接入 World — 實作計畫

> **給執行者：** 本計畫以 TDD、bite-sized 步驟撰寫，逐 task 執行。這是「行為保持」重構：
> 既有測試全綠是主要安全網。renderer/迴圈/UI 不寫單元測試（依 CLAUDE.md 慣例），靠實跑驗證。
> 每完成一個邏輯變更就 commit（CLAUDE.md commit 格式）。

**目標：** 把 `core/spatialGrid` 接進 `World`，將逐幀的敵人鄰近查詢（子彈/接觸/大蒜/聖經）改走網格
候選，解決高敵數 O(n²) 碰撞熱點，行為不變。

**架構：** World 每格在敵人移動後重建一個敵人空間網格；子彈命中、接觸傷害、大蒜、聖經改用
`queryRadius(作用半徑 + MAX_ENEMY_RADIUS)` 取候選再做既有精確判定。targeting 維持全掃描。

**技術棧：** TypeScript、Vitest。

---

## 檔案結構（修改一覽）

| 檔案 | 責任 | 動作 |
|------|------|------|
| `src/engine/World.ts` | enemyGrid + 常數 + rebuildEnemyGrid + 四處查詢改走網格 | 修改 |
| `src/engine/World.test.ts` | 遠近混合功能測試 + 確定性測試 | 修改 |

> `core/spatialGrid.ts` 與其測試已存在、不改。`objectPool` 不在本次範圍。

---

## Task 1：網格基礎設施（不改行為）

**Files:**
- Modify: `src/engine/World.ts`

- [ ] **Step 1：import SpatialGrid 與 ENEMY_ORDER**

把
```ts
import { ENEMY_DEFS } from './systems/enemyDefs'
```
改為
```ts
import { ENEMY_DEFS, ENEMY_ORDER } from './systems/enemyDefs'
```
並在 import 區末尾（`import type { Summary } ...` 之前或之後）新增：
```ts
import { SpatialGrid } from './core/spatialGrid'
```

- [ ] **Step 2：新增常數**

在檔案頂部常數區（`BOSS_INTERVAL` 之後）新增：

```ts
/** 敵人空間網格的方格邊長（碰撞鄰近查詢用）。 */
const CELL_SIZE = 100
/** 最大敵人半徑（由 ENEMY_DEFS 推得）；查詢半徑須加上它以免漏接重疊敵人。 */
const MAX_ENEMY_RADIUS = Math.max(...ENEMY_ORDER.map((k) => ENEMY_DEFS[k].radius))
```

- [ ] **Step 3：新增 enemyGrid 欄位**

在 `private bossCount = 0` 附近（私有欄位區）新增：

```ts
  /** 敵人空間網格；每格在敵人移動後重建，供碰撞鄰近查詢。 */
  private enemyGrid = new SpatialGrid<Entity>(CELL_SIZE)
```

- [ ] **Step 4：新增 rebuildEnemyGrid 並於步驟 3 後呼叫**

在 `checkKills()` 方法之後（或 private 方法區）新增：

```ts
  /** 重建敵人空間網格：清空後插入所有存活敵人（每格在敵人移動後呼叫）。 */
  private rebuildEnemyGrid(): void {
    this.enemyGrid.clear()
    for (const e of this.enemies) {
      if (e.active) this.enemyGrid.insert(e, e.pos.x, e.pos.y)
    }
  }
```

在 `step()` 的步驟 3（敵人 AI 迴圈）之後、步驟 4 之前插入：

```ts
    // 3b) 重建敵人空間網格（敵人移動後、碰撞查詢前），供本格鄰近查詢使用。
    this.rebuildEnemyGrid()
```

- [ ] **Step 5：執行全部測試 + 型別檢查（行為未變，全綠）**

Run: `npm test && npm run typecheck`
Expected: 全部通過（網格已建但尚未被查詢使用，行為不變）

- [ ] **Step 6：commit**

```bash
git add src/engine/World.ts
git commit -m "$(cat <<'EOF'
[mvp][refactor][engine] World 每格重建敵人空間網格（尚未接查詢）

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2：四處查詢改走網格 + 功能測試

**Files:**
- Modify: `src/engine/World.ts`
- Test: `src/engine/World.test.ts`

- [ ] **Step 1：寫功能測試（先驗證網格候選正確）**

在 `World.test.ts` 頂層 describe 內新增：

```ts
  it('接觸傷害只對與玩家重疊的敵人生效（網格候選正確）', () => {
    const w = new World(1)
    const near = w.spawnEnemyAt({ x: w.player.pos.x, y: w.player.pos.y }) // 與玩家重疊
    const far = w.spawnEnemyAt({ x: w.player.pos.x + 800, y: w.player.pos.y })
    const farHp0 = far.hp
    const playerHp0 = w.player.hp
    w.step(1 / 60)
    expect(w.player.hp).toBeLessThan(playerHp0) // 受重疊敵人傷害
    expect(far.hp).toBe(farHp0) // 遠方敵人不被牽涉
    expect(near).toBeDefined()
  })

  it('大蒜只傷害半徑內敵人（網格候選正確）', () => {
    const w = new World(1)
    w.applyUpgrade('unlock:garlic')
    const inside = w.spawnEnemyAt({ x: 20, y: 0 })
    const outside = w.spawnEnemyAt({ x: 800, y: 0 })
    const insideHp0 = inside.hp
    const outsideHp0 = outside.hp
    w.step(1 / 60)
    expect(inside.hp).toBeLessThan(insideHp0)
    expect(outside.hp).toBe(outsideHp0)
  })

  it('網格不改變確定性：相同 seed 相同結果', () => {
    const run = () => {
      const w = new World(42)
      for (let i = 0; i < 600; i++) w.step(1 / 60)
      const s = w.summary()
      return { kills: s.kills, hp: s.hp }
    }
    expect(run()).toEqual(run())
  })
```

- [ ] **Step 2：執行確認測試現況**

Run: `npm test -- World`
Expected: 三個新測試應「通過」（現行全掃描即正確）。本 task 是重構：保持它們綠的同時把實作換成網格。
若此時已綠，先記錄基準；接著改實作後須仍綠。

- [ ] **Step 3：子彈命中改走網格（步驟 5）**

把步驟 5 內層的
```ts
      for (const e of this.enemies) {
        if (!e.active) continue
        if (circlesOverlap(p, e)) {
```
改為
```ts
      const cands = this.enemyGrid.queryRadius(p.pos.x, p.pos.y, p.radius + MAX_ENEMY_RADIUS)
      for (const e of cands) {
        if (!e.active) continue
        if (circlesOverlap(p, e)) {
```
（其餘扣血 / 擊殺掉寶 / `p.active = false` / `break` 完全不動。）

- [ ] **Step 4：接觸傷害改走網格（步驟 7）**

把步驟 7 整段
```ts
    for (const e of this.enemies) {
      if (!e.active) continue
      if (circlesOverlap(e, this.player)) {
        this.player.hp -= Math.max(0, e.damage - this.stats.armor) * dt * 10
      }
    }
```
改為
```ts
    const contactCands = this.enemyGrid.queryRadius(
      this.player.pos.x, this.player.pos.y, this.player.radius + MAX_ENEMY_RADIUS,
    )
    for (const e of contactCands) {
      if (!e.active) continue
      if (circlesOverlap(e, this.player)) {
        this.player.hp -= Math.max(0, e.damage - this.stats.armor) * dt * 10
      }
    }
```

- [ ] **Step 5：大蒜改走網格（步驟 4）**

把武器迴圈內 garlic 分支
```ts
      } else if (weapon.kind === 'garlic') {
        const radius = (lvl.radius ?? 70) * this.stats.areaMult
        garlicTick(this.player.pos, this.enemies, radius, damage, dt)
        this.checkKills()
      }
```
改為
```ts
      } else if (weapon.kind === 'garlic') {
        const radius = (lvl.radius ?? 70) * this.stats.areaMult
        const cands = this.enemyGrid.queryRadius(
          this.player.pos.x, this.player.pos.y, radius + MAX_ENEMY_RADIUS,
        )
        garlicTick(this.player.pos, cands, radius, damage, dt)
        this.checkKills()
      }
```

- [ ] **Step 6：聖經改走網格（updateBible 命中迴圈）**

把 `updateBible` 內
```ts
    for (const orb of this.orbitEntities) {
      for (const e of this.enemies) {
        if (!e.active) continue
        if (this.bibleHitTimers.has(e)) continue
```
改為
```ts
    for (const orb of this.orbitEntities) {
      const cands = this.enemyGrid.queryRadius(orb.pos.x, orb.pos.y, orb.radius + MAX_ENEMY_RADIUS)
      for (const e of cands) {
        if (!e.active) continue
        if (this.bibleHitTimers.has(e)) continue
```
（其餘 hypot 判定 / 扣血 / 設命中冷卻完全不動。）

- [ ] **Step 7：執行全部測試 + 型別 + build**

Run: `npm test && npm run typecheck && npm run build`
Expected: 全部通過（既有測試 + 三個新功能測試皆綠，行為保持）

- [ ] **Step 8：commit**

```bash
git add src/engine/World.ts src/engine/World.test.ts
git commit -m "$(cat <<'EOF'
[mvp][refactor][engine] 子彈/接觸/大蒜/聖經 改走空間網格候選（行為不變）

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3：驗證與進度更新（階段 2 收尾）

**Files:**
- Modify: `progress.md`、`docs/superpowers/specs/spatial-grid-integration/acceptance.md`

- [ ] **Step 1：完整測試 + 型別 + build**

Run: `npm test && npm run typecheck && npm run build`
Expected: 測試全綠、型別乾淨、build 乾淨

- [ ] **Step 2：瀏覽器煙霧測試**

Run: `npm run dev`。實際遊玩確認與重構前一致：武器命中、大蒜傷害、聖經 orbit、接觸扣血、Boss、
升級皆正常，敵人多時流暢；無功能相關 console error。

- [ ] **Step 3：更新 acceptance.md 勾選 + progress.md**

依實際結果勾選 `acceptance.md`，把 `progress.md` 階段 2「把 objectPool + spatialGrid 接進 World」
標記為「spatialGrid 已接（objectPool 仍備用）」、更新驗證快照（測試數），並標註階段 2 收尾狀態。

- [ ] **Step 4：commit**

```bash
git add progress.md docs/superpowers/specs/spatial-grid-integration/acceptance.md
git commit -m "$(cat <<'EOF'
[mvp][docs][meta] 空間網格接入驗證通過，更新 progress 與 acceptance（階段 2 收尾）

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## 自我檢查（Self-Review）結果

- **Spec 覆蓋：** FR-1（enemyGrid + rebuild=Task1）、FR-2（MAX_ENEMY_RADIUS + 查詢半徑=Task1/2）、
  FR-3（子彈/接觸/大蒜/聖經四處=Task2）、FR-4（targeting 不動，計畫未觸及=保持）皆有對應。
- **型別一致：** `enemyGrid`、`CELL_SIZE`、`MAX_ENEMY_RADIUS`、`rebuildEnemyGrid`、`queryRadius`
  簽章與既有 SpatialGrid 一致；garlicTick 簽章不變。
- **無 placeholder：** 所有步驟皆含實際程式碼與指令。
- **行為保持：** 既有測試為安全網；三個新功能測試覆蓋遠近混合與確定性。
