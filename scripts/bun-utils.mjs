#!/usr/bin/env node
/**  locating a sufficiently new Bun without requiring it on PATH. */

import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { homedir, platform } from 'node:os'
import { join } from 'node:path'

const 後綴 = platform() === 'win32' ? '.exe' : ''

function 解析版本(字串) {
  const 匹配 = 字串.match(/(\d+)\.(\d+)\.(\d+)/)
  return 匹配 ? 匹配.slice(1).map(Number) : [0, 0, 0]
}

function 比較版本(甲, 乙) {
  for (let i = 0; i < 3; i++) {
    if (甲[i] !== 乙[i]) return 甲[i] - 乙[i]
  }
  return 0
}

/** 回傳符合最低版本的 bun 可執行檔路徑；找不到回傳 null。 */
export function 找可用Bun(最低版本 = '1.4.3') {
  const 候選 = [
    process.env.BUN_PATH,
    join(homedir(), '.bun', 'bin', 'bun' + 後綴),
    'bun',
  ].filter(Boolean)
  const 標準 = 解析版本(最低版本)

  for (const 路徑 of 候選) {
    if (路徑 !== 'bun' && !existsSync(路徑)) continue
    const 結果 = spawnSync(路徑, ['--version'], { encoding: 'utf8' })
    if (結果.error || 結果.status !== 0) continue
    if (比較版本(解析版本(結果.stdout || ''), 標準) >= 0) return 路徑
  }
  return null
}

/** 找到 bun 就跑 bun 命令，否則執行回退命令。 */
export function 執行或回退(最低版本, bun參數, 回退命令, 回退參數, 根目錄) {
  const bun = 找可用Bun(最低版本)
  if (bun) {
    const 結果 = spawnSync(bun, bun參數, { cwd: 根目錄, stdio: 'inherit' })
    if (!結果.error) return 結果.status ?? 1
  }
  console.warn('⚠️ 未找到符合版本的 Bun，回退到相容命令')
  const 結果 = spawnSync(回退命令, 回退參數, { cwd: 根目錄, stdio: 'inherit' })
  return 結果.status ?? 1
}
