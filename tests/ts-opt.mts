/**
 * 純 TS 微優化對照測試
 *
 * 三個语义完全等价的改动，用「旧实现内嵌为参考」逐项对比新实现：
 *  1. Array.from(char).length 单码点判断 → 零分配码点判断
 *  2. /[0-9]/.test(lastChar) → 字符码比较
 *  3. 剥選重鍵 replace(/[0-9]+$/,'') → 尾部字符码扫描
 * 另有端到端：舊_計算出簡重排選重率 vs 新实现。
 */

import { 計算出簡重排選重率 } from '../src/services/duplicateAnalysisService.ts'

let 通过数 = 0
let 失败数 = 0
function 断言(条件: boolean, 说明: string, 详情 = '') {
  if (条件) {
    通过数++
  } else {
    失败数++
    console.log(`  ❌ ${说明} ${详情}`)
  }
}

// ---------- 新实现（与源码保持一致，用于微层对比） ----------
function isHigh(c: number) {
  return c >= 0xd800 && c <= 0xdbff
}
function isLow(c: number) {
  return c >= 0xdc00 && c <= 0xdfff
}
function isSingleCodePoint(s: string): boolean {
  if (s.length === 1) return true
  return s.length === 2 && isHigh(s.charCodeAt(0)) && isLow(s.charCodeAt(1))
}
function 碼點數大於一(s: string): boolean {
  if (s.length > 2) return true
  if (s.length === 2) return !(isHigh(s.charCodeAt(0)) && isLow(s.charCodeAt(1)))
  return false
}
function 新_isSelection(lastChar: string): boolean {
  return lastChar >= '0' && lastChar <= '9'
}
function 新_剥選重鍵(編碼: string): string {
  let end = 編碼.length
  while (end > 0) {
    const c = 編碼.charCodeAt(end - 1)
    if (c >= 48 && c <= 57) end--
    else break
  }
  let c = end === 編碼.length ? 編碼 : 編碼.slice(0, end)
  if (c.endsWith('_')) c = c.slice(0, -1)
  return c
}

// ---------- 旧实现（参考基准） ----------
function 舊_isSingleCodePoint(s: string): boolean {
  return Array.from(s).length === 1
}
function 舊_碼點數大於一(s: string): boolean {
  return Array.from(s).length > 1
}
function 舊_isSelection(lastChar: string): boolean {
  return /[0-9]/.test(lastChar)
}
function 舊_剥選重鍵(編碼: string): string {
  let c = 編碼.replace(/[0-9]+$/, '')
  if (c.endsWith('_')) c = c.slice(0, -1)
  return c
}

// ---------- 测试 1：单码点判断等价 ----------
{
  const 样本 = [
    '',
    'a',
    '中',
    '𠀀',
    '𪱳',
    'ab',
    '中文',
    'a中',
    '🇨🇳',
    '\ud800',
    '\udc00',
    '\ud800a',
    'a\udc00',
    '\ud800\udc00',
    '	',
    '\udbff\udfff',
  ]
  for (const s of 样本) {
    断言(
      isSingleCodePoint(s) === 舊_isSingleCodePoint(s),
      `isSingleCodePoint 等价`,
      JSON.stringify(s)
    )
    断言(碼點數大於一(s) === 舊_碼點數大於一(s), `碼點數大於一 等价`, JSON.stringify(s))
  }
  console.log(`测试1 单码点判断：${样本.length * 2} 项`)
}

// ---------- 测试 2：选重键字符码判断等价 ----------
{
  const 样本 = ['', 'a', '0', '5', '9', '_', 'c', 'q', 'x', '中', '2', '8', '10', '１']
  for (const last of 样本) {
    断言(新_isSelection(last) === 舊_isSelection(last), `isSelection 等价`, JSON.stringify(last))
  }
  // 随机字符串
  for (let i = 0; i < 2000; i++) {
    const last = String.fromCharCode(32 + Math.floor(Math.random() * 96))
    断言(
      新_isSelection(last) === 舊_isSelection(last),
      `isSelection 随机等价`,
      JSON.stringify(last)
    )
  }
  console.log(`测试2 选重键判断：${样本.length + 2000} 项`)
}

// ---------- 测试 3：剥选键扫描等价 ----------
{
  const 样本 = [
    'abc',
    'abc2',
    'abc23',
    'abc_',
    'abc2_',
    'abc_2',
    'abc123_',
    'a',
    '',
    '12',
    '_',
    '2',
    'cqi',
    'cqii2',
    'ab_99',
    '中2',
  ]
  for (const s of 样本) {
    断言(新_剥選重鍵(s) === 舊_剥選重鍵(s), `剥選重鍵 等价`, JSON.stringify(s))
  }
  for (let i = 0; i < 5000; i++) {
    const len = 1 + Math.floor(Math.random() * 6)
    let s = ''
    for (let j = 0; j < len; j++) {
      const pool = 'abcXYZ_0123456789中'
      s += pool[Math.floor(Math.random() * pool.length)]
    }
    断言(新_剥選重鍵(s) === 舊_剥選重鍵(s), `剥選重鍵 随机等价`, JSON.stringify(s))
  }
  console.log(`测试3 剥选键：${样本.length + 5000} 项`)
}

// ---------- 测试 4：端到端 計算出簡重排選重率 ----------
{
  // 旧实现完整版（复制自优化前源码）
  function 舊計算(
    全碼加選重鍵表: Map<string, string[]>,
    簡碼表: Map<string, string[]>,
    字頻數據: Record<string, number>,
    是否按字頻排序: boolean
  ): number {
    function 剥(編碼: string): string {
      let c = 編碼.replace(/[0-9]+$/, '')
      if (c.endsWith('_')) c = c.slice(0, -1)
      return c
    }
    let totalFreq = 0
    for (const [字, codes] of 全碼加選重鍵表) {
      if (codes[0]) totalFreq += 字頻數據[字] || 0
    }
    const 簡碼查找 = new Map(簡碼表)
    const 組映射 = new Map<string, Array<[number, number]>>()
    let 序號 = 0
    for (const [字, codes] of 全碼加選重鍵表) {
      const 編碼 = codes[0]
      if (!編碼) continue
      const 基礎 = 剥(編碼)
      const 短碼 = 簡碼查找.get(字)?.[0]
      if (短碼 !== undefined && 短碼.length < 基礎.length) continue
      let 組 = 組映射.get(基礎)
      if (!組) {
        組 = []
        組映射.set(基礎, 組)
      }
      組.push([字頻數據[字] || 0, 序號++])
    }
    let totalDupFreq = 0
    for (const 組 of 組映射.values()) {
      if (是否按字頻排序) 組.sort((a, b) => b[0] - a[0] || a[1] - b[1])
      let 有頻數 = 0
      for (const x of 組) if (x[0] > 0) 有頻數++
      if (有頻數 >= 2) {
        for (let i = 1; i < 組.length; i++) totalDupFreq += 組[i]![0]
      }
    }
    return totalFreq > 0 ? totalDupFreq / totalFreq : 0
  }

  // 构造几组随机码表
  for (let round = 0; round < 8; round++) {
    const N = 200 + round * 100
    const 全表 = new Map<string, string[]>()
    const 簡表 = new Map<string, string[]>()
    const 字頻: Record<string, number> = {}
    for (let i = 0; i < N; i++) {
      const 字 = String.fromCodePoint(0x4e00 + i)
      // 若干组重码：编码取 i 的一部分落入同组
      const 基础码 = 'abc' + String.fromCharCode(97 + (i % 40))
      const 位置 = 1 + (i % 3)
      const 编码 = 位置 === 1 ? 基础码 : 基础码 + 位置
      全表.set(字, [编码])
      if (i % 5 === 0) 簡表.set(字, [基础码.slice(0, 3)])
      字頻[字] = Math.floor(Math.random() * 1000)
    }
    for (const 排序 of [true, false]) {
      const 旧值 = 舊計算(全表, 簡表, 字頻, 排序)
      const 新值 = 計算出簡重排選重率(全表 as never, 簡表 as never, 字頻 as never, 排序)
      // 新实现内部有 WeakMap 缓存，用同一对象再次调用验证缓存不污染结果
      const 新值2 = 計算出簡重排選重率(全表 as never, 簡表 as never, 字頻 as never, 排序)
      断言(
        Math.abs(旧值 - 新值) < 1e-14,
        `端到端 round=${round} 排序=${排序} 等价`,
        `旧=${旧值} 新=${新值}`
      )
      断言(新值 === 新值2, `端到端缓存不污染 round=${round}`, `${新值} vs ${新值2}`)
    }
  }
  console.log(`测试4 端到端：16 项`)
}

console.log(`\n结果：${通过数} 通过 / ${失败数} 失败`)
if (失败数 > 0) process.exit(1)
