import antfu from '@antfu/eslint-config'

export default antfu({
  formatters: true,
  vue: true,
  ignores: [
    // 本地验证/调试脚本：CLI 形态，天然使用 console 与顶层 await，不参与应用代码规范
    'tools/**',
  ],
})
