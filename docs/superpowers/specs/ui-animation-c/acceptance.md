# Acceptance — HUD/UI 動畫（C 批）

本檔為本功能完成與否的**唯一驗收來源**。所有項目通過才得標記為完成。
（UI 呈現層動畫以實機目視驗證；引擎/store 不動、既有測試維持全綠。）

_驗證日期：（完成時填寫）_

## HUD 動畫（Hud.vue）
- [ ] 血條/經驗條平滑填充（width 過渡，取代硬跳）
- [ ] 升級時 Lv 數字彈跳 + 短暫發光（watch store.level 上升沿）
- [ ] 受傷時血條紅閃（watch store.hp 下降）
- [ ] 連續升級以最後一次重新觸發、不堆疊殘留
- [ ] HUD 既有版面（含靜音鈕預留空間）不變

## 升級彈窗進場（UpgradeModal.vue）
- [ ] 背景淡入
- [ ] 標題 + 三卡錯落 slide-up + scale + fade 進場（依 index 延遲）
- [ ] 卡片按壓 :active 縮放反饋；hover 與 pickUpgrade 行為不變

## Boss 血條（BossBar.vue）
- [ ] 出現滑下淡入、消失淡出（Vue Transition）
- [ ] 血量 < 25% 時脈動發光
- [ ] 既有 width 過渡與血量計算不變

## 死亡結算進場（GameOver.vue）
- [ ] 背景淡入 + 內容縮放浮現
- [ ] restart 事件與數據顯示不變

## phase overlay 轉場（App.vue）
- [ ] menu / upgrading / over overlay 以 Vue Transition 淡入淡出
- [ ] v-if 互斥掛載與引擎握手（暫停/恢復）不變

## 無障礙
- [ ] `prefers-reduced-motion: reduce` 下所有動畫關閉或瞬時、資訊與功能不受影響

## 不變項（硬性）
- [ ] 未修改 engine/** 與 stores/game.ts；模擬/數值/確定性/握手不變
- [ ] 動畫狀態僅存元件本地，不進 store

## 驗證快照（完成時填寫）
- [ ] 既有單元測試（Vitest）全數維持通過（122）
- [ ] 型別檢查（vue-tsc）乾淨
- [ ] Production build 乾淨
- [ ] 實機驗證：HUD/升級彈窗/Boss 血條/死亡結算/轉場皆如設計、reduced-motion 生效、FPS 正常、0 功能相關 console error
- [ ] progress.md 已更新
