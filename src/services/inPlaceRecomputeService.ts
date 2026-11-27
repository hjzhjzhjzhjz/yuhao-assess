/**
 * 原地重算服務
 *
 * 從傳入的 Jotai store 讀取碼表、字頻、當量表與方案參數，計算五類分析結果
 * 並寫回對應 atom。全程不依賴路由導航，因此在碼表解析彈窗内亦可呼叫，
 * 頁面不會跳走、彈窗不會關閉。
 *
 * 計算邏輯與各分析頁面的「重新計算」保持一致，共用同一批 service 純函數。
 * store 由呼叫方透過 `useStore()` 傳入，確保讀寫與組件位於同一個 Provider。
 */

import type { Store } from 'jotai/vanilla'
import type { 字頻表類型 } from '@/atoms/charFrequency'
import { 字頻表緩存原子狀態 } from '@/atoms/charFrequency'
import { 碼表原子狀態 } from '@/atoms/codeTable'
import type { 動態選重分析結果介面 } from '@/atoms/dynamicDuplicate'
import { 動態選重分析原子狀態 } from '@/atoms/dynamicDuplicate'
import { 當量表原子狀態 } from '@/atoms/equivTable'
import type { 鍵位熱力分析結果介面 } from '@/atoms/keyboardHeatmap'
import { 鍵位熱力分析原子狀態 } from '@/atoms/keyboardHeatmap'
import { 當前方案原子狀態 } from '@/atoms/scheme'
import type { 簡碼效率分析結果介面 } from '@/atoms/shortCodeEfficiency'
import { 簡碼效率分析原子狀態 } from '@/atoms/shortCodeEfficiency'
import type { 速度當量分析結果介面 } from '@/atoms/speedEquivalent'
import { 速度當量分析原子狀態 } from '@/atoms/speedEquivalent'
import type { 某字符集的靜態重碼數據介面, 靜態重碼分析結果介面 } from '@/atoms/staticDuplicate'
import { 靜態重碼分析原子狀態 } from '@/atoms/staticDuplicate'
import { 字頻表服務類别 } from '@/services/charFrequencyService'
import type { 累積漢字集名稱型别 } from '@/services/charsetService'
import type { 某字符集的重碼數據介面 } from '@/services/duplicateAnalysisService'
import {
  計算出簡重排選重率,
  計算動態選重率,
  計算原始碼表的動態選重率,
  計算某字符集的重碼數據,
} from '@/services/duplicateAnalysisService'
import { 當量表服務實例 } from '@/services/equivTableService'
import { 計算按鍵計數 } from '@/services/keyboardHeatmapService'
import { 簡碼效率N值列表, 計算指定字頻下之簡碼效率 } from '@/services/shortCodeEfficiencyService'
import {
  從碼表計算加權速度當量,
  生成一級簡碼加選重鍵表,
  生成二級簡碼加選重鍵表,
} from '@/services/speedEquivalentService'
import type { 碼表型别, 處理後的碼表結果介面 } from '@/types'
import type { 選重鍵表型别 } from '@/types/scheme'
import { 默認選重鍵表 } from '@/types/scheme'

/** 靜態重碼涉及的 14 個字符集（順序與分析結果介面一致） */
const 字符集列表: readonly 累積漢字集名稱型别[] = [
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

/** 重算進度回調 */
export interface 重算進度 {
  完成項: number
  總項: number
  當前名稱: string
}

export interface 原地重算結果 {
  成功: boolean
  已計算: string[]
  錯誤?: string
}

type 字頻映射 = Map<字頻表類型, Record<string, number>>

/**
 * 確保所有字頻表與當量表都已加載，並寫入傳入的 store。
 * 加載服務本身可能寫入 default store，這裏用返回值統一寫回當前 store 以保證一致。
 */
async function 確保數據就緒(
  store: Store
): Promise<{ 字頻表: 字頻映射; 當量表: Record<string, number> }> {
  const [知乎, 北語, 臺標, 古籍, 繁簡聯合] = await Promise.all([
    字頻表服務類别.加載知乎簡體字頻(),
    字頻表服務類别.加載北語簡體字頻(),
    字頻表服務類别.加載臺標繁體字頻(),
    字頻表服務類别.加載古籍繁體字頻(),
    字頻表服務類别.計算繁簡聯合字頻(),
  ])

  const 字頻表: 字頻映射 = new Map([
    ['知乎簡體字頻', 知乎],
    ['北語簡體字頻', 北語],
    ['臺標繁體字頻', 臺標],
    ['古籍繁體字頻', 古籍],
    ['繁簡聯合字頻', 繁簡聯合],
  ])
  store.set(字頻表緩存原子狀態, 字頻表)

  let 當量表 = store.get(當量表原子狀態)
  if (Object.keys(當量表).length === 0) {
    const 加載結果 = await 當量表服務實例.加載當量表()
    當量表 = store.get(當量表原子狀態)
    // 若加載服務寫入的是另一個 store，用返回值補寫
    if (Object.keys(當量表).length === 0) {
      當量表 = 加載結果
      store.set(當量表原子狀態, 當量表)
    }
  }

  return { 字頻表, 當量表 }
}

/** 計算靜態重碼（28 次字符集計算） */
async function 計算靜態重碼(碼表: 處理後的碼表結果介面): Promise<靜態重碼分析結果介面> {
  const 全碼結果 = await Promise.all(
    字符集列表.map(名稱 => 計算某字符集的重碼數據(碼表.全碼表, 名稱))
  )
  const 簡碼結果 = await Promise.all(
    字符集列表.map(名稱 => 計算某字符集的重碼數據(碼表.簡碼表, 名稱))
  )

  const 组装 = (
    全碼: 某字符集的重碼數據介面,
    簡碼: 某字符集的重碼數據介面
  ): 某字符集的靜態重碼數據介面 => ({
    全碼重碼組數: 全碼.duplicateGroupCount,
    簡碼重碼組數: 簡碼.duplicateGroupCount,
    全碼重碼字數: 全碼.duplicateCount,
    簡碼重碼字數: 簡碼.duplicateCount,
    實際字符數: 全碼.totalChars,
    理論字符數: 全碼.theoreticalSize,
    字集覆蓋率: 全碼.totalChars / 全碼.theoreticalSize,
  })

  const 結果: Record<string, 某字符集的靜態重碼數據介面> = {}
  字符集列表.forEach((名稱, i) => {
    結果[名稱] = 组装(全碼結果[i]!, 簡碼結果[i]!)
  })

  return { ...結果, 更新時間: new Date().toISOString() } as 靜態重碼分析結果介面
}

/** 計算動態選重率 */
function 計算動態選重(碼表: 處理後的碼表結果介面, 字頻表: 字頻映射): 動態選重分析結果介面 {
  const 全碼表 = 碼表.全碼表
  const 簡碼表 = 碼表.簡碼表
  const 全碼加選重鍵表 = 碼表.全碼加選重鍵表

  const 知乎字頻 = 字頻表.get('知乎簡體字頻') || {}
  const 北語字頻 = 字頻表.get('北語簡體字頻') || {}
  const 臺標字頻 = 字頻表.get('臺標繁體字頻') || {}
  const 古籍字頻 = 字頻表.get('古籍繁體字頻') || {}
  const 繁簡聯合字頻 = 字頻表.get('繁簡聯合字頻') || {}

  const 重排 = (字頻: Record<string, number>) => ({
    全碼: 計算動態選重率(全碼表, 字頻, true),
    簡碼: 計算出簡重排選重率(全碼加選重鍵表, 簡碼表, 字頻, true),
  })
  const 原序 = (字頻: Record<string, number>) => ({
    全碼: 計算原始碼表的動態選重率(全碼加選重鍵表, 字頻),
    簡碼: 計算出簡重排選重率(全碼加選重鍵表, 簡碼表, 字頻, false),
  })

  return {
    知乎簡體動態選重率: 重排(知乎字頻),
    北語簡體動態選重率: 重排(北語字頻),
    臺標繁體動態選重率: 重排(臺標字頻),
    古籍繁體動態選重率: 重排(古籍字頻),
    繁簡聯合動態選重率: 重排(繁簡聯合字頻),
    知乎簡體動態選重率原序: 原序(知乎字頻),
    北語簡體動態選重率原序: 原序(北語字頻),
    臺標繁體動態選重率原序: 原序(臺標字頻),
    古籍繁體動態選重率原序: 原序(古籍字頻),
    繁簡聯合動態選重率原序: 原序(繁簡聯合字頻),
    更新時間: new Date().toISOString(),
  }
}

/** 計算速度當量 */
function 計算速度當量(
  碼表: 處理後的碼表結果介面,
  字頻表: 字頻映射,
  當量表: Record<string, number>,
  選重鍵表: 選重鍵表型别
): 速度當量分析結果介面 {
  const 全碼加選重鍵表 = 碼表.全碼加選重鍵表
  const 簡碼加選重鍵表 = 碼表.簡碼加選重鍵表

  const 一級簡碼 = 生成一級簡碼加選重鍵表(簡碼加選重鍵表, 全碼加選重鍵表, [])
  const 二級簡碼 = 生成二級簡碼加選重鍵表(簡碼加選重鍵表, 全碼加選重鍵表, [])

  const 加權 = (表: 碼表型别) => ({
    知乎簡體: 從碼表計算加權速度當量(表, 字頻表.get('知乎簡體字頻') || {}, 當量表, 選重鍵表),
    北語簡體: 從碼表計算加權速度當量(表, 字頻表.get('北語簡體字頻') || {}, 當量表, 選重鍵表),
    臺標繁體: 從碼表計算加權速度當量(表, 字頻表.get('臺標繁體字頻') || {}, 當量表, 選重鍵表),
    古籍繁體: 從碼表計算加權速度當量(表, 字頻表.get('古籍繁體字頻') || {}, 當量表, 選重鍵表),
    繁簡聯合: 從碼表計算加權速度當量(表, 字頻表.get('繁簡聯合字頻') || {}, 當量表, 選重鍵表),
  })

  const 全碼 = 加權(全碼加選重鍵表)
  const 全部簡碼 = 加權(簡碼加選重鍵表)
  const 一級 = 加權(一級簡碼)
  const 二級 = 加權(二級簡碼)

  return {
    知乎簡體字頻全碼速度當量: 全碼.知乎簡體,
    北語簡體字頻全碼速度當量: 全碼.北語簡體,
    臺標繁體字頻全碼速度當量: 全碼.臺標繁體,
    古籍繁體字頻全碼速度當量: 全碼.古籍繁體,
    繁簡聯合字頻全碼速度當量: 全碼.繁簡聯合,
    知乎簡體字頻一級簡碼速度當量: 一級.知乎簡體,
    北語簡體字頻一級簡碼速度當量: 一級.北語簡體,
    臺標繁體字頻一級簡碼速度當量: 一級.臺標繁體,
    古籍繁體字頻一級簡碼速度當量: 一級.古籍繁體,
    繁簡聯合字頻一級簡碼速度當量: 一級.繁簡聯合,
    知乎簡體字頻二級簡碼速度當量: 二級.知乎簡體,
    北語簡體字頻二級簡碼速度當量: 二級.北語簡體,
    臺標繁體字頻二級簡碼速度當量: 二級.臺標繁體,
    古籍繁體字頻二級簡碼速度當量: 二級.古籍繁體,
    繁簡聯合字頻二級簡碼速度當量: 二級.繁簡聯合,
    知乎簡體字頻全部簡碼速度當量: 全部簡碼.知乎簡體,
    北語簡體字頻全部簡碼速度當量: 全部簡碼.北語簡體,
    臺標繁體字頻全部簡碼速度當量: 全部簡碼.臺標繁體,
    古籍繁體字頻全部簡碼速度當量: 全部簡碼.古籍繁體,
    繁簡聯合字頻全部簡碼速度當量: 全部簡碼.繁簡聯合,
    更新時間: new Date().toISOString(),
  }
}

/** 計算簡碼效率 */
function 計算簡碼效率(
  碼表: 處理後的碼表結果介面,
  字頻表: 字頻映射,
  最大碼長: number
): 簡碼效率分析結果介面 {
  const 簡碼映射 = new Map<string, string>()
  const 全碼映射 = new Map<string, string>()

  for (const [字符, 編碼數組] of 碼表.簡碼加選重鍵表.entries()) {
    if (編碼數組.length > 0) {
      簡碼映射.set(
        字符,
        編碼數組.reduce((a, b) => (a.length <= b.length ? a : b))
      )
    }
  }
  for (const [字符, 編碼數組] of 碼表.全碼加選重鍵表.entries()) {
    if (編碼數組.length > 0) {
      全碼映射.set(
        字符,
        編碼數組.reduce((a, b) => (a.length >= b.length ? a : b))
      )
    }
  }

  const N值列表 = [...簡碼效率N值列表]
  const 計算 = (類型: 字頻表類型) =>
    計算指定字頻下之簡碼效率(字頻表.get(類型) || {}, 簡碼映射, 全碼映射, 最大碼長, N值列表)

  return {
    知乎簡體字頻下之簡碼效率: 計算('知乎簡體字頻'),
    北語簡體字頻下之簡碼效率: 計算('北語簡體字頻'),
    臺標繁體字頻下之簡碼效率: 計算('臺標繁體字頻'),
    古籍繁體字頻下之簡碼效率: 計算('古籍繁體字頻'),
    繁簡聯合字頻下之簡碼效率: 計算('繁簡聯合字頻'),
    計算時間: Date.now(),
  }
}

/** 計算鍵位熱力 */
function 計算鍵位熱力(
  碼表: 處理後的碼表結果介面,
  字頻表: 字頻映射,
  選重鍵表: 選重鍵表型别
): 鍵位熱力分析結果介面 {
  const 當前字頻 = 字頻表.get('北語簡體字頻') || {}
  return {
    全碼: 計算按鍵計數(碼表.全碼加選重鍵表, 當前字頻, 選重鍵表),
    簡碼: 計算按鍵計數(碼表.簡碼加選重鍵表, 當前字頻, 選重鍵表),
    更新時間: new Date().toISOString(),
  }
}

/**
 * 原地重算所有分析：從傳入 store 讀取當前碼表與數據，計算五類結果並寫回 atom。
 * 不進行任何路由導航。
 *
 * @param store 呼叫方組件的 Jotai store（由 useStore() 取得）
 * @param onProgress 可選的進度回調
 */
export async function 原地重算所有分析(
  store: Store,
  onProgress?: (進度: 重算進度) => void
): Promise<原地重算結果> {
  const 碼表 = store.get(碼表原子狀態) as 處理後的碼表結果介面 | null
  const 已計算: string[] = []

  if (!碼表) {
    return { 成功: false, 已計算, 錯誤: '尚無碼表數據，請先解析碼表' }
  }

  const 總項 = 5
  const 報告 = (完成項: number, 當前名稱: string) => onProgress?.({ 完成項, 總項, 當前名稱 })

  try {
    報告(0, '加載字頻與當量表')
    const { 字頻表, 當量表 } = await 確保數據就緒(store)

    const 方案 = store.get(當前方案原子狀態)
    const 選重鍵表 = 方案?.方案參數?.選重鍵表 ?? 默認選重鍵表
    const 最大碼長 = 方案?.方案參數?.最大碼長 || 4

    報告(1, '靜態重碼')
    store.set(靜態重碼分析原子狀態, await 計算靜態重碼(碼表))
    已計算.push('靜態重碼')

    報告(2, '動態選重率')
    store.set(動態選重分析原子狀態, 計算動態選重(碼表, 字頻表))
    已計算.push('動態選重率')

    報告(3, '速度當量')
    store.set(速度當量分析原子狀態, 計算速度當量(碼表, 字頻表, 當量表, 選重鍵表))
    已計算.push('速度當量')

    報告(4, '簡碼效率')
    store.set(簡碼效率分析原子狀態, 計算簡碼效率(碼表, 字頻表, 最大碼長))
    已計算.push('簡碼效率')

    報告(5, '鍵位熱力')
    store.set(鍵位熱力分析原子狀態, 計算鍵位熱力(碼表, 字頻表, 選重鍵表))
    已計算.push('鍵位熱力')

    return { 成功: true, 已計算 }
  } catch (error) {
    return {
      成功: false,
      已計算,
      錯誤: error instanceof Error ? error.message : '重算失敗',
    }
  }
}
