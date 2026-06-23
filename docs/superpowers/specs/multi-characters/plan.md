# 多角色 — 實作計畫

> **給執行者：** TDD、bite-sized 步驟。World 起始套用為純引擎邏輯、先寫失敗測試；MainMenu/App/
> Game/renderer 為膠水層不寫單元測試、實機驗證。每個 task 一個邏輯變更、各自 commit。

**目標：** 進場前可從 4 個角色（戰士/遊俠/法師/豐收者）選一，各有不同起始武器/數值/血/被動/顏色。

**架構：** 角色定義表 `characterDefs.ts`；`World(seed, character)` 套用起始狀態；選角在 MainMenu
往上 emit 至 App → Game → World；玩家顏色經 `world.playerColor` 傳給 `drawPlayer`。

**技術棧：** TypeScript、Vitest、Vue 3、PixiJS。

---

## 檔案結構（建立/修改一覽）

| 檔案 | 責任 | 動作 |
|------|------|------|
| `src/engine/types.ts` | CharacterKind / CharacterDef | 修改 |
| `src/engine/systems/characterDefs.ts` | CHARACTER_DEFS / CHARACTER_ORDER | 建立 |
| `src/engine/World.ts` | 建構子加 character、套用起始狀態、playerColor | 修改 |
| `src/engine/World.test.ts` | 角色起始套用測試 | 修改 |
| `src/engine/sprites.ts` | drawPlayer 加 color 參數 | 修改 |
| `src/engine/PixiRenderer.ts` | 畫玩家傳 world.playerColor | 修改 |
| `src/engine/Game.ts` | start 加 character 參數往下傳 | 修改 |
| `src/App.vue` | startGame(kind)、記住選擇、傳給 Game.start | 修改 |
| `src/ui/MainMenu.vue` | 選角卡 UI、emit('start', kind) | 修改 |
| `progress.md` | 更新進度 | 修改 |

---

## Task 1：型別與角色定義表

**Files:**
- Modify: `src/engine/types.ts`
- Create: `src/engine/systems/characterDefs.ts`

- [ ] **Step 1：types.ts 新增 CharacterKind / CharacterDef**

在 `PassiveDef` interface 之後新增：

```ts
/** 可選的起始角色種類。 */
export type CharacterKind = 'warrior' | 'ranger' | 'mage' | 'harvester'

/**
 * 一個可選角色的定義（純資料）：決定起始武器、起始數值、起始被動與顏色。
 * 在 systems/characterDefs.ts 定義；World 建構時套用。
 */
export interface CharacterDef {
  kind: CharacterKind
  name: string
  description: string
  /** 玩家圓的顏色。 */
  color: number
  /** 起始最大血（覆寫 player.maxHp/hp）。 */
  maxHp: number
  /** 起始武器。 */
  startWeapon: WeaponKind
  /** 併入起始 PlayerStats 的部分欄位。 */
  statMods: Partial<PlayerStats>
  /** 起始就持有的被動道具（建立時各套用一次效果）。 */
  startPassives: PassiveKind[]
}
```

- [ ] **Step 2：建立 characterDefs.ts**

```ts
/**
 * 角色定義表（純資料）。每個可選角色的起始武器、數值、被動與顏色。
 * World 建構時依此套用起始狀態。新增角色或調數值都從這裡下手。
 */
import type { CharacterDef, CharacterKind } from '../types'

/** 選單呈現順序（預設選第一個）。 */
export const CHARACTER_ORDER: CharacterKind[] = ['warrior', 'ranger', 'mage', 'harvester']

export const CHARACTER_DEFS: Record<CharacterKind, CharacterDef> = {
  warrior: {
    kind: 'warrior', name: '戰士', description: '高血量與護甲，穩健近戰', color: 0xff6b6b,
    maxHp: 140, startWeapon: 'wand', statMods: { armor: 3 }, startPassives: [],
  },
  ranger: {
    kind: 'ranger', name: '遊俠', description: '快攻快走，但血量薄', color: 0x6bff8c,
    maxHp: 80, startWeapon: 'knife', statMods: { moveSpeed: 240, cooldownMult: 0.9 }, startPassives: [],
  },
  mage: {
    kind: 'mage', name: '法師', description: '高傷害輸出', color: 0xb39ddb,
    maxHp: 90, startWeapon: 'bible', statMods: { damageMult: 1.25 }, startPassives: [],
  },
  harvester: {
    kind: 'harvester', name: '豐收者', description: '高吸取、起始帶皇冠（經驗加成）', color: 0xffd54a,
    maxHp: 100, startWeapon: 'garlic', statMods: { pickupRadius: 180 }, startPassives: ['crown'],
  },
}
```

- [ ] **Step 3：型別檢查**

Run: `npm run typecheck`
Expected: 乾淨（characterDefs 為純資料、被匯出）

- [ ] **Step 4：commit**

```bash
git add src/engine/types.ts src/engine/systems/characterDefs.ts
git commit -m "$(cat <<'EOF'
[mvp][feat][engine] 新增角色型別與定義表（CharacterKind/CharacterDef/CHARACTER_DEFS）

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2：World 套用角色起始狀態

**Files:**
- Modify: `src/engine/World.ts`
- Test: `src/engine/World.test.ts`

- [ ] **Step 1：寫失敗測試**

在 `World.test.ts` 頂層 describe 內新增：

```ts
  it('預設角色為戰士（warrior）起始狀態', () => {
    const w = new World(1)
    expect(w.weapons[0].kind).toBe('wand')
    expect(w.player.maxHp).toBe(140)
    expect(w.player.hp).toBe(140)
    expect(w.stats.armor).toBeGreaterThan(0)
  })

  it('遊俠起始：飛刀、高移速、薄血、顏色', () => {
    const w = new World(1, 'ranger')
    expect(w.weapons[0].kind).toBe('knife')
    expect(w.stats.moveSpeed).toBe(240)
    expect(w.player.maxHp).toBe(80)
    expect(w.playerColor).toBe(0x6bff8c)
  })

  it('法師起始：聖經、高傷害乘區', () => {
    const w = new World(1, 'mage')
    expect(w.weapons[0].kind).toBe('bible')
    expect(w.stats.damageMult).toBeCloseTo(1.25, 5)
  })

  it('豐收者起始：大蒜 + 皇冠被動（xpGain>1）', () => {
    const w = new World(1, 'harvester')
    expect(w.weapons[0].kind).toBe('garlic')
    expect(w.passives.some((p) => p.kind === 'crown')).toBe(true)
    expect(w.stats.xpGain).toBeGreaterThan(1)
  })
```

- [ ] **Step 2：執行確認失敗**

Run: `npm test -- World`
Expected: FAIL（建構子尚未吃 character / playerColor 不存在）

- [ ] **Step 3：World import 與 playerColor 欄位**

於檔頭 import 區新增：

```ts
import { CHARACTER_DEFS } from './systems/characterDefs'
import { PASSIVE_DEFS } from './systems/passiveDefs'
```
並把型別 import 補上 `CharacterKind`：把
`import type { Entity, PlayerStats, Weapon, UpgradeContext, EnemyKind, Passive } from './types'`
改為
`import type { Entity, PlayerStats, Weapon, UpgradeContext, EnemyKind, Passive, CharacterKind } from './types'`

在 `player: Entity` 欄位附近（或 stats 之後）新增公開欄位：

```ts
  /** 玩家圓顏色（取自所選角色）；供 renderer 取用。 */
  playerColor = 0x4aa3ff
```

- [ ] **Step 4：建構子套用角色**

把建構子
```ts
  constructor(seed: number) {
    this.rng = createRng(seed)
    this.player = createPlayer({ x: 0, y: 0 })
  }
```
改為
```ts
  /**
   * @param seed      本場亂數種子。
   * @param character 起始角色（預設戰士）；決定起始武器/數值/血/被動/顏色。
   */
  constructor(seed: number, character: CharacterKind = 'warrior') {
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
  }
```

> 註：`stats` / `weapons` / `passives` 為欄位初始值，於建構子主體執行前已就緒，故此處可安全覆寫與
> 呼叫 `upgradeContext()`。

- [ ] **Step 5：執行確認通過 + 全測試**

Run: `npm test`
Expected: PASS（新角色測試 + 既有 99；既有未斷言 player.maxHp 特定值，不受 140 影響）

- [ ] **Step 6：型別檢查**

Run: `npm run typecheck`
Expected: 乾淨（Game.start 仍以舊簽章呼叫 new World(seed)，合法因 character 有預設值）

- [ ] **Step 7：commit**

```bash
git add src/engine/World.ts src/engine/World.test.ts
git commit -m "$(cat <<'EOF'
[mvp][feat][engine] World 建構子套用角色起始狀態（武器/數值/血/被動/顏色）

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3：玩家顏色渲染（sprites + PixiRenderer）

**Files:**
- Modify: `src/engine/sprites.ts`
- Modify: `src/engine/PixiRenderer.ts`

- [ ] **Step 1：drawPlayer 加 color 參數**

把 `sprites.ts` 的 `drawPlayer` 改為：

```ts
/** 玩家：柔光圈 + 圓身 + 描邊 + 朝 +x 的槍口三角（顏色為所選角色色）。 */
export function drawPlayer(g: Graphics, e: Entity, color: number): void {
  const r = e.radius
  g.circle(0, 0, r * 1.8).fill({ color, alpha: 0.15 })
  g.circle(0, 0, r).fill(color)
  g.circle(0, 0, r).stroke({ width: 2, color: 0xffffff })
  g.poly([r - 1, -5, r + 7, 0, r - 1, 5]).fill(0xffffff)
}
```

> 描邊與槍口改白色，讓各角色色都清晰可辨。

- [ ] **Step 2：PixiRenderer 傳入玩家顏色**

`PixiRenderer.spriteFor` 目前簽章為 `private spriteFor(e: Entity)`，且 player 分支呼叫
`drawPlayer(body, e)`。改為讓它能取得顏色：把 `spriteFor(e)` 改為 `spriteFor(e, playerColor)`：

```ts
  private spriteFor(e: Entity, playerColor: number): Sprite {
    let s = this.sprites.get(e)
    if (!s) {
      const root = new Container()
      const body = new Graphics()
      switch (e.kind) {
        case 'player': drawPlayer(body, e, playerColor); break
        case 'enemy': drawEnemy(body, e); break
        case 'gem': drawGem(body, e); break
        case 'projectile': drawProjectile(body, e); break
        case 'orbit': drawOrbit(body, e); break
      }
      const flash = new Graphics()
      flash.circle(0, 0, e.radius).fill(0xffffff)
      flash.alpha = 0
      root.addChild(body, flash)
      this.world.addChild(root)
      s = { root, flash }
      this.sprites.set(e, s)
      this.lastHp.set(e, e.hp)
    }
    return s
  }
```

並在 `render()` 的 entity 迴圈把 `this.spriteFor(e)` 改為 `this.spriteFor(e, world.playerColor)`：

```ts
    for (const e of all) {
      const s = this.spriteFor(e, world.playerColor)
      s.root.position.set(e.pos.x, e.pos.y)
      s.root.visible = true
      this.animate(e, s, world)
      this.applyHitFlash(e, s)
      seen.add(e)
    }
```

- [ ] **Step 3：型別檢查 + build**

Run: `npm run typecheck && npm run build`
Expected: 乾淨

- [ ] **Step 4：commit**

```bash
git add src/engine/sprites.ts src/engine/PixiRenderer.ts
git commit -m "$(cat <<'EOF'
[mvp][feat][art] 玩家圓依所選角色顏色繪製（drawPlayer 加 color）

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4：選角流程串接（Game / App / MainMenu）

**Files:**
- Modify: `src/engine/Game.ts`
- Modify: `src/App.vue`
- Modify: `src/ui/MainMenu.vue`

- [ ] **Step 1：Game.start 加 character 參數**

`Game.ts` 的 `static start(canvasParent, seed)` 內 `new World(seed)` 改為帶角色。把簽章與該行改為：

```ts
  static async start(canvasParent: HTMLElement, seed: number, character: CharacterKind): Promise<Game> {
    const world = new World(seed, character)
```
並於 `Game.ts` 檔頭新增型別 import：

```ts
import type { CharacterKind } from './types'
```

- [ ] **Step 2：App.vue 記住選擇並往下傳**

把 `App.vue` 的 `startGame` 與 `restart` 改為：

```ts
import type { CharacterKind } from './engine/types'
// ...
let seed = 1
// 記住目前選定角色（供「再玩一次」沿用）；預設戰士。
let selectedCharacter: CharacterKind = 'warrior'

async function startGame(character: CharacterKind = selectedCharacter) {
  selectedCharacter = character
  store.start()
  if (!canvasParent.value) return
  game = await Game.start(canvasParent.value, seed++, character)
}

function restart() {
  game?.stop()
  game = null
  startGame(selectedCharacter)
}
```

並把 template 的 MainMenu 監聽改為傳遞 payload：

```html
    <MainMenu v-if="store.phase === 'menu'" @start="startGame" />
```
（`@start="startGame"` 會把 emit 的 `CharacterKind` 當參數傳入 `startGame`。）

- [ ] **Step 3：MainMenu.vue 選角卡 UI**

把 `MainMenu.vue` 全檔替換為：

```vue
<script setup lang="ts">
/**
 * MainMenu.vue — 主選單 overlay（phase === 'menu' 時顯示）。
 * 顯示角色選擇卡，按開始時向 App.vue 發出 start 事件並帶選定角色。
 */
import { ref } from 'vue'
import { CHARACTER_ORDER, CHARACTER_DEFS } from '../engine/systems/characterDefs'
import type { CharacterKind } from '../engine/types'

const emit = defineEmits<{ start: [character: CharacterKind] }>()
const selected = ref<CharacterKind>('warrior')

/** 把顏色數字轉成 CSS hex 字串。 */
function css(color: number): string {
  return '#' + color.toString(16).padStart(6, '0')
}
</script>

<template>
  <div class="overlay">
    <h1>Survivor</h1>
    <div class="chars">
      <button
        v-for="kind in CHARACTER_ORDER"
        :key="kind"
        class="card"
        :class="{ active: selected === kind }"
        :style="selected === kind ? { borderColor: css(CHARACTER_DEFS[kind].color) } : {}"
        @click="selected = kind"
      >
        <span class="name" :style="{ color: css(CHARACTER_DEFS[kind].color) }">{{ CHARACTER_DEFS[kind].name }}</span>
        <span class="desc">{{ CHARACTER_DEFS[kind].description }}</span>
      </button>
    </div>
    <button class="start" @click="emit('start', selected)">開始遊戲</button>
    <p class="hint">WASD / 方向鍵移動 · 自動攻擊</p>
  </div>
</template>

<style scoped>
.overlay {
  position: absolute; inset: 0; display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 1.2rem;
  color: #fff; font-family: sans-serif; background: rgba(16, 16, 24, 0.85);
}
h1 { font-size: 3.5rem; margin: 0; letter-spacing: 0.1em; }
.chars { display: flex; gap: 1rem; flex-wrap: wrap; justify-content: center; max-width: 90vw; }
.card {
  display: flex; flex-direction: column; gap: 0.3rem; width: 9rem; padding: 0.8rem;
  cursor: pointer; border: 2px solid rgba(255, 255, 255, 0.2); border-radius: 10px;
  background: rgba(255, 255, 255, 0.06); color: #fff; text-align: left;
}
.card.active { background: rgba(255, 255, 255, 0.14); }
.name { font-size: 1.2rem; font-weight: bold; }
.desc { font-size: 0.85rem; opacity: 0.8; }
.start {
  font-size: 1.5rem; padding: 0.6rem 2rem; cursor: pointer; border: none;
  border-radius: 8px; background: #4aa3ff; color: #fff;
}
.hint { opacity: 0.7; }
</style>
```

- [ ] **Step 3b：型別檢查 + build**

Run: `npm run typecheck && npm run build`
Expected: 乾淨

- [ ] **Step 4：commit**

```bash
git add src/engine/Game.ts src/App.vue src/ui/MainMenu.vue
git commit -m "$(cat <<'EOF'
[mvp][feat][ui] 主選單選角卡，選定角色串接至 World 起始

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5：驗證與進度更新

**Files:**
- Modify: `progress.md`、`docs/superpowers/specs/multi-characters/acceptance.md`

- [ ] **Step 1：完整測試 + 型別 + build**

Run: `npm test && npm run typecheck && npm run build`
Expected: 測試全綠、型別乾淨、build 乾淨

- [ ] **Step 2：實機煙霧測試**

Run: `npm run dev`。確認主選單出現 4 張角色卡、可切換選中、各角色開局後：起始武器不同
（戰士魔杖/遊俠飛刀/法師聖經/豐收者大蒜）、玩家圓顏色不同、手感不同（遊俠快、戰士耐打）；
無功能相關 console error。

- [ ] **Step 3：更新 acceptance.md 勾選 + progress.md**

依結果勾選 `acceptance.md`，把 `progress.md` 階段 3「多個可玩角色」標記完成、更新驗證快照。

- [ ] **Step 4：commit**

```bash
git add progress.md docs/superpowers/specs/multi-characters/acceptance.md
git commit -m "$(cat <<'EOF'
[mvp][docs][meta] 多角色功能驗證通過，更新 progress 與 acceptance

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## 自我檢查（Self-Review）結果

- **Spec 覆蓋：** FR-1（CharacterDef/CHARACTER_DEFS=Task1）、FR-2（World 套用=Task2）、
  FR-3（選角流程=Task4）、FR-4（playerColor + drawPlayer=Task2/3）皆有對應。
- **型別一致：** `CharacterKind`、`CharacterDef`、`CHARACTER_DEFS`/`CHARACTER_ORDER`、`playerColor`、
  `drawPlayer(g,e,color)`、`spriteFor(e, playerColor)`、`Game.start(...,character)`、
  MainMenu `emit('start', kind)` 跨 task 一致。
- **無 placeholder：** 所有步驟含實際程式碼與指令。
- **相容性：** 既有 `new World(seed)` 因 character 有預設值仍合法；既有測試未斷言 maxHp 特定值（已查證）。
