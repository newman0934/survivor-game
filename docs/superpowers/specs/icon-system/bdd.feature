# language: zh-TW
功能: 主題圖示系統 — 武器/被動 SVG 圖示套用升級彈窗（D2）
  作為玩家
  我希望升級時每個武器/被動與選項都有可辨識的圖示
  以便快速辨識持有與選擇，不再純文字盲選

  背景:
    假設 圖示 registry 已涵蓋全部 7 武器與 10 被動
    並且 GameIcon 元件與 resolveOptionIcon 解析器可用

  # Happy Path
  場景: loadout 持有區顯示武器/被動圖示
    當 升級彈窗開啟且已持有武器與被動
    那麼 每個武器列名稱前顯示該武器的主題色圖示
    並且 每個被動列名稱前顯示該被動的主題色圖示
    並且 既有名稱/等級/進化提示維持不變

  # Happy Path
  場景: 升級選項卡顯示對應圖示
    當 升級彈窗顯示三選一選項
    並且 某選項 id 為 "unlock:antibody"、"levelup:nova"、"evolve:cascade"、"passunlock:heart" 或 "passlvl:tome"
    那麼 該卡片顯示對應武器或被動的圖示
    並且 點擊卡片仍送出該升級並恢復遊戲

  # Validation Failure / Error Handling
  場景: 無對應圖示的選項維持純文字
    當 某升級選項 id 為 "heal" 或其他未對應 kind 的 id
    那麼 resolveOptionIcon 回傳 null
    並且 該卡片以純文字呈現、不顯示圖示、不破版

  # Boundary Conditions
  場景: registry 完整性（編譯期 + 執行期雙重保證）
    假設 新增了一個武器或被動 kind 但忘了補圖示
    那麼 TS Record 型別在編譯期報錯
    並且 完整性單元測試在執行期失敗

  # Boundary Conditions
  場景: 無 placeholder 圖示
    當 檢查每個 IconDef
    那麼 paths 陣列非空且每條 d 為非空字串
    並且 color 符合 #rrggbb 格式

  # Boundary Conditions
  場景: 行動寬度下圖示與文字並排不破版
    假設 視窗寬度小於等於 600px 且升級卡垂直堆疊
    當 顯示 loadout 與升級卡
    那麼 圖示與文字並排、不溢出、不擠壓既有排版

  # Error Handling
  場景: 解析器對未知前綴安全回 null
    當 以未知前綴或空字串呼叫 resolveOptionIcon
    那麼 回傳 null
    並且 不丟出例外
