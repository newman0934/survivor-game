# Acceptance — 隊伍動態生命感（B2）

本檔為本功能完成與否的**唯一驗收來源**。所有項目通過才得標記為完成。
（純 renderer 動畫屬呈現層、不寫單元測試；以 typecheck/build + 瀏覽器實機（看動態）驗證；既有 181 測試維持全綠、引擎/store 零改動。）

_驗證日期：2026-06-25（typecheck/build/181 測試 + 瀏覽器實機渲染驗證通過；動態為逐幀微動畫）_

## 相位 + animate 架構
- [x] `Sprite` 結構新增 `phase`（建立時 Math.random()*2π）
- [x] `animate` 依 entity 種類疊加待機 transform（與既有旋轉/縮放疊加，走 clock + phase）
- [x] 待機 transform 僅套 `s.root`，不重畫造型

## 各 entity 動態性格
- [x] 玩家：呼吸擠壓拉伸 + 朝向微搖擺
- [x] 病毒：呼吸脈動 + 小幅 wobble 旋轉
- [x] 細菌：游動抖擺 + 朝速度；孢子：極緩呼吸；螺旋菌：朝速度 + 蠕動脈動
- [x] 噴吐病原：鼓脹蓄勢；分裂菌：較強脈動；自爆體：緊張快脈動 + 抖動；超級病原：沉重大脈動 + 微搖擺

## 不變項（硬性）
- [x] 只動 `PixiRenderer.ts`；引擎/模擬/ World / store / sprites.ts 零改動
- [x] 待機 transform 不影響碰撞（碰撞用 entity.pos）；命中閃白/相機/震動相容
- [x] 既有 181 單元測試全綠

## 驗證快照（完成時填寫）
- [x] 型別檢查（vue-tsc）乾淨
- [x] Production build 乾淨
- [x] 單元測試全綠（181，不新增/不破壞）
- [x] 實機驗證（瀏覽器）：各單位待機動態（呼吸/搖擺/擠壓/抖動）相位錯開、渲染乾淨無破圖、幅度克制、可讀性與瞄準不受影響、FPS 正常（2026-06-25 確認）
- [x] progress.md 已更新
