# Acceptance — 被動道具 / 更多升級分支

本檔為本功能完成與否的**唯一驗收來源**。所有項目通過才得標記為完成。
（不重複 BDD scenario；此處為可勾選的驗收清單。）

## 被動道具系統
- [ ] 新增 PassiveKind（10 種）、Passive、PassiveDef；PASSIVE_DEFS + PASSIVE_ORDER
- [ ] World 持有 passives（起始空），每種 5 級、持有上限 6（PASSIVE_CAP）
- [ ] 選到被動：未持有則新增 Lv1 並套用第 1 級；已持有則 level+1 並套用該新級
- [ ] 卡面文案正確：解鎖「新道具：<名>」、升級「<名> LvN→LvN+1」

## 10 種道具效果正確
- [ ] 菠菜 damageMult ×1.1/級
- [ ] 空書 cooldownMult ×0.92/級
- [ ] 護腕 projectileSpeedMult ×1.1/級
- [ ] 翅膀 moveSpeed ×1.08/級
- [ ] 吸引石 pickupRadius ×1.15/級
- [ ] 燭台 areaMult ×1.1/級
- [ ] 空心之心 player.maxHp +25 且 hp +25/級
- [ ] 番茄 regen +0.6/級
- [ ] 護甲 armor +2/級
- [ ] 皇冠 xpGain +0.15/級

## 新引擎鉤點
- [ ] 回復：每格（僅存活時）hp = min(maxHp, hp + regen×dt)，不溢出
- [ ] 減傷：接觸傷害 = max(0, e.damage − armor) × dt × 10（逐隻敵人、防負）
- [ ] 經驗加成：撿寶 grantXp(gem.xp × xpGain)
- [ ] PlayerStats 初值新增 regen:0 / armor:0 / xpGain:1

## 升級候選池整合
- [ ] UpgradeContext 擴充 passives 與 player
- [ ] 候選含「解鎖被動 / 升級被動」與武器並列
- [ ] 被動達上限 6 後不再出「解鎖被動」候選
- [ ] 被動滿級後不再出該被動升級候選
- [ ] 移除舊 5 張無限乘區卡；候選不再含舊 damage/firerate/projspeed/movespeed/pickup id
- [ ] 候選不足 3 張時 heal 保底補滿
- [ ] applyUpgradeById 處理 passunlock: / passlvl:；未知 id 安靜略過

## 確定性與架構邊界
- [ ] 候選抽選走 seeded rng；相同 seed+選擇序列 → 相同候選序列
- [ ] passiveDefs.ts / leveling.ts / types.ts 無 Vue/Pinia 執行期 import
- [ ] 固定步長 1/60 不變
- [ ] Game.stop() / PixiRenderer.destroy() 維持冪等
- [ ] store / Summary / HUD 不變

## 回歸（既有行為不被破壞）
- [ ] 多武器解鎖/升級、多敵人、Boss、升級握手、死亡結算不受影響

## 驗證快照（完成時填寫）
- [ ] 單元測試（Vitest）全數通過（含新增 passiveDefs/leveling/World 測試）
- [ ] 型別檢查（vue-tsc）乾淨
- [ ] Production build 乾淨
- [ ] 瀏覽器煙霧測試：升級卡出現被動道具（解鎖/升級）、效果生效（如回血/減傷），無功能相關 console error
- [ ] progress.md 已更新
