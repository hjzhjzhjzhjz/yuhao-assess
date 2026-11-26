/**
 * Bun 1.4.3+ 版數據下載：Bun.FetchSession 提供獨立連接池與 keep-alive，
 * 全部文件並行下載，完成後寫入暫存檔再原子重命名，避免留下半截文件。
 */

import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const 腳本目錄 = path.dirname(fileURLToPath(import.meta.url))
const 根目錄 = path.resolve(腳本目錄, '..')
const CDN_BASE = 'https://zhuyuhao.com/yuhao-assess-data/'
const DATA_DIR = path.join(根目錄, 'public/data')
const SCHEMES_DIR = path.join(根目錄, 'public/schemes')
const TEXTS_DIR = path.join(根目錄, 'public/texts')

const DATA_FILES = [
  'data/charAbsoluteFrequencyZhihu.json',
  'data/charAbsoluteFrequencySC.json',
  'data/charAbsoluteFrequencyTC.json',
  'data/charAbsoluteFrequencyGuji.json',
  'data/wordAbsoluteFrequencySC.json',
  'data/charsets.json',
]
const TEXT_FILES = ['texts/literature.txt']

async function 取啓用方案() {
  try {
    const 內容 = await fs.readFile(
      path.join(根目錄, 'public/settings/builtin-schemes.json'),
      'utf8',
    )
    const 設定 = JSON.parse(內容)
    return 設定.schemes.filter(方案 => 方案.enabled).map(方案 => `schemes/${方案.key}.json`)
  } catch {
    console.warn('⚠️ 找不到 builtin-schemes.json，跳過方案文件')
    return []
  }
}

async function 下載一項(session, 任務) {
  const 目標 = path.join(任務.目錄, path.basename(任務.文件))
  const 暫存 = 目標 + '.part'
  const 回應 = await session.fetch(CDN_BASE + 任務.文件)
  if (!回應.ok) throw new Error(`HTTP ${回應.status}: ${任務.文件}`)

  await Bun.write(暫存, await 回應.arrayBuffer())
  await fs.rename(暫存, 目標)
  const 大小 = ((await fs.stat(目標)).size / 1024).toFixed(2)
  console.log(`✅ ${任務.文件} (${大小} KB)`)
}

async function main() {
  const 方案 = await 取啓用方案()
  const 任務 = [
    ...DATA_FILES.map(文件 => ({ 文件, 目錄: DATA_DIR })),
    ...TEXT_FILES.map(文件 => ({ 文件, 目錄: TEXTS_DIR })),
    ...方案.map(文件 => ({ 文件, 目錄: SCHEMES_DIR })),
  ]
  for (const 目錄 of [DATA_DIR, SCHEMES_DIR, TEXTS_DIR]) {
    await fs.mkdir(目錄, { recursive: true })
  }

  console.log(`🚀 FetchSession 並行下載 ${任務.length} 個文件...`)
  console.log(`📦 CDN: ${CDN_BASE}`)
  const 開始 = performance.now()
  const session = new Bun.FetchSession({
    keepAlive: { idleTimeout: 30, maxIdleSockets: 8 },
  })
  try {
    const 結果 = await Promise.allSettled(任務.map(項目 => 下載一項(session, 項目)))
    const 失敗 = 結果.filter(項目 => 項目.status === 'rejected')
    if (失敗.length > 0) {
      for (const 項目 of 失敗) console.error('❌', 項目.reason?.message ?? 項目.reason)
      throw new Error(`${失敗.length} 個文件下載失敗`)
    }
  } finally {
    session.close()
  }
  const 耗時 = ((performance.now() - 開始) / 1000).toFixed(2)
  console.log(`🎉 ${任務.length} 個文件全部完成（${耗時} 秒）`)
}

main().catch(錯誤 => {
  console.error('❌ 下載失敗：', 錯誤.message)
  process.exit(1)
})
