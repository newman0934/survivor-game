# Acceptance — 新增肥大細胞角色與兩張地圖（gut／brain）

本檔為本功能完成與否的**唯一驗收來源**。所有項目通過才得標記為完成。

_驗證日期：2026-06-26 — 單元測試 206 全過、vue-tsc 乾淨、production build 乾淨、SDD 雙階段審查（task + 全分支廣審）皆 Approved／Ready to merge。實機目視待玩家確認。_

## 角色定義 — 肥大細胞
- [x] `CharacterKind` 含 `'mastcell'`；`CHARACTER_DEFS.mastcell` 完整；`CHARACTER_ORDER` 末端含 `'mastcell'`
- [x] 欄位正確：name='肥大細胞'、startWeapon='inflammation'、maxHp=100、color=0xf06292、startPassives=[]
- [x] statMods = { areaMult: 1.3, cooldownMult: 0.9 }

## World 以肥大細胞建構
- [x] 起始 weapons 為 inflammation（Lv1）
- [x] player.maxHp 與 hp 等於 100
- [x] stats.areaMult 等於 1.3、stats.cooldownMult 等於 0.9
- [x] playerColor 等於 0xf06292

## 地圖定義 — gut / brain
- [x] `MapKind` 含 `'gut' | 'brain'`；`MAP_DEFS` 兩筆完整；`MAP_ORDER` 末端依序含 `'gut'`,`'brain'`
- [x] gut 欄位正確：name='腸道'、spawnIntervalMult=0.7、enemyHpMult=0.8
- [x] brain 欄位正確：name='腦'、spawnIntervalMult=1.2、enemyHpMult=1.4

## World 以新地圖建構
- [x] 以 gut 建構：mapSpawnIntervalMult=0.7、mapEnemyHpMult=0.8（spawnEnemyAt 敵人 hp ×0.8）
- [x] 以 brain 建構：mapSpawnIntervalMult=1.2、mapEnemyHpMult=1.4（spawnEnemyAt 敵人 hp ×1.4）

## 呈現層（實機目視 — 待玩家確認）
- [ ] 主選單角色列出現「肥大細胞」、地圖列出現「腸道」「腦」（程式已自動帶出，待目視）
- [ ] 肥大細胞玩家圓為洋紅色、造型為含顆粒圓形 + 一圈短偽足
- [ ] 腸道背景為暖橙地貌、腦背景為冷藍紫地貌
- [ ] 腸道與腦各播放可辨識的不同背景音樂
- [ ] CHARACTER_ICONS.mastcell 圖示於選單/HUD/升級彈窗正常顯示

## 確定性與架構邊界
- [x] 新內容只改起始狀態與視覺，之後全走 seeded rng；模擬中不呼叫 Math.random()（noiseBackground 噪聲 seed 屬呈現層）
- [x] characterDefs.ts / mapDefs.ts / World 無 Vue/Pinia 執行期 import（廣審確認）
- [x] 固定步長 1/60 不變；store/Summary/MainMenu/Leaderboard 程式碼不變（自動帶出）
- [x] noiseBackground 對 gut/brain 有對應分支、lung 的 else 保留；startMusic 對未知 map 仍回退 vessel
- [x] World 既有 `new World(seed)` 預設 macrophage/vessel 不變；舊存檔未知 kind 安全降級

## 驗證快照
- [x] 單元測試（Vitest）全數通過（含新增：mastcell 起始 + gut/brain 難度）— 206 passed
- [x] 型別檢查（vue-tsc）乾淨
- [x] Production build 乾淨
- [ ] 實機煙霧測試：肥大細胞洋紅造型 + 發炎起手；腸道/腦各有背景與音樂（待玩家於 `npm run dev` 確認）
- [x] progress.md 已更新
