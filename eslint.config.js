import vue from 'eslint-plugin-vue'

export default [
  ...vue.configs['flat/essential'],
  { ignores: ['dist', 'node_modules'] },
]
