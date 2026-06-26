# content-mastcell-maps Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新增可選角色「肥大細胞（mastcell）」與兩張地圖「腸道（gut）」「腦（brain）」，純資料 + 呈現層擴充，不新增任何 system。

**Architecture:** 沿用既有 `CHARACTER_DEFS` / `MAP_DEFS` 驅動的 World 起始套用機制——`World` 已能對任意 `CharacterKind`/`MapKind` 一般化套用起始狀態與難度倍率，故新內容只需擴充資料表與對應的呈現層 switch/Record（造型、圖示、背景地貌、背景音樂）。選單與排行榜由 `CHARACTER_ORDER`/`MAP_ORDER`/`*_DEFS` 自動帶出，零改動。

**Tech Stack:** TypeScript、PixiJS（Graphics 程式化造型 + canvas 噪聲紋理）、Web Audio（程式合成音樂）、Vitest（引擎單元測試）。

## Global Constraints

- 文件/說明一律繁體中文（zh-TW）；程式碼/型別/commit 格式為英文。
- 引擎（`src/engine/**`）純 TypeScript，執行期不得 import Vue/Pinia。
- 確定性：模擬中不得呼叫 `Math.random()`；背景/造型屬呈現層，沿用既有慣例（`noiseBackground` 的噪聲 seed 用 `Math.random()` 為刻意的呈現層亂數，不影響模擬確定性）。
- 固定步長 1/60，邏輯與 FPS 解耦。
- 既有函式**簽章皆不變**，僅擴充資料表與 switch/Record 分支。
- 新增 `CharacterKind`/`MapKind` union 成員後，所有 `Record<CharacterKind,…>`/`Record<MapKind,…>`（`CHARACTER_DEFS`、`CHARACTER_ICONS`、`MAP_DEFS`、`MAP_TINT`、`MUSIC_THEMES`）**必須**同步補齊對應鍵，否則 `vue-tsc` 型別檢查失敗——故每個 task 結束時 typecheck 必須乾淨。
- commit 格式：`[mvp][type][scope] 描述`，結尾含 `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`。
- 角色/地圖數值為定稿值（見各 task），不得改動：
  - mastcell：`maxHp 100`、`startWeapon 'inflammation'`、`color 0xf06292`、`statMods { areaMult: 1.3, cooldownMult: 0.9 }`、`startPassives []`。
  - gut：`spawnIntervalMult 0.7`、`enemyHpMult 0.8`、`bgColor 0x140e08`、`gridColor 0xffb74d`。
  - brain：`spawnIntervalMult 1.2`、`enemyHpMult 1.4`、`bgColor 0x0a0a18`、`gridColor 0x9fa8ff`。

---

## 檔案結構（本案異動）

| 檔案 | 異動 | 責任 |
|------|------|------|
| `src/engine/types.ts` | Modify | `CharacterKind` 加 `'mastcell'`；`MapKind` 加 `'gut' \| 'brain'` |
| `src/engine/systems/characterDefs.ts` | Modify | `CHARACTER_DEFS.mastcell` + `CHARACTER_ORDER` |
| `src/engine/systems/mapDefs.ts` | Modify | `MAP_DEFS.gut/brain` + `MAP_ORDER` |
| `src/engine/sprites.ts` | Modify | `drawPlayer` 新增 `case 'mastcell'` 造型 |
| `src/ui/icons/iconRegistry.ts` | Modify | `CHARACTER_ICONS.mastcell` |
| `src/engine/noiseBackground.ts` | Modify | `MAP_TINT` + `makeNoiseTexture` 加 gut/brain 分支 |
| `src/engine/core/soundManager.ts` | Modify | `MUSIC_THEMES` 加 gut/brain |
| `src/engine/World.test.ts` | Modify | 新增 mastcell 起始 + gut/brain 難度測試 |

兩個 task：Task 1 = 肥大細胞角色（資料 + World 起始 + 造型 + 圖示）；Task 2 = 兩張地圖（資料 + World 難度 + 背景地貌 + 背景音樂）。各自結束時皆 typecheck/test 乾淨、可獨立驗收。

---

### Task 1: 肥大細胞角色（mastcell）

**Files:**
- Modify: `src/engine/types.ts`（`CharacterKind` union，約 line 225）
- Modify: `src/engine/systems/characterDefs.ts`（`CHARACTER_ORDER` line 8、`CHARACTER_DEFS` line 11-28）
- Modify: `src/engine/sprites.ts`（`drawPlayer` switch，約 line 92-169）
- Modify: `src/ui/icons/iconRegistry.ts`（`CHARACTER_ICONS` line 80-94）
- Test: `src/engine/World.test.ts`（新增 it）

**Interfaces:**
- Consumes：`World` 建構子 `constructor(seed: number, character: CharacterKind = 'macrophage', map: MapKind = 'vessel')`，建構時依 `CHARACTER_DEFS[character]` 套用 `weapons[0].kind`、`player.maxHp`/`hp`、`Object.assign(stats, statMods)`、`playerColor`。暴露欄位：`w.weapons`、`w.player`、`w.stats`、`w.playerColor`。
- Produces：`CharacterKind` 含 `'mastcell'`；`CHARACTER_DEFS.mastcell`、`CHARACTER_ICONS.mastcell`、`drawPlayer` 的 `case 'mastcell'`。

- [ ] **Step 1: 寫失敗測試（World 以 mastcell 套用起始狀態）**

在 `src/engine/World.test.ts` 既有 `dendritic` 測試（約 line 134）之後新增：

```ts
  it('肥大細胞起始：發炎場、範圍/冷卻強化、洋紅色', () => {
    const w = new World(1, 'mastcell')
    expect(w.weapons[0].kind).toBe('inflammation')
    expect(w.player.maxHp).toBe(100)
    expect(w.player.hp).toBe(100)
    expect(w.stats.areaMult).toBeCloseTo(1.3, 5)
    expect(w.stats.cooldownMult).toBeCloseTo(0.9, 5)
    expect(w.playerColor).toBe(0xf06292)
  })
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `npx vitest run src/engine/World.test.ts -t "肥大細胞起始"`
Expected: FAIL — 型別錯誤（`'mastcell'` 不在 `CharacterKind`）或執行期 `CHARACTER_DEFS['mastcell']` 為 undefined。

- [ ] **Step 3: 擴充 `CharacterKind` union**

`src/engine/types.ts`，把：

```ts
export type CharacterKind = 'macrophage' | 'neutrophil' | 'nkcell' | 'dendritic'
```

改為：

```ts
export type CharacterKind = 'macrophage' | 'neutrophil' | 'nkcell' | 'dendritic' | 'mastcell'
```

- [ ] **Step 4: 新增 `CHARACTER_DEFS.mastcell` 與 `CHARACTER_ORDER`**

`src/engine/systems/characterDefs.ts`，`CHARACTER_ORDER` 改為：

```ts
export const CHARACTER_ORDER: CharacterKind[] = ['macrophage', 'neutrophil', 'nkcell', 'dendritic', 'mastcell']
```

並在 `CHARACTER_DEFS` 物件 `dendritic` 條目之後加入：

```ts
  mastcell: {
    kind: 'mastcell', name: '肥大細胞', description: '釋放發炎介質範圍清場', color: 0xf06292,
    maxHp: 100, startWeapon: 'inflammation', statMods: { areaMult: 1.3, cooldownMult: 0.9 }, startPassives: [],
  },
```

- [ ] **Step 5: 新增 `CHARACTER_ICONS.mastcell`（補齊 Record 鍵，避免 typecheck 失敗）**

`src/ui/icons/iconRegistry.ts`，在 `CHARACTER_ICONS` 的 `dendritic` 條目之後加入：

```ts
  // 肥大細胞：圓細胞 + 密布顆粒點（組織胺顆粒）
  mastcell: { color: '#f06292', paths: ['M12 3 a9 9 0 1 0 0.01 0'],
    fills: ['M8.5 9 a1 1 0 1 0 0.01 0', 'M14 8.5 a1 1 0 1 0 0.01 0', 'M15.5 13 a1 1 0 1 0 0.01 0', 'M9 14.5 a1 1 0 1 0 0.01 0', 'M12 12 a1.2 1.2 0 1 0 0.01 0'] },
```

- [ ] **Step 6: 新增 `drawPlayer` 的 `case 'mastcell'` 造型**

`src/engine/sprites.ts`，在 `drawPlayer` 的 `switch (character)` 內、`case 'dendritic'` 的 `break` 之後、`default` 之前加入：

```ts
    case 'mastcell': {
      // 肥大細胞（範圍清場）：圓潤膜身 + 一圈短鈍偽足 + 密布組織胺顆粒
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2
        g.circle(Math.cos(a) * r * 1.02, Math.sin(a) * r * 1.02, r * 0.16).fill({ color, alpha: 0.8 })
      }
      g.circle(0, 0, r).fill({ color, alpha: 0.85 })
      g.circle(0, 0, r).stroke({ width: 2, color: stroke })
      g.circle(-r * 0.28, -r * 0.28, r * 0.34).fill({ color: lighten(color, 0.5), alpha: 0.3 })
      g.circle(0, 0, r * 0.34).fill(dim(color, 0.4)) // 核
      for (const [px, py] of [[r * 0.3, -r * 0.2], [-r * 0.34, r * 0.26], [r * 0.12, r * 0.4], [-r * 0.1, -r * 0.42], [r * 0.44, r * 0.12], [-r * 0.44, -r * 0.06]] as const) {
        g.circle(px, py, r * 0.1).fill({ color: lighten(color, 0.6), alpha: 0.8 })
      }
      innerShade(g, r, color)
      rimLight(g, r, color)
      specular(g, r)
      emissiveCore(g, 0, 0, r * 0.22, CELL_CORE)
      membrane(g, r, color)
      break
    }
```

- [ ] **Step 7: 跑測試確認通過**

Run: `npx vitest run src/engine/World.test.ts -t "肥大細胞起始"`
Expected: PASS。

- [ ] **Step 8: 型別檢查乾淨**

Run: `npm run typecheck`
Expected: 無錯誤（`CHARACTER_DEFS`/`CHARACTER_ICONS` 兩個 Record 都已補 `mastcell` 鍵）。

- [ ] **Step 9: 全測試回歸**

Run: `npm test`
Expected: 全綠（既有測試不受影響 + 新增 1 筆通過）。

- [ ] **Step 10: Commit**

```bash
git add src/engine/types.ts src/engine/systems/characterDefs.ts src/engine/sprites.ts src/ui/icons/iconRegistry.ts src/engine/World.test.ts
git commit -m "$(printf '%s\n\n%s' '[mvp][feat][engine] 新增肥大細胞角色（範圍清場：發炎場 + areaMult/cooldownMult）' 'Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

### Task 2: 兩張地圖（gut／brain）

**Files:**
- Modify: `src/engine/types.ts`（`MapKind` union，約 line 248）
- Modify: `src/engine/systems/mapDefs.ts`（`MAP_ORDER` line 8、`MAP_DEFS` line 11-24）
- Modify: `src/engine/noiseBackground.ts`（`MAP_TINT` line 13-17、`makeNoiseTexture` line 33-44）
- Modify: `src/engine/core/soundManager.ts`（`MUSIC_THEMES` line 18-49）
- Test: `src/engine/World.test.ts`（新增 it）

**Interfaces:**
- Consumes：`World` 建構子第三參數 `map: MapKind = 'vessel'`，建構時依 `MAP_DEFS[map]` 設 `mapSpawnIntervalMult`、`mapEnemyHpMult`、`mapBgColor`、`mapGridColor`；`w.spawnEnemyAt(pos, kind)` 生成的敵人 `hp`/`maxHp` 已乘 `enemyHpMult`。`makeNoiseTexture(kind, seed)`、`MAP_TINT[kind]`、`MUSIC_THEMES[map]`。
- Produces：`MapKind` 含 `'gut' | 'brain'`；`MAP_DEFS.gut/brain`、`MAP_TINT.gut/brain`、`makeNoiseTexture` 的 gut/brain 分支、`MUSIC_THEMES.gut/brain`。

- [ ] **Step 1: 寫失敗測試（World 以 gut/brain 套用難度）**

在 `src/engine/World.test.ts` 既有「省略地圖預設血管」測試（約 line 105）之後新增：

```ts
  it('腸道地圖：生怪快 0.7、敵人脆 ×0.8、視覺欄位正確', () => {
    const w = new World(1, 'macrophage', 'gut')
    expect(w.mapSpawnIntervalMult).toBeCloseTo(0.7, 5)
    expect(w.mapEnemyHpMult).toBeCloseTo(0.8, 5)
    const e = w.spawnEnemyAt({ x: 100, y: 0 }, 'virus')
    expect(e.hp).toBeCloseTo(10 * 0.8, 5) // basic 基礎 hp 10
    expect(w.mapBgColor).toBe(0x140e08)
    expect(w.mapGridColor).toBe(0xffb74d)
  })

  it('腦地圖：生怪慢 1.2、敵人硬 ×1.4、視覺欄位正確', () => {
    const w = new World(1, 'macrophage', 'brain')
    expect(w.mapSpawnIntervalMult).toBeCloseTo(1.2, 5)
    expect(w.mapEnemyHpMult).toBeCloseTo(1.4, 5)
    const e = w.spawnEnemyAt({ x: 100, y: 0 }, 'virus')
    expect(e.hp).toBeCloseTo(10 * 1.4, 5)
    expect(w.mapBgColor).toBe(0x0a0a18)
    expect(w.mapGridColor).toBe(0x9fa8ff)
  })
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `npx vitest run src/engine/World.test.ts -t "地圖"`
Expected: FAIL — 型別錯誤（`'gut'`/`'brain'` 不在 `MapKind`）或 `MAP_DEFS['gut']` 為 undefined。

- [ ] **Step 3: 擴充 `MapKind` union**

`src/engine/types.ts`，把：

```ts
export type MapKind = 'vessel' | 'stomach' | 'lung'
```

改為：

```ts
export type MapKind = 'vessel' | 'stomach' | 'lung' | 'gut' | 'brain'
```

- [ ] **Step 4: 新增 `MAP_DEFS.gut/brain` 與 `MAP_ORDER`**

`src/engine/systems/mapDefs.ts`，`MAP_ORDER` 改為：

```ts
export const MAP_ORDER: MapKind[] = ['vessel', 'stomach', 'lung', 'gut', 'brain']
```

並在 `MAP_DEFS` 物件 `lung` 條目之後加入：

```ts
  gut: {
    kind: 'gut', name: '腸道', description: '蟲潮：生怪極快、敵人脆', bgColor: 0x140e08,
    gridColor: 0xffb74d, gridAlpha: 0.05, spawnIntervalMult: 0.7, enemyHpMult: 0.8,
  },
  brain: {
    kind: 'brain', name: '腦', description: '精英試煉：生怪偏慢、敵人硬', bgColor: 0x0a0a18,
    gridColor: 0x9fa8ff, gridAlpha: 0.05, spawnIntervalMult: 1.2, enemyHpMult: 1.4,
  },
```

- [ ] **Step 5: 新增 `MAP_TINT.gut/brain`（補齊 Record 鍵）**

`src/engine/noiseBackground.ts`，在 `MAP_TINT` 的 `lung` 條目之後加入：

```ts
  gut:     { deep: 0x3a1e08, mid: 0x8a5016, core: 0x7a3e10 },
  brain:   { deep: 0x141233, mid: 0x3a3a8a, core: 0x2a2a66 },
```

- [ ] **Step 6: 新增 `makeNoiseTexture` 的 gut/brain 地貌分支**

`src/engine/noiseBackground.ts`，把 `makeNoiseTexture` 內的判斷（現為 vessel / stomach / else=lung）改為涵蓋 gut/brain；把：

```ts
      if (kind === 'vessel') {
        // domain warp → 流動渦流/大理石流紋
        const wu = wx + 1.4 * fbm(wx, wy, seed + 11, 3, P)
        const wv = wy + 1.4 * fbm(wx + 3.3, wy + 1.7, seed + 23, 3, P)
        v = fbm(wu, wv, seed, 4, P)
      } else if (kind === 'stomach') {
        // ridged → 黏膜皺褶折痕
        v = ridgedFbm(wx, wy, seed, 4, P)
      } else {
        // cellular → 肺泡蜂窩（反相：細胞中心亮、邊界暗）
        v = 1 - cellular(wx, wy, seed, P)
      }
```

改為：

```ts
      if (kind === 'vessel') {
        // domain warp → 流動渦流/大理石流紋
        const wu = wx + 1.4 * fbm(wx, wy, seed + 11, 3, P)
        const wv = wy + 1.4 * fbm(wx + 3.3, wy + 1.7, seed + 23, 3, P)
        v = fbm(wu, wv, seed, 4, P)
      } else if (kind === 'stomach') {
        // ridged → 黏膜皺褶折痕
        v = ridgedFbm(wx, wy, seed, 4, P)
      } else if (kind === 'gut') {
        // 腸道：輕度 domain-warp 的 ridged → 絨毛皺褶流向
        const wu = wx + 1.0 * fbm(wx, wy, seed + 7, 2, P)
        v = ridgedFbm(wu, wy, seed, 3, P)
      } else if (kind === 'brain') {
        // 腦：cellular + fbm 混合 → 神經迴路網狀
        v = 0.5 * (1 - cellular(wx, wy, seed, P)) + 0.5 * fbm(wx, wy, seed + 5, 4, P)
      } else {
        // cellular → 肺泡蜂窩（反相：細胞中心亮、邊界暗）
        v = 1 - cellular(wx, wy, seed, P)
      }
```

- [ ] **Step 7: 新增 `MUSIC_THEMES.gut/brain`（補齊 Record 鍵）**

`src/engine/core/soundManager.ts`，在 `MUSIC_THEMES` 的 `lung` 條目之後加入：

```ts
  // 腸道：方波、較快較密、明亮躁動小調（Em–C–G–D），呼應蟲潮節奏。
  gut: {
    beatMs: 250, arpWave: 'square', arpVol: 0.03,
    chords: [
      { bass: 82.41, arp: [164.81, 196.0, 246.94] }, // Em
      { bass: 65.41, arp: [130.81, 164.81, 196.0] }, // C
      { bass: 98.0, arp: [196.0, 246.94, 293.66] }, // G
      { bass: 73.42, arp: [146.83, 185.0, 220.0] }, // D
    ],
  },
  // 腦：正弦波、緩慢稀疏、高疊置空靈帶張力（Dm–A–Bdim–Bb），精英試煉的肅穆感。
  brain: {
    beatMs: 520, arpWave: 'sine', arpVol: 0.04, sparse: true,
    chords: [
      { bass: 73.42, arp: [293.66, 349.23, 440.0] }, // Dm
      { bass: 55.0, arp: [277.18, 329.63, 440.0] }, // A（張力）
      { bass: 61.74, arp: [246.94, 311.13, 392.0] }, // Bdim-ish
      { bass: 58.27, arp: [233.08, 293.66, 349.23] }, // Bb
    ],
  },
```

- [ ] **Step 8: 跑測試確認通過**

Run: `npx vitest run src/engine/World.test.ts -t "地圖"`
Expected: PASS（含既有「胃/肺泡/省略地圖」與新增「腸道/腦」皆通過）。

- [ ] **Step 9: 型別檢查乾淨**

Run: `npm run typecheck`
Expected: 無錯誤（`MAP_DEFS`/`MAP_TINT`/`MUSIC_THEMES` 三個 Record 都已補 `gut`/`brain` 鍵）。

- [ ] **Step 10: 全測試回歸**

Run: `npm test`
Expected: 全綠。

- [ ] **Step 11: Commit**

```bash
git add src/engine/types.ts src/engine/systems/mapDefs.ts src/engine/noiseBackground.ts src/engine/core/soundManager.ts src/engine/World.test.ts
git commit -m "$(printf '%s\n\n%s' '[mvp][feat][engine] 新增腸道/腦兩張地圖（難度修正 + 背景地貌 + 背景音樂）' 'Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

## 實機驗證（兩 task 完成後，呈現層）

依 `acceptance.md`「呈現層（實機目視）」與「驗證快照」：

- [ ] `npm run dev`，主選單確認角色列出現「肥大細胞」、地圖列出現「腸道」「腦」。
- [ ] 以肥大細胞開局：玩家圓為洋紅、造型為含顆粒圓形 + 偽足、起手為發炎場。
- [ ] 以腸道開局：暖橙地貌 + 腸道背景音樂；敵人成群且偏脆。
- [ ] 以腦開局：冷藍紫地貌 + 緩慢肅穆背景音樂；敵人少而硬。
- [ ] `npm run build` 乾淨。
- [ ] 更新 `acceptance.md` 勾選與 `progress.md`。

---

## Self-Review（plan 對照 spec）

- **Spec coverage：** FR-1 角色定義→Task1 Step3-4；FR-2 地圖定義→Task2 Step3-4；FR-3 造型→Task1 Step6；FR-4 圖示→Task1 Step5；FR-5 背景→Task2 Step5-6；FR-6 音樂→Task2 Step7。Edge cases（預設不變、未知 map 回退、背景分支、存檔相容）由既有機制 + Task2 Step6 的 `else` 保留涵蓋。
- **Placeholder scan：** 無 TBD/TODO；每個改碼步驟皆含完整程式碼與確切路徑/指令。
- **Type consistency：** 全程沿用既有欄位名 `mapSpawnIntervalMult`/`mapEnemyHpMult`/`mapBgColor`/`mapGridColor`/`playerColor`/`stats.areaMult`/`stats.cooldownMult`、`weapons[0].kind`；數值與 Global Constraints/spec 表一致。
