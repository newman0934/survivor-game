# Acceptance — 多角色

本檔為本功能完成與否的**唯一驗收來源**。所有項目通過才得標記為完成。

_驗證日期：2026-06-23 — 單元測試 103 全過、vue-tsc 乾淨、build 乾淨、實機驗證通過。_

## 角色定義
- [x] 新增 CharacterKind（4 種）、CharacterDef；CHARACTER_DEFS + CHARACTER_ORDER
- [x] 每角色含 kind/name/description/color/maxHp/startWeapon/statMods/startPassives 完整欄位
- [x] startWeapon 為合法 WeaponKind、startPassives 為合法 PassiveKind

## World 起始參數化
- [x] 建構子 constructor(seed, character='warrior')
- [x] 起始 weapons 為該角色 startWeapon（Lv1）
- [x] Object.assign(stats, statMods) 正確套用（如 ranger moveSpeed=240、mage damageMult=1.25）
- [x] player.maxHp 與 hp 等於 def.maxHp（warrior 140 / ranger 80 / mage 90 / harvester 100）
- [x] startPassives 套用（harvester passives 含 crown 且 xpGain>1）
- [x] playerColor 等於 def.color
- [x] 省略 character 預設 warrior（既有 new World(seed) 不壞）

## 選角流程（實機目視）
- [x] MainMenu 顯示 4 張角色卡（名稱+特色），預設戰士、可切換、選中以角色色描邊
- [x] start 事件帶 CharacterKind；App.startGame / Game.start 往下傳
- [x] 遊戲中玩家圓為該角色顏色（實機確認法師為紫色 + 聖經書本起手）
- [x] 「再玩一次」沿用上次選定角色（實機確認）

## 確定性與架構邊界
- [x] 角色只改起始狀態，之後全走 seeded rng；相同 seed+角色+操作 → 相同結果
- [x] characterDefs.ts / World 無 Vue/Pinia 執行期 import
- [x] 固定步長 1/60 不變；store/Summary 不變
- [x] Game.stop() / PixiRenderer.destroy() 維持冪等

## 驗證快照
- [x] 單元測試（Vitest）全數通過（含新增 World 起始套用測試）— 103 passed
- [x] 型別檢查（vue-tsc）乾淨
- [x] Production build 乾淨
- [x] 實機煙霧測試：4 角色卡可選/切換、法師開局為紫色玩家 + 聖經書本、再玩沿用角色；
      唯一 console error 為既有 favicon 404（與功能無關）
- [x] progress.md 已更新
