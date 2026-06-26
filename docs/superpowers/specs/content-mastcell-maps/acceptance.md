# Acceptance — 新增肥大細胞角色與兩張地圖（gut／brain）

本檔為本功能完成與否的**唯一驗收來源**。所有項目通過才得標記為完成。

_驗證日期：（待填）_

## 角色定義 — 肥大細胞
- [ ] `CharacterKind` 含 `'mastcell'`；`CHARACTER_DEFS.mastcell` 完整；`CHARACTER_ORDER` 末端含 `'mastcell'`
- [ ] 欄位正確：name='肥大細胞'、startWeapon='inflammation'、maxHp=100、color=0xf06292、startPassives=[]
- [ ] statMods = { areaMult: 1.3, cooldownMult: 0.9 }

## World 以肥大細胞建構
- [ ] 起始 weapons 為 inflammation（Lv1）
- [ ] player.maxHp 與 hp 等於 100
- [ ] stats.areaMult 等於 1.3、stats.cooldownMult 等於 0.9
- [ ] playerColor 等於 0xf06292

## 地圖定義 — gut / brain
- [ ] `MapKind` 含 `'gut' | 'brain'`；`MAP_DEFS` 兩筆完整；`MAP_ORDER` 末端依序含 `'gut'`,`'brain'`
- [ ] gut 欄位正確：name='腸道'、spawnIntervalMult=0.7、enemyHpMult=0.8
- [ ] brain 欄位正確：name='腦'、spawnIntervalMult=1.2、enemyHpMult=1.4

## World 以新地圖建構
- [ ] 以 gut 建構：mapSpawnIntervalMult=0.7、mapEnemyHpMult=0.8
- [ ] 以 brain 建構：mapSpawnIntervalMult=1.2、mapEnemyHpMult=1.4

## 呈現層（實機目視）
- [ ] 主選單角色列出現「肥大細胞」、地圖列出現「腸道」「腦」（自動帶出，無選單程式改動）
- [ ] 肥大細胞玩家圓為洋紅色、造型為含顆粒圓形 + 一圈短偽足
- [ ] 腸道背景為暖橙地貌、腦背景為冷藍紫地貌
- [ ] 腸道與腦各播放可辨識的不同背景音樂
- [ ] CHARACTER_ICONS.mastcell 圖示於選單/HUD/升級彈窗正常顯示

## 確定性與架構邊界
- [ ] 新內容只改起始狀態與視覺，之後全走 seeded rng；相同 seed+角色+地圖+操作 → 相同結果
- [ ] characterDefs.ts / mapDefs.ts / World 無 Vue/Pinia 執行期 import；模擬中不呼叫 Math.random()
- [ ] 固定步長 1/60 不變；store/Summary/MainMenu/Leaderboard 程式碼不變
- [ ] noiseBackground 對 gut/brain 有對應分支、不崩潰；startMusic 對未知 map 仍回退 vessel
- [ ] Game.stop() / PixiRenderer.destroy() / noiseBackground.destroy() 維持冪等

## 驗證快照
- [ ] 單元測試（Vitest）全數通過（含新增：mastcell 起始套用、gut/brain 難度修正）
- [ ] 型別檢查（vue-tsc）乾淨
- [ ] Production build 乾淨
- [ ] 實機煙霧測試：肥大細胞可選且洋紅造型 + 發炎起手；腸道/腦可選且各有背景與音樂
- [ ] progress.md 已更新
