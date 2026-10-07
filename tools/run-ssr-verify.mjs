/**
 * show_price 渲染验证：在 Vite 真实编译管线（vue 插件 + @ 别名）下 SSR 渲染真实组件，
 * 断言产出 HTML 是否包含价格信息。
 *
 * 运行：node tools/run-ssr-verify.mjs
 */
import { createServer } from 'vite'

// store 在模块作用域直接引用 localStorage（浏览器 API），SSR 下需先垫片
const __store = new Map()
globalThis.localStorage = {
  get length() { return __store.size },
  clear: () => __store.clear(),
  getItem: k => (__store.has(k) ? __store.get(k) : null),
  key: i => [...__store.keys()][i] ?? null,
  removeItem: k => void __store.delete(k),
  setItem: (k, v) => void __store.set(k, String(v)),
}

const server = await createServer({
  server: { middlewareMode: true, hmr: false },
  appType: 'custom',
  logLevel: 'error',
})

let failures = 0
function check(label, condition, detail = '') {
  if (condition) {
    console.log(`  ✓ ${label}`)
  }
  else {
    failures++
    console.log(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`)
  }
}

try {
  const mod = await server.ssrLoadModule('/tools/ssr-entry.ts')

  console.log('\n[1] 访客 + show_price=false')
  check('canViewPrice 为 false', (await mod.canViewPriceFor(false, false)) === false)
  let r = await mod.runScenario(false, false)
  check('卡片不出现「¥30」', !r.cardPaid.includes('¥30'), 'NodeCard 仍渲染了价格')
  check('卡片不出现「免费」', !r.cardFree.includes('免费'))
  check('卡片仍保留「费用」行', r.cardPaid.includes('费用'))
  check('卡片仍显示剩余天数「120 天」', r.cardPaid.includes('120 天'))
  check('卡片不出现「白嫖中」以外的价格残留', !/¥\s*30/.test(r.cardPaid))
  check('列表不出现「¥30」', !r.list.includes('¥30'))
  check('列表不出现「免费」', !r.list.includes('免费'))
  check('汇总卡片不出现「剩余价值」', !r.summary.includes('剩余价值'))
  check('汇总卡片不出现「总价值」', !r.summary.includes('总价值'))
  check('汇总卡片不出现「月均支出」', !r.summary.includes('月均支出'))
  check('汇总卡片不出现「今日汇率」', !r.summary.includes('今日汇率'))
  check('汇总卡片仍显示「累计流量」', r.summary.includes('累计流量'))
  check('汇总卡片仍显示「实时上行」', r.summary.includes('实时上行'))
  check('详情页不出现「节点价格」', !r.detail.includes('节点价格'))
  check('详情页不出现「月均支出」', !r.detail.includes('月均支出'))
  check('详情页不出现「剩余价值」', !r.detail.includes('剩余价值'))
  check('详情页仍显示「剩余时间」', r.detail.includes('剩余时间'))
  check('详情页仍显示硬件信息', r.detail.includes('硬件信息'))

  console.log('\n[2] 管理员（已登录）+ show_price=false')
  check('canViewPrice 为 true', (await mod.canViewPriceFor(false, true)) === true)
  r = await mod.runScenario(false, true)
  check('卡片出现「¥30/M」', r.cardPaid.includes('¥30/M'), '管理员应可见价格')
  check('卡片出现「免费」', r.cardFree.includes('免费'))
  check('列表出现「¥30/M」', r.list.includes('¥30/M'))
  check('汇总卡片出现「剩余价值」', r.summary.includes('剩余价值'))
  check('详情页出现「节点价格」', r.detail.includes('节点价格'))
  check('详情页出现「剩余价值」', r.detail.includes('剩余价值'))

  console.log('\n[3] 访客 + show_price=true')
  check('canViewPrice 为 true', (await mod.canViewPriceFor(true, false)) === true)
  r = await mod.runScenario(true, false)
  check('卡片出现「¥30/M」', r.cardPaid.includes('¥30/M'))
  check('卡片出现「免费」', r.cardFree.includes('免费'))
  check('列表出现「¥30/M」', r.list.includes('¥30/M'))
  check('汇总卡片出现「剩余价值」', r.summary.includes('剩余价值'))
  check('详情页出现「节点价格」', r.detail.includes('节点价格'))

  console.log('\n[4] 旧版后端不返回 show_price（undefined 按开启处理）')
  const legacy = await mod.canViewPriceFor(undefined, false)
  check('canViewPrice 为 true', legacy === true)
  r = await mod.runScenario(undefined, false)
  check('卡片出现「¥30/M」', r.cardPaid.includes('¥30/M'))

  console.log(failures === 0 ? '\n全部通过 ✅' : `\n${failures} 项失败 ❌`)
}
finally {
  await server.close()
}

process.exit(failures === 0 ? 0 : 1)
