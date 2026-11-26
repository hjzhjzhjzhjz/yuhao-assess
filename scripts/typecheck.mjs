#!/usr/bin/env node
/**
 * 優先使用 Bun 1.4.3+ 的 bun check：多核心平行、實測比 tsc 快 4~5 倍。
 * 沒有符合版本的 Bun 時自動回退 tsc --noEmit，保持 pnpm typecheck 可用。
 */

import { resolve } from 'node:path'
import { 執行或回退 } from './bun-utils.mjs'

const 根目錄 = resolve(import.meta.dirname, '..')
process.exit(
  執行或回退(
    '1.4.3',
    ['check', '--no-script'],
    process.execPath,
    ['node_modules/typescript/bin/tsc', '--noEmit'],
    根目錄,
  ),
)
