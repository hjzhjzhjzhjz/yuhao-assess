/**
 * 動態選重分析
 * 複用 duplicateAnalysisService 中的計算函數
 */

import {
  計算動態選重率,
  計算原始碼表的動態選重率,
  計算出簡重排選重率,
} from '../../services/duplicateAnalysisService'
import type { 碼表型别, 頻率數據型别 } from '../../types'
import type { 動態選重分析結果介面, 動態選重結果介面 } from '../../atoms/dynamicDuplicate'

const FREQ_TYPES = [
  '知乎簡體字頻',
  '北語簡體字頻',
  '臺標繁體字頻',
  '古籍繁體字頻',
  '繁簡聯合字頻',
] as const

const KEY_MAP: Record<string, { sorted: string; original: string }> = {
  知乎簡體字頻: { sorted: '知乎簡體動態選重率', original: '知乎簡體動態選重率原序' },
  北語簡體字頻: { sorted: '北語簡體動態選重率', original: '北語簡體動態選重率原序' },
  臺標繁體字頻: { sorted: '臺標繁體動態選重率', original: '臺標繁體動態選重率原序' },
  古籍繁體字頻: { sorted: '古籍繁體動態選重率', original: '古籍繁體動態選重率原序' },
  繁簡聯合字頻: { sorted: '繁簡聯合動態選重率', original: '繁簡聯合動態選重率原序' },
}

export async function analyzeDynamicDuplicate(
  fullCodeTable: 碼表型别,
  shortCodeTable: 碼表型别,
  fullCodeWithSelectionTable: 碼表型别,
  shortCodeWithSelectionTable: 碼表型别,
  charFrequencies: Record<string, 頻率數據型别>
): Promise<動態選重分析結果介面> {
  const result: Partial<動態選重分析結果介面> = {}

  for (const freqType of FREQ_TYPES) {
    const freq = charFrequencies[freqType] || {}
    const keys = KEY_MAP[freqType]!

    // 按字頻重排模式：複用 duplicateAnalysisService
    const sorted: 動態選重結果介面 = {
      全碼: 計算動態選重率(fullCodeTable, freq, true),
      // 出簡：以全碼組爲基礎，剔除擁有更短簡碼的字後重排（出簡不出全）
      簡碼: 計算出簡重排選重率(fullCodeWithSelectionTable, shortCodeTable, freq, true),
    }
    // 保持原序模式：複用 duplicateAnalysisService
    const original: 動態選重結果介面 = {
      全碼: 計算原始碼表的動態選重率(fullCodeWithSelectionTable, freq),
      // 出簡：出簡不出全重排（原序）
      簡碼: 計算出簡重排選重率(fullCodeWithSelectionTable, shortCodeTable, freq, false),
    }

    ;(result as Record<string, 動態選重結果介面>)[keys.sorted] = sorted
    ;(result as Record<string, 動態選重結果介面>)[keys.original] = original
  }

  result.更新時間 = new Date().toISOString()
  return result as 動態選重分析結果介面
}
