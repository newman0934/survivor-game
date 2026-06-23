# Spec — 被動道具 / 更多升級分支

**日期：** 2026-06-23
**功能名稱：** passive-items
**所屬階段：** 階段 2 — 內容（第四項）
**狀態：** 待批准（Approval Gate）

---

## 1. Overview（總覽）

把目前「可無限重複選的 5 張全域乘區卡」升級為 **VS 風的被動道具系統**：每種道具有等級、持有上限，
與武器並列於升級卡池（解鎖／升級）。共 **10 種**道具（5 種來自既有乘區、5 種新增，其中 4 種需新引擎
鉤點），擴大 build 的策略深度。

被動道具完全鏡像武器系統的分層（defs 表 + kind + 等級），但「選到即套用」（apply-on-pick 增量），
不在每格開火。

---

## 2. Business Requirements（商業需求）

- 提供「道具收集 + 取捨」的 build 深度，是 survivor-like 的核心成長樂趣。
- 沿用武器分層，工量可控；為後續被動進化等預留結構。
- 不破壞架構紅線：引擎純 TS、無 Vue/Pinia 執行期依賴；確定性（seeded rng）；固定步長；
  store 只放純資料。

---

## 3. Functional Requirements（功能需求）

### FR-1 被動道具為帶等級的資料
- 新增 `PassiveKind`（10 種）與 `Passive { kind, level }`。
- `World.passives: Passive[]`（起始為空）。每種 5 級、持有上限 6。

### FR-2 被動定義表
- `systems/passiveDefs.ts` 提供 `PASSIVE_DEFS[kind] = { kind, label, maxLevel, apply(ctx) }`
  與 `PASSIVE_ORDER`、`PASSIVE_CAP`。`apply(ctx)` 為每升一級執行一次的固定增量。

### FR-3 選到即套用（apply-on-pick 增量）
- 升級握手選到被動時：若未持有則新增該被動（level 1）並執行一次 apply；若已持有則 level += 1
  並再執行一次 apply。
- 被動 `level` 用於候選產生、卡面文案、上限計數。

### FR-4 新數值與引擎鉤點
- `PlayerStats` 新增 `regen`（hp/秒，初值 0）、`armor`（接觸減傷固定值，初值 0）、
  `xpGain`（經驗乘區，初值 1）；`areaMult` 沿用既有。
- World 鉤點：
  - 回復：每格（僅存活時）`player.hp = min(maxHp, hp + regen × dt)`。
  - 減傷：接觸傷害改為 `max(0, e.damage − armor) × dt × 10`（逐隻敵人）。
  - 經驗加成：撿寶時 `grantXp(gem.xp × xpGain)`。
- 最大血道具（heart）改 `player.maxHp` 與 `player.hp`（透過 UpgradeContext 的 player）。

### FR-5 升級候選池整合
- `UpgradeContext` 擴充 `passives: Passive[]` 與 `player: Entity`。
- 候選新增「解鎖被動 / 升級被動」兩類，與武器並列：
  - 解鎖被動：未持有且持有數 < 6。
  - 升級被動：已持有且 level < maxLevel。
- **移除舊的 5 張無限乘區卡**（`damage/firerate/projspeed/movespeed/pickup` 的 PASSIVE_UPGRADES）。
- heal 保底維持。

### FR-6 store / HUD 不變
- 被動不需逐項顯示（同武器處理）；`Summary`、store、HUD 不動。

---

## 4. Acceptance Criteria（驗收標準）

詳見 `acceptance.md`。摘要：10 種被動可解鎖/升級、有上限 6/每種 5 級、各效果正確（含 regen/armor/
xpGain/maxHp 鉤點）、候選正確整合並移除舊乘區卡；確定性與引擎邊界不變；測試/型別/build 全綠。

---

## 5. Edge Cases（邊界情況）

- **被動上限 6 已滿**：不再出解鎖被動候選（仍可升級既有、出武器候選、heal 保底）。
- **armor ≥ 敵人傷害**：該敵接觸傷害歸零（`max(0, …)` 防負）。
- **regen 補滿**：hp 補到 maxHp 即封頂、不溢出；玩家死亡（hp≤0）後不再回血。
- **候選不足 3 張**：全武器/被動皆滿時以 heal 保底補滿。
- **xpGain 造成分數經驗**：xp 為 number，照常累加，升級門檻比較不受影響。
- **套用未知 id**：安靜略過、不丟例外。

---

## 6. API Contracts（介面契約）

```ts
// types.ts
export type PassiveKind =
  | 'spinach' | 'tome' | 'bracer' | 'wings' | 'magnet'
  | 'candle' | 'heart' | 'tomato' | 'armor' | 'crown'

export interface Passive {
  kind: PassiveKind
  level: number // 1..maxLevel
}

export interface PassiveDef {
  kind: PassiveKind
  label: string
  maxLevel: number
  /** 每升一級執行一次的固定增量套用函式（uniform per-level increment）。 */
  apply: (ctx: UpgradeContext) => void
}

// PlayerStats 新增
export interface PlayerStats {
  moveSpeed: number
  pickupRadius: number
  damageMult: number
  cooldownMult: number
  projectileSpeedMult: number
  areaMult: number
  regen: number       // 新：hp/秒
  armor: number       // 新：接觸減傷固定值
  xpGain: number      // 新：經驗乘區（初值 1）
}

// UpgradeContext 擴充
export interface UpgradeContext {
  stats: PlayerStats
  weapons: Weapon[]
  passives: Passive[] // 新
  player: Entity      // 新（heart 改 maxHp）
  heal: (amount: number) => void
}
```

```ts
// systems/passiveDefs.ts
export const PASSIVE_DEFS: Record<PassiveKind, PassiveDef>
export const PASSIVE_ORDER: PassiveKind[]

// systems/leveling.ts — 候選與套用整合被動（rollUpgrades / buildCandidates / applyUpgradeById 簽章不變）
// 候選 id：解鎖被動 'passunlock:<kind>'、升級被動 'passlvl:<kind>'

// World.ts
upgradeContext(): UpgradeContext // 多回傳 passives 與 player
```

---

## 7. Data Model Changes（資料模型變更）

- 新增 `PassiveKind`、`Passive`、`PassiveDef`、`PASSIVE_DEFS`、`PASSIVE_ORDER`。
- `PlayerStats` 新增 `regen`、`armor`、`xpGain`。
- `UpgradeContext` 新增 `passives`、`player`。
- `World` 新增 `passives: Passive[]`。
- 移除 `leveling.ts` 的 `PASSIVE_UPGRADES`（舊無限乘區卡）。

---

## 8. State Changes（狀態變更）

- `buildCandidates` / `rollUpgrades`：候選改為含「解鎖/升級被動」、不含舊乘區卡。
- `applyUpgradeById`：新增 `passunlock:` / `passlvl:` 分支。
- `World.step()` 新增 regen 鉤點、修改接觸傷害套 armor、撿寶套 xpGain。
- `World.upgradeContext()` 多回傳 passives 與 player。
- 升級握手流程、HUD、死亡結算其餘不變。

---

## 9. UI Behaviour（UI 行為）

- 升級彈窗卡面新增被動文案：解鎖「新道具：菠菜」、升級「菠菜 Lv2→Lv3」。
- HUD / store / summary 不變。

---

## 10. Non-Functional Requirements（非功能需求）

- **架構邊界**：`passiveDefs.ts`、`leveling.ts`、`types.ts` 純 TS，無 Vue/Pinia。
- **確定性**：候選抽選走 seeded rng；固定步長 1/60 不變。
- **TDD**：passiveDefs、leveling 候選/套用、World 鉤點先寫失敗測試；renderer/迴圈/UI 不寫單元測試。
- **store 邊界**：不新增 store 欄位。
- **資源清理**：`Game.stop()` / `PixiRenderer.destroy()` 維持冪等。

---

## 11. 被動數值表（草案，定稿於 passiveDefs.ts；每種 5 級、每級套用一次）

| 道具 | kind | 每級效果 |
|------|------|------|
| 菠菜 | spinach | `damageMult ×1.1` |
| 空書 | tome | `cooldownMult ×0.92` |
| 護腕 | bracer | `projectileSpeedMult ×1.1` |
| 翅膀 | wings | `moveSpeed ×1.08` |
| 吸引石 | magnet | `pickupRadius ×1.15` |
| 燭台 | candle | `areaMult ×1.1` |
| 空心之心 | heart | `player.maxHp += 25`、`player.hp += 25` |
| 番茄 | tomato | `regen += 0.6` |
| 護甲 | armor | `armor += 2` |
| 皇冠 | crown | `xpGain += 0.15` |

持有上限 `PASSIVE_CAP = 6`。

---

## 12. 非目標（本 spec 明確不做）

- 被動進化/合成。
- 被動專屬 UI 清單/圖示。
- 幸運（luck）、復活（revive）等更複雜效果。
