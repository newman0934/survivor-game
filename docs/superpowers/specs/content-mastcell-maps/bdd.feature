# language: zh-TW
功能: 新增肥大細胞角色與兩張地圖（gut／brain）
  作為玩家
  我希望多一個範圍清場角色與兩張新難度手感的地圖
  以便獲得新的開局走向與重玩體驗

  背景:
    假設 遊戲以固定種子開始

  # ---------- Happy Path：角色 ----------
  場景: 以肥大細胞開局套用其起始狀態
    當 以角色「mastcell」建立 World
    那麼 起始武器為發炎（inflammation）
    並且 player.maxHp 與 hp 等於 100
    並且 stats.areaMult 等於 1.3
    並且 stats.cooldownMult 等於 0.9
    並且 playerColor 等於 mastcell 的顏色（0xf06292）

  # ---------- Happy Path：地圖 ----------
  場景: 以腸道地圖開局套用難度修正
    當 以地圖「gut」建立 World
    那麼 spawnIntervalMult 等於 0.7
    並且 enemyHpMult 等於 0.8

  場景: 以腦地圖開局套用難度修正
    當 以地圖「brain」建立 World
    那麼 spawnIntervalMult 等於 1.2
    並且 enemyHpMult 等於 1.4

  # ---------- 呈現層（實機目視） ----------
  場景: 主選單顯示新角色與新地圖
    假設 玩家在主選單
    那麼 角色列出現「肥大細胞」卡
    並且 地圖列出現「腸道」與「腦」卡

  場景: 肥大細胞造型與顏色
    當 玩家以肥大細胞開局
    那麼 玩家圓為洋紅色
    並且 造型為含顆粒圓形 + 一圈短偽足

  場景: 新地圖各有背景與音樂
    當 玩家分別以腸道、腦開局
    那麼 腸道背景為暖橙地貌、腦背景為冷藍紫地貌
    並且 兩張各播放可辨識的不同背景音樂

  # ---------- Validation / 合法性 ----------
  場景: 新增定義欄位合法
    假設 mastcell 的 startWeapon 與 gut/brain 的數值欄位
    那麼 startWeapon 為合法 WeaponKind
    並且 spawnIntervalMult 與 enemyHpMult 為正數

  # ---------- Boundary Conditions ----------
  場景: 既有預設不受影響
    當 以 new World(seed) 建立（不傳角色與地圖）
    那麼 角色預設為 macrophage、地圖預設為 vessel
    並且 既有測試行為不變

  場景: 背景對新地圖不崩潰
    當 noiseBackground 以 gut 或 brain 建立
    那麼 有對應地貌分支
    並且 不丟出例外

  # ---------- Error Handling ----------
  場景: 未知地圖音樂回退
    當 startMusic 收到未對應的 map
    那麼 回退至 vessel 主題且不崩潰

  # ---------- Determinism ----------
  場景: 新內容不破壞確定性
    假設 兩局使用相同 seed、相同角色、相同地圖、相同操作
    當 比較模擬結果
    那麼 兩局一致（新內容只改起始狀態與視覺）

  # ---------- Authorization（單機前端，無權限層） ----------
  場景: 無權限概念
    假設 本功能為純前端單機遊戲
    那麼 不存在需要授權檢查的操作
    並且 此分類標記為 N/A
