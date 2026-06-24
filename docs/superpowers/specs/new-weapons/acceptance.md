# Acceptance — 新增三把武器（吞噬偽足 / 補體級聯 / 抗原脈衝）

本檔為本功能完成與否的**唯一驗收來源**。所有項目通過才得標記為完成。
（武器邏輯走 TDD 單元測試；視覺以實機目視驗證；既有測試維持全綠。）

_驗證日期：2026-06-24（程式/型別/build/單元測試通過；實機目視待玩家確認）_

## 武器定義（types / weaponDefs）
- [x] `WeaponKind` 新增 `phagocyte` / `cascade` / `nova`
- [x] `WEAPON_DEFS` 三筆等級表（maxLevel 5）數值如 spec
- [x] `WEAPON_ORDER` 追加三把（接於現有四把後）
- [x] 沿用既有 `WeaponLevelStats` 欄位，不新增欄位

## 武器純函式（weapons.ts，含單元測試）
- [x] `phagocyteSweep`：扇形（半徑 + 半角）命中判定正確、回傳命中陣列、就地扣血
- [x] `chainTargets`：從最近起跳、每跳取範圍內最近未命中者、上限跳數、提前結束、確定性 tiebreak
- [x] `novaBurst`：半徑內全體命中、回傳命中陣列
- [x] 三函式皆確定性、無 `Math.random()`（grep 確認）

## World 接線
- [x] 三把武器冷卻倒數觸發；damage×damageMult、radius×areaMult、cooldown×cooldownMult
- [x] phagocyte 以 lastMoveDir 朝向；cascade 第 k 跳套 0.75^k 遞減；nova 範圍爆發
- [x] 命中後 `checkKills()`；命中數>0 推 hit 音效 + 對應 fx 事件

## 視覺事件佇列與繪製
- [x] 新增 `FxEvent` 型別與 `World.fxEventQueue` + `consumeFxEvents()`（比照 soundEventQueue）
- [x] `EffectsLayer` 新增 `spawnSweep` / `spawnChain` / `spawnNova`
- [x] Game/PixiRenderer 每幀排空 fx 事件並繪製（扇掃弧/連鎖閃電/擴張環）

## 解除武器上限
- [x] `WEAPON_CAP` 4→7，七把武器可全數解鎖

## 不變項（硬性）
- [x] 既有四把武器數值/行為/平衡不變
- [x] 升級握手 / store / Summary / 被動 / 敵人 / 角色 / 地圖 / 確定性不變
- [x] Game.stop / PixiRenderer.destroy / EffectsLayer.destroy 冪等

## 驗證快照（完成時填寫）
- [x] 單元測試全綠（既有 122 + 新測試 7 = 129）
- [x] 型別檢查（vue-tsc）乾淨
- [x] Production build 乾淨
- [ ] 實機驗證：三把武器解鎖/升級、機制如設計、視覺正確、可收齊 7 把、FPS 正常、0 功能相關 console error（**待玩家 `npm run dev` 目視確認**）
- [x] progress.md 已更新
