import { embeddedFiles } from 'bun'

type 嵌入文件 = Blob & { name?: string }

const 文件表 = new Map<string, Blob>()
for (const blob of embeddedFiles as readonly 嵌入文件[]) {
  const 名称 = blob.name ?? ''
  if (!名称.startsWith('dist/')) continue
  文件表.set('/' + 名称.slice('dist/'.length), blob)
}

const 类型表: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.jsonc': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.webmanifest': 'application/manifest+json',
}

function 取类型(路径: string): string {
  const 点 = 路径.lastIndexOf('.')
  if (点 < 0) return 'application/octet-stream'
  return 类型表[路径.slice(点).toLowerCase()] ?? 'application/octet-stream'
}

const 服务 = Bun.serve({
  hostname: '127.0.0.1',
  port: 0,
  fetch(请求) {
    const 网址 = new URL(请求.url)
    let 路径 = decodeURIComponent(网址.pathname)
    if (路径 === '/') 路径 = '/index.html'

    let 文件 = 文件表.get(路径)
    let 是否回退 = false
    // 前端是單頁應用：没有副檔名的路徑交給 index.html 自行路由
    if (!文件 && !路径.includes('.') && !路径.startsWith('/assets/')) {
      文件 = 文件表.get('/index.html')
      是否回退 = 文件 !== undefined
    }

    if (!文件) {
      return new Response('找不到文件：' + 路径, {
        status: 404,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      })
    }

    const 响应头 = {
      'Content-Type': 是否回退 ? 'text/html; charset=utf-8' : 取类型(路径),
    }
    if (请求.method === 'HEAD') return new Response(null, { headers: 响应头 })
    return new Response(文件, { headers: 响应头 })
  },
})

const 地址 = `http://127.0.0.1:${服务.port}/`

function 打开浏览器(url: string) {
  const 选项 = { stdout: 'ignore' as const, stderr: 'ignore' as const }
  if (process.platform === 'win32') {
    Bun.spawn(['rundll32.exe', 'url.dll,FileProtocolHandler', url], 选项)
  } else if (process.platform === 'darwin') {
    Bun.spawn(['open', url], 选项)
  } else {
    Bun.spawn(['xdg-open', url], 选项)
  }
}

console.log('宇浩測評 · 離線單文件版')
console.log('服務地址：' + 地址)
console.log('瀏覽器會自動打開；關閉此視窗或按 Ctrl+C 結束。')
打开浏览器(地址)

process.on('SIGINT', () => {
  服务.stop()
  process.exit(0)
})
