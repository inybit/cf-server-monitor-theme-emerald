#!/usr/bin/env node
/**
 * 本地验证用 mock CF Server Monitor 后端。
 * 提供 /api/config、/api/servers（含 sysConfig.show_price），
 * 以及 /flags、/os-icons 静态资源，供 vite dev 代理使用。
 *
 * 环境变量：
 *   MOCK_PORT        监听端口（默认 8899）
 *   MOCK_SHOW_PRICE  sysConfig.show_price（true/false，默认 false）
 *   MOCK_AUTHORIZATION  /api/config 的 authorization（true/false，默认 false）
 */
import http from 'node:http'

const port = Number(process.env.MOCK_PORT || 8899)
const showPrice = process.env.MOCK_SHOW_PRICE !== 'false'
const authorization = process.env.MOCK_AUTHORIZATION === 'true'

const now = Date.now()

const servers = [
  {
    id: 'srv-hk-01',
    name: 'HK-01',
    server_group: '香港',
    tags: '白嫖中<green>,建站<blue>',
    price: '30.00',
    billing_cycle: 'month',
    currency: '¥',
    expire_date: new Date(now + 120 * 86400000).toISOString(),
    traffic_limit: '1TB',
    traffic_calc_type: 'total',
    reset_day: 1,
    sort_order: 1,
    cpu: 12.5,
    load_avg: '0.10 0.20 0.30',
    net_in_speed: 1024 * 512,
    net_out_speed: 1024 * 256,
    net_rx: 12345678,
    net_tx: 87654321,
    net_rx_monthly: 1073741824,
    net_tx_monthly: 536870912,
    processes: 256,
    tcp_conn: 32,
    udp_conn: 4,
    ping_ct: 23,
    ping_cu: 25,
    ping_cm: 30,
    ping_bd: 18,
    loss_ct: 0,
    loss_cu: 0,
    loss_cm: 1,
    loss_bd: 0,
    ram_total: 4096,
    ram_used: 1024,
    swap_total: 2048,
    swap_used: 128,
    disk_total: 40960,
    disk_used: 10240,
    cpu_cores: 2,
    cpu_info: 'Intel Xeon E5-2680 v4',
    arch: 'x86_64',
    os: 'Ubuntu 22.04',
    region: 'HK',
    ip_v4: '203.0.113.10',
    kernel_version: '5.15.0-91-generic',
    agent_version: '2.8.0',
    last_updated: now,
    boot_time: now - 86400000 * 30,
    is_online: true,
  },
  {
    id: 'srv-jp-02',
    name: 'JP-02',
    server_group: '日本',
    tags: '付费<gold>',
    price: '¥JPY980',
    billing_cycle: 'year',
    currency: '¥JPY',
    expire_date: new Date(now + 400 * 86400000).toISOString(),
    traffic_limit: '2TB',
    traffic_calc_type: 'total',
    sort_order: 2,
    cpu: 45.2,
    load_avg: '1.10 1.20 1.30',
    net_in_speed: 1024 * 1024 * 2,
    net_out_speed: 1024 * 1024,
    net_rx: 22345678,
    net_tx: 97654321,
    net_rx_monthly: 2073741824,
    net_tx_monthly: 1536870912,
    processes: 512,
    tcp_conn: 64,
    udp_conn: 8,
    ping_ct: 55,
    ping_cu: 60,
    ping_cm: 65,
    ping_bd: 40,
    loss_ct: 0,
    loss_cu: 0,
    loss_cm: 0,
    loss_bd: 0,
    ram_total: 8192,
    ram_used: 4096,
    swap_total: 4096,
    swap_used: 256,
    disk_total: 81920,
    disk_used: 40960,
    cpu_cores: 4,
    cpu_info: 'AMD EPYC 7763',
    arch: 'x86_64',
    os: 'Debian 12',
    region: 'JP',
    ip_v4: '198.51.100.20',
    kernel_version: '6.1.0-18-amd64',
    agent_version: '2.8.0',
    last_updated: now,
    boot_time: now - 86400000 * 10,
    is_online: true,
  },
]

const siteConfig = {
  version: '2.8.0',
  is_public: true,
  authorization,
  turnstile_enabled: false,
  turnstile_login_enabled: false,
  turnstile_site_key: '',
  site_title: 'Mock CF Server Monitor',
  display_mode: 'bar',
  preferred_theme: 'auto',
  default_language: 'zh',
  verified: false,
  turnstile_verified: null,
  theme_options: {},
  frontend_ws_timeout_minutes: 0,
  long_history_points: 120,
  latency_window: { points: 20, hours: 2 },
  custom_ct_name: '电信',
  custom_cu_name: '联通',
  custom_cm_name: '移动',
  custom_bd_name: 'BGP',
}

const emptySvg = label => `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><rect width="32" height="32" fill="#0f766e"/><text x="16" y="21" font-size="10" fill="#fff" text-anchor="middle">${label}</text></svg>`

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${port}`)
  const send = (code, body, type = 'application/json') => {
    res.writeHead(code, {
      'Content-Type': type,
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': '*',
    })
    res.end(typeof body === 'string' ? body : JSON.stringify(body))
  }

  if (url.pathname === '/api/config')
    return send(200, siteConfig)

  if (url.pathname === '/api/servers') {
    return send(200, {
      servers,
      latestReportUpdates: [],
      stats: { total: servers.length, online: servers.length, offline: 0 },
      regionStats: { HK: 1, JP: 1 },
      sysConfig: {
        show_price: showPrice,
        show_expire: true,
        show_tf: true,
        show_three_net_details: true,
        display_mode: 'bar',
      },
    })
  }

  if (url.pathname === '/api/server') {
    const id = url.searchParams.get('id')
    const found = servers.find(s => s.id === id)
    return found ? send(200, found) : send(404, { error: 'Server not found', code: 404 })
  }

  if (url.pathname.startsWith('/flags/'))
    return send(200, emptySvg(url.pathname.slice(7, 9).toUpperCase()), 'image/svg+xml')

  if (url.pathname.startsWith('/os-icons/'))
    return send(200, emptySvg('OS'), 'image/svg+xml')

  if (url.pathname === '/favicon.ico')
    return send(200, emptySvg('F'), 'image/svg+xml')

  return send(404, { error: 'Not found', code: 404 })
})

server.listen(port, '127.0.0.1', () => {
  console.log(`mock CF Server Monitor on http://127.0.0.1:${port} (show_price=${showPrice}, authorization=${authorization})`)
})
