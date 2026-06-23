/**
 * Vue 應用程式進入點。
 *
 * 建立 Vue app、安裝 Pinia（提供 src/stores/game.ts 的橋接 store），
 * 再把根元件 App.vue 掛載到 index.html 的 #app 節點上。
 * 引擎本身（src/engine/**）不在此啟動——它由 App.vue 在使用者按下「開始遊戲」後才掛載。
 */
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'

createApp(App).use(createPinia()).mount('#app')
