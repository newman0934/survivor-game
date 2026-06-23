# Acceptance — 多角色

本檔為本功能完成與否的**唯一驗收來源**。所有項目通過才得標記為完成。

## 角色定義
- [ ] 新增 CharacterKind（4 種）、CharacterDef；CHARACTER_DEFS + CHARACTER_ORDER
- [ ] 每角色含 kind/name/description/color/maxHp/startWeapon/statMods/startPassives 完整欄位
- [ ] startWeapon 為合法 WeaponKind、startPassives 為合法 PassiveKind

## World 起始參數化
- [ ] 建構子 constructor(seed, character='warrior')
- [ ] 起始 weapons 為該角色 startWeapon（Lv1）
- [ ] Object.assign(stats, statMods) 正確套用（如 ranger moveSpeed=240、mage damageMult=1.25）
- [ ] player.maxHp 與 hp 等於 def.maxHp（warrior 140 / ranger 80 / mage 90 / harvester 100）
- [ ] startPassives 套用（harvester passives 含 crown 且 xpGain>1）
- [ ] playerColor 等於 def.color
- [ ] 省略 character 預設 warrior（既有 new World(seed) 不壞）

## 選角流程（實機目視）
- [ ] MainMenu 顯示 4 張角色卡（名稱+起始武器+特色），預設戰士、可切換、選中以角色色描邊
- [ ] start 事件帶 CharacterKind；App.startGame / Game.start 往下傳
- [ ] 遊戲中玩家圓為該角色顏色
- [ ] 「再玩一次」沿用上次選定角色

## 確定性與架構邊界
- [ ] 角色只改起始狀態，之後全走 seeded rng；相同 seed+角色+操作 → 相同結果
- [ ] characterDefs.ts / World 無 Vue/Pinia 執行期 import
- [ ] 固定步長 1/60 不變；store/Summary 不變
- [ ] Game.stop() / PixiRenderer.destroy() 維持冪等

## 驗證快照（完成時填寫）
- [ ] 單元測試（Vitest）全數通過（含新增 World 起始套用測試 + 既有 99）
- [ ] 型別檢查（vue-tsc）乾淨
- [ ] Production build 乾淨
- [ ] 實機煙霧測試：四角色可選、起始武器/顏色各異、玩起來差異明顯，無功能相關 console error
- [ ] progress.md 已更新
