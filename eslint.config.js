import vue from 'eslint-plugin-vue'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'playwright-report', 'test-results'] },
  // TypeScript 建議規則（.ts / .vue 的 <script lang="ts">）
  ...tseslint.configs.recommended,
  // Vue 3 essential 規則
  ...vue.configs['flat/essential'],
  // .vue 的 <script> 以 typescript-eslint parser 解析（修正原本無法解析 TS 語法的問題）
  {
    files: ['**/*.vue'],
    languageOptions: {
      parserOptions: { parser: tseslint.parser },
    },
  },
  // 專案慣例調整
  {
    rules: {
      // `_` 前綴＝刻意未使用的參數/變數（介面實作的 no-op 回呼等）
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      // app 內部元件容許單字命名（Overlay/Panel/Hud/Leaderboard 等）
      'vue/multi-word-component-names': 'off',
    },
  },
)
