/**
 * 方案狀態服务
 * 提供清空所有原子状态、以及把一份方案 JSON 套進所有原子状态的公共函数
 */

import type { 編碼預覽項 } from '@/atoms/codeTable'
import type { 動態選重分析結果介面 } from '@/atoms/dynamicDuplicate'
import type { 鍵位熱力分析結果介面 } from '@/atoms/keyboardHeatmap'
import type { 簡碼效率分析結果介面 } from '@/atoms/shortCodeEfficiency'
import type { 當量詳情數據介面, 速度當量分析結果介面 } from '@/atoms/speedEquivalent'
import type { 靜態重碼分析結果介面 } from '@/atoms/staticDuplicate'
import { 校驗導入數據, type 測評結果鍵 } from '@/schemas/importScheme'
import type { 碼表型别, 處理後的碼表結果介面 } from '@/types'
import type { 方案配置介面 } from '@/types/scheme'

export interface AtomSetters {
  設置碼表數據: (value: 處理後的碼表結果介面 | null) => void
  設置原始碼表: (value: string) => void
  設置編碼預覽數據: (value: 編碼預覽項[]) => void
  設置靜態重碼分析結果: (value: 靜態重碼分析結果介面 | null) => void
  設置動態選重分析結果: (value: 動態選重分析結果介面 | null) => void
  設置速度當量分析結果: (value: 速度當量分析結果介面 | null) => void
  設置當量詳情: (value: 當量詳情數據介面 | null) => void
  設置簡碼效率分析結果: (value: 簡碼效率分析結果介面 | null) => void
  設置鍵位熱力分析結果: (value: 鍵位熱力分析結果介面 | null) => void
}

/**
 * 清空所有原子状态
 */
export function 清空所有Atom(setters: AtomSetters) {
  setters.設置碼表數據(null)
  setters.設置原始碼表('')
  setters.設置編碼預覽數據([])
  setters.設置靜態重碼分析結果(null)
  setters.設置動態選重分析結果(null)
  setters.設置速度當量分析結果(null)
  setters.設置當量詳情(null)
  setters.設置簡碼效率分析結果(null)
  setters.設置鍵位熱力分析結果(null)
}

/** 套用方案時還要改當前方案本身，比單純清空多這一個 setter */
export interface 方案應用Setters extends AtomSetters {
  設置當前方案: (value: 方案配置介面 | null) => void
}

/** 套用方案後的返回結果 */
export interface 方案應用結果 {
  方案: 方案配置介面
  /** 實際載入到的測評結果名稱（供調用方拼提示語） */
  已載入結果: string[]
  /** 存在但校驗未通過、被跳過的結果名稱（供調用方提示用户） */
  跳過的結果: string[]
}

/**
 * 把一份方案數據（含測評結果）用 Zod 校驗後套進所有原子状态。
 *
 * 首頁下拉、頂欄下拉、頂欄「導入」按鈕、切換本地方案都走這裏，
 * 統一校驗口徑，避免逻辑抄多份漏掉某一項結果。
 *
 * 行爲要點：
 * - 先校驗再清空：方案骨架不合法時直接抛出，绝不動现有 atom（不留半套狀態）。
 * - 測評結果逐類校驗：某一類损坏只跳過那一類，不連累整份方案。
 * - 未知結果字段（候選個數分析、連續文本當量等）透傳回方案配置，不丢失。
 *
 * @param 導入數據 已解析的方案對象（或任意值；不合法會抛出帶字段路徑的錯誤）
 * @throws {Error} 方案配置骨架校驗失敗時，錯誤訊息含精確字段路徑
 */
export function 應用方案數據(導入數據: unknown, setters: 方案應用Setters): 方案應用結果 {
  // 1. 先校驗（含測評結果逐類校驗），失敗直接抛出——不动任何 atom
  const 校驗 = 校驗導入數據(導入數據)
  if (!校驗.成功) {
    throw new Error(`方案格式不正確：${校驗.錯誤}`)
  }

  const { 方案: 校驗後方案, 測評結果, 跳過的結果, 未知結果字段 } = 校驗

  // 把通過校驗的方案配置 + 未知結果字段拼回完整的 方案配置介面
  const 方案 = {
    ...校驗後方案,
    測評結果: { ...測評結果, ...未知結果字段 },
  } as 方案配置介面

  // 2. 校驗通過後才清空，免得上一個方案的結果殘留，也避免失败時留下半套狀態
  清空所有Atom(setters)
  setters.設置當前方案(方案)

  // 3. 把通過校驗的測評結果逐項寫入 atom
  const 已載入結果: string[] = []
  const 寫入 = <T>(名稱: 測評結果鍵, 寫入setter: (value: T | null) => void) => {
    const 值 = 測評結果[名稱] as T | undefined
    寫入setter(值 ?? null)
    if (值 !== undefined) 已載入結果.push(名稱)
  }
  寫入<靜態重碼分析結果介面>('靜態重碼分析', setters.設置靜態重碼分析結果)
  寫入<動態選重分析結果介面>('動態選重分析', setters.設置動態選重分析結果)
  寫入<速度當量分析結果介面>('速度當量分析', setters.設置速度當量分析結果)
  寫入<簡碼效率分析結果介面>('簡碼效率分析', setters.設置簡碼效率分析結果)
  寫入<鍵位熱力分析結果介面>('鍵位熱力', setters.設置鍵位熱力分析結果)

  return { 方案, 已載入結果, 跳過的結果 }
}
