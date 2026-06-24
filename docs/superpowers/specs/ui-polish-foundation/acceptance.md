# Acceptance — UI 精修地基（D1）

本檔為本功能完成與否的**唯一驗收來源**。所有項目通過才得標記為完成。
（純 DOM 呈現層、無可測純邏輯，不寫單元測試；以 typecheck/build + 瀏覽器實機逐畫面驗證；
既有 181 單元測試維持全綠、引擎/模擬/store/確定性零改動。）

_驗證日期：（待填）_

## 設計 token 與字體
- [ ] 全域 `:root` 擴充設計 token（面板面/模糊/發光邊框/陰影/圓角/間距/字級/過渡/`--font-display`）
- [ ] 既有 5 個主題變數保留且仍生效（HUD/BossBar/MuteButton 外觀不退化）
- [ ] Chakra Petch 自托管（拉丁 subset、woff2、`font-display: swap`），`@font-face` 載入、不走 CDN
- [ ] 展示字體套於標題/數字/Lv/計時等拉丁字元；中文走系統字體棧

## 共用元件
- [ ] `Overlay.vue`：毛玻璃遮罩 + 中心徑向暈染 + 置中；行動寬度降 blur；無狀態 slot
- [ ] `Panel.vue`：半透明面 + 1px 發光細邊 + 柔外發光 + 頂緣膜光澤 + 圓角 + drop shadow；內容超高可捲；無狀態 slot
- [ ] `.ui-btn` / `.ui-btn-primary` / `.ui-btn-ghost`：hover 發光/浮起、`:active` 壓縮、`:focus-visible` 外環、統一圓角/過渡

## 四 overlay 套用
- [ ] 主選單改用 Overlay/Panel + 共用按鈕；角色/地圖選擇與 `start`/`open-leaderboard` 事件不變
- [ ] 升級彈窗改用 Overlay/Panel；loadout 持有區與三卡呈現於面板；點卡仍送出升級並恢復遊戲
- [ ] 結算改用 Overlay/Panel + 共用按鈕；`restart`/`menu` 事件不變；破紀錄多行正常
- [ ] 排行榜改用 Overlay/Panel + 共用按鈕；表格/空狀態正常、`close` 事件不變

## 邊界與可及性
- [ ] 不支援 backdrop-filter 時退回不透明深色面、文字按鈕仍清楚可讀
- [ ] 行動寬度（≤600px）：既有 RWD 行為不變、面板可捲不溢出
- [ ] 內容過長（滿筆排行榜/滿級 loadout/多行結算）面板自適應可捲、不破版
- [ ] `prefers-reduced-motion: reduce` 關位移/縮放、保留焦點回饋

## 不變項（硬性）
- [ ] 引擎/模擬/World/store/確定性零改動；四 overlay 對外 props/emits 簽章不變
- [ ] HUD/BossBar/MuteButton 不在本專案改動範圍、外觀不退化
- [ ] 既有 181 單元測試全綠

## 驗證快照（完成時填寫）
- [ ] 型別檢查（vue-tsc）乾淨
- [ ] Production build 乾淨
- [ ] 單元測試全綠（181，不新增/不破壞）
- [ ] 實機驗證（瀏覽器）：四 overlay 桌機 before→after 截圖、行動寬度（≤600px）一輪，
      面板/字體/按鈕回饋正確、RWD 不破版、0 功能相關 console error
- [ ] progress.md 已更新
