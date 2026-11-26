/**
 * 服務模塊統一導出
 */

// 處理後的碼表結果類型從 types 導入
export type { 處理後的碼表結果介面 } from '../types'
// 導出字頻表服務
export { 字頻表服務類别 } from './charFrequencyService'
// 導出字符集服務
export {
  charsetInfo,
  getCharsetSize,
  getTheoreticalCharsetSize,
  isInCJKToA,
  isInCJKToB,
  isInCJKToBasic,
  isInCJKToC,
  isInCJKToD,
  isInCJKToE,
  isInCJKToF,
  isInCJKToG,
  isInCJKToH,
  isInCJKToI,
  isInGB2312,
  isInGuozi,
  漢字集檢查器映射,
  過濾自定義字符集,
} from './charsetService'
// 導出碼表服務（統一服務）
export {
  清理碼表,
  type 清理結果,
  獲取碼表統計,
  type 碼表清理選項,
  碼表處理服務,
  碼表處理服務實例,
  type 碼表處理選項介面,
  驗證碼表,
} from './codeTableService'
// 導出數據服務
export {
  clearFrequencyCharsCache,
  getFrequencyCharsUnion,
  加載北語簡體字頻,
  加載所有字頻數據,
  加載知乎簡體字頻,
  加載臺標繁體字頻,
  計算繁簡聯合字頻,
} from './dataService'
// 重碼分析服務
export {
  type 某字符集的重碼數據介面,
  計算某字符集的重碼數據,
  計算靜態重碼數,
} from './duplicateAnalysisService'
// 導出簡碼效率服務
export { 計算指定字頻下之簡碼效率 } from './shortCodeEfficiencyService'
// 導出UI服務
export { formatNumber, formatRate, getCharacterTooltip } from './uiService'
