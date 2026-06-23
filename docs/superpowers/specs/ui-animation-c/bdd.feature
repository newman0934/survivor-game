# language: zh-TW
功能: HUD/UI 動畫（C 批）
  作為玩家
  我希望 HUD、升級彈窗、Boss 血條、死亡結算與畫面轉場都有流暢的反饋動畫
  以獲得更好的戰鬥手感，同時資訊內容與玩法完全不變

  背景:
    假設 遊戲已完成免疫主題化與造型精緻化
    而且 本批僅加 UI 層動畫，不碰引擎/store/模擬

  場景: Happy Path — HUD 血條平滑填充與受傷紅閃
    假設 玩家在遊玩中
    當 經驗增加或血量減少
    那麼 經驗條/血條以平滑過渡變化而非硬跳
    而且 血量減少時血條出現一次紅色亮閃

  場景: Happy Path — 升級時 Lv 數字彈跳
    假設 玩家等級上升
    當 HUD 偵測到 store.level 增加
    那麼 Lv 數字播放一次縮放彈跳 + 短暫發光
    而且 連續升級時以最後一次重新觸發、不堆疊殘留

  場景: Happy Path — 升級彈窗錯落進場
    假設 phase 變為 upgrading
    當 升級彈窗顯示
    那麼 背景淡入、標題與三張卡片以錯落 slide-up + scale + fade 進場
    而且 卡片按壓有縮放反饋、點選送出升級 id 的行為不變

  場景: Happy Path — Boss 血條進場與低血脈動
    假設 Boss 出現
    當 Boss 血條顯示
    那麼 血條滑下淡入進場
    而且 當 Boss 血量低於 25% 時血條脈動發光
    而且 Boss 消失時血條淡出、不殘留

  場景: Happy Path — 死亡結算與 overlay 轉場
    假設 phase 變為 over
    當 死亡結算顯示
    那麼 背景淡入、內容縮放浮現
    而且 menu/upgrading/over overlay 之間切換時以淡入淡出轉場

  場景: Boundary Conditions — 重新開始無殘留
    假設 玩家在死亡結算按「再玩一次」
    當 phase 由 over 切換並重啟遊戲
    那麼 overlay 轉場正常、無殘留動畫狀態、引擎握手不受影響

  場景: Authorization / 無障礙 — 尊重 prefers-reduced-motion
    假設 使用者系統設定偏好減少動態
    當 觸發任何 UI 動畫時機
    那麼 進場/脈動/彈跳關閉或瞬時呈現
    而且 資訊內容與互動功能完全不受影響

  場景: Validation Failure — 引擎/store 不得改變（回歸保護）
    假設 C 批動畫完成
    當 執行既有單元測試（122）
    那麼 全部通過、型別檢查與 build 乾淨
