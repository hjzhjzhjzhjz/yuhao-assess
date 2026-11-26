/**
 * 分析協調器
 * 按順序調用各項分析，彙總結果，並通過回調報告進度
 */

import type { 處理後的碼表結果介面, 頻率數據型别 } from '../types'
import type { 方案測評結果介面, 選重鍵表型别 } from '../types/scheme'
import { analyzeKeyboardHeatmap } from './analyses/keyboard-heatmap'
import { analyzeShortCodeEfficiency } from './analyses/short-code-efficiency'
import { analyzeStaticDuplicate } from './analyses/static-duplicate'
import { loadCharFrequency } from './node-adapter'

export interface AnalyzerOptions {
  processedCodeTable: 處理後的碼表結果介面
  maxCodeLength: number
  /** 方案的選重鍵表；鍵位熱力要按它折算，否則二重三重全記在數字鍵上 */
  選重鍵表?: 選重鍵表型别
  /** 簡碼效率的 N 值網格；不給就用 CLI 自己那一組 */
  簡碼效率N值列表?: readonly number[]
  onStepStart: (step: string) => void
  onStepDone: (step: string, ms: number) => void
}

export async function runAllAnalyses(options: AnalyzerOptions): Promise<方案測評結果介面> {
  const { processedCodeTable, maxCodeLength, 選重鍵表, 簡碼效率N值列表, onStepStart, onStepDone } =
    options
  const { 全碼表, 簡碼表, 全碼加選重鍵表, 簡碼加選重鍵表 } = processedCodeTable

  // 預加載所有字頻數據
  const [知乎, 北語, 臺標, 古籍, 繁簡] = await Promise.all([
    loadCharFrequency('知乎簡體字頻'),
    loadCharFrequency('北語簡體字頻'),
    loadCharFrequency('臺標繁體字頻'),
    loadCharFrequency('古籍繁體字頻'),
    loadCharFrequency('繁簡聯合字頻'),
  ])

  const charFrequencies: Record<string, 頻率數據型别> = {
    知乎簡體字頻: 知乎,
    北語簡體字頻: 北語,
    臺標繁體字頻: 臺標,
    古籍繁體字頻: 古籍,
    繁簡聯合字頻: 繁簡,
  }

  const result: 方案測評結果介面 = {}

  // 1. 靜態重碼分析
  {
    const step = '靜態重碼分析'
    onStepStart(step)
    const t0 = Date.now()
    result.靜態重碼分析 = await analyzeStaticDuplicate(全碼表, 簡碼表)
    onStepDone(step, Date.now() - t0)
  }

  // 5. 簡碼效率分析
  {
    const step = '簡碼效率分析'
    onStepStart(step)
    const t0 = Date.now()
    result.簡碼效率分析 = await analyzeShortCodeEfficiency(
      簡碼加選重鍵表,
      全碼加選重鍵表,
      charFrequencies,
      maxCodeLength,
      簡碼效率N值列表
    )
    onStepDone(step, Date.now() - t0)
  }

  // 6. 鍵位熱力分析
  {
    const step = '鍵位熱力分析'
    onStepStart(step)
    const t0 = Date.now()
    result.鍵位熱力 = await analyzeKeyboardHeatmap(全碼加選重鍵表, 簡碼加選重鍵表, 北語, 選重鍵表)
    onStepDone(step, Date.now() - t0)
  }

  return result
}
