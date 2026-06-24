# Spec — 武器進化

## Overview

新增《吸血鬼倖存者》招牌的**武器進化**機制：某武器升到滿級（Lv5）且持有其指定被動（≥Lv1）時，
升級三選一會多出一張「⭐ 進化」卡；選取後該武器就地進化——改新名、套用遠超 Lv5 的「進化層」
數值，並獲得一個招牌行為加成。沿用既有升級握手（`buildCandidates`/`applyUpgradeById`）與 World
武器分派，不新增 UI 流程。7 把武器全部具備進化。

## Business Requirements

- 提供 build 終局目標與「武器蛻變」的爽感，大幅提升耐玩度與 build 多樣性。
- 完全接上既有武器/被動/升級系統，維持引擎純度與確定性。

## Functional Requirements

### FR-1 進化條件與觸發
- 對玩家持有的某武器，當「**已達 maxLevel** 且 **持有該武器 `evolution.requires` 指定的被動（level≥1）** 且 **尚未進化（`evolved !== true`）**」三者同時成立時：
  `buildCandidates` 加入一張 `evolve:<kind>` 候選卡（label 形如「⭐ 進化：<evolution.label>」）。
- 條件任一不成立則不提供該卡。
- `applyUpgradeById('evolve:<kind>')` 須**再次驗證**上述三條件後，才將該武器 `evolved` 設為 true（防止條件已變動）。

### FR-2 進化後效果
- 進化後該武器仍為同一 `kind`、留在 `weapons` 陣列原位、`evolved = true`；**所需被動保留**、不消耗。
- World.step 取生效數值時，進化武器改用 `def.evolution.level`（而非 `def.levels[level-1]`）；
  生效值仍乘全域乘區（damageMult/cooldownMult/areaMult/projectileSpeedMult），與既有一致。
- 招牌行為加成（見 FR-4）依 `def.evolution` 的旗標在對應分派分支生效。
- 進化武器不再提供 `levelup`（已滿級）也不再提供 `evolve`（已進化）。

### FR-3 七把進化定義（武器 + 所需被動 → 進化層數值）

| 武器(kind) | 所需被動(requires) | 進化名(label) | 進化層數值 | 招牌加成 |
|---|---|---|---|---|
| antibody | tome（干擾素/攻速） | 抗體風暴 | cooldown 0.12, damage 12, count 5, projectileSpeed 500 | 近乎無冷卻 + 多重彈（純數值） |
| perforin | bracer（趨化因子/彈速） | 千刃穿孔 | cooldown 0.12, damage 8, count 5, projectileSpeed 750 | `pierce: 3`（彈體穿透 3 敵） |
| complement | spinach（細胞激素/傷害） | 終末補體複合體 | damage 12, count 6, radius 150, angularSpeed 4.5 | 命中冷卻縮短 0.5→0.25s（進化專屬） |
| inflammation | tomato（生長因子/回復） | 自體炎症風暴 | damage 16, radius 170 | `fieldRegen: 1.5`（場域存在時每秒回血 1.5） |
| phagocyte | wings（偽足/移速） | 巨噬吞噬漩渦 | cooldown 0.3, damage 30, radius 130 | `halfAngle: Math.PI`（近 360° 環掃） |
| cascade | candle（組織胺/範圍） | 補體爆發級聯 | cooldown 0.45, damage 24, count 9, radius 260 | `noFalloff: true`（取消每跳衰減） |
| nova | magnet（受體/吸取） | 抗原超載脈衝 | cooldown 0.8, damage 40, radius 300 | 巨大範圍 + 低冷卻（純數值） |

### FR-4 招牌行為加成的實作（沿用既有分派）
- **pierce（perforin）**：`Entity.pierce` 記剩餘穿透數。子彈命中敵人扣血後，若 `pierce>0` 則 `pierce-=1` 且**不失效**（繼續飛行命中下一隻）；否則失效。每幀單發仍最多命中一隻（既有 `break`）。
- **noFalloff（cascade）**：進化時每跳傷害係數用 `1.0`（不套 `CASCADE_FALLOFF`）。
- **halfAngle（phagocyte）**：進化時 `phagocyteSweep` 的半角用 `def.evolution.halfAngle`（覆寫常數 `PHAGOCYTE_HALF_ANGLE`）。
- **fieldRegen（inflammation）**：進化時 inflammation 分支每格替玩家回 `fieldRegen * dt` 血（夾 maxHp 上限；玩家存活時）。
- **命中冷卻（complement）**：進化的補體環 per-enemy 命中冷卻由 0.5s 改 0.25s（`updateBible` 內依 `evolved` 判定）。

### FR-5 視覺
- 進化武器的投射物加進化色調/光暈：`Entity.evolved` 旗標傳入，`drawProjectile` 依旗標上色（輕量，不另寫整套造型）。
- 升級彈窗對 `evolve:` 開頭的卡片給星標/高亮邊框強調（小改 UpgradeModal）。

## Acceptance Criteria

詳見 acceptance.md（唯一驗收來源）。

## Edge Cases

- 武器滿級但尚未持有所需被動：不提供進化卡；之後取得該被動 → 進化卡才出現（動態 `buildCandidates`）。
- 已進化的武器：不再出現進化卡，也不出現 levelup 卡（已達 maxLevel）。
- `applyUpgradeById('evolve:X')` 時條件已不成立（理論上不會，因卡片動態產生）：不設 evolved、安靜略過。
- pierce 子彈跨幀可能再次接近同一敵人：接受（每幀單發單命中，子彈持續位移，重複命中機率低且無害）。
- 被動無法被移除（既有設計），故「進化後失去被動」不存在。

## Data Model Changes

- `Entity` 新增選用 `pierce?: number`（投射物穿透剩餘數）、`evolved?: boolean`（投射物進化上色用）。
- `Weapon` 新增選用 `evolved?: boolean`（執行期局內狀態，不入存檔）。
- 新增 `WeaponEvolution` 介面，`WeaponDef` 新增選用 `evolution?: WeaponEvolution`：
  ```ts
  interface WeaponEvolution {
    requires: PassiveKind
    label: string
    level: WeaponLevelStats
    pierce?: number
    noFalloff?: boolean
    halfAngle?: number
    fieldRegen?: number
  }
  ```
- `WEAPON_DEFS` 七筆各補 `evolution`（數值如 FR-3）。
- **不修改** `Summary` / store 形狀 / saveStore（`evolved` 為局內狀態，不持久化）。

## State Changes

- `World.weapons[i].evolved` 於選取進化卡時設 true；`World` 武器分派依 `evolved` 取進化層數值與旗標。
- 既有升級握手流程、phase 狀態機不變。

## UI Behaviour

- 進化卡沿用既有三選一彈窗呈現；`evolve:` 卡片有視覺強調（星標/高亮）。
- 進化即時生效（下一格起該武器以進化數值開火）。

## Non-Functional Requirements

- **確定性**：進化卡走既有 seeded rng 抽選；模擬無 `Math.random()`。
- **引擎純度**：邏輯全在 `engine/`；不引入 Vue/Pinia 執行期依賴。
- **既有測試全綠**：154 既有測試不受影響；新增進化邏輯走 TDD 單元測試。
- **既有武器行為不變**：未進化時所有武器數值/行為/平衡與現況完全一致。
