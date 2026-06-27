# language: zh-TW
功能: 本地玩家管線 + 多人升級浮層（多人合作 3）
  作為開發者
  我希望引擎/UI 跟隨「本地玩家 index」而非寫死 players[0]，並有多人非阻塞升級浮層
  以便為 SP4 連線鋪路，且單人零退化

  背景:
    假設 遊戲以固定種子開始

  # ---------- World 視角化 ----------
  場景: summary 依玩家 index
    當 以兩玩家建立 World 並讓玩家 1 升級
    那麼 summary(1).level 為玩家 1 的等級
    並且 summary(0).level 為玩家 0 的等級

  場景: 省略 index 等同 players[0]（向後相容）
    當 呼叫 summary() 與 summary(0)
    那麼 兩者相同
    並且 既有 summary 測試行為不變

  場景: loadoutSnapshot 依玩家 index
    當 兩玩家起始武器不同（巨噬 antibody / 嗜中性球 perforin）
    那麼 loadoutSnapshot(0) 武器含 antibody
    並且 loadoutSnapshot(1) 武器含 perforin

  # ---------- 多人升級浮層 ----------
  場景: 多人本地玩家有待選時推給 store
    假設 多人、本地玩家 index 與其待選卡
    當 Game 迴圈推送
    那麼 store.multiOffer 為該玩家待選的 {id,label}[]
    並且 store.multiOfferTimeLeft 為剩餘秒

  場景: 點卡套用該升級
    假設 store.multiOffer 有卡
    當 pickMultiUpgrade(某 id)
    那麼 觸發 onMultiUpgradePicked → world.chooseUpgrade(localPlayerIndex, id)

  場景: 浮層非阻塞
    假設 多人浮層顯示中
    那麼 世界持續推進、玩家可移動（不暫停）

  # ---------- 單人零退化 ----------
  場景: 單人不顯示多人浮層
    假設 單一玩家（playerCount 1）
    當 升級
    那麼 store.multiOffer 為 null（不推送）
    並且 走既有暫停 UpgradeModal 流程

  場景: 單人渲染/摘要不變
    假設 單人、localPlayerIndex 預設 0
    那麼 render(world)/summary()/loadoutSnapshot() 行為與現況一致

  # ---------- 渲染 ----------
  場景: 渲染全部玩家、鏡頭跟本地
    假設 多人
    那麼 畫面渲染每位玩家 entity（各自 color/character）
    並且 鏡頭中心為 players[localPlayerIndex]

  # ---------- Boundary ----------
  場景: localPlayerIndex 越界防呆
    當 render/summary 收到不存在的 index
    那麼 安全退回 players[0] 或略過、不崩潰

  # ---------- Authorization（單機前端，無權限層） ----------
  場景: 無權限概念
    假設 本功能為純前端引擎/UI（網路屬 SP4）
    那麼 不存在需要授權檢查的操作
    並且 此分類標記為 N/A
