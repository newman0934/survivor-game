# language: zh-TW
功能: Bloom 開關（bloom-toggle）
  作為玩家
  我希望泛光在手機與電腦都能開、並可自行切換
  以便依裝置與喜好調整畫面精緻度與效能

  背景:
    假設 遊戲已載入

  # Happy Path
  場景: 兩平台預設開啟 bloom
    假設 尚無已儲存的設定
    當 開始一場遊戲（手機或電腦）
    那麼 bloom 預設為開啟
    並且 色彩分級與暈影始終保留

  # Happy Path
  場景: 暫停選單即時切換 bloom
    假設 遊戲進行中且 bloom 為開
    當 我暫停並點「泛光：開」切為關
    那麼 畫面發光明顯變弱、後製重建為僅色彩分級+暈影
    當 我再次切回開
    那麼 bloom 即時恢復

  # Happy Path
  場景: 設定跨場次記住
    假設 我把 bloom 切為關
    當 我重新整理瀏覽器或開新的一場
    那麼 bloom 仍為關（沿用上次選擇）

  # Error Handling
  場景: 無設定或壞資料回預設
    假設 localStorage 無設定或資料毀損
    當 載入設定
    那麼 回傳預設（bloom: true）
    並且 不丟出例外

  # Error Handling
  場景: 寫入失敗不影響遊玩
    假設 localStorage 寫入失敗（無痕/配額滿）
    當 我切換 bloom
    那麼 切換在本次仍即時生效
    並且 不丟出例外、不影響遊玩

  # Boundary Conditions
  場景: 切換不影響確定性
    當 我於遊戲中切換 bloom
    那麼 模擬與隨機序列不受影響
    並且 僅後製濾鏡重建

  # Boundary Conditions
  場景: 濾鏡建立失敗安全退回
    假設 後製濾鏡建立失敗
    當 渲染或切換 bloom
    那麼 退回正常渲染、不崩潰
