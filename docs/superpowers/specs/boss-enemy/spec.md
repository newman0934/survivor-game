# Spec — Boss 敵人

**日期：** 2026-06-23
**功能名稱：** boss-enemy
**所屬階段：** 階段 2 — 內容（第三項）
**狀態：** 待批准（Approval Gate）

---

## 1. Overview（總覽）

在多種敵人之上，引入**週期性出現的 Boss**：巨型、超高 hp、慢速直線追擊的特化敵人，
每隔固定時間（60s）出現一隻、隨次數變強，擊殺後掉落大量經驗。Boss 存在時，畫面頂部顯示
一條專屬血條。

設計原則：**Boss = 特化敵人**，最大化複用既有敵人系統（factory / enemyAI / renderer 路徑），
只在「Boss 計時器」與「Boss 血條（動到 store 邊界）」兩處新增。

---

## 2. Business Requirements（商業需求）

- 提供階段性的高張力對抗目標，是 survivor-like 的節奏高潮。
- 複用既有敵人分層，工量最小；為後續 Boss 特殊攻擊/階段預留結構。
- 不破壞架構紅線：引擎純 TS、無 Vue/Pinia 執行期依賴；確定性（seeded rng）；固定步長；
  store 只放純資料。

---

## 3. Functional Requirements（功能需求）

### FR-1 Boss 為特化敵種
- `EnemyKind` 新增 `'boss'`。`ENEMY_DEFS.boss` 定義 hp/speed/damage/radius/xp/color，
  且 `spawnWeight: 0`（排除於一般生怪）。
- Boss 行為走既有 `steerEnemy` 預設分支（直線追擊），不需改 `enemyAI`。
- Boss 渲染走既有「依 `enemyKind` 取色 + factory 半徑」路徑，不需改 renderer。

### FR-2 一般生怪排除 Boss
- `pickEnemyKind` 改為只在 `spawnWeight > 0 && elapsed >= unlockTime` 的種類間抽，
  確保 Boss 永不被一般生怪抽到。

### FR-3 Boss 計時器與成長
- `World` 新增 `bossTimer`（週期 60s）與 `bossCount`。
- 計時器到點時 `spawnBossAt(pos)` 在玩家周圍 `SPAWN_RADIUS` 環上生成一隻 Boss，並 `bossCount += 1`。
- 成長：Boss `hp = maxHp = ENEMY_DEFS.boss.hp × (1 + 0.5 × bossCount_before_increment)`，
  使每隻比前一隻硬（第 1 隻 ×1、第 2 隻 ×1.5、第 3 隻 ×2…）。

### FR-4 擊殺獎勵（複用既有掉寶）
- Boss def `xp: 50`。Boss 被擊殺時沿用既有「死亡 → `createGem(pos, e.xp)`」，自動掉一顆 50 經驗
  寶石。不新增掉落程式碼。

### FR-5 Boss 血條
- `Summary` 擴充 `bossActive: boolean`、`bossHp: number`、`bossMaxHp: number`。
- `World.summary()` 找出場上第一隻存活 Boss 計算上述欄位（無則 `false/0/0`）。
- 新增 `ui/BossBar.vue`（純呈現，讀 store）；`App.vue` 在 playing 階段於頂部渲染，
  `bossActive` 為真時顯示，寬度 = `bossHp / bossMaxHp`。

---

## 4. Acceptance Criteria（驗收標準）

詳見 `acceptance.md`。摘要：Boss 每 60s 出現、隨次數變強、巨型紫色直線追擊、擊殺掉 50 經驗、
血條正確顯示/消失；一般生怪永不抽到 Boss；確定性與引擎邊界不變；測試/型別/build 全綠。

---

## 5. Edge Cases（邊界情況）

- **計時器獨立**：Boss 計時器與一般生怪計時器各自倒數、互不干擾。
- **Boss 跨越下一里程碑仍存活**：再生一隻（可能同時 2 隻）；血條顯示找到的第一隻，可接受。
- **玩家在 Boss 出現前死亡**：迴圈停止，`bossTimer` 不再推進，無殘留。
- **Boss 未被擊殺 / 被秒殺**：summary 每幀重算，血條即時反映或消失。
- **武器命中 Boss**：傷害結算不分敵種（沿用 `e.hp -= dmg`）。

---

## 6. API Contracts（介面契約）

```ts
// types.ts
export type EnemyKind = 'basic' | 'swarm' | 'tank' | 'charger' | 'boss'

// stores/game.ts — Summary 擴充
export interface Summary {
  hp: number
  maxHp: number
  time: number
  level: number
  kills: number
  xp: number
  xpNeeded: number
  bossActive: boolean
  bossHp: number
  bossMaxHp: number
}
```

```ts
// systems/enemyDefs.ts — 新增 boss 條目（spawnWeight 0）
// ENEMY_ORDER 仍含 boss（供 factory 等取用），但 pickEnemyKind 以 spawnWeight 過濾。

// systems/spawn.ts — pickEnemyKind 過濾 spawnWeight > 0（簽章不變）
export function pickEnemyKind(elapsed: number, rng: Rng): EnemyKind

// World.ts
spawnBossAt(pos: Vec2): Entity   // 生成並依 bossCount 縮放 hp，bossCount += 1
// summary() 多回傳 bossActive/bossHp/bossMaxHp
```

---

## 7. Data Model Changes（資料模型變更）

- `EnemyKind` 新增 `'boss'`。
- `ENEMY_DEFS` 新增 `boss` 條目（spawnWeight 0）。
- `Summary`（store）新增 `bossActive`、`bossHp`、`bossMaxHp`。
- `World` 新增 `bossTimer`、`bossCount` 私有狀態與 `spawnBossAt` 方法。

---

## 8. State Changes（狀態變更）

- `World.step()` 新增「Boss 計時器倒數 → 到點 spawnBossAt」段（與一般生怪段並列、獨立）。
- `World.summary()` 計算並回傳 boss 三欄。
- store `start()` 重置 boss 三欄；`updateSummary()` 複製 boss 三欄。
- `App.vue` 在 playing 階段渲染 `BossBar.vue`。
- 其餘流程（碰撞、接觸傷害、掉寶、升級握手、死亡結算）不變。

---

## 9. UI Behaviour（UI 行為）

- Boss 存在時，畫面頂部顯示一條紫色血條，寬度隨 Boss 剩餘 hp 變化；Boss 不存在時隱藏。
- 既有 HUD / 選單 / 升級彈窗 / 死亡結算不變。
- Boss 以巨大深紫色圓呈現（color `0x9c27b0`、radius 34）。

---

## 10. Non-Functional Requirements（非功能需求）

- **架構邊界**：`enemyDefs.ts`、`spawn.ts`、`World.ts`、`types.ts` 純 TS，無 Vue/Pinia；
  `BossBar.vue` 為 Vue 呈現層、只讀 store。
- **確定性**：Boss 生成位置走 seeded rng；固定步長 1/60 不變。
- **TDD**：spawn 過濾、World boss 計時/成長/summary、factory 先寫失敗測試；
  renderer/迴圈/Vue 元件不寫單元測試。
- **store 邊界**：僅新增三個純數字/布林欄位，不放 entity。
- **資源清理**：`Game.stop()` / `PixiRenderer.destroy()` 維持冪等。

---

## 11. 數值表（草案，定稿於 enemyDefs.ts）

| 欄位 | 值 |
|------|----|
| hp（基底） | 220（實際 = 220 × (1 + 0.5×bossCount)） |
| speed | 30 |
| damage | 20 |
| radius | 34 |
| xp | 50 |
| color | 0x9c27b0（深紫） |
| spawnWeight | 0 |
| unlockTime | 0（不影響，因 spawnWeight 0 已排除） |

Boss 週期 `BOSS_INTERVAL = 60` 秒。

---

## 12. 非目標（本 spec 明確不做）

- Boss 特殊攻擊、階段轉換、召喚小怪。
- 多 Boss 同時血條、Boss 名稱/頭像。
- 實箱/隨機獎勵（擊殺只給經驗）。
