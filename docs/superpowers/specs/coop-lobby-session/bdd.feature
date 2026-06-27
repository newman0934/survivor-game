# language: zh-TW
功能: 連線會話抽象 + 主選單多人分層 + 等待室（多人合作 4B-1）
  作為玩家
  我希望能建立/加入房間並在等待室就緒
  以便房主開始一場多人合作（真連線屬 4C）

  背景:
    假設 使用 LoopbackSession（行程內，真 Playroom 屬 4C）

  # ---------- LoopbackSession ----------
  場景: 建立房間者為房主
    當 建立 LoopbackSession
    那麼 isHost() 為 true
    並且 players() 含本地玩家一人

  場景: 玩家上限 4
    假設 已有 4 名玩家
    當 addFakePlayer 再加一人
    那麼 該加入被略過、players() 仍為 4

  場景: 設定角色與就緒
    當 setCharacter('neutrophil') 並 setReady(true)
    那麼 本地玩家 character 為 neutrophil、ready 為 true
    並且 onChange 回呼被觸發

  場景: 房主設定地圖
    當 房主 setMap('stomach')
    那麼 getMap() 為 stomach

  場景: 開始條件
    假設 房主
    當 僅 1 人或有人未就緒
    那麼 canStart() 為 false
    當 ≥2 人且全員就緒
    那麼 canStart() 為 true

  場景: 房主開始觸發 onStart
    假設 canStart() 為 true 且已註冊 onStart
    當 start(種子)
    那麼 onStart 以 (種子, 地圖, 玩家列表) 被呼叫

  場景: 非開始條件時 start 無效
    假設 canStart() 為 false
    當 start(種子)
    那麼 onStart 不被呼叫

  # ---------- 流程 / UI（實機目視） ----------
  場景: 主選單單人/多人分層
    假設 玩家在主選單
    那麼 可選單人遊玩（現有流程）或多人遊玩

  場景: 建立/加入進等待室
    當 建立或加入房間
    那麼 store.phase 為 'lobby'
    並且 等待室顯示玩家列表、角色、就緒、房間碼

  # ---------- 單人零退化 ----------
  場景: 單人不經 session
    假設 玩家選單人遊玩
    那麼 走既有 startGame、不建立 NetSession
    並且 單人行為與現況一致

  # ---------- Authorization（單機前端，無權限層） ----------
  場景: 無權限概念
    假設 私房合作、無權威防護（設計 Non-Goal）
    那麼 不存在需要授權檢查的操作
    並且 此分類標記為 N/A
