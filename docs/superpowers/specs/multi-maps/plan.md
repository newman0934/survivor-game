# 多地圖 — 實作計畫

> **給執行者：** TDD、bite-sized 步驟。World 難度/視覺套用為純引擎邏輯、先寫失敗測試；
> MainMenu/Game/renderer 為膠水層不寫單元測試、實機驗證。每個 task 一個邏輯變更、各自 commit。

**目標：** 進場前可選 3 張地圖，各有不同背景視覺（底色/網格色）與難度修正（生怪間隔/敵人 hp 倍率）。

**架構：** 地圖定義表 `mapDefs.ts`；`World(seed, character, map)` 套用難度倍率與視覺欄位；
選圖在 MainMenu 往上 emit（{character, map}）→ App → Game → World；背景視覺經 world 欄位傳給
renderer。

**技術棧：** TypeScript、Vitest、Vue 3、PixiJS v8。

---

## 檔案結構（建立/修改一覽）

| 檔案 | 責任 | 動作 |
|------|------|------|
| `src/engine/types.ts` | MapKind / MapDef | 修改 |
| `src/engine/systems/mapDefs.ts` | MAP_DEFS / MAP_ORDER | 建立 |
| `src/engine/World.ts` | 建構子加 map、spawnIntervalMult、enemyHpMult、視覺欄位 | 修改 |
| `src/engine/World.test.ts` | 地圖難度/視覺套用測試 | 修改 |
| `src/engine/sprites.ts` | drawBackgroundGrid 加 color/alpha | 修改 |
| `src/engine/PixiRenderer.ts` | 傳網格色、設背景底色 | 修改 |
| `src/engine/Game.ts` | start 加 map 參數 | 修改 |
| `src/App.vue` | startGame 改吃 {character, map}、記住、往下傳 | 修改 |
| `src/ui/MainMenu.vue` | 地圖卡排、emit {character, map} | 修改 |
| `progress.md` | 更新進度 | 修改 |

---

## Task 1：型別與地圖定義表

**Files:**
- Modify: `src/engine/types.ts`
- Create: `src/engine/systems/mapDefs.ts`

- [ ] **Step 1：types.ts 新增 MapKind / MapDef**

在 `CharacterDef` interface 之後新增：

```ts
/** 可選的地圖種類。 */
export type MapKind = 'plains' | 'lava' | 'tundra'

/**
 * 一張地圖的定義（純資料）：背景視覺與難度修正。
 * 在 systems/mapDefs.ts 定義；World 建構時套用。
 */
export interface MapDef {
  kind: MapKind
  name: string
  description: string
  /** 畫布底色。 */
  bgColor: number
  /** 背景網格線顏色。 */
  gridColor: number
  /** 背景網格線透明度。 */
  gridAlpha: number
  /** 生怪間隔倍率（<1 = 生更快 = 更難）。 */
  spawnIntervalMult: number
  /** 敵人 hp 倍率（>1 = 更硬）。 */
  enemyHpMult: number
}
```

- [ ] **Step 2：建立 mapDefs.ts**

```ts
/**
 * 地圖定義表（純資料）。每張地圖的背景視覺與難度修正。
 * World 建構時依此套用。新增地圖或調數值都從這裡下手。
 */
import type { MapDef, MapKind } from '../types'

/** 選單呈現順序（預設選第一張）。 */
export const MAP_ORDER: MapKind[] = ['plains', 'lava', 'tundra']

export const MAP_DEFS: Record<MapKind, MapDef> = {
  plains: {
    kind: 'plains', name: '平原', description: '普通難度，標準節奏', bgColor: 0x0c0c12,
    gridColor: 0xffffff, gridAlpha: 0.04, spawnIntervalMult: 1.0, enemyHpMult: 1.0,
  },
  lava: {
    kind: 'lava', name: '熔岩', description: '困難：生怪更快、敵人更硬', bgColor: 0x1a0a0a,
    gridColor: 0xff7043, gridAlpha: 0.06, spawnIntervalMult: 0.8, enemyHpMult: 1.25,
  },
  tundra: {
    kind: 'tundra', name: '冰原', description: '簡單：生怪較慢、敵人較脆', bgColor: 0x0a1420,
    gridColor: 0x80d8ff, gridAlpha: 0.05, spawnIntervalMult: 1.15, enemyHpMult: 0.9,
  },
}
```

- [ ] **Step 3：型別檢查**

Run: `npm run typecheck`
Expected: 乾淨

- [ ] **Step 4：commit**

```bash
git add src/engine/types.ts src/engine/systems/mapDefs.ts
git commit -m "$(cat <<'EOF'
[mvp][feat][engine] 新增地圖型別與定義表（MapKind/MapDef/MAP_DEFS）

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2：World 套用地圖難度與視覺

**Files:**
- Modify: `src/engine/World.ts`
- Test: `src/engine/World.test.ts`

- [ ] **Step 1：寫失敗測試**

在 `World.test.ts` 頂層 describe 內新增：

```ts
  it('熔岩地圖：敵人 hp ×1.25、視覺欄位正確', () => {
    const w = new World(1, 'warrior', 'lava')
    const e = w.spawnEnemyAt({ x: 100, y: 0 }, 'basic')
    expect(e.hp).toBeCloseTo(10 * 1.25, 5) // basic 基礎 hp 10
    expect(e.maxHp).toBeCloseTo(10 * 1.25, 5)
    expect(w.mapBgColor).toBe(0x1a0a0a)
    expect(w.mapGridColor).toBe(0xff7043)
  })

  it('冰原地圖：敵人 hp ×0.9', () => {
    const w = new World(1, 'warrior', 'tundra')
    const e = w.spawnEnemyAt({ x: 100, y: 0 }, 'basic')
    expect(e.hp).toBeCloseTo(10 * 0.9, 5)
  })

  it('熔岩 Boss hp 疊乘地圖倍率', () => {
    const w = new World(1, 'warrior', 'lava')
    const b = w.spawnBossAt({ x: 100, y: 0 })
    expect(b.maxHp).toBeCloseTo(220 * 1 * 1.25, 5) // 第一隻 boss：220×1×1.25
  })

  it('省略地圖預設平原（倍率皆 1、視覺同現況）', () => {
    const w = new World(1, 'warrior')
    const e = w.spawnEnemyAt({ x: 100, y: 0 }, 'basic')
    expect(e.hp).toBe(10)
    expect(w.mapBgColor).toBe(0x0c0c12)
  })
```

- [ ] **Step 2：執行確認失敗**

Run: `npm test -- World`
Expected: FAIL（建構子第三參數 / mapBgColor 不存在）

- [ ] **Step 3：World import 與視覺欄位**

於檔頭 import 區新增：

```ts
import { MAP_DEFS } from './systems/mapDefs'
```
把型別 import 補上 `MapKind`：把
`import type { Entity, PlayerStats, Weapon, UpgradeContext, EnemyKind, Passive, CharacterKind } from './types'`
改為
`import type { Entity, PlayerStats, Weapon, UpgradeContext, EnemyKind, Passive, CharacterKind, MapKind } from './types'`

在 `playerColor` 欄位附近新增：

```ts
  /** 背景底色（取自所選地圖）；供 renderer 取用。 */
  mapBgColor = 0x0c0c12
  /** 背景網格線顏色（取自所選地圖）。 */
  mapGridColor = 0xffffff
  /** 背景網格線透明度（取自所選地圖）。 */
  mapGridAlpha = 0.04
  /** 生怪間隔倍率（取自所選地圖）。 */
  private mapSpawnIntervalMult = 1
  /** 敵人 hp 倍率（取自所選地圖）。 */
  private mapEnemyHpMult = 1
```

- [ ] **Step 4：建構子加 map 參數並套用**

把建構子簽章與主體改為（在角色套用之後追加地圖套用）：

```ts
  constructor(seed: number, character: CharacterKind = 'warrior', map: MapKind = 'plains') {
    this.rng = createRng(seed)
    this.player = createPlayer({ x: 0, y: 0 })
    const def = CHARACTER_DEFS[character]
    this.playerColor = def.color
    this.player.maxHp = def.maxHp
    this.player.hp = def.maxHp
    Object.assign(this.stats, def.statMods)
    this.weapons = [{ kind: def.startWeapon, level: 1, cooldownTimer: 0 }]
    for (const pk of def.startPassives) {
      this.passives.push({ kind: pk, level: 1 })
      PASSIVE_DEFS[pk].apply(this.upgradeContext())
    }
    const m = MAP_DEFS[map]
    this.mapBgColor = m.bgColor
    this.mapGridColor = m.gridColor
    this.mapGridAlpha = m.gridAlpha
    this.mapSpawnIntervalMult = m.spawnIntervalMult
    this.mapEnemyHpMult = m.enemyHpMult
  }
```

- [ ] **Step 5：新增 scaleEnemyHp 私有方法並套用於三個 spawn 入口**

在 `spawnBossAt` 方法之後新增：

```ts
  /** 依地圖倍率縮放單一敵人的 hp/maxHp。 */
  private scaleEnemyHp(e: Entity): void {
    e.hp *= this.mapEnemyHpMult
    e.maxHp = e.hp
  }
```

把 `spawnEnemyAt` 改為（生成後縮放）：

```ts
  spawnEnemyAt(pos: Vec2, kind: EnemyKind = 'basic'): Entity {
    const e = createEnemy(pos, kind)
    this.scaleEnemyHp(e)
    this.enemies.push(e)
    return e
  }
```

把 `spawnSwarmAt` 的迴圈改為（生成後縮放）：

```ts
  spawnSwarmAt(pos: Vec2): void {
    const offsets = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2]
    const r = 24
    for (const a of offsets) {
      const e = createEnemy({ x: pos.x + Math.cos(a) * r, y: pos.y + Math.sin(a) * r }, 'swarm')
      this.scaleEnemyHp(e)
      this.enemies.push(e)
    }
  }
```

把 `spawnBossAt` 改為（boss 成長後再乘地圖倍率）：

```ts
  spawnBossAt(pos: Vec2): Entity {
    const b = createEnemy(pos, 'boss')
    const scale = 1 + 0.5 * this.bossCount
    b.hp = ENEMY_DEFS.boss.hp * scale
    b.maxHp = b.hp
    this.scaleEnemyHp(b)
    this.bossCount += 1
    this.enemies.push(b)
    return b
  }
```

- [ ] **Step 6：生怪間隔套用倍率**

把 step() 生怪段的
```ts
      this.spawnTimer = spawnInterval(this.elapsed)
```
改為
```ts
      this.spawnTimer = spawnInterval(this.elapsed) * this.mapSpawnIntervalMult
```

- [ ] **Step 7：執行確認通過 + 全測試 + 型別**

Run: `npm test && npm run typecheck`
Expected: 全綠（新地圖測試 + 既有 103；省略 map 預設 plains 不壞既有）

- [ ] **Step 8：commit**

```bash
git add src/engine/World.ts src/engine/World.test.ts
git commit -m "$(cat <<'EOF'
[mvp][feat][engine] World 套用地圖難度（生怪間隔/敵人 hp 倍率）與背景視覺欄位

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3：背景視覺渲染（sprites + PixiRenderer）

**Files:**
- Modify: `src/engine/sprites.ts`
- Modify: `src/engine/PixiRenderer.ts`

- [ ] **Step 1：drawBackgroundGrid 加 color/alpha**

把 `sprites.ts` 的 `drawBackgroundGrid` 改為：

```ts
/** 背景網格：在世界座標、玩家可視範圍內畫間距 64 的細線（無限捲動）。 */
export function drawBackgroundGrid(
  g: Graphics, cx: number, cy: number, viewW: number, viewH: number, color: number, alpha: number,
): void {
  const step = 64
  const left = cx - viewW / 2 - step
  const right = cx + viewW / 2 + step
  const top = cy - viewH / 2 - step
  const bottom = cy + viewH / 2 + step
  const x0 = Math.floor(left / step) * step
  const y0 = Math.floor(top / step) * step
  for (let x = x0; x <= right; x += step) {
    g.moveTo(x, top).lineTo(x, bottom)
  }
  for (let y = y0; y <= bottom; y += step) {
    g.moveTo(left, y).lineTo(right, y)
  }
  g.stroke({ width: 1, color, alpha })
}
```

- [ ] **Step 2：PixiRenderer 傳網格色並設背景底色**

把 `render()` 中的背景網格段
```ts
    this.grid.clear()
    drawBackgroundGrid(this.grid, world.player.pos.x, world.player.pos.y, this.app.renderer.width, this.app.renderer.height)
```
改為
```ts
    this.app.renderer.background.color = world.mapBgColor
    this.grid.clear()
    drawBackgroundGrid(
      this.grid, world.player.pos.x, world.player.pos.y,
      this.app.renderer.width, this.app.renderer.height,
      world.mapGridColor, world.mapGridAlpha,
    )
```

- [ ] **Step 3：型別檢查 + build**

Run: `npm run typecheck && npm run build`
Expected: 乾淨

- [ ] **Step 4：commit**

```bash
git add src/engine/sprites.ts src/engine/PixiRenderer.ts
git commit -m "$(cat <<'EOF'
[mvp][feat][art] 背景底色與網格顏色依所選地圖呈現

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4：選圖流程串接（Game / App / MainMenu）

**Files:**
- Modify: `src/engine/Game.ts`
- Modify: `src/App.vue`
- Modify: `src/ui/MainMenu.vue`

- [ ] **Step 1：Game.start 加 map 參數**

`Game.ts`：把
```ts
  static async start(canvasParent: HTMLElement, seed: number, character: CharacterKind): Promise<Game> {
    const world = new World(seed, character)
```
改為
```ts
  static async start(canvasParent: HTMLElement, seed: number, character: CharacterKind, map: MapKind): Promise<Game> {
    const world = new World(seed, character, map)
```
並把檔頭型別 import 改為：
```ts
import type { CharacterKind, MapKind } from './types'
```

- [ ] **Step 2：App.vue 改吃 {character, map}**

把 `App.vue` 的相關段落改為：

```ts
import type { CharacterKind, MapKind } from './engine/types'
// ...
let seed = 1
// 記住目前選定的角色與地圖（供「再玩一次」沿用）；預設戰士 + 平原。
let selected: { character: CharacterKind; map: MapKind } = { character: 'warrior', map: 'plains' }

async function startGame(opts: { character: CharacterKind; map: MapKind } = selected) {
  selected = opts
  store.start()
  if (!canvasParent.value) return
  game = await Game.start(canvasParent.value, seed++, opts.character, opts.map)
}

function restart() {
  game?.stop()
  game = null
  startGame(selected)
}
```

template 的 MainMenu 監聽不變（`@start="startGame"`，payload 物件會當參數傳入）。

- [ ] **Step 3：MainMenu.vue 加地圖卡排**

把 `MainMenu.vue` 全檔替換為：

```vue
<script setup lang="ts">
/**
 * MainMenu.vue — 主選單 overlay（phase === 'menu' 時顯示）。
 * 顯示角色與地圖選擇卡，按開始時向 App.vue 發出 start 事件並帶 { character, map }。
 */
import { ref } from 'vue'
import { CHARACTER_ORDER, CHARACTER_DEFS } from '../engine/systems/characterDefs'
import { MAP_ORDER, MAP_DEFS } from '../engine/systems/mapDefs'
import type { CharacterKind, MapKind } from '../engine/types'

const emit = defineEmits<{ start: [opts: { character: CharacterKind; map: MapKind }] }>()
const character = ref<CharacterKind>('warrior')
const map = ref<MapKind>('plains')

/** 把顏色數字轉成 CSS hex 字串。 */
function css(color: number): string {
  return '#' + color.toString(16).padStart(6, '0')
}
</script>

<template>
  <div class="overlay">
    <h1>Survivor</h1>

    <div class="section-label">角色</div>
    <div class="row">
      <button
        v-for="kind in CHARACTER_ORDER"
        :key="kind"
        class="card"
        :class="{ active: character === kind }"
        :style="character === kind ? { borderColor: css(CHARACTER_DEFS[kind].color) } : {}"
        @click="character = kind"
      >
        <span class="name" :style="{ color: css(CHARACTER_DEFS[kind].color) }">{{ CHARACTER_DEFS[kind].name }}</span>
        <span class="desc">{{ CHARACTER_DEFS[kind].description }}</span>
      </button>
    </div>

    <div class="section-label">地圖</div>
    <div class="row">
      <button
        v-for="kind in MAP_ORDER"
        :key="kind"
        class="card"
        :class="{ active: map === kind }"
        :style="map === kind ? { borderColor: css(MAP_DEFS[kind].gridColor) } : {}"
        @click="map = kind"
      >
        <span class="name" :style="{ color: css(MAP_DEFS[kind].gridColor) }">{{ MAP_DEFS[kind].name }}</span>
        <span class="desc">{{ MAP_DEFS[kind].description }}</span>
      </button>
    </div>

    <button class="start" @click="emit('start', { character, map })">開始遊戲</button>
    <p class="hint">WASD / 方向鍵移動 · 自動攻擊</p>
  </div>
</template>

<style scoped>
.overlay {
  position: absolute; inset: 0; display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 0.6rem;
  color: #fff; font-family: sans-serif; background: rgba(16, 16, 24, 0.85); overflow: auto;
}
h1 { font-size: 3rem; margin: 0 0 0.5rem; letter-spacing: 0.1em; }
.section-label { font-size: 0.9rem; opacity: 0.7; letter-spacing: 0.2em; margin-top: 0.4rem; }
.row { display: flex; gap: 0.8rem; flex-wrap: wrap; justify-content: center; max-width: 90vw; }
.card {
  display: flex; flex-direction: column; gap: 0.25rem; width: 8.5rem; padding: 0.7rem;
  cursor: pointer; border: 2px solid rgba(255, 255, 255, 0.2); border-radius: 10px;
  background: rgba(255, 255, 255, 0.06); color: #fff; text-align: left;
}
.card.active { background: rgba(255, 255, 255, 0.14); }
.name { font-size: 1.1rem; font-weight: bold; }
.desc { font-size: 0.8rem; opacity: 0.8; }
.start {
  font-size: 1.4rem; padding: 0.6rem 2rem; margin-top: 0.6rem; cursor: pointer; border: none;
  border-radius: 8px; background: #4aa3ff; color: #fff;
}
.hint { opacity: 0.7; }
</style>
```

- [ ] **Step 4：型別檢查 + build**

Run: `npm run typecheck && npm run build`
Expected: 乾淨

- [ ] **Step 5：commit**

```bash
git add src/engine/Game.ts src/App.vue src/ui/MainMenu.vue
git commit -m "$(cat <<'EOF'
[mvp][feat][ui] 主選單加地圖選擇，選定地圖串接至 World 起始

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5：驗證與進度更新

**Files:**
- Modify: `progress.md`、`docs/superpowers/specs/multi-maps/acceptance.md`

- [ ] **Step 1：完整測試 + 型別 + build**

Run: `npm test && npm run typecheck && npm run build`
Expected: 測試全綠、型別乾淨、build 乾淨

- [ ] **Step 2：實機煙霧測試**

Run: `npm run dev`。確認主選單有角色排與地圖排、可各自切換；選熔岩開局後底色偏暗紅、網格橘色、
敵人更密更硬；選冰原則暗藍/淡青、較鬆；平原同現況；「再玩一次」沿用角色+地圖；無功能相關 console error。

- [ ] **Step 3：更新 acceptance.md 勾選 + progress.md**

依結果勾選 `acceptance.md`，把 `progress.md` 階段 3「多張地圖」標記完成、更新驗證快照。

- [ ] **Step 4：commit**

```bash
git add progress.md docs/superpowers/specs/multi-maps/acceptance.md
git commit -m "$(cat <<'EOF'
[mvp][docs][meta] 多地圖功能驗證通過，更新 progress 與 acceptance

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## 自我檢查（Self-Review）結果

- **Spec 覆蓋：** FR-1（MapDef/MAP_DEFS=Task1）、FR-2（World 難度+視覺欄位=Task2）、
  FR-3（背景渲染=Task3）、FR-4（選圖流程=Task4）皆有對應。
- **型別一致：** `MapKind`、`MapDef`、`MAP_DEFS`/`MAP_ORDER`、`mapBgColor/mapGridColor/mapGridAlpha`、
  `scaleEnemyHp`、`drawBackgroundGrid(...,color,alpha)`、`Game.start(...,map)`、
  MainMenu `emit('start', { character, map })`、App `startGame({character, map})` 跨 task 一致。
- **無 placeholder：** 所有步驟含實際程式碼與指令。
- **相容性：** map 有預設值 'plains'，既有 `new World(seed)` / `(seed, char)` 與 Game.start 既有呼叫
  （Task 4 一併更新為帶 map）皆合法；plains 倍率 1、視覺同現況。
