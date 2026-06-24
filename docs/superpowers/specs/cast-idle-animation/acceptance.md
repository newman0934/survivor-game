# Acceptance — 隊伍動態生命感（B2）

本檔為本功能完成與否的**唯一驗收來源**。所有項目通過才得標記為完成。
（純 renderer 動畫屬呈現層、不寫單元測試；以 typecheck/build + 瀏覽器實機（看動態）驗證；既有 181 測試維持全綠、引擎/store 零改動。）

_驗證日期：（待填）_

## 相位 + animate 架構
- [ ] `Sprite` 結構新增 `phase`（建立時 Math.random()*2π）
- [ ] `animate` 依 entity 種類疊加待機 transform（與既有旋轉/縮放疊加，走 clock + phase）
- [ ] 待機 transform 僅套 `s.root`，不重畫造型

## 各 entity 動態性格
- [ ] 玩家：呼吸擠壓拉伸 + 朝向微搖擺
- [ ] 病毒：呼吸脈動 + 小幅 wobble 旋轉
- [ ] 細菌：游動抖擺 + 微 bob；孢子：極緩呼吸；螺旋菌：朝速度 + 蠕動脈動
- [ ] 噴吐病原：鼓脹蓄勢；分裂菌：較強脈動；自爆體：緊張快脈動 + 抖動；超級病原：沉重大脈動 + 微搖擺

## 不變項（硬性）
- [ ] 只動 `PixiRenderer.ts`；引擎/模擬/ World / store / sprites.ts 零改動
- [ ] 待機 transform 不影響碰撞（碰撞用 entity.pos）；命中閃白/相機/震動相容
- [ ] 既有 181 單元測試全綠

## 驗證快照（完成時填寫）
- [ ] 型別檢查（vue-tsc）乾淨
- [ ] Production build 乾淨
- [ ] 單元測試全綠（181，不新增/不破壞）
- [ ] 實機驗證（瀏覽器）：玩家/各病原有待機動態且相位錯開、幅度克制不暈眩、可讀性與瞄準不受影響、FPS 正常、0 功能相關 console error
- [ ] progress.md 已更新
