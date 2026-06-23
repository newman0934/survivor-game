# Acceptance — HUD/UI 動畫（C 批）

本檔為本功能完成與否的**唯一驗收來源**。所有項目通過才得標記為完成。
（UI 呈現層動畫以實機目視驗證；引擎/store 不動、既有測試維持全綠。）

_驗證日期：2026-06-24（程式/型別/build/單元測試 + 實機目視全數通過）_

## HUD 動畫（Hud.vue）
- [x] 血條/經驗條平滑填充（width 過渡，取代硬跳）
- [x] 升級時 Lv 數字彈跳 + 短暫發光（watch store.level 上升沿）
- [x] 受傷時血條紅閃（watch store.hp 下降）
- [x] 連續升級以最後一次重新觸發、不堆疊殘留（false→rAF→true 重觸發）
- [x] HUD 既有版面（含靜音鈕預留空間）不變

## 升級彈窗進場（UpgradeModal.vue）
- [x] 背景淡入（由 App.vue Transition 集中處理）
- [x] 標題 + 三卡錯落 slide-up + scale + fade 進場（依 index 延遲）
- [x] 卡片按壓 :active 縮放反饋（animation fill-mode 用 backwards 不蓋 :active）；hover 與 pickUpgrade 行為不變

## Boss 血條（BossBar.vue）
- [x] 出現滑下淡入、消失淡出（Vue Transition）
- [x] 血量 < 25% 時脈動發光
- [x] 既有 width 過渡與血量計算不變

## 死亡結算進場（GameOver.vue）
- [x] 背景淡入（App.vue Transition）+ 內容 panel 縮放浮現
- [x] restart 事件與數據顯示不變

## phase overlay 轉場（App.vue）
- [x] menu / upgrading / over overlay 以 Vue Transition 淡入淡出（非 scoped fade 類別）
- [x] v-if 互斥掛載與引擎握手（暫停/恢復）不變

## 無障礙
- [x] `prefers-reduced-motion: reduce` 下所有動畫關閉或瞬時（各元件 + App 均含 guard）

## 不變項（硬性）
- [x] 未修改 engine/** 與 stores/game.ts；模擬/數值/確定性/握手不變
- [x] 動畫狀態僅存元件本地，不進 store

## 驗證快照（完成時填寫）
- [x] 既有單元測試（Vitest）全數維持通過（122）
- [x] 型別檢查（vue-tsc）乾淨
- [x] Production build 乾淨
- [x] 實機驗證：HUD/升級彈窗/Boss 血條/死亡結算/轉場皆如設計、reduced-motion 生效、FPS 正常、0 功能相關 console error
- [x] progress.md 已更新
