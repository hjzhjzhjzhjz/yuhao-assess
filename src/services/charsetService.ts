// 導入 Jotai atom
import { getDefaultStore } from 'jotai'
import { 字符集數據原子狀態, CJK區塊數據原子狀態 } from '../atoms/charset'
import type { 字符集數據型别, CJK區塊數據型别 } from '../atoms/charset'
import { 加載JSON數據文件 } from '../utils/data-loader'

// 加載字符集數據（使用 atom 全局緩存）
async function loadCharsetData(): Promise<void> {
  const store = getDefaultStore()
  const existing = store.get(字符集數據原子狀態)
  if (existing) return

  const data = await 加載JSON數據文件<字符集數據型别>('charsets.json')
  store.set(字符集數據原子狀態, data)
}

// 加載CJK區塊數據（使用 atom 全局緩存）
export async function loadCJKBlockData(): Promise<void> {
  const store = getDefaultStore()
  const existing = store.get(CJK區塊數據原子狀態)
  if (existing) return

  // cjkBlocks.json 在 settings 文件夹，不在 data 文件夹
  const response = await fetch('/settings/cjkBlocks.json')
  const CJK區塊數據 = (await response.json()) as CJK區塊數據型别
  store.set(CJK區塊數據原子狀態, CJK區塊數據)
}

// 字符集檢查函數
export async function isInGB2312(char: string): Promise<boolean> {
  await loadCharsetData()
  const store = getDefaultStore()
  const charsetData = store.get(字符集數據原子狀態)
  return charsetData?.[char]?.is_gb2312 ?? false
}

export async function isInGuozi(char: string): Promise<boolean> {
  await loadCharsetData()
  const store = getDefaultStore()
  const charsetData = store.get(字符集數據原子狀態)
  return charsetData?.[char]?.is_guozi ?? false
}

export async function isInTonggui(char: string): Promise<boolean> {
  await loadCharsetData()
  const store = getDefaultStore()
  const charsetData = store.get(字符集數據原子狀態)
  return charsetData?.[char]?.is_tonggui ?? false
}

// CJK Unicode範圍檢查函數 - 使用 atom 獲取數據
//
// 效能：原實作每判斷一個字符都要 getDefaultStore() + 兩次 parseInt(..., 16)，
// 累積字符集（到CJK擴X）還會鏈式呼叫最多 11 個檢查器；10 萬字 × 14 個
// 字符集會産生數百萬次重複解析。這裏按 atom 數據引用緩存解析後的數值邊界，
// 判定結果與逐次 parseInt 完全一致（無效邊界 → NaN → 比較恆 false）。
type 區塊邊界 = { start: number; end: number }
let 區塊邊界快取來源: CJK區塊數據型别 | null = null
let 區塊邊界快取: Record<string, 區塊邊界> | null = null

function 取區塊邊界(): Record<string, 區塊邊界> | null {
  const 數據 = getDefaultStore().get(CJK區塊數據原子狀態)
  if (!數據) return null
  if (區塊邊界快取來源 === 數據 && 區塊邊界快取) return 區塊邊界快取
  const 邊界表: Record<string, 區塊邊界> = {}
  for (const [名稱, 區塊] of Object.entries(數據.blocks)) {
    if (區塊) 邊界表[名稱] = { start: parseInt(區塊.start, 16), end: parseInt(區塊.end, 16) }
  }
  區塊邊界快取來源 = 數據
  區塊邊界快取 = 邊界表
  return 邊界表
}

function 字符在區塊(char: string, 區塊名: string): boolean {
  const 邊界表 = 取區塊邊界()
  if (!邊界表) return false
  const codePoint = char.codePointAt(0)
  if (!codePoint) return false
  const 邊界 = 邊界表[區塊名]
  if (!邊界) return false
  return codePoint >= 邊界.start && codePoint <= 邊界.end
}

export function isInCJKBasic(char: string): boolean {
  return 字符在區塊(char, 'cjk_basic')
}

export function isInCJKA(char: string): boolean {
  return 字符在區塊(char, 'cjk_a')
}

export function isInCJKB(char: string): boolean {
  return 字符在區塊(char, 'cjk_b')
}

export function isInCJKC(char: string): boolean {
  return 字符在區塊(char, 'cjk_c')
}

export function isInCJKD(char: string): boolean {
  return 字符在區塊(char, 'cjk_d')
}

export function isInCJKE(char: string): boolean {
  return 字符在區塊(char, 'cjk_e')
}

export function isInCJKF(char: string): boolean {
  return 字符在區塊(char, 'cjk_f')
}

export function isInCJKG(char: string): boolean {
  return 字符在區塊(char, 'cjk_g')
}

export function isInCJKH(char: string): boolean {
  return 字符在區塊(char, 'cjk_h')
}

export function isInCJKI(char: string): boolean {
  return 字符在區塊(char, 'cjk_i')
}

export function isInCJKJ(char: string): boolean {
  return 字符在區塊(char, 'cjk_j')
}

// 累積的CJK範圍檢查函數 - "到X區"
export function isInCJKToBasic(char: string): boolean {
  return isInCJKBasic(char)
}

export function isInCJKToA(char: string): boolean {
  return isInCJKBasic(char) || isInCJKA(char)
}

export function isInCJKToB(char: string): boolean {
  return isInCJKBasic(char) || isInCJKA(char) || isInCJKB(char)
}

export function isInCJKToC(char: string): boolean {
  return isInCJKBasic(char) || isInCJKA(char) || isInCJKB(char) || isInCJKC(char)
}

export function isInCJKToD(char: string): boolean {
  return isInCJKBasic(char) || isInCJKA(char) || isInCJKB(char) || isInCJKC(char) || isInCJKD(char)
}

export function isInCJKToE(char: string): boolean {
  return (
    isInCJKBasic(char) ||
    isInCJKA(char) ||
    isInCJKB(char) ||
    isInCJKC(char) ||
    isInCJKD(char) ||
    isInCJKE(char)
  )
}

export function isInCJKToF(char: string): boolean {
  return (
    isInCJKBasic(char) ||
    isInCJKA(char) ||
    isInCJKB(char) ||
    isInCJKC(char) ||
    isInCJKD(char) ||
    isInCJKE(char) ||
    isInCJKF(char)
  )
}

export function isInCJKToG(char: string): boolean {
  return (
    isInCJKBasic(char) ||
    isInCJKA(char) ||
    isInCJKB(char) ||
    isInCJKC(char) ||
    isInCJKD(char) ||
    isInCJKE(char) ||
    isInCJKF(char) ||
    isInCJKG(char)
  )
}

export function isInCJKToH(char: string): boolean {
  return (
    isInCJKBasic(char) ||
    isInCJKA(char) ||
    isInCJKB(char) ||
    isInCJKC(char) ||
    isInCJKD(char) ||
    isInCJKE(char) ||
    isInCJKF(char) ||
    isInCJKG(char) ||
    isInCJKH(char)
  )
}

export function isInCJKToI(char: string): boolean {
  return (
    isInCJKBasic(char) ||
    isInCJKA(char) ||
    isInCJKB(char) ||
    isInCJKC(char) ||
    isInCJKD(char) ||
    isInCJKE(char) ||
    isInCJKF(char) ||
    isInCJKG(char) ||
    isInCJKH(char) ||
    isInCJKI(char)
  )
}

export function isInCJKToJ(char: string): boolean {
  return (
    isInCJKBasic(char) ||
    isInCJKA(char) ||
    isInCJKB(char) ||
    isInCJKC(char) ||
    isInCJKD(char) ||
    isInCJKE(char) ||
    isInCJKF(char) ||
    isInCJKG(char) ||
    isInCJKH(char) ||
    isInCJKI(char) ||
    isInCJKJ(char)
  )
}

// 字符集檢查器映射
const 細胞漢字集檢查器映射 = {
  GB2312: isInGB2312,
  通用規範: isInTonggui,
  常用國字: isInGuozi,
  CJK基本: isInCJKBasic,
  CJK擴A: isInCJKA,
  CJK擴B: isInCJKB,
  CJK擴C: isInCJKC,
  CJK擴D: isInCJKD,
  CJK擴E: isInCJKE,
  CJK擴F: isInCJKF,
  CJK擴G: isInCJKG,
  CJK擴H: isInCJKH,
  CJK擴I: isInCJKI,
  CJK擴J: isInCJKJ,
}

const 累積漢字集檢查器映射 = {
  GB2312: isInGB2312,
  通用規範: isInTonggui,
  常用國字: isInGuozi,
  CJK基本: isInCJKBasic,
  到CJK擴A: isInCJKToA,
  到CJK擴B: isInCJKToB,
  到CJK擴C: isInCJKToC,
  到CJK擴D: isInCJKToD,
  到CJK擴E: isInCJKToE,
  到CJK擴F: isInCJKToF,
  到CJK擴G: isInCJKToG,
  到CJK擴H: isInCJKToH,
  到CJK擴I: isInCJKToI,
  到CJK擴J: isInCJKToJ,
}

export const 漢字集檢查器映射 = {
  ...細胞漢字集檢查器映射,
  ...累積漢字集檢查器映射,
}

/**
 * 細胞漢字集，指的是單獨的字符集，如 GB2312、CJK基本區、CJK擴展A區等。
 */
export type 細胞漢字集名稱型别 = keyof typeof 細胞漢字集檢查器映射
/**
 * 累積漢字集，指的是從CJK基本區開始，逐步累積擴展區的字符集，外加GB2312等。
 * 如 "GB2312"、"到CJK擴A區"、"到CJK擴B區" 等。
 */
export type 累積漢字集名稱型别 = keyof typeof 累積漢字集檢查器映射
/**
 * 包含所有字符集的聯合型别，既包括細胞漢字集，也包括累積漢字集。
 */
export type 漢字集名稱型别 = keyof typeof 漢字集檢查器映射

// 字符集信息
// TO DEPRECATE
export const charsetInfo: Record<漢字集名稱型别, { name: string; description: string }> = {
  GB2312: { name: 'GB2312', description: 'GB2312 簡體中文字符集' },
  通用規範: { name: '通用規範漢字表', description: '通用規範漢字表' },
  常用國字: { name: '常用國字', description: '常用國字標準字體表' },
  CJK基本: { name: 'CJK基本區', description: 'CJK統一漢字基本區 (U+4E00-U+9FFF)' },
  CJK擴A: { name: 'CJK擴展A區', description: 'CJK統一漢字擴展A區 (U+3400-U+4DBF)' },
  CJK擴B: { name: 'CJK擴展B區', description: 'CJK統一漢字擴展B區 (U+20000-U+2A6DF)' },
  CJK擴C: { name: 'CJK擴展C區', description: 'CJK統一漢字擴展C區 (U+2A700-U+2B73F)' },
  CJK擴D: { name: 'CJK擴展D区', description: 'CJK統一漢字擴展D區 (U+2B740-U+2B81F)' },
  CJK擴E: { name: 'CJK擴展E区', description: 'CJK統一漢字擴展E區 (U+2B820-U+2CEAF)' },
  CJK擴F: { name: 'CJK擴展F区', description: 'CJK統一漢字擴展F區 (U+2CEB0-U+2EBEF)' },
  CJK擴G: { name: 'CJK擴展G区', description: 'CJK統一漢字擴展G區 (U+30000-U+3134F)' },
  CJK擴H: { name: 'CJK擴展H区', description: 'CJK統一漢字擴展H區 (U+31350-U+323AF)' },
  CJK擴I: { name: 'CJK擴展I区', description: 'CJK統一漢字擴展I區 (U+2EBF0-U+2EE5F)' },
  CJK擴J: { name: 'CJK擴展J区', description: 'CJK統一漢字擴展J區 (U+323B0-U+3247B)' },
  到CJK擴A: { name: '到CJK擴A區', description: 'CJK基本區+擴展A區' },
  到CJK擴B: { name: '到CJK擴B區', description: 'CJK基本區+擴展A+B區' },
  到CJK擴C: { name: '到CJK擴C區', description: 'CJK基本區+擴展A+B+C區' },
  到CJK擴D: { name: '到CJK擴D區', description: 'CJK基本區+擴展A+B+C+D區' },
  到CJK擴E: { name: '到CJK擴E區', description: 'CJK基本區+擴展A+B+C+D+E區' },
  到CJK擴F: { name: '到CJK擴F區', description: 'CJK基本區+擴展A+B+C+D+E+F區' },
  到CJK擴G: { name: '到CJK擴G區', description: 'CJK基本區+擴展A+B+C+D+E+F+G區' },
  到CJK擴H: { name: '到CJK擴H區', description: 'CJK基本區+擴展A+B+C+D+E+F+G+H區' },
  到CJK擴I: { name: '到CJK擴I區', description: 'CJK基本區+擴展A+B+C+D+E+F+G+H+I區' },
  到CJK擴J: { name: '到CJK擴J區', description: 'CJK基本區+擴展A+B+C+D+E+F+G+H+I+J區' },
}

// 獲取字符集大小的函數
// 三種「表列」字符集的理論大小只需遍歷一次 charsets.json。
// 原實作每次呼叫都遍歷整張表，靜態重碼分析 14 個字符集 × 2 張碼表
// 會重複數十次遍歷；按 atom 數據引用緩存計數，數值不變。
let 字符集大小快取來源: 字符集數據型别 | null = null
let 字符集大小快取: Record<'GB2312' | '通用規範' | '常用國字', number> | null = null

export async function getCharsetSize(charsetType: 漢字集名稱型别): Promise<number> {
  await loadCharsetData()
  const charsetData = getDefaultStore().get(字符集數據原子狀態)
  if (!charsetData) return 0

  if (字符集大小快取來源 !== charsetData || !字符集大小快取) {
    let gb2312 = 0
    let 通規 = 0
    let 國字 = 0
    for (const record of Object.values(charsetData)) {
      if (record.is_gb2312) gb2312++
      if (record.is_tonggui) 通規++
      if (record.is_guozi) 國字++
    }
    字符集大小快取 = { GB2312: gb2312, 通用規範: 通規, 常用國字: 國字 }
    字符集大小快取來源 = charsetData
  }

  switch (charsetType) {
    case 'GB2312':
      return 字符集大小快取.GB2312
    case '通用規範':
      return 字符集大小快取.通用規範
    case '常用國字':
      return 字符集大小快取.常用國字
    default:
      return 0
  }
}

// 獲取理論字符集大小
export async function getTheoreticalCharsetSize(charsetType: 漢字集名稱型别): Promise<number> {
  await loadCJKBlockData()

  switch (charsetType) {
    case 'GB2312':
    case '通用規範':
    case '常用國字':
      // 對於GB2312、通規和國字，從JSON文件獲取總字符數
      return await getCharsetSize(charsetType)

    case 'CJK基本': {
      const store = getDefaultStore()
      const cjkBlockData = store.get(CJK區塊數據原子狀態)
      if (!cjkBlockData) return 0
      const basicBlock = cjkBlockData.blocks.cjk_basic
      if (!basicBlock) return 0
      return parseInt(basicBlock.end, 16) - parseInt(basicBlock.start, 16) + 1
    }

    case 'CJK擴A': {
      const store = getDefaultStore()
      const cjkBlockData = store.get(CJK區塊數據原子狀態)
      if (!cjkBlockData) return 0
      const aBlock = cjkBlockData.blocks.cjk_a
      if (!aBlock) return 0
      return parseInt(aBlock.end, 16) - parseInt(aBlock.start, 16) + 1
    }

    case 'CJK擴B': {
      const store = getDefaultStore()
      const cjkBlockData = store.get(CJK區塊數據原子狀態)
      if (!cjkBlockData) return 0
      const bBlock = cjkBlockData.blocks.cjk_b
      if (!bBlock) return 0
      return parseInt(bBlock.end, 16) - parseInt(bBlock.start, 16) + 1
    }

    case 'CJK擴C': {
      const store = getDefaultStore()
      const cjkBlockData = store.get(CJK區塊數據原子狀態)
      if (!cjkBlockData) return 0
      const cBlock = cjkBlockData.blocks.cjk_c
      if (!cBlock) return 0
      return parseInt(cBlock.end, 16) - parseInt(cBlock.start, 16) + 1
    }

    case 'CJK擴D': {
      const store = getDefaultStore()
      const cjkBlockData = store.get(CJK區塊數據原子狀態)
      if (!cjkBlockData) return 0
      const dBlock = cjkBlockData.blocks.cjk_d
      if (!dBlock) return 0
      return parseInt(dBlock.end, 16) - parseInt(dBlock.start, 16) + 1
    }

    case 'CJK擴E': {
      const store = getDefaultStore()
      const cjkBlockData = store.get(CJK區塊數據原子狀態)
      if (!cjkBlockData) return 0
      const eBlock = cjkBlockData.blocks.cjk_e
      if (!eBlock) return 0
      return parseInt(eBlock.end, 16) - parseInt(eBlock.start, 16) + 1
    }

    case 'CJK擴F': {
      const store = getDefaultStore()
      const cjkBlockData = store.get(CJK區塊數據原子狀態)
      if (!cjkBlockData) return 0
      const fBlock = cjkBlockData.blocks.cjk_f
      if (!fBlock) return 0
      return parseInt(fBlock.end, 16) - parseInt(fBlock.start, 16) + 1
    }

    case 'CJK擴G': {
      const store = getDefaultStore()
      const cjkBlockData = store.get(CJK區塊數據原子狀態)
      if (!cjkBlockData) return 0
      const gBlock = cjkBlockData.blocks.cjk_g
      if (!gBlock) return 0
      return parseInt(gBlock.end, 16) - parseInt(gBlock.start, 16) + 1
    }

    case 'CJK擴H': {
      const store = getDefaultStore()
      const cjkBlockData = store.get(CJK區塊數據原子狀態)
      if (!cjkBlockData) return 0
      const hBlock = cjkBlockData.blocks.cjk_h
      if (!hBlock) return 0
      return parseInt(hBlock.end, 16) - parseInt(hBlock.start, 16) + 1
    }

    case 'CJK擴I': {
      const store = getDefaultStore()
      const cjkBlockData = store.get(CJK區塊數據原子狀態)
      if (!cjkBlockData) return 0
      const iBlock = cjkBlockData.blocks.cjk_i
      if (!iBlock) return 0
      return parseInt(iBlock.end, 16) - parseInt(iBlock.start, 16) + 1
    }

    case 'CJK擴J': {
      const store = getDefaultStore()
      const cjkBlockData = store.get(CJK區塊數據原子狀態)
      if (!cjkBlockData) return 0
      const jBlock = cjkBlockData.blocks.cjk_j
      if (!jBlock) return 0
      return parseInt(jBlock.end, 16) - parseInt(jBlock.start, 16) + 1
    }

    // 累積字符集
    case '到CJK擴A':
      return (
        (await getTheoreticalCharsetSize('CJK基本')) + (await getTheoreticalCharsetSize('CJK擴A'))
      )

    case '到CJK擴B':
      return (
        (await getTheoreticalCharsetSize('到CJK擴A')) + (await getTheoreticalCharsetSize('CJK擴B'))
      )

    case '到CJK擴C':
      return (
        (await getTheoreticalCharsetSize('到CJK擴B')) + (await getTheoreticalCharsetSize('CJK擴C'))
      )

    case '到CJK擴D':
      return (
        (await getTheoreticalCharsetSize('到CJK擴C')) + (await getTheoreticalCharsetSize('CJK擴D'))
      )

    case '到CJK擴E':
      return (
        (await getTheoreticalCharsetSize('到CJK擴D')) + (await getTheoreticalCharsetSize('CJK擴E'))
      )

    case '到CJK擴F':
      return (
        (await getTheoreticalCharsetSize('到CJK擴E')) + (await getTheoreticalCharsetSize('CJK擴F'))
      )

    case '到CJK擴G':
      return (
        (await getTheoreticalCharsetSize('到CJK擴F')) + (await getTheoreticalCharsetSize('CJK擴G'))
      )

    case '到CJK擴H':
      return (
        (await getTheoreticalCharsetSize('到CJK擴G')) + (await getTheoreticalCharsetSize('CJK擴H'))
      )

    case '到CJK擴I':
      return (
        (await getTheoreticalCharsetSize('到CJK擴H')) + (await getTheoreticalCharsetSize('CJK擴I'))
      )

    case '到CJK擴J':
      return (
        (await getTheoreticalCharsetSize('到CJK擴I')) + (await getTheoreticalCharsetSize('CJK擴J'))
      )

    default:
      console.error(`未知的字符集類型: ${charsetType}`)
      return 0
  }
}

/**
 * 過濾自定義字符集
 * 從一個自定義字符集合中，過濾出存在於預設字符集中的字符。
 * @param 預設字符集，可以是 "gb2312"、"tonggui"、"guozi" 或 CJK 區塊類型
 * @param 自定義字符集
 * @returns 過濾後的字符集
 */
export async function 過濾自定義字符集(
  預設字符集: 漢字集名稱型别,
  自定義字符集: Set<string>
): Promise<Set<string>> {
  const charset = new Set<string>()

  // 對於 gb2312、tonggui 和 guozi，直接從字符集數據中過濾
  if (預設字符集 === 'GB2312' || 預設字符集 === '通用規範' || 預設字符集 === '常用國字') {
    await loadCharsetData()
    const store = getDefaultStore()
    const charsetData = store.get(字符集數據原子狀態)
    if (!charsetData) return charset

    for (const char of 自定義字符集) {
      const record = charsetData[char]
      if (record) {
        if (預設字符集 === 'GB2312' && record.is_gb2312) {
          charset.add(char)
        } else if (預設字符集 === '通用規範' && record.is_tonggui) {
          charset.add(char)
        } else if (預設字符集 === '常用國字' && record.is_guozi) {
          charset.add(char)
        }
      }
    }
  } else {
    // 對於其他字符集，加載CJK塊數據並使用Unicode範圍檢查
    await loadCJKBlockData()
    const checker = 漢字集檢查器映射[預設字符集]
    if (!checker) {
      console.error(`找不到字符集檢查器: ${預設字符集}`)
      return charset
    }

    for (const char of 自定義字符集) {
      if (checker(char)) {
        charset.add(char)
      }
    }
  }

  return charset
}

/**
 * 一次遍歷算出全部「累積字符集」的成員集合。
 *
 * 靜態重碼與候選個數分析各要跑 14 個字符集，舊版每次呼叫
 * 過濾自定義字符集 都重新遍歷全部字符、鏈式呼叫最多 11 個檢查器，
 * 10 萬字 × 數十次呼叫是主要瓶頸。這裏對每個字符只做一次
 * 11 個數值區間比較，得出「最小命中區塊序號」，累積字符集
 * 「到X」即等價於該序號 ≤ X（與 isInCJKToX 的 OR 鏈完全等價）。
 * 前 3 個表列字符集仍按 charsets.json 的標誌位判定，數值不變。
 *
 * @param 字符集合 待分類的字符集合（通常是碼表的全部字符）
 * @returns 名稱 → 屬於該字符集的字符集合
 */
const CJK細胞區塊順序 = [
  'cjk_basic',
  'cjk_a',
  'cjk_b',
  'cjk_c',
  'cjk_d',
  'cjk_e',
  'cjk_f',
  'cjk_g',
  'cjk_h',
  'cjk_i',
  'cjk_j',
] as const

const CJK累積名稱順序: readonly 累積漢字集名稱型别[] = [
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

export async function 批量過濾字符集(
  字符集合: Set<string>
): Promise<Map<累積漢字集名稱型别, Set<string>>> {
  const 結果 = new Map<累積漢字集名稱型别, Set<string>>()
  for (const 名稱 of ['GB2312', '通用規範', '常用國字', ...CJK累積名稱順序] as const) {
    結果.set(名稱, new Set<string>())
  }

  await loadCharsetData()
  await loadCJKBlockData()
  const 字符集數據 = getDefaultStore().get(字符集數據原子狀態)
  const 邊界表 = 取區塊邊界()
  if (!字符集數據 || !邊界表) return 結果

  const 區間 = CJK細胞區塊順序.map(名稱 => {
    const 邊界 = 邊界表[名稱]
    return 邊界 && Number.isFinite(邊界.start) && Number.isFinite(邊界.end) ? 邊界 : null
  })

  for (const char of 字符集合) {
    const record = 字符集數據[char]
    if (record) {
      if (record.is_gb2312) 結果.get('GB2312')!.add(char)
      if (record.is_tonggui) 結果.get('通用規範')!.add(char)
      if (record.is_guozi) 結果.get('常用國字')!.add(char)
    }

    const codePoint = char.codePointAt(0)
    if (!codePoint) continue

    let 最小命中 = -1
    for (let i = 0; i < 區間.length; i++) {
      const 邊界 = 區間[i]
      if (邊界 && codePoint >= 邊界.start && codePoint <= 邊界.end) {
        最小命中 = i
        break
      }
    }
    if (最小命中 < 0) continue

    for (let i = 最小命中; i < CJK累積名稱順序.length; i++) {
      const 名稱 = CJK累積名稱順序[i]
      if (!名稱) continue
      結果.get(名稱)!.add(char)
    }
  }

  return 結果
}
