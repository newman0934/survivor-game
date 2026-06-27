# coop-upgrade-nonblocking (1B) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 `World` 內新增多人 per-player 非阻塞升級流程（世界不暫停 + 12s 逾時確定性自動選），單人路徑完全不變。

**Architecture:** 新增 `World.upgradeRng`（獨立 seeded）+ `PlayerState.pendingOffer/upgradeTimer`；`step` 在存活旗標同步後呼叫 `processUpgrades(dt)`，**僅 playerCount>1 生效**：為待升級玩家用 `rollUpgrades` 產生待選、倒數、逾時自動選第一張；對外提供 `pendingOfferFor/upgradeTimeRemaining/chooseUpgrade`。單人 playerCount===1 時 `processUpgrades` early-return，沿用既有 `consumeLevelUp`/Game 暫停握手。

**Tech Stack:** TypeScript、Vitest。

## Global Constraints

- 文件繁中；程式碼/型別/commit 英文。
- 引擎 `src/engine/**` 純 TS、執行期不得 import Vue/Pinia（World 僅 `import type` store 型別）；模擬中不得 `Math.random()`；固定步長 1/60。
- **單人零退化**：playerCount===1 時 `processUpgrades` no-op；既有 `consumeLevelUp`/`applyUpgrade`/Game 暫停握手/UpgradeModal 不變；既有升級相關測試不改且全綠。
- 確定性：選項產生與逾時自動選一律走 `upgradeRng` + 固定 index 升冪；相同 seed → 相同升級序列。
- 定稿：`UPGRADE_TIMEOUT = 12`（秒）；逾時自動選 `pendingOffer[0]`（第一張）；一次升多級逐張依序；`chooseUpgrade` 非待選 id 安靜略過；死亡玩家不產/不倒數/不自動選。
- `rollUpgrades`/`applyUpgradeById` 沿用 `leveling.ts`（不重複邏輯）。
- commit 格式 `[mvp][type][scope] 描述` + 結尾 `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`。

---

## 檔案結構（本案異動）

| 檔案 | 異動 | 責任 |
|------|------|------|
| `src/engine/types.ts` | Modify | `PlayerState` 加 `pendingOffer?`、`upgradeTimer` |
| `src/engine/World.ts` | Modify | `upgradeRng`、`UPGRADE_TIMEOUT`、makePlayerState 初值、`processUpgrades`、step 接線、`pendingOfferFor`/`upgradeTimeRemaining`/`chooseUpgrade`、imports |
| `src/engine/World.test.ts` | Modify | 新增多人非阻塞 + 單人 no-op + 確定性測試 |

單一 task（自成一體的引擎子系統）。

---

### Task 1: 非阻塞升級引擎子系統（多人）+ 單人零退化

**Files:**
- Modify: `src/engine/types.ts`（`PlayerState`，約 line 256-275）
- Modify: `src/engine/World.ts`（imports 16/34/35；常數區 ~44-60；欄位 ~121-123；`makePlayerState` ~160-170；建構子 ~179-181；step 7d 後 ~740；方法區）
- Test: `src/engine/World.test.ts`

**Interfaces:**
- Consumes：`rollUpgrades(rng, count, ctx)`、`applyUpgradeById(id, ctx)`（leveling.ts）；`this.upgradeContextFor(p)`、`this.playerCount`、`PlayerState.alive/pendingLevelUps`（1A 既有）。
- Produces：`PlayerState.pendingOffer?: UpgradeOption[]`、`PlayerState.upgradeTimer: number`；`World.pendingOfferFor(i)`、`upgradeTimeRemaining(i)`、`chooseUpgrade(i, id)`、`processUpgrades(dt)`（私有）。

- [ ] **Step 1: 寫失敗測試**

在 `src/engine/World.test.ts` 新增（直接設 `pendingLevelUps` 觸發，免經 xp 管線）：

```ts
  describe('多人非阻塞升級（1B）', () => {
    it('多人玩家升級取得 3 張待選、世界不暫停', () => {
      const w = new World(1, ['macrophage', 'neutrophil'])
      w.players[0].pendingLevelUps = 1
      w.step(1 / 60)
      const offer = w.pendingOfferFor(0)
      expect(offer).not.toBeNull()
      expect(offer!.length).toBe(3)
      expect(w.upgradeTimeRemaining(0)).toBeGreaterThan(0)
      expect(() => w.step(1 / 60)).not.toThrow() // 世界仍可推進
    })

    it('逾時 12 秒自動選第一張', () => {
      const w = new World(1, ['macrophage', 'neutrophil'])
      w.players[0].pendingLevelUps = 1
      w.step(1 / 60) // 產生待選
      expect(w.pendingOfferFor(0)!.length).toBe(3)
      for (let i = 0; i < 13 * 60; i++) w.step(1 / 60) // 越過 12 秒
      expect(w.pendingOfferFor(0)).toBeNull()
      expect(w.players[0].pendingLevelUps).toBe(0)
    })

    it('逾時前主動 chooseUpgrade 套用該卡', () => {
      const w = new World(1, ['macrophage', 'neutrophil'])
      w.players[1].pendingLevelUps = 1
      w.step(1 / 60)
      const id = w.pendingOfferFor(1)![0].id
      w.chooseUpgrade(1, id)
      expect(w.pendingOfferFor(1)).toBeNull()
      expect(w.players[1].pendingLevelUps).toBe(0)
    })

    it('chooseUpgrade 非待選 id 安靜略過', () => {
      const w = new World(1, ['macrophage', 'neutrophil'])
      w.players[0].pendingLevelUps = 1
      w.step(1 / 60)
      const before = w.pendingOfferFor(0)!.length
      w.chooseUpgrade(0, '不存在的id')
      expect(w.pendingOfferFor(0)!.length).toBe(before)
      expect(w.players[0].pendingLevelUps).toBe(1)
    })

    it('一次升多級逐張提供', () => {
      const w = new World(1, ['macrophage', 'neutrophil'])
      w.players[0].pendingLevelUps = 2
      w.step(1 / 60)
      const id1 = w.pendingOfferFor(0)![0].id
      w.chooseUpgrade(0, id1)
      expect(w.pendingOfferFor(0)).toBeNull()
      w.step(1 / 60) // 下一格產下一張
      expect(w.pendingOfferFor(0)!.length).toBe(3)
      expect(w.players[0].pendingLevelUps).toBe(1)
    })

    it('升級浮層期間角色照常可動', () => {
      const w = new World(1, ['macrophage', 'neutrophil'])
      w.players[0].pendingLevelUps = 1
      w.step(1 / 60)
      const x = w.players[0].entity.pos.x
      w.setMoveInput(0, { x: 1, y: 0 })
      for (let i = 0; i < 30; i++) w.step(1 / 60)
      expect(w.players[0].entity.pos.x).toBeGreaterThan(x)
    })

    it('死亡玩家不再倒數/自動選', () => {
      const w = new World(1, ['macrophage', 'neutrophil'])
      w.players[0].pendingLevelUps = 1
      w.step(1 / 60)
      expect(w.pendingOfferFor(0)!.length).toBe(3)
      w.players[0].entity.hp = 0
      const remainBefore = w.upgradeTimeRemaining(0)
      for (let i = 0; i < 13 * 60; i++) w.step(1 / 60)
      expect(w.upgradeTimeRemaining(0)).toBe(remainBefore) // 不再倒數
      expect(w.pendingOfferFor(0)!.length).toBe(3) // 不自動選
    })

    it('選項跨機確定性（相同 seed → 相同選項序列）', () => {
      const gen = () => {
        const w = new World(7, ['macrophage', 'neutrophil'])
        w.players[1].pendingLevelUps = 1
        w.step(1 / 60)
        return w.pendingOfferFor(1)!.map((o) => o.id)
      }
      expect(gen()).toEqual(gen())
    })

    it('單人 processUpgrades 為 no-op（pendingOfferFor 回 null）', () => {
      const w = new World(1) // playerCount 1
      w.players[0].pendingLevelUps = 1
      w.step(1 / 60)
      expect(w.pendingOfferFor(0)).toBeNull()
      expect(w.consumeLevelUp()).toBe(true) // 既有單人路徑仍可消費
    })
  })
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `npx vitest run src/engine/World.test.ts -t "多人非阻塞升級"`
Expected: FAIL — `pendingOfferFor`/`upgradeTimeRemaining`/`chooseUpgrade` 不存在。

- [ ] **Step 3: 型別擴充（types.ts）**

`src/engine/types.ts` 的 `PlayerState` 介面新增（`alive` 附近）：

```ts
  /** 目前提供的待選升級卡（多人非阻塞流程；無則 undefined）。 */
  pendingOffer?: UpgradeOption[]
  /** 待選逾時倒數（秒）；無待選為 0。 */
  upgradeTimer: number
```

確認 `UpgradeOption` 已在 `types.ts` 定義（是，line 334）。

- [ ] **Step 4: World imports + 常數 + 欄位（World.ts）**

`src/engine/World.ts`：
1. line 34 import 補 `rollUpgrades`：

```ts
import { xpForLevel, applyUpgradeById, rollUpgrades } from './systems/leveling'
```

2. line 35 type import 補 `UpgradeDescriptor`：

```ts
import type { Summary, LoadoutSnapshot, UpgradeDescriptor } from '../stores/game'
```

3. types import（line ~13）**通常不需**補 `UpgradeOption`——`processUpgrades` 對 `p.pendingOffer` 的賦值由 `rollUpgrades` 回傳型別推斷即可，`PlayerState.pendingOffer` 的型別在 types.ts 定義。**僅當實作需顯式標註才補**，否則不要加（避免 `noUnusedLocals` 報未使用 import）。

4. 常數區（`FINAL_BOSS_TIME` 附近）新增：

```ts
/** 多人非阻塞升級的待選逾時（秒）。 */
const UPGRADE_TIMEOUT = 12
```

5. 欄位區（`private pickupRng: Rng` 附近）新增：

```ts
  /** 升級選項專用 rng（自 seed 衍生，獨立串流；使多人選項跨機一致、不擾動其他串流）。 */
  private upgradeRng: Rng
```

- [ ] **Step 5: makePlayerState 初值 + 建構子（World.ts）**

`makePlayerState` 回傳物件加 `upgradeTimer: 0`（`pendingOffer` 為選填可省略）：

```ts
      lastMoveDir: { x: 1, y: 0 }, moveInput: { x: 0, y: 0 }, vacuumTimer: 0, alive: true,
      bibleAngle: 0, orbitEntities: [], bibleHitTimers: new Map(),
      upgradeTimer: 0,
```

建構子（`this.pickupRng = createRng(...)` 之後）新增：

```ts
    this.upgradeRng = createRng(seed ^ 0x9e3779b9)
```

- [ ] **Step 6: processUpgrades + step 接線（World.ts）**

新增私有方法（放在 `grantXpTo` 附近）：

```ts
  /**
   * 多人非阻塞升級處理（僅 playerCount>1 生效；單人沿用既有暫停握手）。
   * 為待升級玩家產生待選卡、倒數逾時、逾時自動選第一張。死亡玩家略過。
   * @param dt 固定步長秒數。
   */
  private processUpgrades(dt: number): void {
    if (this.playerCount <= 1) return
    for (const p of this.players) {
      if (!p.alive) continue
      if (!p.pendingOffer) {
        if (p.pendingLevelUps > 0) {
          p.pendingOffer = rollUpgrades(this.upgradeRng, 3, this.upgradeContextFor(p))
          p.upgradeTimer = UPGRADE_TIMEOUT
        }
      } else {
        p.upgradeTimer -= dt
        if (p.upgradeTimer <= 0) {
          applyUpgradeById(p.pendingOffer[0].id, this.upgradeContextFor(p))
          p.pendingOffer = undefined
          p.pendingLevelUps -= 1
        }
      }
    }
  }
```

在 step 的「7d) 同步玩家存活旗標」之後、「8) 清理」之前呼叫：

```ts
    // 7e) 多人非阻塞升級：產生待選/倒數/逾時自動選（單人 no-op）。
    this.processUpgrades(dt)
```

- [ ] **Step 7: 對外 API（World.ts）**

新增（放在 `applyUpgrade` 附近）：

```ts
  /**
   * 指定玩家目前的待選升級卡（多人非阻塞流程）；無則 null。
   * @param playerIndex 玩家索引。
   */
  pendingOfferFor(playerIndex: number): UpgradeDescriptor[] | null {
    const p = this.players[playerIndex]
    if (!p || !p.pendingOffer) return null
    return p.pendingOffer.map((o) => ({ id: o.id, label: o.label }))
  }

  /** 指定玩家待選的剩餘秒數（無待選回 0）。 */
  upgradeTimeRemaining(playerIndex: number): number {
    const p = this.players[playerIndex]
    return p && p.pendingOffer ? Math.max(0, p.upgradeTimer) : 0
  }

  /**
   * 玩家於逾時前選定一張待選升級：套用後清待選、扣一次 pendingLevelUps。
   * id 不在該玩家待選中則安靜略過。
   * @param playerIndex 玩家索引。
   * @param id 選定的升級卡 id。
   */
  chooseUpgrade(playerIndex: number, id: string): void {
    const p = this.players[playerIndex]
    if (!p || !p.pendingOffer) return
    const opt = p.pendingOffer.find((o) => o.id === id)
    if (!opt) return
    applyUpgradeById(opt.id, this.upgradeContextFor(p))
    p.pendingOffer = undefined
    p.pendingLevelUps -= 1
  }
```

- [ ] **Step 8: 跑測試確認通過**

Run: `npx vitest run src/engine/World.test.ts -t "多人非阻塞升級"`
Expected: PASS（9 筆）。

- [ ] **Step 9: 型別檢查 + 全測試 + build**

Run: `npm run typecheck && npm test && npm run build`
Expected: 乾淨；既有測試（含單人升級流程）全綠、零改動。

- [ ] **Step 10: Commit**

```bash
git add src/engine/types.ts src/engine/World.ts src/engine/World.test.ts
git commit -m "$(printf '%s\n\n%s' '[mvp][feat][engine] 多人非阻塞升級流程：per-player 待選 + 12s 逾時自動選（單人 no-op）' 'Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

## 實機驗證（task 後）
- [ ] `npm run dev`：單人升級行為與現況無差異（暫停選卡、無限時間）。
- [ ] `npm test` 全綠、`npm run build` 乾淨；更新 `acceptance.md` + `progress.md`。
- [ ]（多人浮層 UI 屬 SP3，本份不驗。）

---

## Self-Review（plan 對照 spec）
- **Spec coverage：** FR-1 upgradeRng/pendingOffer/upgradeTimer→S3-5；FR-2 processUpgrades→S6；FR-3 UPGRADE_TIMEOUT→S4；FR-4 API→S7；FR-5 角色可動→S6 不凍結輸入 + 測試；FR-6 單人不變→playerCount>1 guard + no-op 測試。Edge：非待選 id 略過、一次升多級、死亡排除、單人 no-op 皆有測試。
- **Placeholder scan：** 無 TBD；所有改碼步驟含完整程式碼與路徑/指令。
- **Type consistency：** `pendingOffer?: UpgradeOption[]`、`upgradeTimer`、`processUpgrades(dt)`、`pendingOfferFor`/`upgradeTimeRemaining`/`chooseUpgrade`、`upgradeRng`、`UPGRADE_TIMEOUT`、`rollUpgrades`/`applyUpgradeById`/`upgradeContextFor` 全程一致。
