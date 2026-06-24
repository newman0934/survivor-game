# language: zh-TW
功能: 升級彈窗顯示目前持有與進化提示
  作為玩家
  我希望在升級時看到自己持有的武器/被動與各武器的進化條件
  以便規劃 build、避免盲選導致後期卡死

  背景:
    假設 升級彈窗於提供升級選項時顯示
    而且 引擎在提供選項時推一份持有快照（loadoutSnapshot）給 store
    而且 進化條件判定與 leveling.buildCandidates 一致

  # Happy Path
  場景: 升級時顯示持有武器與被動及等級
    假設 玩家持有抗體 Lv5 與發炎場 Lv3、被動干擾素 Lv2
    當 升級彈窗出現
    那麼 持有區顯示「抗體 Lv5（MAX）」「發炎場 Lv3」與「干擾素 Lv2」

  場景: 滿級且持有所需被動的武器顯示可進化
    假設 抗體已 Lv5 且玩家持有干擾素被動
    當 升級彈窗出現
    那麼 抗體的進化提示為「可進化！」

  場景: 缺對應被動的滿級武器顯示所需被動
    假設 抗體已 Lv5 但玩家未持有干擾素被動
    當 升級彈窗出現
    那麼 抗體的進化提示為「進化需：滿級＋干擾素（攻速）」

  場景: 已進化武器顯示進化名與標記
    假設 玩家的抗體已進化
    當 升級彈窗出現
    那麼 持有區顯示進化名「抗體風暴」與「★ 已進化」

  # 進化狀態純函式（evolutionStatus）
  場景: evolutionStatus 回傳 evolved
    假設 一把 evolved 為 true 的武器
    當 呼叫 evolutionStatus
    那麼 回傳 'evolved'

  場景: evolutionStatus 回傳 ready
    假設 一把滿級、未進化的抗體且 ownedPassives 含 tome
    當 呼叫 evolutionStatus
    那麼 回傳 'ready'

  場景: evolutionStatus 回傳 pending（未滿級或缺被動）
    假設 一把未滿級的抗體，或滿級但 ownedPassives 不含 tome
    當 呼叫 evolutionStatus
    那麼 回傳 'pending'

  # 快照
  場景: loadoutSnapshot 反映目前武器與被動
    假設 World 持有抗體 Lv5（已進化）與被動干擾素 Lv2
    當 呼叫 world.loadoutSnapshot()
    那麼 weapons 含 { kind: 'antibody', level: 5, evolved: true }
    而且 passives 含 { kind: 'tome', level: 2 }

  # 不變項
  場景: 不影響既有模擬與測試
    假設 新增持有顯示功能
    當 推進模擬
    那麼 武器/被動數值與行為不變
    而且 既有 168 單元測試全綠
