#!/usr/bin/env node
/**
 * 數據下載入口：有 Bun 1.4.3+ 就用 FetchSession 並行下載，否則用原有 node 串行腳本。
 */

import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { 找可用Bun } from './bun-utils.mjs'

const 根目錄 = resolve(fileURLToPath(new URL('..', import.meta.url)))
const bun = 找可用Bun('1.4.3')

if (bun) {
  const { spawnSync } = await import('node:child_process')
  const 結果 = spawnSync(bun, ['scripts/fetch-data.bun.js'], { cwd: 根目錄, stdio: 'inherit' })
  process.exit(結果.status ?? 1)
} else {
  const { spawnSync } = await import('node:child_process')
  const 結果 = spawnSync(process.execPath, ['scripts/fetch-data.js'], { cwd: 根目錄, stdio: 'inherit' })
  process.exit(結果.status ?? 1)
}
