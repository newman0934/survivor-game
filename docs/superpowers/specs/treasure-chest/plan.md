# 寶箱 / 隨機獎勵 — 實作計畫

> **給執行者：** TDD、bite-sized 步驟。killEnemy/寶箱拾取/createChest 為純引擎邏輯、先寫失敗測試；
> drawChest/renderer 接線為呈現膠水層、實機驗證。既有 111 測試維持全綠。每個 task 一個邏輯變更、各自 commit。

**目標：** Boss 死亡必掉寶箱；撿取觸發既有升級三選一握手；順手把兩處掉寶重構成 killEnemy。

**架構：** 新增 `chest` entity 與 `createChest`/`drawChest`；`World.killEnemy()` 統一死亡掉落（boss 加掉箱）；
寶箱拾取 → `pendingLevelUps += 1`（複用既有握手）；renderer 畫寶箱。

**技術棧：** TypeScript、Vitest、PixiJS v8。

---

## 檔案結構（建立/修改一覽）

| 檔案 | 責任 | 動作 |
|------|------|------|
| `src/engine/types.ts` | EntityKind 加 'chest' | 修改 |
| `src/engine/entities/factory.ts` | createChest | 修改 |
| `src/engine/entities/factory.test.ts` | createChest 測試 | 修改 |
| `src/engine/sprites.ts` | drawChest | 修改 |
| `src/engine/World.ts` | chestEntities/chests/killEnemy/拾取/清理 | 修改 |
| `src/engine/World.test.ts` | killEnemy/拾取測試 | 修改 |
| `src/engine/PixiRenderer.ts` | spriteFor 'chest' + render 清單 | 修改 |
| `progress.md` | 更新進度 | 修改 |

---

## Task 1：chest 型別、工廠、造型

**Files:**
- Modify: `src/engine/types.ts`
- Modify: `src/engine/entities/factory.ts`
- Test: `src/engine/entities/factory.test.ts`
- Modify: `src/engine/sprites.ts`

- [ ] **Step 1：types.ts 加 'chest'**

把
```ts
export type EntityKind = 'player' | 'enemy' | 'projectile' | 'gem' | 'orbit'
```
改為
```ts
export type EntityKind = 'player' | 'enemy' | 'projectile' | 'gem' | 'orbit' | 'chest'
```

- [ ] **Step 2：寫 createChest 失敗測試**

在 `factory.test.ts` 末尾新增：

```ts
import { createChest } from './factory'

describe('createChest', () => {
  it('建立 chest entity（radius 14）', () => {
    const c = createChest({ x: 5, y: 6 })
    expect(c.kind).toBe('chest')
    expect(c.pos).toEqual({ x: 5, y: 6 })
    expect(c.radius).toBe(14)
    expect(c.active).toBe(true)
  })
})
```

（若檔頭已 `import { createPlayer, createEnemy, ... } from './factory'`，可改為一併匯入 `createChest`，
不必另開 import 行；此處單列 import 亦可。）

- [ ] **Step 3：執行確認失敗**

Run: `npm test -- factory`
Expected: FAIL（createChest 不存在）

- [ ] **Step 4：factory.ts 新增 createChest**

在 `createOrbit` 之後新增：

```ts
/**
 * 建立寶箱 entity（Boss 死亡掉落）。
 * @param pos 掉落位置（會被複製）。
 * @returns 新的 chest entity。
 */
export function createChest(pos: Vec2): Entity {
  return { ...base(), kind: 'chest', pos: { ...pos }, radius: 14 }
}
```

- [ ] **Step 5：執行確認通過**

Run: `npm test -- factory`
Expected: PASS

- [ ] **Step 6：sprites.ts 新增 drawChest**

在 `drawOrbit` 之後新增：

```ts
/** 寶箱：金棕箱身 + 蓋線金條 + 中央鎖扣。 */
export function drawChest(g: Graphics, e: Entity): void {
  const r = e.radius
  g.roundRect(-r, -r * 0.75, r * 2, r * 1.5, 3).fill(0x8d6e63)
  g.roundRect(-r, -r * 0.75, r * 2, r * 1.5, 3).stroke({ width: 2, color: 0x5d4037 })
  g.rect(-r, -r * 0.2, r * 2, r * 0.14).fill(0xffd54a) // 蓋線金條
  g.rect(-r * 0.22, -r * 0.18, r * 0.44, r * 0.5).fill(0xffd54a) // 中央鎖扣
}
```

- [ ] **Step 7：型別檢查**

Run: `npm run typecheck`
Expected: 乾淨（drawChest 已匯出；尚未被 renderer 引用亦合法）

- [ ] **Step 8：commit**

```bash
git add src/engine/types.ts src/engine/entities/factory.ts src/engine/entities/factory.test.ts src/engine/sprites.ts
git commit -m "$(cat <<'EOF'
[mvp][feat][engine] 新增 chest 型別、createChest 工廠與 drawChest 造型

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2：World — killEnemy 重構 + Boss 掉箱 + 拾取

**Files:**
- Modify: `src/engine/World.ts`
- Test: `src/engine/World.test.ts`

- [ ] **Step 1：寫失敗測試**

在 `World.test.ts` 頂層 describe 內新增：

```ts
  it('spawnBossAt 後擊殺 Boss 掉落寶箱', () => {
    const w = new World(1)
    const b = w.spawnBossAt({ x: 50, y: 0 })
    b.hp = 1
    w.forceFire()
    w.stats.pickupRadius = 0 // 避免寶箱/寶石立刻被吸走，便於觀察
    for (let i = 0; i < 40; i++) w.step(1 / 60)
    expect(b.active).toBe(false)
    expect(w.chests().length).toBeGreaterThan(0)
  })

  it('一般敵人死亡不掉寶箱', () => {
    const w = new World(1)
    w.stats.pickupRadius = 0
    const e = w.spawnEnemyAt({ x: w.player.pos.x + 30, y: w.player.pos.y }, 'basic')
    e.hp = 1
    w.forceFire()
    for (let i = 0; i < 20; i++) w.step(1 / 60)
    expect(e.active).toBe(false)
    expect(w.chests().length).toBe(0)
    expect(w.gems().length).toBeGreaterThan(0)
  })

  it('撿取寶箱觸發一次待處理升級', () => {
    const w = new World(1)
    // 直接放一個與玩家重疊的寶箱（透過 spawnBossAt 取得後搬到玩家位置）
    const b = w.spawnBossAt({ x: 9999, y: 9999 })
    b.hp = 0 // 讓它在下一格被 checkKills 清掉並掉箱於遠方（不影響）
    // 改以直接製造重疊寶箱：用 killEnemy 行為已測，這裡測拾取——把一個寶箱移到玩家身上
    const chest = w.chests()[0] ?? null
    void chest
    // 簡化：呼叫一次 step 讓 boss 死亡掉箱，再把該箱移到玩家位置
    w.step(1 / 60)
    const c = w.chests()[0]
    expect(c).toBeDefined()
    c.pos = { x: w.player.pos.x, y: w.player.pos.y }
    w.step(1 / 60)
    expect(w.consumeLevelUp()).toBe(true)
  })
```

> 註：第三個測試以「Boss 死亡掉箱 → 把箱搬到玩家身上 → 再一格拾取」驗證拾取觸發 pendingLevelUps。

- [ ] **Step 2：執行確認失敗**

Run: `npm test -- World`
Expected: FAIL（`chests` 不存在）

- [ ] **Step 3：World import 與欄位**

把
```ts
import { createPlayer, createEnemy, createGem, createOrbit } from './entities/factory'
```
改為
```ts
import { createPlayer, createEnemy, createGem, createOrbit, createChest } from './entities/factory'
```

在 `gemEntities: Entity[] = []` 之後新增：

```ts
  /** 場上所有寶箱（Boss 掉落）。 */
  chestEntities: Entity[] = []
```

在 `gems()` getter 之後新增：

```ts
  /** @returns 所有寶箱 entity（供 renderer 顯示）。 */
  chests(): Entity[] {
    return this.chestEntities
  }
```

- [ ] **Step 4：新增 killEnemy 並改寫兩處死亡點**

在 `checkKills()` 之後新增：

```ts
  /**
   * 統一處理敵人死亡：失效、記擊殺、掉經驗寶石；Boss 額外掉寶箱。
   * @param e 已判定 hp<=0 的敵人。
   */
  private killEnemy(e: Entity): void {
    e.active = false
    this.kills += 1
    this.gemEntities.push(createGem(e.pos, e.xp))
    if (e.enemyKind === 'boss') this.chestEntities.push(createChest(e.pos))
  }
```

把投射物命中段
```ts
          if (e.hp <= 0) {
            e.active = false
            this.kills += 1
            const gem = createGem(e.pos, e.xp)
            this.gemEntities.push(gem)
          }
```
改為
```ts
          if (e.hp <= 0) this.killEnemy(e)
```

把 `checkKills()` 內
```ts
      if (e.active && e.hp <= 0) {
        e.active = false
        this.kills += 1
        this.gemEntities.push(createGem(e.pos, e.xp))
      }
```
改為
```ts
      if (e.active && e.hp <= 0) this.killEnemy(e)
```

- [ ] **Step 5：寶箱拾取迴圈 + 清理**

在 step 的寶石迴圈（步驟 6）之後新增：

```ts
    // 6b) 寶箱：吸取並位移；碰到玩家本體即收取並觸發一次免費升級（pendingLevelUps）。
    for (const c of this.chestEntities) {
      if (!c.active) continue
      attractGem(c, this.player.pos, this.stats.pickupRadius, GEM_PULL_SPEED)
      applyVelocity(c, dt)
      if (distance(c.pos, this.player.pos) <= this.player.radius) {
        c.active = false
        this.pendingLevelUps += 1
      }
    }
```

把清理段
```ts
    this.gemEntities = this.gemEntities.filter((g) => g.active)
  }
```
改為
```ts
    this.gemEntities = this.gemEntities.filter((g) => g.active)
    this.chestEntities = this.chestEntities.filter((c) => c.active)
  }
```

- [ ] **Step 6：執行全部測試 + 型別**

Run: `npm test && npm run typecheck`
Expected: 全綠（新寶箱測試 + 既有 111，含投射物擊殺掉寶回歸）

- [ ] **Step 7：commit**

```bash
git add src/engine/World.ts src/engine/World.test.ts
git commit -m "$(cat <<'EOF'
[mvp][feat][engine] World 統一 killEnemy 掉落、Boss 掉寶箱、撿取觸發免費升級

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3：渲染寶箱（PixiRenderer）

**Files:**
- Modify: `src/engine/PixiRenderer.ts`

- [ ] **Step 1：import drawChest 並加入 spriteFor 與 render 清單**

把 sprites import 改為含 `drawChest`：

```ts
import {
  drawPlayer, drawEnemy, drawGem, drawProjectile, drawOrbit, drawChest,
  drawBackgroundGrid, drawGarlicAura,
} from './sprites'
```

在 `spriteFor` 的 switch 內 `case 'orbit'` 之後新增：

```ts
        case 'chest': drawChest(body, e); break
```

在 `render()` 的 `all` 陣列加入寶箱（在 orbits 之後、player 之前）：

```ts
      ...world.orbits(),
      ...world.chests(),
      world.player,
```

- [ ] **Step 2：型別檢查 + build**

Run: `npm run typecheck && npm run build`
Expected: 乾淨

- [ ] **Step 3：commit**

```bash
git add src/engine/PixiRenderer.ts
git commit -m "$(cat <<'EOF'
[mvp][feat][art] 渲染寶箱（spriteFor + render 清單）

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4：驗證與進度更新（階段 3 收尾）

**Files:**
- Modify: `progress.md`、`docs/superpowers/specs/treasure-chest/acceptance.md`

- [ ] **Step 1：完整測試 + 型別 + build**

Run: `npm test && npm run typecheck && npm run build`
Expected: 測試全綠、型別乾淨、build 乾淨

- [ ] **Step 2：實機煙霧測試**

Run: `npm run dev`（可暫時把 `BOSS_INTERVAL` 調小以快速見 Boss）。確認：擊殺 Boss 掉出金棕色寶箱、
靠近吸取、撿到彈出升級三選一；寶箱造型正確；無功能相關 console error。驗證後還原 `BOSS_INTERVAL`。

- [ ] **Step 3：更新 acceptance.md 勾選 + progress.md**

依結果勾選 `acceptance.md`，把 `progress.md` 階段 3「寶箱 / 隨機獎勵」標記完成、更新驗證快照；
階段 3 三項全完成。

- [ ] **Step 4：commit**

```bash
git add progress.md docs/superpowers/specs/treasure-chest/acceptance.md
git commit -m "$(cat <<'EOF'
[mvp][docs][meta] 寶箱功能驗證通過，更新 progress 與 acceptance（階段 3 收尾）

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## 自我檢查（Self-Review）結果

- **Spec 覆蓋：** FR-1（chest 型別/createChest/chests=Task1/2）、FR-2（killEnemy + boss 掉箱=Task2）、
  FR-3（拾取→pendingLevelUps + 清理=Task2）、FR-4（drawChest + renderer=Task1/3）皆有對應。
- **型別一致：** `'chest'`、`createChest`、`drawChest`、`chestEntities`/`chests()`、`killEnemy` 跨 task 一致。
- **無 placeholder：** 所有步驟含實際程式碼與指令。
- **相容性：** killEnemy 對非 boss 行為等同重構前（active/kills/gem）；既有投射物擊殺測試維持綠。
