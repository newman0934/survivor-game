# Acceptance — 免疫大戰主題化（Immune War Re-theme）

本檔為本功能完成與否的**唯一驗收來源**。所有項目通過才得標記為完成。
（引擎邏輯改名以單元測試保護；造型 / 背景 / 特效配色以實機目視驗證。）

_驗證日期：（完成時填寫）_

## 主要類別代號改名（全專案一致）
- [ ] `EnemyKind`：basic→virus、swarm→bacteria、tank→spore、charger→spiral、boss→superbug
- [ ] `WeaponKind`：wand→antibody、knife→perforin、bible→complement、garlic→inflammation
- [ ] `CharacterKind`：warrior→macrophage、ranger→neutrophil、mage→nkcell、harvester→dendritic
- [ ] `MapKind`：plains→vessel、lava→stomach、tundra→lung
- [ ] `*_DEFS` 物件鍵、`*_ORDER` 值、所有 `Record<XxxKind,…>` 與引用點同步改名
- [ ] systems / World / sprites / PixiRenderer 內所有比較 / switch / 索引同步改名
- [ ] `World`、`Game` 預設角色（macrophage）與地圖（vessel）代號同步
- [ ] 全專案搜尋舊代號程式識別字串 0 殘留

## 被動道具（保留代號、改標籤）
- [ ] `PassiveKind` 內部代號維持 spinach/tome/bracer/wings/magnet/candle/heart/tomato/armor/crown
- [ ] 10 種標籤改為免疫主題（細胞激素 / 干擾素 / 趨化因子 / 偽足 / 受體 / 組織胺 / 幹細胞 / 生長因子 / 細胞膜 / 記憶細胞），效果說明保留

## 顯示名稱 / 描述主題化
- [ ] 角色名：巨噬細胞 / 嗜中性球 / NK 細胞 / 樹突細胞（描述沿用數值定位）
- [ ] 武器名：抗體 / 穿孔素飛鏢 / 補體環 / 發炎場
- [ ] 地圖名：血管（標準）/ 胃（困難）/ 肺泡（簡單），description 沿用難度語意

## 造型重繪（sprites.ts）
- [ ] 玩家細胞：細胞膜輪廓 + 細胞核 + 顆粒/偽足分層，各角色以核形/膜色區分
- [ ] 病毒（多刺殼）/ 細菌（帶鞭毛桿菌）/ 真菌孢子（厚壁圓孢）/ 螺旋菌（螺旋體）/ 超級病原（巨型脈動團塊）
- [ ] 抗體 / 穿孔素飛鏢 / 補體環 / 發炎場（ROS）造型主題化
- [ ] 經驗寶石 → 抗原碎片（偏黃，與升級藍綠特效區隔）
- [ ] 既有立體分層、命中閃白、動畫 transform、相機跟隨照舊

## 地圖背景重繪
- [ ] 血管：暗紅血漿 + 漂浮紅血球/血小板
- [ ] 胃：胃黏膜皺褶 + 酸泡脈動
- [ ] 肺泡：藍灰氣囊群 + 緩慢氣流
- [ ] 沿用 `bgHash` 確定性座標 + renderer clock 氛圍動畫

## 特效配色主題化（effects.ts）
- [ ] 擊殺碎屑沿用敵色（自動帶到）
- [ ] 收集閃光 → 抗原黃
- [ ] 升級光環 → 免疫藍綠
- [ ] 受傷紅暈 / 傷害數字 / 鏡頭震動機制不變

## 不變項（硬性）
- [ ] 模擬 / 碰撞 / 生怪曲線 / 難度倍率 / 數值與平衡 / 升級握手 / store / Summary / 音效語意事件不變
- [ ] Game.stop() / PixiRenderer.destroy() / EffectsLayer.destroy() 冪等
- [ ] 確定性：相同 seed 結果不變；未引入任何 Math.random() 或新隨機分支

## 驗證快照（完成時填寫）
- [ ] 既有單元測試（Vitest）全數維持通過（122；斷言識別字串隨改名同步）
- [ ] 型別檢查（vue-tsc）乾淨
- [ ] Production build 乾淨
- [ ] 實機驗證：主選單 / 遊玩 / 升級 / 三地圖皆呈現免疫主題、玩法與平衡無變化、FPS 正常、0 功能相關 console error
- [ ] progress.md 已更新
