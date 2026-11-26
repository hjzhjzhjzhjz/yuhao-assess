#!/usr/bin/env node
/**
 * 優先使用 Bun 1.4.3+ 的 bun check：多核心平行、實測比 tsc 快 4~5 倍。
 * 沒有符合版本的 Bun 時自動回退 tsc --noEmit，保持 pnpm typecheck 可用。
 */

import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { 執行或回退 } from './bun-utils.mjs'

const 根目錄 = resolve(import.meta.dirname, '..')
// typescript alias 指向 @typescript/typescript6 時 bin 為 tsc6；標準包為 tsc。
// 自動探測兩者，避免寫死路徑在 alias 環境下失效。
const tsc候選 = ['node_modules/typescript/bin/tsc', 'node_modules/typescript/bin/tsc6']
const tsc路徑 = tsc候選.map((p) => resolve(根目錄, p)).find(existsSync) ?? resolve(根目錄, tsc候選[0])
process.exit(
  執行或回退(
    '1.4.3',
    ['check', '--no-script'],
    process.execPath,
    [tsc路徑, '--noEmit'],
    根目錄,
  ),
)
