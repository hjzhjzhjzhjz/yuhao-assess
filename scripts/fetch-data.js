#!/usr/bin/env node
/**
 * 從 yuhao-assess-data CDN 下載數據文件到 public/
 * 這是沒有 Bun 時的 node 實現（有 Bun 時走 fetch-data.bun.js）
 *
 * 用到的 Node 24 能力：
 * - 內建 fetch（undici 7，自帶連接池與 keep-alive），不必再手寫 https.get 與 301/302 轉向
 * - navigator.hardwareConcurrency：按機器核數決定並行度
 * - AbortSignal.timeout()：單個請求的超時上限
 * - import.meta.dirname / import.meta.main
 *
 * 每個文件先寫 .part 再 rename，失敗不會留下半截 JSON。
 */

import fs from 'node:fs/promises'
import path from 'node:path'

// 發佈後的 CDN 地址，不容易被防火牆屏蔽
const CDN_BASE = 'https://zhuyuhao.com/yuhao-assess-data/'
const 根目錄 = path.resolve(import.meta.dirname, '..')
const DATA_DIR = path.join(根目錄, 'public/data')
const SCHEMES_DIR = path.join(根目錄, 'public/schemes')
const TEXTS_DIR = path.join(根目錄, 'public/texts')

// 需要下載的數據文件列表（從 data/ 路徑）
const DATA_FILES = [
  'data/charAbsoluteFrequencyZhihu.json',
  'data/charAbsoluteFrequencySC.json',
  'data/charAbsoluteFrequencyTC.json',
  'data/charAbsoluteFrequencyGuji.json',
  'data/wordAbsoluteFrequencySC.json',
  'data/charsets.json',
]

// 連續文本語料（用於連續文本當量分析）
const TEXT_FILES = ['texts/literature.txt']

// 併發數：文件都很小，瓶頸是往返延遲，取核數並夾在 4~8 之間
const 併發數 = Math.min(8, Math.max(4, navigator.hardwareConcurrency || 4))

/**
 * 從 builtin-schemes.json 讀取啓用的方案列表
 */
async function 取啓用方案() {
  const 設定路徑 = path.join(根目錄, 'public/settings/builtin-schemes.json')

  try {
    const 設定 = JSON.parse(await fs.readFile(設定路徑, 'utf8'))
    return 設定.schemes.filter(方案 => 方案.enabled).map(方案 => `schemes/${方案.key}.json`)
  } catch {
    console.warn('⚠️  找不到或無法解析 builtin-schemes.json，跳過方案文件')
    return []
  }
}

/**
 * 下載單個文件
 */
async function 下載一項({ 文件, 目錄 }) {
  const 目標 = path.join(目錄, path.basename(文件))
  const 暫存 = `${目標}.part`

  const 回應 = await fetch(CDN_BASE + 文件, { signal: AbortSignal.timeout(60_000) })
  if (!回應.ok) throw new Error(`HTTP ${回應.status}`)

  await fs.writeFile(暫存, Buffer.from(await 回應.arrayBuffer()))
  await fs.rename(暫存, 目標)

  const 大小 = ((await fs.stat(目標)).size / 1024).toFixed(2)
  console.log(`✅ 完成: ${文件} (${大小} KB)`)
}

/**
 * 有界併發下載：同時最多 併發數 個請求，一個失敗不影響其他
 */
async function 並行下載(任務們) {
  let 下一個 = 0
  const 錯誤們 = []

  const 工人 = Array.from({ length: Math.min(併發數, 任務們.length) }, async () => {
    while (下一個 < 任務們.length) {
      const 任務 = 任務們[下一個++]
      try {
        await 下載一項(任務)
      } catch (錯誤) {
        錯誤們.push(`${任務.文件}: ${錯誤.message}`)
      }
    }
  })

  await Promise.all(工人)

  if (錯誤們.length > 0) {
    throw new Error(`${錯誤們.length} 個文件下載失敗\n${錯誤們.join('\n')}`)
  }
}

/**
 * 主函數
 */
async function main() {
  console.log('🚀 從 CDN 下載數據文件...')
  console.log(`📦 CDN: ${CDN_BASE}`)
  console.log(`🧵 併發: ${併發數}（navigator.hardwareConcurrency = ${navigator.hardwareConcurrency}）`)
  console.log('')

  for (const 目錄 of [DATA_DIR, SCHEMES_DIR, TEXTS_DIR]) {
    await fs.mkdir(目錄, { recursive: true })
  }

  const 方案文件 = await 取啓用方案()
  if (方案文件.length === 0) {
    console.warn('⚠️  没有找到啓用的方案，跳過')
  } else {
    console.log(`   找到 ${方案文件.length} 個啓用的方案`)
  }

  const 任務們 = [
    ...DATA_FILES.map(文件 => ({ 文件, 目錄: DATA_DIR })),
    ...TEXT_FILES.map(文件 => ({ 文件, 目錄: TEXTS_DIR })),
    ...方案文件.map(文件 => ({ 文件, 目錄: SCHEMES_DIR })),
  ]

  const 開始 = performance.now()
  await 並行下載(任務們)
  const 耗時 = ((performance.now() - 開始) / 1000).toFixed(2)

  console.log('')
  console.log(`🎉 ${任務們.length} 個文件全部完成（${耗時} 秒）`)
  console.log('💡 現在可以運行 pnpm run dev 啓動開發服務器')
}

// Node 24.2+ 的 import.meta.main：被 import 時不會自動跑下載
if (import.meta.main) {
  main().catch(錯誤 => {
    console.error('')
    console.error('❌ 下載失敗:', 錯誤.message)
    console.error('')
    console.error('💡 請確保：')
    console.error('   1. yuhao-assess-data 已推送到 GitHub')
    console.error('   2. GitHub Pages 已啓用（Settings → Pages → main branch）')
    console.error('   3. 網絡連接正常')
    process.exit(1)
  })
}
