# language: zh-TW
功能: Boss 敵人
  作為玩家
  我希望每隔一段時間面對一隻強大的 Boss 並看到牠的血條
  以便獲得階段性的高張力挑戰與豐厚獎勵

  背景:
    假設 遊戲以固定種子開始
    並且 場上的隨機皆使用該局 seeded rng

  # ---------- Happy Path ----------
  場景: Boss 在時間里程碑出現
    假設 遊戲開始
    當 遊戲時間推進到 60 秒
    那麼 場上出現一隻 enemyKind 為 boss 的敵人

  場景: Boss 隨次數變強
    假設 已生成過第一隻 Boss
    當 生成第二隻 Boss
    那麼 第二隻 Boss 的 maxHp 大於第一隻

  場景: 擊殺 Boss 掉落大量經驗
    假設 場上一隻 Boss 的 hp 被打到 0
    當 World 結算該格
    那麼 該 Boss 失效、擊殺數 +1
    並且 原地掉落一顆經驗值為 50 的寶石

  場景: Boss 巨型且直線追擊玩家
    假設 一隻 Boss 位於玩家右側
    當 推進一個固定步長
    那麼 該 Boss 的速度方向朝向玩家
    並且 其半徑明顯大於一般敵人

  # ---------- Boss 血條 ----------
  場景: Boss 存在時 summary 反映血條資料
    假設 場上存在一隻 Boss
    當 取得遊戲 summary
    那麼 bossActive 為真
    並且 bossHp 等於該 Boss 目前 hp（取整）
    並且 bossMaxHp 等於該 Boss 的 maxHp

  場景: 無 Boss 時血條資料歸零
    假設 場上沒有任何 Boss
    當 取得遊戲 summary
    那麼 bossActive 為假
    並且 bossHp 與 bossMaxHp 皆為 0

  # ---------- Boundary Conditions ----------
  場景: 一般生怪永不選到 Boss
    假設 遊戲時間為任意值（含極大值）
    當 pickEnemyKind 連續選種多次
    那麼 不會選到 boss

  # ---------- Error Handling / Regression ----------
  場景: Boss 計時器與一般生怪計時器互不干擾
    假設 遊戲進行中
    當 兩個計時器各自倒數
    那麼 一般敵人持續生成
    並且 Boss 仍依自身週期獨立生成

  場景: 武器命中 Boss 正常結算傷害
    假設 一發投射物命中 Boss
    當 World 結算該格
    那麼 Boss 的 hp 依投射物傷害減少

  # ---------- Determinism ----------
  場景: 相同種子產生相同 Boss 生成位置序列
    假設 兩局使用相同 seed 並推進相同步數
    當 比較兩局 Boss 的生成位置
    那麼 兩局序列完全一致

  # ---------- Authorization（單機前端，無權限層） ----------
  場景: 無權限概念
    假設 本功能為純前端單機遊戲
    那麼 不存在需要授權檢查的操作
    並且 此分類標記為 N/A
