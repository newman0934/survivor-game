# 免疫大戰主題化 — 實作計畫

> **For agentic workers:** 用 superpowers:subagent-driven-development 或 executing-plans 逐 task 實作。步驟用 `- [ ]` 追蹤。
> 引擎邏輯改名以**既有 122 單元測試**保護（行為不變、僅識別字串改）；造型/背景/特效屬呈現層膠水，依 CLAUDE.md **不寫單元測試**、以實機目視驗證。每個 task 一個邏輯變更、各自 commit。

**Goal:** 把遊戲換皮為「免疫細胞 vs 病原體」主題：四類主要代號改名 + 顯示文字主題化 + 造型/背景/特效配色重繪，玩法與平衡完全不變。

**Architecture:** 先做行為保留的「代號改名」（型別字面值 + defs 鍵 + 引用點 + 測試同步，typecheck/測試為安全網），再做「顯示文字主題化」，最後做「視覺重繪」（純呈現層、實機驗證）。

**Tech Stack:** TypeScript、Vue 3、PixiJS v8（Graphics）、Vitest、vue-tsc。

## Global Constraints（每個 task 隱含適用）

- **僅改識別字串 / 顯示文字 / 造型 / 配色**：模擬、碰撞、生怪曲線、難度倍率、數值與平衡、升級握手、store/Summary 結構、音效語意事件**完全不變**。
- **`'boss'` 雙重身分陷阱**：`'boss'` 同時是 `EnemyKind` 與 `SoundEvent`。EnemyKind 改 `superbug`；但下列 4 處屬 **SoundEvent，保持 `'boss'` 不動**：`types.ts` 的 `SoundEvent` 型別、`core/soundManager.ts:132` `case 'boss'`、`World.ts:214` `soundEventQueue.push('boss')`、`World.test.ts:15` `toContain('boss')`。
- **保留內部函式/欄位識別字**：`fireWand`/`fireKnife`/`garlicTick`/`garlicRadius()`/`drawGarlicAura`/`garlicAura` 等**不改名**（它們是內部 API、非 Kind 字面值；改名會波及 renderer 簽章，無主題收益）。只改 Kind 的**字串字面值**。
- **被動道具內部代號不動**（spinach/tome/…），只改 `label`。
- **確定性**：不得引入 `Math.random()` 到模擬，不新增隨機分支；背景/特效沿用 `bgHash`（確定性）+ renderer clock。
- **改名後驗證三件**：`npm run typecheck`、受影響測試、`grep` 舊代號 0 殘留（程式識別字串）。
- commit 格式 `[mvp][type][scope] 描述`，含 `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`。

---

## 檔案結構（建立/修改一覽）

| 檔案 | 責任 | 動作 |
|------|------|------|
| `src/engine/types.ts` | 四個 Kind 聯集型別字面值 | 修改 |
| `src/engine/systems/enemyDefs.ts` | ENEMY_ORDER + ENEMY_DEFS 鍵/kind | 修改 |
| `src/engine/systems/weaponDefs.ts` | WEAPON_DEFS 鍵/kind/label | 修改 |
| `src/engine/systems/characterDefs.ts` | CHARACTER_ORDER + DEFS 鍵/kind/name/desc/startWeapon | 修改 |
| `src/engine/systems/mapDefs.ts` | MAP_ORDER + MAP_DEFS 鍵/kind/name/desc | 修改 |
| `src/engine/systems/passiveDefs.ts` | 10 個 label（代號不動） | 修改 |
| `src/engine/systems/spawn.ts`、`enemyAI.ts`、`weapons.ts` | Kind 字面值比較 | 修改 |
| `src/engine/entities/factory.ts` | createEnemy 預設 kind | 修改 |
| `src/engine/World.ts` | 預設角色/地圖 + Kind 比較（排除 boss SoundEvent） | 修改 |
| `src/engine/sprites.ts` | drawEnemy/drawPlayer/drawGem/drawProjectile/背景/aura 造型 + 配色 + PATCH_COLORS + 地圖 case | 修改 |
| `src/engine/PixiRenderer.ts` | enemyKind 比較 | 修改 |
| `src/engine/effects.ts` | 收集/升級配色 | 修改 |
| `src/App.vue`、`src/ui/MainMenu.vue` | 預設角色/地圖代號 | 修改 |
| 對應 `*.test.ts`（enemyAI/factory/spawn/leveling/World） | 斷言識別字串同步 | 修改 |
| `progress.md`、`acceptance.md` | 進度與驗收 | 修改 |

---

## Task 1：EnemyKind 改名（basic→virus、swarm→bacteria、tank→spore、charger→spiral、boss→superbug）

**Files:** `types.ts`、`enemyDefs.ts`、`entities/factory.ts`、`systems/spawn.ts`、`systems/enemyAI.ts`、`World.ts`、`PixiRenderer.ts`、`sprites.ts` + 測試 `factory.test.ts`、`enemyAI.test.ts`、`spawn.test.ts`、`World.test.ts`

**Interfaces:**
- Produces: `type EnemyKind = 'virus' | 'bacteria' | 'spore' | 'spiral' | 'superbug'`，`ENEMY_DEFS` 以新鍵索引。

- [ ] **Step 1：改型別**

`types.ts`：
```ts
export type EnemyKind = 'virus' | 'bacteria' | 'spore' | 'spiral' | 'superbug'
```
（**不要動**同檔的 `SoundEvent`，其 `'boss'` 是音效事件。）

- [ ] **Step 2：改 enemyDefs.ts**

把 `ENEMY_ORDER` 與 `ENEMY_DEFS` 的鍵與 `kind` 欄位改名（數值/color/unlockTime/spawnWeight 全部不變）：
```ts
export const ENEMY_ORDER: EnemyKind[] = ['virus', 'bacteria', 'spore', 'spiral', 'superbug']
// ENEMY_DEFS 鍵與 kind：basic→virus, swarm→bacteria, tank→spore, charger→spiral, boss→superbug
//   virus:    { kind: 'virus',    hp: 10, ... color: 0xff5252, ... }
//   bacteria: { kind: 'bacteria', hp: 4,  ... color: 0xff9d5c, ... }
//   spore:    { kind: 'spore',    hp: 60, ... color: 0x8e2b2b, ... }
//   spiral:   { kind: 'spiral',   hp: 18, ... color: 0xe91e63, ... }
//   superbug: { kind: 'superbug', hp: 220,... color: 0x9c27b0, ... }
```

- [ ] **Step 3：改所有 EnemyKind 字面值引用點（排除 boss SoundEvent）**

逐檔把 enemy 字面值改名：
- `entities/factory.ts`：`createEnemy` 預設參數 `kind: EnemyKind = 'basic'` → `'virus'`。
- `systems/spawn.ts`：`pickEnemyKind` 等內部對 `'swarm'`/`'basic'`/`'boss'`… 的引用（boss 此處是 EnemyKind→`superbug`）。
- `systems/enemyAI.ts`：`'charger'` 衝刺判斷 → `'spiral'`。
- `World.ts`：`spawnSwarmAt`/`spawnBossAt` 的 `createEnemy(pos,'swarm'|'boss')`、`e.enemyKind === 'boss'`（行 514、528）→ `'superbug'`。**注意行 214 `soundEventQueue.push('boss')` 不動**（SoundEvent）。
- `PixiRenderer.ts:159`：`e.enemyKind === 'boss'` → `'superbug'`。
- `sprites.ts` `drawEnemy` switch：`case 'swarm'|'tank'|'charger'|'boss'` → `case 'bacteria'|'spore'|'spiral'|'superbug'`（`default` 仍對應 virus；造型本身 Task 6 再重繪，這裡只改 case 標籤）。

- [ ] **Step 4：同步測試斷言**

`factory.test.ts`、`enemyAI.test.ts`、`spawn.test.ts:53`（`not.toBe('boss')`→`not.toBe('superbug')`）、`World.test.ts:153/167`（`enemyKind === 'boss'`→`'superbug'`）。**`World.test.ts:15` `toContain('boss')` 不動**（SoundEvent 斷言）。

- [ ] **Step 5：型別檢查 + 受影響測試 + 殘留掃描**

```bash
npm run typecheck
npx vitest run src/engine/World.test.ts src/engine/systems/spawn.test.ts src/engine/systems/enemyAI.test.ts src/engine/entities/factory.test.ts
grep -rnE "'(basic|swarm|tank|charger)'" src/                 # 期望：0 筆
grep -rn "enemyKind === 'boss'\|createEnemy(.*'boss')\|kind: 'boss'\|toBe('boss')" src/  # 期望：0 筆
```
Expected: typecheck 乾淨、測試全綠、enemy 殘留 0（`soundEventQueue.push('boss')` 與 `SoundEvent` 的 `'boss'` 仍在，屬正常）。

- [ ] **Step 6：commit**
```bash
git add src/engine
git commit -m "$(cat <<'EOF'
[mvp][refactor][engine] EnemyKind 代號主題化改名（病毒/細菌/孢子/螺旋菌/超級病原），boss SoundEvent 保留

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2：WeaponKind 改名（wand→antibody、knife→perforin、bible→complement、garlic→inflammation）

**Files:** `types.ts`、`weaponDefs.ts`、`characterDefs.ts`、`World.ts` + 測試 `leveling.test.ts`、`World.test.ts`

**Interfaces:**
- Produces: `type WeaponKind = 'antibody' | 'perforin' | 'complement' | 'inflammation'`。

- [ ] **Step 1：改型別**
```ts
export type WeaponKind = 'antibody' | 'perforin' | 'complement' | 'inflammation'
```

- [ ] **Step 2：改 weaponDefs.ts**

`WEAPON_DEFS` 鍵與 `kind` 改名（levels/數值不變）；同時把 `label` 主題化（Task 5 也涵蓋，但此處一併改）：
```
wand→antibody   label '魔杖'→'抗體'
knife→perforin  label '飛刀'→'穿孔素飛鏢'
bible→complement label '聖經'→'補體環'
garlic→inflammation label '大蒜'→'發炎場'
```

- [ ] **Step 3：改引用點**
- `characterDefs.ts`：各角色 `startWeapon: 'wand'|'knife'|'bible'` → 新代號。
- `World.ts`：`weapons = [{ kind: 'wand', ... }]`（行 70 預設、建構子）、`w.kind === 'garlic'`（garlicRadius 行 248）、`WEAPON_DEFS.garlic`（行 250）、`weapon.kind === 'garlic'`（行 354）等所有 `weapon.kind === 'xxx'` 比較 → 新代號。**函式名 `garlicRadius`/`garlicTick`/`fireWand`/`fireKnife` 不改。**

- [ ] **Step 4：同步測試**

`leveling.test.ts`、`World.test.ts` 內對 `'wand'/'knife'/'bible'/'garlic'` 的斷言 → 新代號。

- [ ] **Step 5：型別檢查 + 測試 + 殘留掃描**
```bash
npm run typecheck
npx vitest run src/engine/systems/leveling.test.ts src/engine/World.test.ts
grep -rnE "'(wand|knife|bible|garlic)'" src/   # 期望：0 筆
```
Expected: 乾淨、全綠、0 殘留。

- [ ] **Step 6：commit**
```bash
git add src/engine && git commit -m "$(cat <<'EOF'
[mvp][refactor][engine] WeaponKind 代號 + 標籤主題化（抗體/穿孔素/補體環/發炎場）

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3：CharacterKind 改名（warrior→macrophage、ranger→neutrophil、mage→nkcell、harvester→dendritic）

**Files:** `types.ts`、`characterDefs.ts`、`World.ts`、`App.vue`、`ui/MainMenu.vue` + `World.test.ts`

- [ ] **Step 1：改型別**
```ts
export type CharacterKind = 'macrophage' | 'neutrophil' | 'nkcell' | 'dendritic'
```

- [ ] **Step 2：改 characterDefs.ts**

`CHARACTER_ORDER` + `CHARACTER_DEFS` 鍵/kind 改名；`name`/`description` 主題化（數值/color/startWeapon/startPassives 不變，startWeapon 用 Task 2 新代號）：
```
warrior→macrophage  name '戰士'→'巨噬細胞'   desc 沿用「高血量與護甲，穩健近戰」
ranger→neutrophil   name '遊俠'→'嗜中性球'   desc 沿用「快攻快走，但血量薄」
mage→nkcell         name '法師'→'NK 細胞'    desc 沿用「高傷害輸出」
harvester→dendritic name '豐收者'→'樹突細胞' desc 沿用「高吸取、起始帶記憶細胞（經驗加成）」
```

- [ ] **Step 3：改引用點**
- `World.ts` 建構子預設 `character: CharacterKind = 'warrior'` → `'macrophage'`。
- `App.vue:31` `character: 'warrior'` → `'macrophage'`。
- `ui/MainMenu.vue:12` `ref<CharacterKind>('warrior')` → `'macrophage'`。

- [ ] **Step 4：同步測試** — `World.test.ts` 角色相關斷言。

- [ ] **Step 5：型別檢查 + 測試 + 殘留**
```bash
npm run typecheck && npx vitest run src/engine/World.test.ts
grep -rnE "'(warrior|ranger|mage|harvester)'" src/   # 期望：0 筆
```

- [ ] **Step 6：commit**
```bash
git add src/ && git commit -m "$(cat <<'EOF'
[mvp][refactor][engine] CharacterKind 代號 + 名稱主題化（巨噬/嗜中性球/NK/樹突細胞）

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4：MapKind 改名（plains→vessel、lava→stomach、tundra→lung）

**Files:** `types.ts`、`mapDefs.ts`、`World.ts`、`sprites.ts`、`App.vue`、`ui/MainMenu.vue` + `World.test.ts`

- [ ] **Step 1：改型別**
```ts
export type MapKind = 'vessel' | 'stomach' | 'lung'
```

- [ ] **Step 2：改 mapDefs.ts**

`MAP_ORDER` + `MAP_DEFS` 鍵/kind 改名；`name`/`description` 主題化（bgColor/gridColor/倍率不變）：
```
plains→vessel  name '平原'→'血管'   desc '普通難度，標準節奏'
lava→stomach   name '熔岩'→'胃'     desc '困難：生怪更快、敵人更硬'
tundra→lung    name '冰原'→'肺泡'   desc '簡單：生怪較慢、敵人較脆'
```

- [ ] **Step 3：改引用點**
- `World.ts` 建構子預設 `map: MapKind = 'plains'` → `'vessel'`；欄位 `mapKind: MapKind = 'plains'` → `'vessel'`。
- `sprites.ts`：`PATCH_COLORS` 鍵 `plains/lava/tundra` → `vessel/stomach/lung`；`drawTerrain`/`drawAmbient` 內 `kind === 'lava'|'tundra'` → `'stomach'|'lung'`（`else` 分支即 vessel）。**視覺內容 Task 8 重繪，這裡只改鍵/case 標籤，先讓 typecheck 過。**
- `App.vue:31` `map: 'plains'` → `'vessel'`；`ui/MainMenu.vue:13` `ref<MapKind>('plains')` → `'vessel'`。

- [ ] **Step 4：同步測試** — `World.test.ts` 地圖相關斷言（若有）。

- [ ] **Step 5：型別檢查 + 測試 + 殘留**
```bash
npm run typecheck && npx vitest run src/engine/World.test.ts
grep -rnE "'(plains|lava|tundra)'" src/   # 期望：0 筆
```

- [ ] **Step 6：commit**
```bash
git add src/ && git commit -m "$(cat <<'EOF'
[mvp][refactor][engine] MapKind 代號 + 名稱主題化（血管/胃/肺泡）

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5：被動道具標籤主題化（代號保留）

**Files:** `src/engine/systems/passiveDefs.ts`

- [ ] **Step 1：改 10 個 label（kind 與 apply 完全不動）**
```
spinach→'細胞激素（傷害）'  tome→'干擾素（攻速）'    bracer→'趨化因子（彈速）'
wings→'偽足（移速）'        magnet→'受體（吸取）'    candle→'組織胺（範圍）'
heart→'幹細胞（最大血）'    tomato→'生長因子（回復）' armor→'細胞膜（減傷）'
crown→'記憶細胞（經驗）'
```

- [ ] **Step 2：型別檢查 + 全測試**
```bash
npm run typecheck && npm test
```
Expected: 乾淨、122 全綠（label 改名不影響行為）。

- [ ] **Step 3：commit**
```bash
git add src/engine/systems/passiveDefs.ts && git commit -m "$(cat <<'EOF'
[mvp][feat][content] 被動道具標籤主題化（細胞激素/干擾素/趨化因子…），代號保留

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 6：病原造型重繪（sprites.ts `drawEnemy`）

> 呈現層：不寫單元測試，實機目視。沿用既有 `shaded`/`groundShadow`/`dim`/`lighten` 輔助與「立體分層」手法；顏色取 `ENEMY_DEFS[kind].color`（已改名）。每個 case 重畫為病原輪廓。

- [ ] **Step 1：改寫 `drawEnemy` 各 case**

以微生物輪廓取代既有動物造型（保留 renderer 的旋轉/脈動鉤：spiral 依 vel 旋轉、superbug 脈動）：
```ts
// virus（default 分支）：多刺殼——立體圓身 + 一圈三角棘突 + 衣殼亮點
//   shaded(g,0,0,r,color); for 12 spikes: g.poly([...三角...]).fill(dim(color,0.6))
//   g.circle(0,0,r*0.45).fill(dim(color,0.3))  // 衣殼核
case 'bacteria': // 桿菌：膠囊身（roundRect 旋轉感）+ 1~2 條鞭毛曲線 + 微高光
case 'spore':    // 真菌孢子：厚壁雙圈（外壁 dim、內體 color）+ 內含顆粒小點數枚
case 'spiral':   // 螺旋體：沿 x 軸的正弦螺旋粗線（前端略大），renderer 依 vel 旋轉
case 'superbug': // 超級病原：不規則團塊（多個交疊圓 lobes）+ 暗核 + 兩發光點（保留脈動）
```
細節（棘突數、鞭毛擺動以 `e` 無 clock，故畫靜態；動畫仍由 renderer transform）依實機微調；維持與半徑 `r` 等比、保留 `groundShadow(g, r)` 起手。

- [ ] **Step 2：build + 實機驗證**
```bash
npm run typecheck && npm run dev
```
驗證五種病原造型清楚可辨、命中閃白/旋轉/脈動正常、0 console error。

- [ ] **Step 3：commit**
```bash
git add src/engine/sprites.ts && git commit -m "$(cat <<'EOF'
[mvp][feat][art] 病原造型重繪：病毒棘突殼/桿菌鞭毛/真菌孢子/螺旋體/超級病原團塊

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 7：玩家細胞 + 武器 + 抗原寶石造型（sprites.ts `drawPlayer`/`drawProjectile`/`drawOrbit`/`drawGem`/`drawGarlicAura`）

- [ ] **Step 1：`drawPlayer` 改為免疫細胞**

半透明細胞膜 + 細胞核 + 偽足；保留 `color`（角色色）與 renderer 依 `lastMoveDir` 旋轉：
```ts
// groundShadow(g,r)
// 偽足：前方 +x 一兩個小突起 g.circle(r*0.9, ±r*0.3, r*0.25).fill(...)
// 膜身：g.circle(0,0,r).fill({color, alpha:0.85}); 描邊 dim(color,0.5)
// 細胞質高光：lighten(color,0.5) 半透明左上
// 細胞核：g.circle(r*0.1,0,r*0.42).fill(dim(color,0.4)) + 核仁亮點
```

- [ ] **Step 2：武器/環/場域造型**
```ts
// drawProjectile（抗體/穿孔素共用彈體）：改為 Y 形抗體或亮中和粒——
//   柔光暈 g.circle(0,0,r*2.2).fill({color:0xbfefff,alpha:0.25}) + 亮核 0xeaffff
// drawOrbit（補體環）：改為發光蛋白球——g.circle(0,0,r).fill(0xbfeaff)+描邊+亮心（取代書本）
// drawGarlicAura（發炎場 ROS）：配色由紫 0x9b59b6 改暖橙紅 0xff6e40（保留呼吸脈動公式）
```

- [ ] **Step 3：`drawGem` 改抗原碎片**

偏黃抗原碎片（與升級藍綠特效區隔）：
```ts
g.poly([0,-r, r,0, 0,r, -r,0]).fill(0xffd54a)
g.poly([0,-r, r,0, 0,r, -r,0]).stroke({ width: 1.5, color: 0xfff3c4 })
g.circle(0,0,r*0.35).fill(0xffffff)
```

- [ ] **Step 4：build + 實機驗證 + commit**
```bash
npm run typecheck && npm run dev
git add src/engine/sprites.ts && git commit -m "$(cat <<'EOF'
[mvp][feat][art] 玩家免疫細胞 + 抗體/補體環/發炎場 + 抗原碎片造型

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 8：人體場景背景重繪（sprites.ts `PATCH_COLORS`/`drawTerrain`/`drawAmbient`）

> 沿用 `bgHash` 確定性座標 + clock 動畫骨架；只換每個 kind 分支的地貌內容與配色。

- [ ] **Step 1：`PATCH_COLORS` 換色**
```ts
const PATCH_COLORS: Record<MapKind, readonly [number, number]> = {
  vessel:  [0x3a0d12, 0x2a0a0e],   // 暗紅血漿
  stomach: [0x3a1c0a, 0x2c1408],   // 胃黏膜暖褐
  lung:    [0x16303f, 0x102330],   // 藍灰肺泡
}
```

- [ ] **Step 2：`drawTerrain` 三分支重繪**
- `vessel`（原 plains else 分支）：漂浮**紅血球**（雙色凹環橢圓）+ 偶見**血小板**小點。
- `stomach`（原 lava）：**胃黏膜皺褶**（暖褐曲線雙線）+ **酸泡**（脈動氣泡：暈 + 亮核，沿用 clock 脈動）。
- `lung`（原 tundra）：**肺泡氣囊**（淡藍柔化圓 + 內陰影）+ 偶見**氣孔**小點。

- [ ] **Step 3：`drawAmbient` 三分支配色**
- `lung`：緩慢上飄淡藍氣流粒（沿用 tundra 飄移，色改 0xbfdcef）。
- `stomach`：上升酸泡粒（沿用 lava 上升火星，色改 0xffd180）。
- `vessel`（else）：隨血流漂移的微紅粒（色改 0xff8a80, alpha 低）。

- [ ] **Step 4：build + 實機驗證（三地圖各開一局）+ commit**
```bash
npm run typecheck && npm run dev
git add src/engine/sprites.ts && git commit -m "$(cat <<'EOF'
[mvp][feat][art] 人體場景背景：血管血漿紅血球/胃黏膜酸泡/肺泡氣囊

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 9：特效配色主題化（effects.ts）

- [ ] **Step 1：收集閃光改抗原黃、升級光環改免疫藍綠**

`spawnPickup`：`0x8bff8b`→`0xffd54a`（光圈）、白星保留。
`spawnLevelUp`：金 `0xffd54f`→免疫藍綠 `0x4dd0c0`；上升光點 `0xffe082`→`0xb2f0e6`。
（擊殺碎屑沿用敵色，自動帶；受傷紅暈/傷害數字/震動不動。）

- [ ] **Step 2：build + 實機驗證（撿抗原=黃閃、升級=藍綠光環）+ commit**
```bash
npm run typecheck && npm run dev
git add src/engine/effects.ts && git commit -m "$(cat <<'EOF'
[mvp][feat][art] 特效配色主題化：收集抗原黃 + 升級免疫藍綠

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 10：完整驗證與進度更新

**Files:** `progress.md`、`docs/superpowers/specs/immune-war-theme/acceptance.md`

- [ ] **Step 1：完整測試 + 型別 + build**
```bash
npm test && npm run typecheck && npm run build
```
Expected: 122 全綠、型別乾淨、build 乾淨。

- [ ] **Step 2：全域殘留總掃描**
```bash
grep -rnE "'(basic|swarm|tank|charger|wand|knife|bible|garlic|warrior|ranger|mage|harvester|plains|lava|tundra)'" src/
```
Expected: 0 筆（`'boss'` 若出現，僅限 SoundEvent 的 4 處，屬正常）。

- [ ] **Step 3：實機完整驗證**

主選單（細胞/場景名）→ 三地圖各遊玩一局（病原造型、背景、抗體/補體環/發炎場、抗原黃閃、升級藍綠光環、傷害數字、受傷紅暈）→ 升級彈窗（主題化武器/被動名）→ 死亡重開。確認玩法/平衡無變化、FPS 正常、0 功能相關 console error。

- [ ] **Step 4：更新 acceptance.md 勾選 + progress.md**

依結果勾選 `acceptance.md` 填驗證日期；`progress.md` 階段 4 美術補一條「免疫大戰主題化」、確認測試數仍 122。

- [ ] **Step 5：commit**
```bash
git add progress.md docs/superpowers/specs/immune-war-theme/acceptance.md && git commit -m "$(cat <<'EOF'
[mvp][docs][meta] 免疫大戰主題化驗證通過，更新 progress 與 acceptance

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## 自我檢查（Self-Review）結果

- **Spec 覆蓋：** FR-1 四類代號改名（Task1–4）、FR-2 被動標籤保留代號（Task5）、FR-3 顯示名稱（Task2–4 含 name/desc/label）、FR-4 病原+玩家造型（Task6–7）、FR-5 武器/寶石造型（Task7）、FR-6 三地圖背景（Task8）、FR-7 特效配色（Task9）、FR-8 不變項（全程 typecheck+122 測試+殘留掃描為安全網，Task10）皆有對應。
- **`'boss'` 陷阱：** Global Constraints + Task1 Step1/3/4/5 明確列出 4 處 SoundEvent 例外，避免誤改。
- **型別一致：** 四個 Kind 新字面值在型別、defs、引用、測試跨 task 一致；函式名（fireWand/garlicRadius/drawGarlicAura）刻意保留並於約束聲明。
- **無 placeholder：** 改名 task 給出型別行 + defs 對照 + 引用點清單 + 三道驗證；視覺 task 給出造型/配色方向與起手碼，屬呈現層迭代（同 sprite-polish 慣例，實機驗證）。
- **確定性/相容：** 不碰 rng、不新增隨機；背景沿用 bgHash；無存檔相容問題（階段 4 未做存檔）。
