# language: zh-TW
功能: UI 精修地基 — 免疫膜質面板語言與展示字體（D1）
  作為玩家
  我希望主選單、升級彈窗、結算與排行榜有一致且精緻的介面
  以便獲得與遊戲畫面相稱的高級感體驗

  背景:
    假設 遊戲已載入且全域樣式（設計 token、字體、共用按鈕類別）已套用

  # Happy Path
  場景: 主選單套用免疫膜質面板
    當 phase 為 'menu' 顯示主選單
    那麼 內容應包在毛玻璃遮罩與發光膜質面板中
    並且 標題與統計數字應使用 Chakra Petch 展示字體
    並且 「開始遊戲」「排行榜」按鈕應使用共用按鈕類別樣式
    並且 角色/地圖選擇與開始/排行榜事件行為維持不變

  # Happy Path
  場景: 升級彈窗套用面板語言且功能不變
    當 phase 為 'upgrading' 顯示升級彈窗
    那麼 標題、loadout 持有區與三張升級卡應呈現於膜質面板中
    並且 點擊任一升級卡仍會送出該升級並恢復遊戲

  # Happy Path
  場景: 結算與排行榜一致呈現
    當 顯示結算畫面或排行榜
    那麼 兩者皆使用相同的 Overlay/Panel 視覺語言與共用按鈕
    並且 結算的再玩一次/回主選單、排行榜的關閉事件維持不變

  # Validation Failure（樣式退化防呆）
  場景: 瀏覽器不支援 backdrop-filter
    假設 瀏覽器不支援 backdrop-filter
    當 顯示任一 overlay
    那麼 面板退回不透明深色面
    並且 面板內所有文字與按鈕仍清楚可讀

  # Boundary Conditions
  場景: 行動寬度下面板可用且效能從簡
    假設 視窗寬度小於等於 600px
    當 顯示任一 overlay
    那麼 面板 blur 強度降低以顧效能
    並且 既有行動版版面行為（卡片縮放、升級卡垂直、表格可橫捲）維持不變
    並且 內容超出時面板可捲動、不溢出視窗

  # Boundary Conditions
  場景: 內容過長時面板自適應
    當 排行榜為滿筆、或 loadout 持有滿級多列、或結算多行破紀錄
    那麼 面板高度自適應
    並且 超出可視高度時可捲動且不破版

  # Error Handling
  場景: 展示字體尚未載入或載入失敗
    假設 Chakra Petch 尚未載入完成或載入失敗
    當 顯示任一 overlay
    那麼 文字以系統字體立即顯示（font-display: swap，無隱形文字）
    並且 載入完成後拉丁字元換成 Chakra Petch

  # Boundary Conditions（可及性）
  場景: 使用者偏好減少動態
    假設 使用者系統設定 prefers-reduced-motion: reduce
    當 與按鈕互動或 overlay 進場
    那麼 位移/縮放動畫關閉
    並且 仍提供必要的狀態與焦點回饋
