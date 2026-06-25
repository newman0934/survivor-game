# language: zh-TW
功能: HUD / 戰鬥內 UI 精修（D3）
  作為玩家
  我希望戰鬥中的 HUD 精緻且資訊清楚（角色、持有、血量、經驗）
  以便沉浸於與遊戲畫面相稱的體驗並掌握戰況

  背景:
    假設 D1 設計 token/字體與 D2 圖示系統已可用
    並且 角色圖示 registry 已涵蓋全部 4 角色

  # Happy Path
  場景: 左上頭像顯示角色與等級
    當 以某角色開始遊戲
    那麼 左上頭像框顯示該角色的圖示與主題色發光邊
    並且 頭像顯示目前 Lv，升級時 Lv 更新

  # Happy Path
  場景: 左下持有列從開賽即顯示
    當 遊戲開始（尚未升級）
    那麼 左下持有列顯示起始武器圖示
    當 升級取得新武器或被動
    那麼 持有列新增對應圖示，進化武器顯示金邊

  # Happy Path
  場景: 血條/經驗條光澤分段與數值
    當 遊玩中血量或經驗變化
    那麼 血條顯示目前/最大數值與分段光澤，經驗條顯示升級進度
    並且 受傷時紅閃、升級時脈動仍作用

  # Happy Path
  場景: BossBar 與靜音鈕質感統一
    當 場上出現 Boss
    那麼 BossBar 以膜質凹槽 + 紫色光澤 + Chakra Petch 標題呈現、低血脈動
    並且 靜音鈕為膜質小鈕、hover/focus 有主題回饋且可切換靜音

  # Boundary Conditions
  場景: HUD 不擋戰鬥操作
    當 HUD 各元件顯示
    那麼 除靜音鈕外皆 pointer-events none
    並且 不影響玩家移動/攻擊/碰撞與確定性

  # Boundary Conditions
  場景: 行動寬度不破版
    假設 視窗寬度小於等於 600px
    當 顯示 HUD
    那麼 頭像/持有列/血條/BossBar 縮放或換行、不溢出、不擋中央戰鬥

  # Boundary Conditions（完整性）
  場景: 角色圖示完整性
    假設 新增了一個角色 kind 但忘了補圖示
    那麼 TS Record 編譯期報錯
    並且 完整性單元測試失敗

  # Error Handling
  場景: 未知角色安全退回
    當 store.character 為未知值
    那麼 頭像退回預設角色圖示
    並且 不丟出例外

  # Boundary Conditions（可及性）
  場景: 減少動態偏好
    假設 使用者系統設定 prefers-reduced-motion: reduce
    當 HUD 動畫（脈動/紅閃/Boss 低血）觸發
    那麼 位移/脈動動畫關閉
    並且 仍提供必要的狀態與焦點回饋
