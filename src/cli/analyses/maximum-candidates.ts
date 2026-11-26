/**
 * 候選個數分析
 * 計算 14 個字符集下全碼編碼的最大候選個數
 */

import { 批量過濾字符集, type 累積漢字集名稱型别 } from '../../services/charsetService'
import type { 碼表型别 } from '../../types'
import type { 最大候選個數分析結果 } from '../../atoms/maximumCandidates'

const CHARSET_LIST: 累積漢字集名稱型别[] = [
  'GB2312',
  '通用規範',
  '常用國字',
  'CJK基本',
  '到CJK擴A',
  '到CJK擴B',
  '到CJK擴C',
  '到CJK擴D',
  '到CJK擴E',
  '到CJK擴F',
  '到CJK擴G',
  '到CJK擴H',
  '到CJK擴I',
  '到CJK擴J',
]

export async function analyzeMaximumCandidates(
  fullCodeTable: 碼表型别
): Promise<最大候選個數分析結果> {
  const allChars = new Set(fullCodeTable.keys())
  const 字符集映射 = await 批量過濾字符集(allChars)
  const result: Partial<最大候選個數分析結果> = {}

  // 全碼表按編碼分組只做一次（原版 14 個字符集各重建一次）
  const codeToChars = new Map<string, string[]>()
  for (const [char, codes] of fullCodeTable.entries()) {
    const code = codes[0]
    if (!code) continue
    let 組 = codeToChars.get(code)
    if (!組) {
      組 = []
      codeToChars.set(code, 組)
    }
    組.push(char)
  }

  for (const charsetName of CHARSET_LIST) {
    const charset = 字符集映射.get(charsetName) ?? new Set<string>()

    // 組内屬於該字符集的字符數等價於原版只放入該字符集字符後的組長度；
    // 計數爲 0 的組在原版中根本不存在，必須跳過，否則空字符集會列出全部編碼
    let maxCandidates = 0
    const codeList: string[] = []
    for (const [code, chars] of codeToChars) {
      let 個數 = 0
      for (const char of chars) {
        if (charset.has(char)) 個數++
      }
      if (個數 === 0) continue
      if (個數 > maxCandidates) {
        maxCandidates = 個數
        codeList.length = 0
        codeList.push(code)
      } else if (個數 === maxCandidates) {
        codeList.push(code)
      }
    }

    ;(result as Record<string, { 最大候選個數: number; 編碼列表: string[] }>)[charsetName] = {
      最大候選個數: maxCandidates,
      編碼列表: codeList,
    }
  }

  result.字符數 = fullCodeTable.size
  result.更新時間 = new Date().toISOString()
  return result as 最大候選個數分析結果
}
