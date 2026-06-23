# Acceptance — 被動道具 / 更多升級分支

本檔為本功能完成與否的**唯一驗收來源**。所有項目通過才得標記為完成。
（不重複 BDD scenario；此處為可勾選的驗收清單。）

_驗證日期：2026-06-23 — 單元測試 96 全過、vue-tsc 乾淨、build 乾淨、瀏覽器實測通過。_

## 被動道具系統
- [x] 新增 PassiveKind（10 種）、Passive、PassiveDef；PASSIVE_DEFS + PASSIVE_ORDER
- [x] World 持有 passives（起始空），每種 5 級、持有上限 6（PASSIVE_CAP）
- [x] 選到被動：未持有則新增 Lv1 並套用第 1 級；已持有則 level+1 並套用該新級
- [x] 卡面文案正確：解鎖「新道具：<名>」、升級「<名> LvN→LvN+1」

## 10 種道具效果正確
- [x] 菠菜 damageMult ×1.1/級
- [x] 空書 cooldownMult ×0.92/級
- [x] 護腕 projectileSpeedMult ×1.1/級
- [x] 翅膀 moveSpeed ×1.08/級
- [x] 吸引石 pickupRadius ×1.15/級
- [x] 燭台 areaMult ×1.1/級
- [x] 空心之心 player.maxHp +25 且 hp +25/級
- [x] 番茄 regen +0.6/級
- [x] 護甲 armor +2/級
- [x] 皇冠 xpGain +0.15/級

## 新引擎鉤點
- [x] 回復：每格（僅存活時）hp = min(maxHp, hp + regen×dt)，不溢出
- [x] 減傷：接觸傷害 = max(0, e.damage − armor) × dt × 10（逐隻敵人、防負）
- [x] 經驗加成：撿寶 grantXp(gem.xp × xpGain)
- [x] PlayerStats 初值新增 regen:0 / armor:0 / xpGain:1

## 升級候選池整合
- [x] UpgradeContext 擴充 passives 與 player
- [x] 候選含「解鎖被動 / 升級被動」與武器並列
- [x] 被動達上限 6 後不再出「解鎖被動」候選
- [x] 被動滿級後不再出該被動升級候選
- [x] 移除舊 5 張無限乘區卡；候選不再含舊 damage/firerate/projspeed/movespeed/pickup id
- [x] 候選不足 3 張時 heal 保底補滿
- [x] applyUpgradeById 處理 passunlock: / passlvl:；未知 id 安靜略過

## 確定性與架構邊界
- [x] 候選抽選走 seeded rng；相同 seed+選擇序列 → 相同候選序列
- [x] passiveDefs.ts / leveling.ts / types.ts 無 Vue/Pinia 執行期 import
- [x] 固定步長 1/60 不變
- [x] Game.stop() / PixiRenderer.destroy() 維持冪等
- [x] store / Summary / HUD 不變

## 回歸（既有行為不被破壞）
- [x] 多武器解鎖/升級、多敵人、Boss、升級握手、死亡結算不受影響

## 驗證快照
- [x] 單元測試（Vitest）全數通過（含新增 passiveDefs/leveling/World 測試）— 96 passed
- [x] 型別檢查（vue-tsc）乾淨
- [x] Production build 乾淨
- [x] 瀏覽器煙霧測試：升級卡出現被動道具解鎖（新道具：菠菜/番茄/燭台…）與武器升級，
      且不再出現舊乘區卡（傷害+15% 等）；效果由 passiveDefs + World 鉤點單元測試覆蓋。
      唯一 console error 為既有 favicon 404（與功能無關）。
- [x] progress.md 已更新
