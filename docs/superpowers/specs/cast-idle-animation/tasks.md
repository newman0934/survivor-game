# Tasks — 隊伍動態生命感（cast-idle-animation / B2）

逐 task 執行；詳細步驟與完整程式碼見 `plan.md`。**建議 inline 執行**（動畫需瀏覽器看動態微調）。
（純 renderer 動畫屬呈現層、不寫單元測試；以 typecheck/build + 瀏覽器實機驗證。既有 181 測試須維持全綠、引擎/模擬/store/sprites.ts 零改動。）

- [ ] **Task 1：Sprite 相位 + animate 待機動畫 + 驗證** — `Sprite` 加 `phase`、`spriteFor` 設隨機相位；改寫 `animate` 依 entity 種類疊加待機 transform（玩家呼吸搖擺、病毒 wobble、細菌游動、孢子緩呼吸、螺旋蠕動、噴吐鼓脹、分裂鼓動、自爆緊張、超級沉重）；typecheck + `npm test`(181) + build + 瀏覽器看動態微調；更新 acceptance/progress。commit。

## 驗收門檻（全綠才算完成）
- `npm run typecheck`、`npm test`(181 不變)、`npm run build` 全通過
- 只動 PixiRenderer.ts（+ 文件）；引擎/模擬/store/sprites.ts/確定性零改動
- 各單位待機動態 + 相位錯開、幅度克制不暈眩、碰撞/瞄準不受影響
- acceptance.md 所有項目勾選（含瀏覽器實機看動態驗證）
- progress.md 反映最新狀態
