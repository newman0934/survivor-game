# coop-local-player-shell (SP3) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把引擎/UI 從寫死 players[0] 改為跟隨 `localPlayerIndex`，並加多人非阻塞升級浮層（消費 1B）；單人＝0、零退化。

**Architecture:** `World.summary(i)`/`loadoutSnapshot(i)` 加選填 index（預設 0）；`Game` 保存 `localPlayerIndex` 並於輸入/摘要/持有/渲染處改用之；`PixiRenderer.render(world, i)` 鏡頭跟本地玩家並渲染全部玩家；`store` 加多人升級狀態 + `MultiUpgradeOverlay.vue` 非阻塞顯示本地待選卡。

**Tech Stack:** TypeScript、PixiJS、Vue 3、Pinia、Vitest。

## Global Constraints

- 文件繁中；程式碼/型別/commit 英文。
- 引擎純 TS、不得 import Vue/Pinia 執行期；`World.summary`/`loadoutSnapshot` 唯讀、不改模擬邏輯。
- **單人零退化**：所有新增 index 參數預設 0；playerCount===1 不推 multiOffer；既有測試不改且全綠；單人實機行為不變。
- 多人浮層**非阻塞**（不暫停、不擋輸入）；單人仍用既有暫停 UpgradeModal（互斥）。
- App.vue 既有 5 參數 `Game.start(...)` 不需改（新參數有預設）。
- commit 格式 `[mvp][type][scope] 描述` + 結尾 `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`。

---

## 檔案結構（本案異動）

| 檔案 | 異動 | 責任 |
|------|------|------|
| `src/engine/World.ts` | Modify | `summary(i)`/`loadoutSnapshot(i)` 加選填 index |
| `src/engine/World.test.ts` | Modify | summary(i)/loadoutSnapshot(i) 測試 |
| `src/engine/Game.ts` | Modify | `localPlayerIndex` + 輸入/摘要/持有/渲染改用之 + 多人 offer 推送 + onMultiUpgradePicked |
| `src/engine/PixiRenderer.ts` | Modify | `render(world, i)` 鏡頭跟本地 + 渲染全部玩家 |
| `src/stores/game.ts` | Modify | `localPlayerIndex`/`multiOffer`/`multiOfferTimeLeft`/`onMultiUpgradePicked` + 2 actions |
| `src/ui/MultiUpgradeOverlay.vue` | Create | 多人非阻塞限時卡列 + 倒數條 |
| `src/App.vue` | Modify | playing 期間掛載 MultiUpgradeOverlay |

三個 task：T1 World 視角化 → T2 Game/renderer 本地玩家 → T3 store + 浮層 UI。

---

### Task 1: World.summary(i) / loadoutSnapshot(i)

**Files:**
- Modify: `src/engine/World.ts`（`summary()`、`loadoutSnapshot()`）
- Test: `src/engine/World.test.ts`

**Interfaces:**
- Produces：`World.summary(playerIndex?: number)`、`World.loadoutSnapshot(playerIndex?: number)`（預設 0）。

- [ ] **Step 1: 寫失敗測試**

在 `src/engine/World.test.ts` 新增：

```ts
  describe('視角化 summary/loadout（SP3）', () => {
    it('summary(i) 回對應玩家、省略＝players[0]', () => {
      const w = new World(1, ['macrophage', 'neutrophil'])
      w.players[1].pendingLevelUps = 0
      w.players[1].level = 3
      w.players[0].level = 1
      expect(w.summary(1).level).toBe(3)
      expect(w.summary(0).level).toBe(1)
      expect(w.summary().level).toBe(w.summary(0).level) // 省略＝players[0]
    })
    it('summary(i) 的 hp 為該玩家', () => {
      const w = new World(1, ['macrophage', 'neutrophil'])
      w.players[1].entity.hp = 42
      expect(w.summary(1).hp).toBe(42)
    })
    it('loadoutSnapshot(i) 回對應玩家武器', () => {
      const w = new World(1, ['macrophage', 'neutrophil'])
      expect(w.loadoutSnapshot(0).weapons.some((x) => x.kind === 'antibody')).toBe(true)
      expect(w.loadoutSnapshot(1).weapons.some((x) => x.kind === 'perforin')).toBe(true)
      expect(w.loadoutSnapshot().weapons).toEqual(w.loadoutSnapshot(0).weapons) // 省略＝0
    })
  })
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `npx vitest run src/engine/World.test.ts -t "視角化"`
Expected: FAIL — summary/loadoutSnapshot 不接受參數（型別錯）或結果不分玩家。

- [ ] **Step 3: 改 summary()（World.ts）**

把 `summary()` 改為接受 index、以該玩家 PlayerState 取值（Boss/事件/kills/time 維持共享）：

```ts
  summary(playerIndex = 0): Summary {
    const p = this.players[playerIndex] ?? this.players[0]
    const boss = this.enemies.find((e) => e.active && (e.enemyKind === 'superbug' || e.enemyKind === 'finalboss'))
    return {
      hp: Math.max(0, Math.round(p.entity.hp)),
      maxHp: p.entity.maxHp,
      time: Math.floor(this.elapsed),
      level: p.level,
      kills: this.kills,
      xp: p.xp,
      xpNeeded: xpForLevel(p.level),
      bossActive: !!boss,
      bossHp: boss ? Math.round(boss.hp) : 0,
      bossMaxHp: boss ? boss.maxHp : 0,
      isFinalBoss: boss?.enemyKind === 'finalboss',
      eventWarning: this.eventWarning,
    }
  }
```

- [ ] **Step 4: 改 loadoutSnapshot()（World.ts）**

```ts
  loadoutSnapshot(playerIndex = 0): LoadoutSnapshot {
    const p = this.players[playerIndex] ?? this.players[0]
    return {
      weapons: p.weapons.map((w) => ({ kind: w.kind, level: w.level, evolved: !!w.evolved })),
      passives: p.passives.map((ps) => ({ kind: ps.kind, level: ps.level })),
    }
  }
```

- [ ] **Step 5: 跑測試 + 全測試 + 型別**

Run: `npx vitest run src/engine/World.test.ts -t "視角化" && npm run typecheck && npm test`
Expected: 新 3 筆 PASS；既有全綠（省略參數＝players[0]，與原 proxy 行為一致）；typecheck 乾淨。

- [ ] **Step 6: Commit**

```bash
git add src/engine/World.ts src/engine/World.test.ts
git commit -m "$(printf '%s\n\n%s' '[mvp][feat][engine] World.summary/loadoutSnapshot 加選填 playerIndex（預設 0 向後相容）' 'Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

### Task 2: Game localPlayerIndex + Renderer 跟本地玩家 + 渲染全部玩家

**Files:**
- Modify: `src/engine/Game.ts`（建構子/start/loop）
- Modify: `src/engine/PixiRenderer.ts`（`render`、`syncSprite`）

**Interfaces:**
- Consumes：T1 的 `summary(i)`/`loadoutSnapshot(i)`；`World.setMoveInput(i,dir)`、`World.players`。
- Produces：`Game.start(..., localPlayerIndex = 0)`；`PixiRenderer.render(world, localPlayerIndex = 0)`。

- [ ] **Step 1: Game localPlayerIndex 欄位 + 建構子 + start（Game.ts）**

建構子加參數與欄位（`private constructor(world, renderer, seed)` → 加 `localPlayerIndex`）：

```ts
  /** 本地玩家索引（單人＝0；SP4 連線時為自己的位置）。 */
  private localPlayerIndex: number

  private constructor(world: World, renderer: PixiRenderer, seed: number, localPlayerIndex = 0) {
    this.world = world
    this.renderer = renderer
    this.localPlayerIndex = localPlayerIndex
    this.upgradeRng = createRng(seed ^ 0xdead)
  }
```

`start` 簽章加參數、傳入建構子、初始 loadout 用 index：

```ts
  static async start(canvasParent: HTMLElement, seed: number, character: CharacterKind, map: MapKind, bloomEnabled = true, localPlayerIndex = 0): Promise<Game> {
    const world = new World(seed, character, map)
    const renderer = await PixiRenderer.create(canvasParent, bloomEnabled)
    const game = new Game(world, renderer, seed, localPlayerIndex)
    game.store.setLoadout(world.loadoutSnapshot(localPlayerIndex))
    game.input.attach()
    game.touch.attach(canvasParent)
    soundManager.resume()
    soundManager.startMusic(map)
    game.store.onUpgradePicked = (id: string) => {
      world.applyUpgrade(id)
      game.store.setLoadout(world.loadoutSnapshot(localPlayerIndex))
      game.paused = false
    }
    game.loop(0)
    return game
  }
```

- [ ] **Step 2: loop 改用 localPlayerIndex（Game.ts）**

在 `loop` 內逐處替換（保持單人 index 0 等價）：
- 輸入（line ~107）：
  ```ts
  const tdir = this.touch.direction()
  this.world.setMoveInput(this.localPlayerIndex, (tdir.x !== 0 || tdir.y !== 0) ? tdir : this.input.direction())
  ```
- 單人升級握手內 `this.store.setLoadout(this.world.loadoutSnapshot())` → `...loadoutSnapshot(this.localPlayerIndex))`（兩處）。
- 所有 `this.store.updateSummary(this.world.summary())` → `...summary(this.localPlayerIndex))`（三處：勝利/死亡/正常）。
- 渲染 `this.renderer.render(this.world)` → `this.renderer.render(this.world, this.localPlayerIndex)`。

> 單人升級握手（consumeLevelUp + rollUpgrades + 暫停）維持不變（playerCount 1、index 0）；本 task 不加多人 offer 推送（留 T3）。

- [ ] **Step 3: Renderer render(world, i) + 渲染全部玩家（PixiRenderer.ts）**

把 `render(world: World)` 改為 `render(world: World, localPlayerIndex = 0)`，開頭取本地玩家，並把 `world.player` 的「玩家相對」用途改為本地玩家：

```ts
  render(world: World, localPlayerIndex = 0): void {
    this.clock += 1 / 60
    this.frameId += 1
    const lp = world.players[localPlayerIndex] ?? world.players[0]
    const local = lp.entity

    if (!this.noise) this.noise = new NoiseBackground(this.app, world.mapKind)
    this.noise.update(local.pos.x, local.pos.y)

    if (lp.level > this.lastLevel) {
      this.effects.spawnLevelUp(local.pos.x, local.pos.y)
    }
    this.lastLevel = lp.level

    this.app.renderer.background.color = world.mapBgColor
    this.grid.clear()
    drawMapBackground(
      this.grid, world.mapKind, local.pos.x, local.pos.y,
      this.app.renderer.width, this.app.renderer.height, this.clock,
    )

    this.garlicAura.clear()
    const gr = world.garlicRadius()
    if (gr > 0) drawGarlicAura(this.garlicAura, local.pos.x, local.pos.y, gr, this.clock)

    for (const g of world.gems()) if (g.active) this.syncSprite(g, world)
    for (const e of world.enemies) if (e.active) this.syncSprite(e, world)
    for (const p of world.projectiles) if (p.active) this.syncSprite(p, world)
    for (const p of world.enemyProjectiles) if (p.active) this.syncSprite(p, world)
    for (const o of world.orbits()) if (o.active) this.syncSprite(o, world)
    for (const c of world.chests()) if (c.active) this.syncSprite(c, world)
    for (const pk of world.pickups()) if (pk.active) this.syncSprite(pk, world)
    // 渲染全部玩家（各自 color/character）；本地玩家最後畫（最上層）。
    for (const pl of world.players) {
      if (pl === lp) continue
      this.syncSprite(pl.entity, world, pl.color, pl.character)
    }
    this.syncSprite(local, world, lp.color, lp.character)

    // …（回收/resize 段不變）…

    const shake = this.effects.update()
    this.world.position.set(
      this.app.renderer.width / 2 - local.pos.x + shake.shakeX,
      this.app.renderer.height / 2 - local.pos.y + shake.shakeY,
    )
  }
```

> 回收迴圈（line 173-188）與 resize 段（190-197）原樣保留，不需改。

把 `syncSprite` 加選填 color/character override：

```ts
  private syncSprite(e: Entity, world: World, playerColor = world.playerColor, playerCharacter = world.playerCharacter): void {
    const s = this.spriteFor(e, playerColor, playerCharacter)
    s.root.position.set(e.pos.x, e.pos.y)
    s.root.visible = true
    s.lastSeen = this.frameId
    this.animate(e, s, world)
    this.applyHitFlash(e, s)
  }
```

> `currentLevel`/`lastLevel`：原以 `world.currentLevel`（players[0]）偵測升級閃光，改用本地玩家 `lp.level`。`world.currentLevel` getter 可保留不動（其他處若用到）。

- [ ] **Step 4: 型別 + 全測試 + build**

Run: `npm run typecheck && npm test && npm run build`
Expected: 乾淨；既有測試全綠（單人 index 0 等價）。

- [ ] **Step 5: Commit**

```bash
git add src/engine/Game.ts src/engine/PixiRenderer.ts
git commit -m "$(printf '%s\n\n%s' '[mvp][feat][engine] Game/renderer 跟隨 localPlayerIndex + 渲染全部玩家（單人零退化）' 'Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

### Task 3: store 多人升級狀態 + Game 推送 + MultiUpgradeOverlay

**Files:**
- Modify: `src/stores/game.ts`
- Modify: `src/engine/Game.ts`（loop 推送 + start 設 onMultiUpgradePicked）
- Create: `src/ui/MultiUpgradeOverlay.vue`
- Modify: `src/App.vue`

**Interfaces:**
- Consumes：T2 的 Game `localPlayerIndex`；`World.pendingOfferFor(i)`/`upgradeTimeRemaining(i)`/`chooseUpgrade(i,id)`（1B）；`UpgradeDescriptor`。
- Produces：store `multiOffer`/`multiOfferTimeLeft`/`localPlayerIndex`/`onMultiUpgradePicked` + `setMultiOffer`/`pickMultiUpgrade`。

- [ ] **Step 1: store 多人升級狀態（game.ts）**

`State`/state() 加欄位（`upgradeOptions` 附近）：

```ts
  // State 介面
  localPlayerIndex: number
  multiOffer: UpgradeDescriptor[] | null
  multiOfferTimeLeft: number
  onMultiUpgradePicked: ((id: string) => void) | null
```
state() 初值：

```ts
    localPlayerIndex: 0,
    multiOffer: null,
    multiOfferTimeLeft: 0,
    onMultiUpgradePicked: null,
```
`reset()`（清場那段）加：

```ts
      this.multiOffer = null
      this.multiOfferTimeLeft = 0
      this.onMultiUpgradePicked = null
```
actions 新增：

```ts
    /** 引擎 → store：推送本地玩家目前的多人待選與剩餘秒（無待選傳 null/0）。 */
    setMultiOffer(offer: UpgradeDescriptor[] | null, timeLeft: number) {
      this.multiOffer = offer
      this.multiOfferTimeLeft = timeLeft
    },
    /** UI → 引擎：選定一張多人升級卡（觸發引擎註冊的 callback）。 */
    pickMultiUpgrade(id: string) {
      this.onMultiUpgradePicked?.(id)
    },
```

> `UpgradeDescriptor` 已於 game.ts 定義；無需 import。

- [ ] **Step 2: Game 推送 offer + 設 callback（Game.ts）**

`start` 內（`onUpgradePicked` 設定之後）新增：

```ts
    game.store.onMultiUpgradePicked = (id: string) => {
      world.chooseUpgrade(localPlayerIndex, id)
      game.store.setLoadout(world.loadoutSnapshot(localPlayerIndex))
    }
```

`loop` 內、step 消化後且未暫停時（緊接 `this.store.updateSummary(...)` 正常推送處）新增多人 offer 推送：

```ts
      // 多人非阻塞升級：推送本地玩家待選（單人 playerCount 1 不進此分支，multiOffer 保持 null）。
      if (this.world.playerCount > 1) {
        this.store.setMultiOffer(
          this.world.pendingOfferFor(this.localPlayerIndex),
          this.world.upgradeTimeRemaining(this.localPlayerIndex),
        )
      }
```

> 放在每幀消化後固定執行一次（與 updateSummary 同區），確保倒數條即時。

- [ ] **Step 3: MultiUpgradeOverlay.vue（建立）**

`src/ui/MultiUpgradeOverlay.vue`（沿用 GameIcon/膜質風格；非阻塞、不暫停）：

```vue
<script setup lang="ts">
/** MultiUpgradeOverlay.vue — 多人非阻塞升級浮層：本地玩家有待選時顯示限時卡列 + 倒數條。
 *  不暫停世界、不擋遊戲輸入（pointer-events 僅卡片）。 */
import { computed } from 'vue'
import { useGameStore } from '../stores/game'
import GameIcon from './GameIcon.vue'
import { resolveOptionIcon } from './icons/iconRegistry'

const store = useGameStore()
const UPGRADE_TIMEOUT = 12
const pct = computed(() => Math.max(0, Math.min(100, (store.multiOfferTimeLeft / UPGRADE_TIMEOUT) * 100)))
</script>

<template>
  <div v-if="store.multiOffer" class="multi-upgrade">
    <div class="hint">升級！選一張（{{ Math.ceil(store.multiOfferTimeLeft) }}s）</div>
    <div class="timer"><div class="fill" :style="{ width: pct + '%' }" /></div>
    <div class="cards">
      <button v-for="o in store.multiOffer" :key="o.id" class="card ui-btn" @click="store.pickMultiUpgrade(o.id)">
        <GameIcon v-if="resolveOptionIcon(o.id)" :category="resolveOptionIcon(o.id)!.category" :kind="resolveOptionIcon(o.id)!.kind" :size="28" />
        <span class="label">{{ o.label }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.multi-upgrade {
  position: absolute; left: 50%; bottom: 6.5rem; transform: translateX(-50%);
  display: flex; flex-direction: column; align-items: center; gap: 0.4rem;
  pointer-events: none; /* 容器不擋輸入；卡片自行開啟 */
}
.hint { font-family: var(--font-display, sans-serif); font-size: 0.85rem; color: #ffd54a; text-shadow: 0 1px 2px #000; }
.timer { width: min(70vw, 360px); height: 5px; border-radius: 3px; background: rgba(0,0,0,0.45); overflow: hidden; }
.timer .fill { height: 100%; background: #ffd54a; transition: width 0.1s linear; }
.cards { display: flex; gap: 0.5rem; }
.card { pointer-events: auto; display: flex; flex-direction: column; align-items: center; gap: 0.2rem; padding: 0.4rem 0.6rem; min-width: 88px; }
.label { font-size: 0.75rem; }
</style>
```

> 若 `GameIcon` 的 props 名稱與此處不符，依 `src/ui/icons/GameIcon.vue` 既有 props 對齊（category/kind/size）。

- [ ] **Step 4: App 掛載（App.vue）**

`App.vue` import 並在 `phase==='playing'` 期間掛載（與 Hud 同層）：

```ts
import MultiUpgradeOverlay from './ui/MultiUpgradeOverlay.vue'
```
template（Hud 附近）：

```vue
    <MultiUpgradeOverlay v-if="store.phase === 'playing'" />
```

- [ ] **Step 5: 型別 + 全測試 + build**

Run: `npm run typecheck && npm test && npm run build`
Expected: 乾淨；既有測試全綠。

- [ ] **Step 6: Commit**

```bash
git add src/stores/game.ts src/engine/Game.ts src/ui/MultiUpgradeOverlay.vue src/App.vue
git commit -m "$(printf '%s\n\n%s' '[mvp][feat][ui] 多人非阻塞升級浮層（store 推送 + MultiUpgradeOverlay）' 'Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

## 實機驗證（三 task 後）
- [ ] `npm run dev`：單人行為**與現況無差異**（移動/開火/升級暫停選卡/撿取/Boss/結算）；多人浮層不出現（playerCount 1）。
- [ ]（可選）開發時暫以 `new World(seed, ['macrophage','neutrophil'])` + 注入 store.multiOffer 目視浮層樣式。
- [ ] `npm run build` 乾淨；更新 `acceptance.md` + `progress.md`。

---

## Self-Review（plan 對照 spec）
- **Spec coverage：** FR-1 summary/loadout(i)→T1；FR-2 Game 接線→T2；FR-3 renderer 跟本地+全玩家→T2；FR-4 store 狀態→T3 S1；FR-5 Game 推送+浮層→T3；FR-6 單人零退化→各 task gate（預設 0 + playerCount>1 guard）。Edge：index 越界 `?? players[0]`（T1/T2）、單人浮層不顯示（T3 guard）、非阻塞（浮層 pointer-events 容器 none）。
- **Placeholder scan：** 無 TBD；改碼步驟含完整碼或精確替換規則 + 確切呼叫點。
- **Type consistency：** `summary(playerIndex?)`/`loadoutSnapshot(playerIndex?)`/`render(world, localPlayerIndex?)`/`localPlayerIndex`/`multiOffer`/`multiOfferTimeLeft`/`setMultiOffer`/`pickMultiUpgrade`/`onMultiUpgradePicked` 全程一致；`chooseUpgrade`/`pendingOfferFor`/`upgradeTimeRemaining`（1B）簽章一致。
