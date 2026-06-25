# language: zh-TW
功能: 遊戲中暫停選單（pause-menu）
  作為玩家
  我希望遊戲中能隨時暫停並選擇繼續/重新開始/回主選單
  以便中途離開或思考，不必死亡或硬退

  背景:
    假設 已開始一場遊戲且 phase 為 'playing'

  # Happy Path
  場景: ESC 暫停與恢復
    當 我按下 ESC
    那麼 phase 變為 'paused'、顯示暫停選單、敵人與模擬凍結
    當 我再次按下 ESC
    那麼 phase 回到 'playing'、選單消失、模擬恢復

  # Happy Path
  場景: 暫停鈕暫停（含行動端）
    假設 戰鬥中右上角顯示暫停鈕
    當 我點擊暫停鈕
    那麼 phase 變為 'paused' 並顯示暫停選單

  # Happy Path
  場景: 繼續
    假設 phase 為 'paused'
    當 我點「繼續」
    那麼 phase 回到 'playing' 並從原狀態續跑

  # Happy Path
  場景: 重新開始（同角色/地圖）
    假設 phase 為 'paused'
    當 我點「重新開始」
    那麼 以同角色與地圖開新的一場
    並且 本場不被記錄為一場戰績/死亡

  # Happy Path
  場景: 回主選單
    假設 phase 為 'paused'
    當 我點「回主選單」
    那麼 回到主選單可重選角色/地圖
    並且 本場不被記錄為一場戰績/死亡

  # Validation Failure（guard）
  場景: 非遊玩狀態不可暫停
    假設 phase 為 'upgrading'
    當 我按下 ESC
    那麼 不進入暫停、必須先完成升級選擇
    並且 升級中不顯示暫停鈕

  # Boundary Conditions
  場景: 暫停不影響確定性
    當 我暫停一段時間後恢復
    那麼 模擬從暫停前的狀態無縫續跑
    並且 不因暫停改變隨機序列或結果

  # Boundary Conditions
  場景: 連續快速切換
    當 我快速連按 ESC 多次
    那麼 phase 在 playing/paused 間正確切換、不卡死

  # Boundary Conditions（可及性）
  場景: 減少動態偏好
    假設 使用者系統設定 prefers-reduced-motion: reduce
    當 暫停選單出現
    那麼 沿用既有 fade 行為、不出現額外位移動畫
    並且 按鈕焦點環可見
