/**
 * 数据流验证：用真实 fetchAllServers 解析 mock 后端的 /api/servers，
 * 再按 utils/init.ts 的同一行代码写入 store，断言 show_price 正确落地。
 *
 * 运行：node tools/run-pipeline-verify.mjs
 */
import { createServer } from 'vite'

const MOCK = process.env.MOCK_BASE || 'http://127.0.0.1:8899'

const __store = new Map()
globalThis.localStorage = {
  get length() { return __store.size },
  clear: () => __store.clear(),
  getItem: k => (__store.has(k) ? __store.get(k) : null),
  key: i => [...__store.keys()][i] ?? null,
  removeItem: k => void __store.delete(k),
  setItem: (k, v) => void __store.set(k, String(v)),
}

// 让模块内的 getApiBases() 指向 mock 后端
globalThis.window = {
  location: { origin: MOCK, hostname: '127.0.0.1', protocol: 'http:' },
}

const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom', logLevel: 'error' })

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
  const { runPipeline } = await server.ssrLoadModule('/tools/ssr-pipeline-entry.ts')

  const r = await runPipeline()
  const expectedShowPrice = process.env.MOCK_SHOW_PRICE !== 'false'
  console.log(`\n[1] 真实解析 /api/servers（mock show_price=${expectedShowPrice}, authorization=${process.env.MOCK_AUTHORIZATION === 'true'}）`)
  check('解析到 2 台服务器', r.serverCount === 2, `实际 ${r.serverCount}`)
  check('解析到 sysConfig', r.hasSysConfig)
  check('sysConfig.show_price 已解析为 boolean', r.showPriceType === 'boolean', `实际 ${r.showPriceType}`)
  check('sysConfig.show_price 值与后端一致', r.showPriceValue === expectedShowPrice, `实际 ${r.showPriceValue}`)
  check('statuses 覆盖全部服务器', r.statusCount === 2, `实际 ${r.statusCount}`)

  check('价格已从 wire 解析', r.firstPrice === 30, `实际 ${r.firstPrice}`)
  check('币种已解析', r.firstCurrency === '¥', `实际 ${r.firstCurrency}`)
  check('计费周期已解析为天数', r.firstBillingCycle === 30, `实际 ${r.firstBillingCycle}`)

  console.log('\n[2] 按 init.ts 同一逻辑写入 store（全链路：/api/config + /api/servers）')
  const expected = process.env.MOCK_AUTHORIZATION === 'true' ? true : expectedShowPrice
  check(`canViewPrice 应为 ${expected}`, r.actualCanViewPrice === expected, `实际 ${r.actualCanViewPrice}`)
  check(`访客视角 canViewPrice 应为 ${expectedShowPrice}`, r.guestCanViewPrice === expectedShowPrice, `实际 ${r.guestCanViewPrice}`)

  console.log('\n[3] 管理员不受 show_price 影响')
  check('管理员 canViewPrice 为 true', r.adminCanViewPrice === true, `实际 ${r.adminCanViewPrice}`)

  console.log('\n[4] show_three_net_details 解析保持原行为（回归）')
  check('show_three_net_details 可解析', r.showThreeNetDetailsResolvable)

  console.log(failures === 0 ? '\n全部通过 ✅' : `\n${failures} 项失败 ❌`)
}
finally {
  await server.close()
}

process.exit(failures === 0 ? 0 : 1)
