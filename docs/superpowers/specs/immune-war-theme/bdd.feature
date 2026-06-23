# language: zh-TW
功能: 免疫大戰主題化（換皮 + 主要類別代號改名）
  作為玩家
  我希望遊戲呈現「免疫細胞 vs 病原體」的免疫主題
  以獲得鮮明且原創的識別，同時玩法與平衡完全不變

  背景:
    假設 遊戲已完成階段 0–4 的核心循環與美術
    而且 本次僅做換皮與主要類別代號改名，不新增任何玩法機制

  場景: Happy Path — 主選單呈現免疫主題的角色與場景
    假設 玩家開啟主選單
    當 玩家瀏覽角色與地圖選項
    那麼 角色顯示為「巨噬細胞 / 嗜中性球 / NK 細胞 / 樹突細胞」
    而且 地圖顯示為「血管 / 胃 / 肺泡」並保留各自難度描述
    而且 選項數量與原本一致（4 角色、3 地圖）

  場景: Happy Path — 遊玩呈現免疫主題造型與特效配色
    假設 玩家以任一免疫細胞於任一人體場景開始遊戲
    當 病原大軍生成並被擊殺、玩家撿取抗原碎片、升級
    那麼 敵人呈現病毒/細菌/孢子/螺旋菌/超級病原造型
    而且 場景背景呈現對應人體部位（血漿與紅血球 / 胃黏膜酸泡 / 肺泡氣囊）
    而且 收集閃光為抗原黃、升級光環為免疫藍綠
    而且 升級卡顯示主題化武器與被動道具名稱（抗體 / 補體環 / 細胞激素…）

  場景: Boundary Conditions — 代號改名後全專案 0 殘留
    假設 四類主要代號已改名（EnemyKind/WeaponKind/CharacterKind/MapKind）
    當 對全專案搜尋舊代號程式識別字串（basic/swarm/tank/charger/boss、wand/knife/bible/garlic、warrior/ranger/mage/harvester、plains/lava/tundra）
    那麼 不存在任何作為程式識別用途的舊字串殘留
    而且 型別檢查（vue-tsc）乾淨、production build 乾淨

  場景: Boundary Conditions — 被動道具代號保留、僅標籤主題化
    假設 被動道具系統存在 10 種道具
    當 檢視 PASSIVE_DEFS
    那麼 內部代號維持 spinach/tome/bracer/wings/magnet/candle/heart/tomato/armor/crown
    而且 顯示標籤改為免疫主題（細胞激素 / 干擾素 / 趨化因子…），括號內效果說明保留

  場景: Error Handling — 預設參數同步改名後可正常啟動
    假設 World 與 Game 的預設角色與地圖代號已改名為 macrophage / vessel
    當 以預設參數開始一場遊戲
    那麼 遊戲正常啟動、不拋出未知代號相關錯誤
    而且 0 功能相關 console error

  場景: Validation Failure — 玩法與平衡不得改變（回歸保護）
    假設 改名與換皮完成
    當 執行既有單元測試（122）
    那麼 全部通過（僅斷言中的識別字串隨改名同步，行為序列與數值不變）

  場景: Authorization / 確定性不變
    假設 同一個亂數 seed
    當 在改名前後各跑相同步數的模擬
    那麼 生怪種類序列（語意相同）、位置、掉落與結果一致
    而且 改名與換皮不引入任何 Math.random() 或新隨機分支
