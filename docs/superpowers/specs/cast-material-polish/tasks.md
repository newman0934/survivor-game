# Tasks — 隊伍造型材質 + 發光（cast-material-polish / B1）

逐 task 執行；詳細步驟與完整程式碼見 `plan.md`。**建議 inline 執行**（純美術、需瀏覽器截圖微調）。
（純程序繪製屬呈現層、不寫單元測試；以 typecheck/build + 瀏覽器截圖驗證。既有 181 測試須維持全綠、引擎/模擬/store 零改動。）

- [ ] **Task 1：材質 helper + 4 角色** — sprites.ts 新增 `LIGHT` + `membrane`/`innerShade`/`rimLight`/`specular`/`emissiveCore`；套用 drawPlayer 四角色（膜身材質 + 細胞核冷光 0x9be8ff）。typecheck + build + 瀏覽器四角色截圖微調。commit。
- [ ] **Task 2：8 病原 + 投射物 + 拾取物 + 驗證** — drawEnemy 八病原套材質 + 毒核/感染核發光（自爆體核更亮）；drawProjectile 叉端/針尖/毒核加發光點；gem/orbit/chest 輕度統一；typecheck + `npm test`(181) + build + 瀏覽器截圖；更新 acceptance/progress。commit。

## 驗收門檻（全綠才算完成）
- `npm run typecheck`、`npm test`(181 不變)、`npm run build` 全通過
- 只動 sprites.ts（+ 文件）；引擎/模擬/store/確定性零改動
- 全隊伍既有輪廓保留、疊材質；僅核發光、不過曝
- acceptance.md 所有項目勾選（含瀏覽器截圖實機驗證）
- progress.md 反映最新狀態
