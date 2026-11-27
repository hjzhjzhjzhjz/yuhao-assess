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
 * 計算某個字頻數據下的動態選重率
 * @param 碼表 碼表（每個字符對應唯一編碼）
 * @param 字頻數據 字頻數據
 * @param 是否按字頻排序 是否按字頻重新排序，false 表示保持原始碼表排序
 * @returns 動態重碼率（0-1之間的小數）
 */
export function 計算動態選重率(
  碼表: 碼表型别,
  字頻數據: 頻率數據型别,
  是否按字頻排序: boolean = true
): number {
  const codeToCharFreqs = new Map<string, Array<{ char: string; freq: number }>>()
  let totalFreq = 0

  for (const [char, codes] of 碼表.entries()) {
    // 分母是碼表全部字符的字頻之和，與分組同一次遍歷累加（舊版會再遍歷一次全表）
    totalFreq += 字頻數據[char] || 0
    const code = codes[0]
    if (code) {
      const freq = 字頻數據[char] || 0

      if (!codeToCharFreqs.has(code)) {
        codeToCharFreqs.set(code, [])
      }
      codeToCharFreqs.get(code)!.push({ char, freq })
    }
  }

  let totalDupFreq = 0

  for (const charFreqs of codeToCharFreqs.values()) {
    if (charFreqs.length > 1) {
      if (是否按字頻排序) {
        charFreqs.sort((a, b) => b.freq - a.freq)
      }

      const groupTotalFreq = charFreqs.reduce((sum, item) => sum + item.freq, 0)
      const firstChar = charFreqs[0]
      if (firstChar) {
        totalDupFreq += groupTotalFreq - firstChar.freq
      }
    }
  }

  return totalFreq > 0 ? totalDupFreq / totalFreq : 0
}

/**
 * 從原始碼表（爲經過排序，帶選重鍵）計算動態選重率
 * 適用於 fullWithSelection 和 shortWithSelection 碼表
 * @param 全碼加選重鍵表 帶選重鍵的碼表（編碼末尾包含選重數字 2-9）
 * @param 字頻數據 字頻數據
 * @returns 動態重碼率（0-1之間的小數）
 */
export function 計算原始碼表的動態選重率(全碼加選重鍵表: 碼表型别, 字頻數據: 頻率數據型别): number {
  let totalDupFreq = 0
  let totalFreq = 0

  for (const [char, codes] of 全碼加選重鍵表.entries()) {
    const code = codes[0]
    if (!code) continue

    const freq = 字頻數據[char] || 0
    totalFreq += freq

    // 檢查編碼最後一位是否爲數字 0-9（表示需要選重）
    // 字符碼區間比較等價於 /[0-9]/.test，避免每字建立正則匹配
    const lastChar = code.slice(-1)
    const isSelection = lastChar >= '0' && lastChar <= '9'

    if (isSelection) {
      totalDupFreq += freq
    }
  }

  return totalFreq > 0 ? totalDupFreq / totalFreq : 0
}

/**
 * 剥離選重鍵與補位下劃線，取得基礎編碼。
 * 與碼表處理服務的約定一致：選重位置 > 1 時末尾追加數字（可能多位），
 * 位置 = 1 且未達最大碼長時末尾補 '_'；達最大碼長時不補。
 */
function 剥選重鍵(編碼: string): string {
  // 從尾部向後掃描數字字符碼，等價於 /[0-9]+$/ 的 replace，但避免正則開銷。
  // 該函數在 10 萬字級循環中被呼叫兩次，是 CLI 熱點之一。
  let end = 編碼.length
  while (end > 0) {
    const cc = 編碼.charCodeAt(end - 1)
    if (cc >= 48 && cc <= 57) end--
    else break
  }
  let c = end === 編碼.length ? 編碼 : 編碼.slice(0, end)
  if (c.endsWith('_')) c = c.slice(0, -1)
  return c
}

/**
 * 「出簡不出全」重排後的候選字項
 */
export interface 出簡重排字項 {
  /** 字符 */
  字: string
  /** 重排後的選重位次（從 1 起） */
  位次: number
  /** 字頻 */
  字頻: number
  /** 是否需要選重（位次 > 1 且組内 ≥2 個字頻 > 0） */
  需選重: boolean
}

/**
 * 構建「出簡不出全」重排後的候選組映射。
 *
 * 規則：
 * - 以全碼加選重鍵表爲基礎，按基礎編碼分組；
 * - 擁有更短簡碼（簡碼表中最短碼長 < 全碼基礎碼長）的字退出其全碼候選組
 *   （出簡不出全），不再與同組其餘字競爭；
 * - 剩餘字按原序（文件順序）或字頻降序重排位次；
 * - 同組有 ≥2 個字頻 > 0 時，位次 > 1 的字標記爲需選重。
 *
 * 例如 cqii 組原爲「束(1)、杏(2)、𘭌(3)、𪱳(4)」，束另有簡碼 cqi → 退出，
 * 重排後杏成爲首選（無選重），杏束不再構成重碼。
 *
 * @param 全碼加選重鍵表 帶選重鍵的全碼表（每字最長碼）
 * @param 簡碼表 簡碼表（每字最短碼）
 * @param 字頻數據 字頻數據
 * @param 是否按字頻排序 組内是否按字頻降序排列
 * @returns 基礎編碼 → 候選字項列表
 */
export function 構建出簡重排組映射(
  全碼加選重鍵表: 碼表型别,
  簡碼表: 碼表型别,
  字頻數據: 頻率數據型别,
  是否按字頻排序: boolean
): Map<string, 出簡重排字項[]> {
  // 按基礎編碼收集，保留文件順序（Map 插入序即處理時的字符順序）
  const 原始組 = new Map<string, Array<{ 字: string; 字頻: number; 序: number }>>()
  let 序號 = 0
  for (const [字, codes] of 全碼加選重鍵表.entries()) {
    const 編碼 = codes[0]
    if (!編碼) continue
    const 基礎 = 剥選重鍵(編碼)
    const 短碼 = 簡碼表.get(字)?.[0]
    // 出簡不出全：該字擁有更短的簡碼 → 退出全碼候選組
    if (短碼 !== undefined && 短碼.length < 基礎.length) continue
    if (!原始組.has(基礎)) 原始組.set(基礎, [])
    原始組.get(基礎)!.push({ 字, 字頻: 字頻數據[字] || 0, 序: 序號++ })
  }

  const 結果 = new Map<string, 出簡重排字項[]>()
  for (const [基礎, 列表] of 原始組.entries()) {
    const 排序列表 = 是否按字頻排序
      ? [...列表].sort((a, b) => b.字頻 - a.字頻 || a.序 - b.序)
      : [...列表].sort((a, b) => a.序 - b.序)
    const 有頻數 = 排序列表.filter(x => x.字頻 > 0).length
    const 組 = 排序列表.map((x, i) => ({
      字: x.字,
      位次: i + 1,
      字頻: x.字頻,
      // 位次 > 1 且組内至少有 2 個字頻 > 0 的實際競爭對手
      需選重: 有頻數 >= 2 && i >= 1,
    }))
    結果.set(基礎, 組)
  }
  return 結果
}

// 同一份簡碼表會被不同字集重複傳入，查找表按物件身份快取。
const 簡碼查找快取 = new WeakMap<object, Map<string, string[] | undefined>>()

function 取簡碼查找(簡碼表: 碼表型别): Map<string, string[] | undefined> {
  let 查找 = 簡碼查找快取.get(簡碼表)
  if (!查找) {
    查找 = new Map(簡碼表)
    簡碼查找快取.set(簡碼表, 查找)
  }
  return 查找
}

/**
 * 計算「出簡不出全」重排後的動態選重率。
 *
 * 分母爲全方案所有字的字頻之和（含擁有簡碼、經由簡碼上屏的字，它們不計入分子）；
 * 分子爲重排後仍需選重的字頻之和。與「全碼」列共用同一分母，故兩者可直接比較。
 *
 * fast-anything profile 顯示這一支是 CLI 最大熱點（約 1/4 時間）。
 * Rust 移植經 verify 正確，但 napi 把 10 萬條 Map/陣列傳進去比原版慢 3 倍，
 * 因此留在 TypeScript：去掉每字一個物件、去掉 filter 臨時陣列並快取簡碼查找表。
 *
 * @param 全碼加選重鍵表 帶選重鍵的全碼表（每字最長碼）
 * @param 簡碼表 簡碼表（每字最短碼）
 * @param 字頻數據 字頻數據
 * @param 是否按字頻排序 組内是否按字頻降序排列
 * @returns 動態重碼率（0-1 之間的小數）
 */
export function 計算出簡重排選重率(
  全碼加選重鍵表: 碼表型别,
  簡碼表: 碼表型别,
  字頻數據: 頻率數據型别,
  是否按字頻排序: boolean
): number {
  // 分母：全方案所有字的字頻之和（與「全碼」列共用，每次遍歷累加）
  let totalFreq = 0
  for (const [字, codes] of 全碼加選重鍵表) {
    if (codes[0]) totalFreq += 字頻數據[字] || 0
  }

  const 簡碼查找 = 取簡碼查找(簡碼表)
  // 每組只存 [字頻, 序]，不再爲 10 萬字各建一個 { 字, 字頻, 序, 位次, 需選重 } 物件
  const 組映射 = new Map<string, Array<[number, number]>>()
  let 序號 = 0
  for (const [字, codes] of 全碼加選重鍵表) {
    const 編碼 = codes[0]
    if (!編碼) continue
    const 基礎 = 剥選重鍵(編碼)
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
    if (是否按字頻排序) {
      組.sort((a, b) => b[0] - a[0] || a[1] - b[1])
    }
    let 有頻數 = 0
    for (const x of 組) if (x[0] > 0) 有頻數++
    if (有頻數 >= 2) {
      for (let i = 1; i < 組.length; i++) totalDupFreq += 組[i]![0]
    }
  }

  return totalFreq > 0 ? totalDupFreq / totalFreq : 0
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
 * 計算詞語的動態選重率（從帶選重鍵的詞語碼表）
 * 詞語碼表已按詞頻排序，直接檢查編碼末尾是否有選重鍵即可
 * @param wordCodeTableWithSelection 帶選重鍵的詞語碼表（編碼末尾包含選重數字 2-9）
 * @param wordFrequency 詞頻數據
 * @returns 動態重碼率（0-1之間的小數）
 */
export function getWordDynamicDupRate(
  wordCodeTableWithSelection: 碼表型别,
  wordFrequency: 頻數數據型别
): number {
  let totalDupFreq = 0
  let totalFreq = 0

  for (const [word, codes] of wordCodeTableWithSelection.entries()) {
    const code = codes[0]
    if (!code) continue

    const freq = wordFrequency[word] || 0
    totalFreq += freq

    // 檢查編碼最後一位是否爲數字 0-9（表示需要選重）
    const lastChar = code.slice(-1)
    const isSelection = lastChar >= '0' && lastChar <= '9'

    if (isSelection) {
      totalDupFreq += freq
    }
  }

  return totalFreq > 0 ? totalDupFreq / totalFreq : 0
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
    const hasSelection = lastChar >= '0' && lastChar <= '9'

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
