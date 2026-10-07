/**
 * 数据流验证入口（由 tools/run-pipeline-verify.mjs 通过 vite ssrLoadModule 加载）。
 * 用真实 fetchAllServers 解析 mock 后端响应，再按 utils/init.ts 的同一逻辑写入 store。
 */
import { createPinia, setActivePinia } from 'pinia'
import { useAppStore } from '@/stores/app'
import { fetchAllServers, fetchSiteConfigs, isEnabledValue } from '@/utils/api'

export async function runPipeline() {
  // 与 init.ts 一致：先取 /api/config 判定登录态，再取 /api/servers 读 sysConfig
  const configs = await fetchSiteConfigs()
  const { clients, statuses, sysConfig } = await fetchAllServers()

  const pinia = createPinia()
  setActivePinia(pinia)
  const appStore = useAppStore()

  // 与 src/utils/init.ts 中的两行调用完全一致
  appStore.updateLoginState(configs.some(item => item.authorization))
  appStore.updateShowPrice(sysConfig?.show_price)
  const actualCanViewPrice = appStore.canViewPrice

  // 对照组：强制未登录，观察访客视角
  appStore.updateLoginState(false)
  const guestCanViewPrice = appStore.canViewPrice

  // 对照组：强制登录（管理员视角）
  appStore.updateLoginState(true)
  const adminCanViewPrice = appStore.canViewPrice

  const first = Object.values(clients)[0]

  return {
    serverCount: Object.keys(clients).length,
    statusCount: Object.keys(statuses).length,
    hasSysConfig: Boolean(sysConfig),
    showPriceType: typeof sysConfig?.show_price,
    showPriceValue: sysConfig?.show_price,
    authorization: configs[0]?.authorization,
    actualCanViewPrice,
    guestCanViewPrice,
    adminCanViewPrice,
    firstPrice: first?.price,
    firstCurrency: first?.currency,
    firstBillingCycle: first?.billing_cycle,
    showThreeNetDetailsResolvable:
      sysConfig?.show_three_net_details === undefined
      || typeof isEnabledValue(sysConfig.show_three_net_details) === 'boolean',
  }
}
