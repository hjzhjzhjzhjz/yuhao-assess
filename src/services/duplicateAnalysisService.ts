/**
 * 重碼分析服務
 * 處理重碼率計算、重碼統計和重碼報告生成
 */

import type { 碼表型别, 頻數數據型别, 頻率數據型别 } from '../types/index'
import {
  charsetInfo,
  getTheoreticalCharsetSize,
  批量過濾字符集,
  type 漢字集名稱型别,
  type 累積漢字集名稱型别,
  過濾自定義字符集,
} from './charsetService'

/**
 * 同一張碼表的 14 個字符集成員集合只算一次。
 * 頁面靜態重碼分析對全碼表/簡碼表各呼叫 14 次，舊版每次都重新遍歷
 * 10 萬字符；以碼表物件 + size 爲鍵緩存批量結果，數值與逐次過濾一致。
 */
const 字符集映射快取 = new WeakMap<
  碼表型别,
  { size: number; 結果: Promise<Map<累積漢字集名稱型别, Set<string>>> }
>()

async function 取字符集映射(碼表: 碼表型别): Promise<Map<累積漢字集名稱型别, Set<string>>> {
  const 快取 = 字符集映射快取.get(碼表)
  if (快取 && 快取.size === 碼表.size) return 快取.結果
  const 結果 = 批量過濾字符集(new Set(碼表.keys()))
  字符集映射快取.set(碼表, { size: 碼表.size, 結果 })
  return 結果
}

/**
 * 計算某個字符集下的靜態重碼數
 * @param 碼表 碼表（每個字符對應唯一編碼）
 * @param 字符集 字符集，可以是字符集合或 'all' 表示全部字符
 * @returns 靜態重碼的字符數量
 */
export function 計算靜態重碼數(碼表: 碼表型别, 字符集: Set<string> | 'all' = 'all'): number {
  const codeToChars = new Map<string, string[]>()

  for (const [char, codes] of 碼表.entries()) {
    if (字符集 !== 'all' && !字符集.has(char)) {
      continue
    }

    const code = codes[0]
    if (code) {
      if (!codeToChars.has(code)) {
        codeToChars.set(code, [])
      }
      codeToChars.get(code)!.push(char)
    }
  }

  let duplicateCount = 0
  for (const chars of codeToChars.values()) {
    if (chars.length > 1) {
      duplicateCount += chars.length
    }
  }

  return duplicateCount
}

/**
 * 某字符集的重碼數據介面
 */
export interface 某字符集的重碼數據介面 {
  /** 指定的字符集 */
  charset: 漢字集名稱型别
  /** 字符集名稱 */
  charsetName: string
  description: string
  /** 理論字符集大小（該字符集應該有的總字符數） */
  theoreticalSize: number
  /** 實際有編碼的字符數（方案中收録的字符數） */
  totalChars: number
  /** 重碼字數（所有重碼字符的總數） */
  duplicateCount: number
  /** 重碼組數（有多少個編碼存在重碼） */
  duplicateGroupCount: number
  /** 重碼字佔全部字符數量的比例 */
  duplicateRate: number
  /** 唯一編碼數量 */
  uniqueCodes: number
  codeEfficiency: number
}

/**
 * 非一選重碼字的詳細信息
 */
export interface NonFirstDuplicateDetail {
  char: string // 非一選的重碼字
  code: string // 對應的編碼
  frequency: number // 該字的字頻
  rank: number // 該字在字頻表中的排名（字頻降序）
  allCharsOnCode: string[] // 該編碼上的所有字符（按字頻降序）
}

/**
 * 非一選重碼詞的詳細信息
 */
export interface NonFirstWordDuplicateDetail {
  word: string // 非一選的重碼詞
  code: string // 對應的編碼
  frequency: number // 該詞的詞頻
  rank: number // 該詞在詞頻表中的排名（詞頻降序）
  allWordsOnCode: string[] // 該編碼上的所有詞（按詞頻降序）
}

/**
 * 獲取非一選重碼字的詳細信息
 * @param codeTable 碼表（每個字符對應唯一編碼）
 * @param charFrequency 字頻數據
 * @param sortByFrequency 是否按字頻重新排序（true表示按字頻排序，false表示保持碼表原始順序）
 * @returns 非一選重碼字的詳細信息列表，按字頻降序排列
 */
export function getNonFirstDuplicateDetails(
  codeTable: 碼表型别,
  charFrequency: 頻率數據型别,
  sortByFrequency: boolean = true
): NonFirstDuplicateDetail[] {
  const codeToCharFreqs = new Map<string, Array<{ char: string; freq: number }>>()

  // 按編碼分組字符，只保留在字頻表中存在的字符
  for (const [char, codes] of codeTable.entries()) {
    const code = codes[0]
    if (code) {
      const freq = charFrequency[char]
      // 只保留字頻表中存在的字符
      if (freq !== undefined && freq > 0) {
        if (!codeToCharFreqs.has(code)) {
          codeToCharFreqs.set(code, [])
        }
        codeToCharFreqs.get(code)!.push({ char, freq })
      }
    }
  }

  // 創建字頻排名映射
  const allCharsWithFreq = Object.entries(charFrequency)
    .filter(([_, freq]) => freq > 0)
    .sort(([_, freqA], [__, freqB]) => freqB - freqA)
  const charRankMap = new Map<string, number>()
  allCharsWithFreq.forEach(([char, _], index) => {
    charRankMap.set(char, index + 1)
  })

  const results: NonFirstDuplicateDetail[] = []

  for (const [code, charFreqs] of codeToCharFreqs.entries()) {
    if (charFreqs.length > 1) {
      // 排序：按字頻降序
      if (sortByFrequency) {
        charFreqs.sort((a, b) => b.freq - a.freq)
      }

      // 獲取該編碼上所有字符
      const allCharsOnCode = charFreqs.map(item => item.char)

      // 添加非一選的字符（跳過第一個）
      for (let i = 1; i < charFreqs.length; i++) {
        const charInfo = charFreqs[i]
        if (!charInfo) continue
        results.push({
          char: charInfo.char,
          code: code,
          frequency: charInfo.freq,
          rank: charRankMap.get(charInfo.char) || 0,
          allCharsOnCode: allCharsOnCode,
        })
      }
    }
  }

  // 結果按字頻降序排列
  results.sort((a, b) => b.frequency - a.frequency)

  return results
}

/**
 * 獲取需要選重的詞語詳細信息（從帶選重鍵的詞語碼表）
 * 列出所有有選重鍵的詞，顯示去掉選重鍵後的編碼及該編碼上的所有詞
 * @param wordCodeTableWithSelection 帶選重鍵的詞語碼表（編碼末尾包含選重數字 2-9）
 * @param wordFrequency 詞頻數據
 * @returns 需要選重的詞語詳細信息列表，按詞頻降序排列
 */
export function getNonFirstWordDuplicateDetails(
  wordCodeTableWithSelection: 碼表型别,
  wordFrequency: 頻數數據型别
): NonFirstWordDuplicateDetail[] {
  // 第一步：按去掉選重鍵的編碼分組所有詞語
  const baseCodeToWords = new Map<
    string,
    Array<{ word: string; freq: number; hasSelection: boolean }>
  >()

  for (const [word, codes] of wordCodeTableWithSelection.entries()) {
    const codeWithSelection = codes[0]
    if (!codeWithSelection) continue

    const freq = wordFrequency[word]
    if (freq === undefined || freq <= 0) continue

    // 檢查是否有選重鍵
    const lastChar = codeWithSelection.slice(-1)
    const hasSelection = /[0-9]/.test(lastChar)

    // 去掉選重鍵得到基礎編碼
    const baseCode = hasSelection ? codeWithSelection.slice(0, -1) : codeWithSelection

    if (!baseCodeToWords.has(baseCode)) {
      baseCodeToWords.set(baseCode, [])
    }
    baseCodeToWords.get(baseCode)!.push({ word, freq, hasSelection })
  }

  // 創建詞頻排名映射
  const allWordsWithFreq = Object.entries(wordFrequency)
    .filter(([_, freq]) => freq > 0)
    .sort(([_, freqA], [__, freqB]) => freqB - freqA)
  const wordRankMap = new Map<string, number>()
  allWordsWithFreq.forEach(([word, _], index) => {
    wordRankMap.set(word, index + 1)
  })

  const results: NonFirstWordDuplicateDetail[] = []

  // 第二步：對每個基礎編碼，處理有選重鍵的詞
  for (const [baseCode, wordInfos] of baseCodeToWords.entries()) {
    // 按詞頻降序排序
    wordInfos.sort((a, b) => b.freq - a.freq)

    // 獲取該編碼上所有詞語（按詞頻降序）
    const allWordsOnCode = wordInfos.map(item => item.word)

    // 只添加有選重鍵的詞
    for (const wordInfo of wordInfos) {
      if (wordInfo.hasSelection) {
        results.push({
          word: wordInfo.word,
          code: baseCode, // 使用去掉選重鍵的編碼
          frequency: wordInfo.freq,
          rank: wordRankMap.get(wordInfo.word) || 0,
          allWordsOnCode: allWordsOnCode,
        })
      }
    }
  }

  // 結果按詞頻降序排列
  results.sort((a, b) => b.frequency - a.frequency)

  return results
}

/**
 * 計算某字符集的重碼數據
 * @param 全碼表 單字全碼表
 * @param 字符集 字符集類型
 * @param 預過濾字符集 由 批量過濾字符集 預先算好的成員集合；
 *   省略時行爲與舊版一致（内部自行過濾），批量分析傳入可避免重複遍歷全表
 * @returns 重碼統計結果
 */
export async function 計算某字符集的重碼數據(
  全碼表: 碼表型别,
  字符集: 漢字集名稱型别,
  預過濾字符集?: Set<string>
): Promise<某字符集的重碼數據介面> {
  let charset: Set<string>
  if (預過濾字符集) {
    charset = 預過濾字符集
  } else {
    const 快取集合 = (await 取字符集映射(全碼表)).get(字符集 as 累積漢字集名稱型别)
    charset = 快取集合 ?? (await 過濾自定義字符集(字符集, new Set(全碼表.keys())))
  }

  // 計算重碼字數和重碼組數
  const codeToChars = new Map<string, string[]>()
  for (const char of charset) {
    const codes = 全碼表.get(char)
    if (codes && codes.length > 0) {
      const code = codes[0]
      if (!code) continue
      if (!codeToChars.has(code)) {
        codeToChars.set(code, [])
      }
      codeToChars.get(code)!.push(char)
    }
  }

  let duplicateCount = 0 // 重碼字數
  let duplicateGroupCount = 0 // 重碼組數
  for (const chars of codeToChars.values()) {
    if (chars.length > 1) {
      duplicateCount += chars.length
      duplicateGroupCount++
    }
  }

  const totalChars = charset.size

  // 獲取理論字符集大小
  const theoreticalSize = await getTheoreticalCharsetSize(字符集)
  const uniqueCodes = codeToChars.size
  const info = charsetInfo[字符集]
  return {
    charset: 字符集,
    charsetName: info.name,
    description: info.description,
    theoreticalSize,
    totalChars,
    duplicateCount,
    duplicateGroupCount,
    duplicateRate: totalChars > 0 ? duplicateCount / totalChars : 0,
    uniqueCodes,
    codeEfficiency: totalChars > 0 ? uniqueCodes / totalChars : 0,
  }
}
