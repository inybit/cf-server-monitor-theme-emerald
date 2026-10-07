import type { NodeData } from '@/stores/nodes'
/**
 * SSR 验证入口（由 tools/run-ssr-verify.mjs 通过 vite ssrLoadModule 加载）。
 * 这里跑在 Vite 的真实编译管线里（vue 插件 + 路径别名），与生产构建一致。
 */
import { renderToString } from '@vue/server-renderer'
import { createPinia, setActivePinia } from 'pinia'
import { createSSRApp, h } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import NodeCard from '@/components/NodeCard.vue'
import NodeGeneralCards from '@/components/NodeGeneralCards.vue'
import NodeList from '@/components/NodeList.vue'
import { useAppStore } from '@/stores/app'
import { useNodesStore } from '@/stores/nodes'
import InstanceDetail from '@/views/InstanceDetail.vue'

export function makeNode(overrides: Partial<NodeData> = {}): NodeData {
  return {
    uuid: 'n1',
    source_index: 0,
    name: 'HK-01',
    cpu_name: 'Intel Xeon',
    virtualization: '-',
    kernel_version: '5.15.0',
    arch: 'x86_64',
    cpu_cores: 2,
    os: 'ubuntu',
    boot_time: new Date().toISOString(),
    region: 'HK',
    public_remark: '',
    mem_total: 4096,
    swap_total: 2048,
    disk_total: 40960,
    weight: 1,
    price: 30,
    price_configured: true,
    billing_cycle: 30,
    auto_renewal: true,
    currency: '¥',
    expired_at: new Date(Date.now() + 120 * 86400000).toISOString(),
    group: '默认分组',
    tags: '白嫖中<green>',
    hidden: false,
    traffic_limit: 1099511627776,
    traffic_limit_type: 'sum',
    created_at: '',
    updated_at: '',
    online: true,
    time: new Date().toISOString(),
    cpu: 12.5,
    gpu: 0,
    ram: 1024,
    swap: 128,
    load: 0.1,
    load5: 0.2,
    load15: 0.3,
    temp: 40,
    disk: 10240,
    net_in: 1024,
    net_out: 512,
    net_total_up: 87654321,
    net_total_down: 12345678,
    net_monthly_up: 536870912,
    net_monthly_down: 1073741824,
    process: 256,
    connections: 32,
    connections_udp: 4,
    uptime: 3600,
    ...overrides,
  } as NodeData
}

const paidNode = makeNode()
const freeNode = makeNode({ uuid: 'n2', name: 'FREE-01', price: -1, price_configured: true })

export interface ScenarioResult {
  cardPaid: string
  cardFree: string
  list: string
  summary: string
  detail: string
}

export async function runScenario(showPrice: boolean, loggedIn: boolean): Promise<ScenarioResult> {
  const pinia = createPinia()
  setActivePinia(pinia)
  const appStore = useAppStore()
  appStore.updateShowPrice(showPrice)
  appStore.updateLoginState(loggedIn)

  const nodesStore = useNodesStore()
  nodesStore.nodes = [paidNode, freeNode]

  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'home', component: { render: () => null } },
      { path: '/server/:id', name: 'instance-detail', component: { render: () => null } },
    ],
  })
  await router.push('/server/n1')
  await router.isReady()

  const render = async (component: unknown, props: Record<string, unknown> = {}) => {
    const app = createSSRApp({ render: () => h(component as never, props) })
    app.use(pinia)
    app.use(router)
    return renderToString(app)
  }

  return {
    cardPaid: await render(NodeCard, { node: paidNode }),
    cardFree: await render(NodeCard, { node: freeNode }),
    list: await render(NodeList, { nodes: [paidNode, freeNode] }),
    summary: await render(NodeGeneralCards, { nodes: [paidNode, freeNode] }),
    detail: await render(InstanceDetail),
  }
}

export async function canViewPriceFor(showPrice: boolean, loggedIn: boolean): Promise<boolean> {
  const pinia = createPinia()
  setActivePinia(pinia)
  const appStore = useAppStore()
  appStore.updateShowPrice(showPrice)
  appStore.updateLoginState(loggedIn)
  return appStore.canViewPrice
}
