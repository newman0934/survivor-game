# Acceptance — 免疫大戰主題化（Immune War Re-theme）

本檔為本功能完成與否的**唯一驗收來源**。所有項目通過才得標記為完成。
（引擎邏輯改名以單元測試保護；造型 / 背景 / 特效配色以實機目視驗證。）

_驗證日期：2026-06-24（程式/型別/build/單元測試/殘留掃描全通過；實機目視待玩家確認）_

## 主要類別代號改名（全專案一致）
- [x] `EnemyKind`：basic→virus、swarm→bacteria、tank→spore、charger→spiral、boss→superbug
- [x] `WeaponKind`：wand→antibody、knife→perforin、bible→complement、garlic→inflammation
- [x] `CharacterKind`：warrior→macrophage、ranger→neutrophil、mage→nkcell、harvester→dendritic
- [x] `MapKind`：plains→vessel、lava→stomach、tundra→lung
- [x] `*_DEFS` 物件鍵、`*_ORDER` 值、所有 `Record<XxxKind,…>` 與引用點同步改名
- [x] systems / World / sprites / PixiRenderer 內所有比較 / switch / 索引同步改名
- [x] `World`、`Game` 預設角色（macrophage）與地圖（vessel）代號同步
- [x] 全專案搜尋舊代號程式識別字串 0 殘留（`'boss'` 僅存 SoundEvent 4 處）

## 被動道具（保留代號、改標籤）
- [x] `PassiveKind` 內部代號維持 spinach/tome/bracer/wings/magnet/candle/heart/tomato/armor/crown
- [x] 10 種標籤改為免疫主題（細胞激素 / 干擾素 / 趨化因子 / 偽足 / 受體 / 組織胺 / 幹細胞 / 生長因子 / 細胞膜 / 記憶細胞），效果說明保留

## 顯示名稱 / 描述主題化
- [x] 角色名：巨噬細胞 / 嗜中性球 / NK 細胞 / 樹突細胞（描述沿用數值定位）
- [x] 武器名：抗體 / 穿孔素飛鏢 / 補體環 / 發炎場
- [x] 地圖名：血管（標準）/ 胃（困難）/ 肺泡（簡單），description 沿用難度語意

## 造型重繪（sprites.ts）
- [x] 玩家細胞：細胞膜輪廓 + 細胞核 + 顆粒/偽足分層，各角色以核形/膜色區分（程式到位，目視待確認）
- [x] 病毒（多刺殼）/ 細菌（帶鞭毛桿菌）/ 真菌孢子（厚壁圓孢）/ 螺旋菌（螺旋體）/ 超級病原（巨型脈動團塊）
- [x] 抗體 / 穿孔素飛鏢 / 補體環 / 發炎場（ROS）造型主題化
- [x] 經驗寶石 → 抗原碎片（偏黃，與升級藍綠特效區隔）
- [x] 既有立體分層、命中閃白、動畫 transform、相機跟隨照舊（未動）

## 地圖背景重繪
- [x] 血管：暗紅血漿 + 漂浮紅血球/血小板
- [x] 胃：胃黏膜皺褶 + 酸泡脈動
- [x] 肺泡：藍灰氣囊群 + 緩慢氣流
- [x] 沿用 `bgHash` 確定性座標 + renderer clock 氛圍動畫（未引入 Math.random）

## 特效配色主題化（effects.ts）
- [x] 擊殺碎屑沿用敵色（自動帶到）
- [x] 收集閃光 → 抗原黃（0xffd54a）
- [x] 升級光環 → 免疫藍綠（0x4dd0c0）
- [x] 受傷紅暈 / 傷害數字 / 鏡頭震動機制不變

## 不變項（硬性）
- [x] 模擬 / 碰撞 / 生怪曲線 / 難度倍率 / 數值與平衡 / 升級握手 / store / Summary / 音效語意事件不變
- [x] Game.stop() / PixiRenderer.destroy() / EffectsLayer.destroy() 冪等（未動）
- [x] 確定性：相同 seed 結果不變；未引入任何 Math.random() 或新隨機分支

## 驗證快照（完成時填寫）
- [x] 既有單元測試（Vitest）全數維持通過（122；斷言識別字串隨改名同步）
- [x] 型別檢查（vue-tsc）乾淨
- [x] Production build 乾淨
- [ ] 實機驗證：主選單 / 遊玩 / 升級 / 三地圖皆呈現免疫主題、玩法與平衡無變化、FPS 正常、0 功能相關 console error（**待玩家 `npm run dev` 目視確認**）
- [x] progress.md 已更新
