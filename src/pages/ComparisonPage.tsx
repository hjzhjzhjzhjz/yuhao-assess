import { PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import { Button, Checkbox, Input, Modal, message, Segmented, Space, Spin, Table, Tag } from 'antd'
import type { ColumnsType, ColumnType } from 'antd/es/table'
import { useAtom, useAtomValue } from 'jotai'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import styled from 'styled-components'
import { 選中對比方案鍵名列表原子狀態 } from '@/atoms/comparison'
import type { 動態選重分析結果介面 } from '@/atoms/dynamicDuplicate'
import { 動態選重分析原子狀態 } from '@/atoms/dynamicDuplicate'
import {
  本地方案列表原子狀態,
  當前本地方案標識符原子狀態,
  選中對比本地方案標識符列表原子狀態,
} from '@/atoms/localSchemes'
import { 方案列表原子狀態, 當前方案原子狀態 } from '@/atoms/scheme'
import type {
  N值簡碼效率結果介面,
  單個字頻簡碼效率結果介面,
  簡碼效率分析結果介面,
} from '@/atoms/shortCodeEfficiency'
import { 簡碼效率分析原子狀態 } from '@/atoms/shortCodeEfficiency'
import type { 速度當量分析結果介面 } from '@/atoms/speedEquivalent'
import { 速度當量分析原子狀態 } from '@/atoms/speedEquivalent'
import type { 靜態重碼分析結果介面 } from '@/atoms/staticDuplicate'
import { 靜態重碼分析原子狀態 } from '@/atoms/staticDuplicate'
import { 累積漢字集名稱型别 } from '@/services/charsetService'
import { type 内置方案配置, 加載方案, 獲取内置方案列表 } from '@/services/schemeService'
import type { 全碼簡碼型别, 字頻來源型别 } from '@/types'
import type { 方案配置介面 } from '@/types/scheme'

// 對比頁容器：窄屏收緊内邊距
const ComparisonContainer = styled.div`
  padding: 24px;

  @media (max-width: 576px) {
    padding: 12px;
  }
`

// 主題色：集中管理，避免多處硬編碼
const 主題色 = {
  青瓷緑: '#2a9d8f',
  正文: 'rgba(28, 43, 45, 0.82)',
  次要文字: 'rgba(28, 43, 45, 0.55)',
  載入遮罩: 'rgba(245, 242, 234, 0.86)',
} as const

// 分析類型切换控件：桌面用 Segmented，手机用两列按钮组，6 個選項全部可見
const 分析類型手機容器 = styled.div`
  display: none;

  @media (max-width: 576px) {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
    width: 100%;
  }
`

const 分析類型手機按鈕 = styled.button<{ $選中: boolean }>`
  min-height: 40px;
  padding: 8px 10px;
  border: 1px solid ${p => (p.$選中 ? 主題色.青瓷緑 : '#d9d9d9')};
  border-radius: 6px;
  background: ${p => (p.$選中 ? 主題色.青瓷緑 : '#fff')};
  color: ${p => (p.$選中 ? '#fff' : 主題色.正文)};
  font-size: 13px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;

  &:active {
    opacity: 0.75;
  }
`

// 桌面端的 Segmented 分析類型控件在手机上隐藏（改用上面的两列按钮组）
const 分析類型桌面控件 = styled.div`
  @media (max-width: 576px) {
    display: none;
  }
`

// 可横滑容器：字頻來源等选项较多的 Segmented 在手机上允许横向滑动，避免末项被裁剪
const 横滑容器 = styled.div`
  max-width: 100%;
  overflow-x: auto;
  overflow-y: hidden;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }

  & > .ant-segmented {
    width: max-content;
    max-width: none;
  }
`

// 覆蓋率閾值
const 靜態重碼分析字集覆蓋率閾值 = 0.99 // 低於此覆蓋率的字集將被標記爲「缺字」
const 動態重碼分析字集覆蓋率閾值 = 0.975 // 低於此覆蓋率的字集將被標記爲「缺字」

// 動態選重字頻來源對應的字集（用於覆蓋率判定）
const 動態選重字頻對應字集: Record<string, 累積漢字集名稱型别> = {
  知乎簡體: '通用規範',
  北語簡體: '通用規範',
  臺標繁體: '常用國字',
  古籍繁體: '常用國字',
  繁簡聯合: 'CJK基本',
}

// 字符集配置（靜態重碼字數、靜態選重個數共用）
interface 字符集配置項 {
  key: string
  title: string
  dataKey: 累積漢字集名稱型别
}
const 字符集配置表: 字符集配置項[] = [
  { key: 'gb2312', title: 'GB2312', dataKey: 'GB2312' },
  { key: 'tonggui', title: '通用規範', dataKey: '通用規範' },
  { key: 'guozi', title: '常用國字', dataKey: '常用國字' },
  { key: 'cjk-basic', title: 'CJK基本', dataKey: 'CJK基本' },
  { key: 'cjk-b', title: 'CJK擴B', dataKey: '到CJK擴B' },
  { key: 'cjk-h', title: 'CJK擴H', dataKey: '到CJK擴H' },
  { key: 'cjk-j', title: 'CJK擴J', dataKey: '到CJK擴J' },
]

// 字頻來源 → 當量鍵名前綴
const 字頻前綴映射: Record<字頻來源型别, string> = {
  知乎簡體: '知乎簡體字頻',
  北語簡體: '北語簡體字頻',
  臺標繁體: '臺標繁體字頻',
  古籍繁體: '古籍繁體字頻',
  繁簡聯合: '繁簡聯合字頻',
}

// 字頻來源 → 簡碼效率鍵名
const 字頻鍵名映射: Record<字頻來源型别, string> = {
  知乎簡體: '知乎簡體字頻下之簡碼效率',
  北語簡體: '北語簡體字頻下之簡碼效率',
  臺標繁體: '臺標繁體字頻下之簡碼效率',
  古籍繁體: '古籍繁體字頻下之簡碼效率',
  繁簡聯合: '繁簡聯合字頻下之簡碼效率',
}

// 當量類型配置
const 當量配置 = [
  { key: 'full-equiv', title: '全碼當量', suffix: '全碼速度當量' },
  { key: 'first-short-equiv', title: '一級簡碼當量', suffix: '一級簡碼速度當量' },
  { key: 'second-short-equiv', title: '二級簡碼當量', suffix: '二級簡碼速度當量' },
  { key: 'all-short-equiv', title: '全部簡碼當量', suffix: '全部簡碼速度當量' },
]

// 動態重碼率字頻來源配置（frequency-desc 與 original-order 兩版）
const 動態重碼率配置 = [
  { key: 'zhihu', title: '知乎簡體', dataKey: '知乎簡體動態選重率' },
  { key: 'sc', title: '北語簡體', dataKey: '北語簡體動態選重率' },
  { key: 'tc', title: '臺標繁體', dataKey: '臺標繁體動態選重率' },
  { key: 'guji', title: '古籍繁體', dataKey: '古籍繁體動態選重率' },
  { key: 'fanjian', title: '繁簡聯合', dataKey: '繁簡聯合動態選重率' },
]
const 動態重碼率原序配置 = [
  { key: 'zhihu-orig', title: '知乎簡體', dataKey: '知乎簡體動態選重率原序' },
  { key: 'sc-orig', title: '北語簡體', dataKey: '北語簡體動態選重率原序' },
  { key: 'tc-orig', title: '臺標繁體', dataKey: '臺標繁體動態選重率原序' },
  { key: 'guji-orig', title: '古籍繁體', dataKey: '古籍繁體動態選重率原序' },
  { key: 'fanjian-orig', title: '繁簡聯合', dataKey: '繁簡聯合動態選重率原序' },
]

// 簡碼效率 N 值配置
const N值配置 = [
  { key: 'n0', title: '0簡碼', N值: 0 },
  { key: 'n25', title: '25簡碼', N值: 25 },
  { key: 'n50', title: '50簡碼', N值: 50 },
  { key: 'n100', title: '100簡碼', N值: 100 },
  { key: 'n200', title: '200簡碼', N值: 200 },
  { key: 'n500', title: '500簡碼', N值: 500 },
]

// 分段控制器選項
const 分析類型選項 = [
  { label: '靜態重碼字數', value: '靜態重碼' },
  { label: '靜態選重個數', value: '靜態選重個數' },
  { label: '頻率降序動重', value: '頻率降序動態選重' },
  { label: '原始碼表動重', value: '原始碼表動態選重' },
  { label: '速度當量', value: '速度當量' },
  { label: '簡碼效率', value: '簡碼效率' },
]
const 字頻來源選項 = [
  { label: '知乎簡體', value: '知乎簡體' },
  { label: '北語簡體', value: '北語簡體' },
  { label: '臺標繁體', value: '臺標繁體' },
  { label: '古籍繁體', value: '古籍繁體' },
  { label: '繁簡聯合', value: '繁簡聯合' },
]
const 全碼簡碼選項 = [
  { label: '全碼', value: '全碼' },
  { label: '簡碼', value: '簡碼' },
]

// 對比方案數據介面
interface 對比方案數據介面 {
  唯一鍵: string // 用於 React key，格式：方案名-current 或 方案名-builtin
  方案名: string
  顯示名稱: string // 顯示用的名稱，當前方案會添加 "(當前方案)" 後綴
  是否當前方案: boolean
  選重編碼化?: boolean // 是否啓用選重編碼化（影響重碼計算的可比性）
  出簡不出全?: boolean // 是否「出簡不出全」（影響重碼計算的可比性）
  碼表哈希?: string // 用於去重判斷
  標識符?: string // 方案唯一標識，用於跨「當前/本地/内置」去重
  動態選重分析?: 動態選重分析結果介面 | null
  靜態重碼分析?: 靜態重碼分析結果介面 | null
  速度當量分析?: 速度當量分析結果介面 | null
  簡碼效率分析?: 簡碼效率分析結果介面 | null
}

// 判斷一個方案是否含有特殊參數（選重編碼化或出簡不出全）
const 是否特殊方案 = (r: 對比方案數據介面): boolean => !!r.選重編碼化 || !!r.出簡不出全

// 包裝排序函數：始終將特殊方案置於底部（升序時）
const 包裝排序 = (基礎: (a: 對比方案數據介面, b: 對比方案數據介面) => number) => {
  return (a: 對比方案數據介面, b: 對比方案數據介面): number => {
    const aSpecial = 是否特殊方案(a)
    const bSpecial = 是否特殊方案(b)
    if (aSpecial && !bSpecial) return 1
    if (!aSpecial && bSpecial) return -1
    return 基礎(a, b)
  }
}

// 在方案名後追加標記符號：
// † = 出簡不出全；‡ = 選重編碼化
const 渲染方案名 = (_: unknown, record: 對比方案數據介面) => {
  const 標記: string[] = []
  if (record.出簡不出全) 標記.push('†')
  if (record.選重編碼化) 標記.push('‡')
  const 名稱 = 標記.length === 0 ? record.顯示名稱 : `${record.顯示名稱} ${標記.join('')}`
  return record.是否當前方案 ? (
    <span>
      {名稱}{' '}
      <Tag color={主題色.青瓷緑} style={{ marginInlineEnd: 0 }}>
        當前
      </Tag>
    </span>
  ) : (
    名稱
  )
}

// 分析型别
type 分析型别 =
  | '靜態重碼'
  | '靜態選重個數'
  | '頻率降序動態選重'
  | '原始碼表動態選重'
  | '速度當量'
  | '簡碼效率'

// 帶「數值提取器」的列：高亮直接取原始數值，不再解析渲染後的字符串
type 數值提取器 = (record: 對比方案數據介面) => number | undefined
type 對比列 = ColumnType<對比方案數據介面> & { 提取數值?: 數值提取器 }

// 方案名列（所有表格共用）
const 方案名列: 對比列 = {
  title: '方案名',
  dataIndex: '顯示名稱',
  key: '顯示名稱',
  fixed: 'left',
  render: 渲染方案名,
}

// 從靜態重碼分析取數值，覆盖率不足或缺失時返回 undefined
type 靜態數值鍵 = '全碼重碼字數' | '簡碼重碼字數' | '全碼重碼組數' | '簡碼重碼組數'
const 取靜態數值 = (
  record: 對比方案數據介面,
  dataKey: 累積漢字集名稱型别,
  鍵: 靜態數值鍵
): number | undefined => {
  const data = record.靜態重碼分析?.[dataKey]
  if (!data) return undefined
  const 覆蓋率 = data.字集覆蓋率
  if (覆蓋率 !== undefined && 覆蓋率 < 靜態重碼分析字集覆蓋率閾值) return undefined
  return data[鍵] ?? undefined
}

// 靜態類列通用的「缺字/缺失」展示
const 靜態缺失顯示 = (record: 對比方案數據介面, dataKey: 累積漢字集名稱型别): string => {
  const data = record.靜態重碼分析?.[dataKey]
  if (!data) return '-'
  const 覆蓋率 = data.字集覆蓋率
  return 覆蓋率 !== undefined && 覆蓋率 < 靜態重碼分析字集覆蓋率閾值 ? '缺字' : '-'
}

const ComparisonPage: React.FC = () => {
  const [當前方案] = useAtom(當前方案原子狀態)
  // 頂欄已經把所有内置方案（含測評結果）加載到這個原子裏，
  // 對比頁直接複用，避免重複 fetch 同一批 JSON 造成「載入失敗」。
  const 方案列表 = useAtomValue(方案列表原子狀態)
  const 動態選重分析結果 = useAtomValue(動態選重分析原子狀態)
  const 靜態重碼分析結果 = useAtomValue(靜態重碼分析原子狀態)
  const 速度當量分析結果 = useAtomValue(速度當量分析原子狀態)
  const 簡碼效率分析結果 = useAtomValue(簡碼效率分析原子狀態)

  const [内置方案列表, 設置内置方案列表] = useState<内置方案配置[]>([])
  const [選中對比方案鍵名列表, 設置選中對比方案鍵名列表] = useAtom(選中對比方案鍵名列表原子狀態)
  const [臨時已選方案鍵名列表, 設置臨時已選方案鍵名列表] = useState<string[]>([])
  const [對比方案列表, 設置對比方案列表] = useState<對比方案數據介面[]>([])
  const [顯示選擇彈窗, 設置顯示選擇彈窗] = useState(false)
  const [臨時搜索詞, 設置臨時搜索詞] = useState('')
  const [載入進度, 設置載入進度] = useState<{ 當前: number; 總數: number; 名稱: string } | null>(
    null
  )
  /** 確認選擇後，等這輪下載結束再提示；進頁和依賴變化觸發的重載不提示 */
  const 完成後提示 = useRef(false)

  // 本地方案
  const 本地方案列表 = useAtomValue(本地方案列表原子狀態)
  const 當前本地方案標識符 = useAtomValue(當前本地方案標識符原子狀態)
  const [選中本地方案標識符列表, 設置選中本地方案標識符列表] = useAtom(
    選中對比本地方案標識符列表原子狀態
  )
  const [臨時已選本地方案標識符列表, 設置臨時已選本地方案標識符列表] = useState<string[]>([])

  // 本地方案列表變化時，自動將新增方案加入選中列表
  useEffect(() => {
    const 所有標識符 = 本地方案列表.map(s => s.元數據.標識符)
    設置選中本地方案標識符列表(prev => {
      const 新增 = 所有標識符.filter(id => !prev.includes(id))
      const 保留 = prev.filter(id => 所有標識符.includes(id))
      return [...保留, ...新增]
    })
  }, [本地方案列表, 設置選中本地方案標識符列表])

  // 三層選擇狀態
  const [當前分析類型, 設置當前分析類型] = useState<分析型别>('靜態重碼')
  const [當前字頻來源, 設置當前字頻來源] = useState<字頻來源型别>('知乎簡體')
  const [當前全碼簡碼, 設置當前全碼簡碼] = useState<全碼簡碼型别>('全碼')

  // 加載内置方案列表
  useEffect(() => {
    const 加載列表 = async () => {
      const 列表 = await 獲取内置方案列表()
      設置内置方案列表(列表)
    }
    加載列表()
  }, [])

  // 刷新對比數據：用計數器觸發 useEffect 重新執行
  const [刷新計數, 設置刷新計數] = useState(0)
  const 刷新對比數據 = () => {
    設置刷新計數(c => c + 1)
  }

  // 加載對比方案數據（内聯於 useEffect 避免閉包問題）
  // biome-ignore lint/correctness/useExhaustiveDependencies: 刷新計數是手動刷新觸發器，effect 體内不直接讀取但必須以其變化重新執行
  useEffect(() => {
    if (内置方案列表.length === 0) return

    // 清理持久化列表裏已經不存在的内置方案鍵
    const 有效鍵名列表 = 選中對比方案鍵名列表.filter(key => 内置方案列表.some(b => b.key === key))
    if (有效鍵名列表.length !== 選中對比方案鍵名列表.length) {
      設置選中對比方案鍵名列表(有效鍵名列表)
      return
    }

    let 已取消 = false

    const 執行加載 = async () => {
      const 要提示 = 完成後提示.current
      const 結果列表: 對比方案數據介面[] = []
      const 已見哈希 = new Set<string>()
      const 已見標識符 = new Set<string>()

      const 加入 = (項: 對比方案數據介面): boolean => {
        if (項.碼表哈希 && 已見哈希.has(項.碼表哈希)) return false
        if (項.標識符 && 已見標識符.has(項.標識符)) return false
        if (項.碼表哈希) 已見哈希.add(項.碼表哈希)
        if (項.標識符) 已見標識符.add(項.標識符)
        結果列表.push(項)
        return true
      }

      // 添加當前方案（如果存在且有分析數據）
      if (當前方案 && (動態選重分析結果 || 靜態重碼分析結果)) {
        加入({
          唯一鍵: `${當前方案.元數據.方案名}-current`,
          方案名: 當前方案.元數據.方案名,
          顯示名稱: `${當前方案.元數據.方案名}（當前方案）`,
          是否當前方案: true,
          標識符: 當前方案.元數據.標識符,
          選重編碼化: !!當前方案.方案參數.選重編碼化,
          出簡不出全: !!當前方案.方案參數.出簡不出全,
          碼表哈希: 當前方案.碼表元數據?.哈希值,
          動態選重分析: 動態選重分析結果,
          靜態重碼分析: 靜態重碼分析結果,
          速度當量分析: 速度當量分析結果,
          簡碼效率分析: 簡碼效率分析結果,
        })
      }

      // 添加選中的本地方案（排除當前激活的本地方案，它已以「當前方案」形式加入）
      for (const 本地方案 of 本地方案列表) {
        const 標識符 = 本地方案.元數據.標識符
        if (!選中本地方案標識符列表.includes(標識符)) continue
        if (標識符 === 當前本地方案標識符) continue
        const 方案名 = 本地方案.元數據.方案名
        加入({
          唯一鍵: `local-${標識符}`,
          方案名,
          顯示名稱: `${方案名}（本地）`,
          是否當前方案: false,
          標識符,
          選重編碼化: !!本地方案.方案參數.選重編碼化,
          出簡不出全: !!本地方案.方案參數.出簡不出全,
          碼表哈希: 本地方案.碼表元數據?.哈希值,
          動態選重分析: 本地方案.測評結果?.動態選重分析 ?? null,
          靜態重碼分析: 本地方案.測評結果?.靜態重碼分析 ?? null,
          速度當量分析: 本地方案.測評結果?.速度當量分析 ?? null,
          簡碼效率分析: 本地方案.測評結果?.簡碼效率分析 ?? null,
        })
      }

      // 内置方案優先用頂欄已加載好的配置，避免重複解析同一批 JSON
      const 方案映射 = new Map<string, 方案配置介面>(
        方案列表.map(項 => [項.鍵名, 項.配置] as [string, 方案配置介面])
      )
      let 成功數 = 0
      const 失敗名單: string[] = []

      try {
        for (const [i, key] of 有效鍵名列表.entries()) {
          const 方案信息 = 内置方案列表.find(b => b.key === key)
          const 預覽名 = 方案信息?.name ?? key
          設置載入進度({ 當前: i + 1, 總數: 有效鍵名列表.length, 名稱: 預覽名 })
          if (已取消) return

          let 方案 = 方案映射.get(key)
          if (!方案) {
            try {
              方案 = await 加載方案(key)
            } catch {
              if (已取消) return
              失敗名單.push(預覽名)
              continue
            }
          }
          if (已取消) return
          成功數++

          const 測評結果 = 方案.測評結果
          const 方案名 = 方案信息?.name || 方案.元數據.方案名
          加入({
            唯一鍵: `${方案名}-builtin-${key}`,
            方案名,
            顯示名稱: 方案名,
            是否當前方案: false,
            標識符: 方案.元數據.標識符,
            選重編碼化: !!方案.方案參數?.選重編碼化,
            出簡不出全: !!方案.方案參數?.出簡不出全,
            碼表哈希: 方案.碼表元數據?.哈希值,
            動態選重分析: 測評結果?.動態選重分析 || null,
            靜態重碼分析: 測評結果?.靜態重碼分析 || null,
            速度當量分析: 測評結果?.速度當量分析 || null,
            簡碼效率分析: 測評結果?.簡碼效率分析 || null,
          })
        }

        if (已取消) return
        設置對比方案列表(結果列表)
        if (要提示) {
          完成後提示.current = false
          if (有效鍵名列表.length === 0) {
            message.success('已更新對比方案列表')
          } else if (失敗名單.length > 0) {
            message.warning(
              `已載入 ${成功數} 個對比方案；${失敗名單.join('、')} 未能讀取，可點「刷新」重試`
            )
          } else {
            message.success(`已載入 ${成功數} 個對比方案`)
          }
        }
      } finally {
        if (!已取消) 設置載入進度(null)
      }
    }

    執行加載()
    return () => {
      已取消 = true
    }
  }, [
    刷新計數,
    當前方案,
    動態選重分析結果,
    靜態重碼分析結果,
    速度當量分析結果,
    簡碼效率分析結果,
    選中對比方案鍵名列表,
    内置方案列表,
    方案列表,
    本地方案列表,
    選中本地方案標識符列表,
    當前本地方案標識符,
    設置選中對比方案鍵名列表,
  ])

  // 打開選擇彈窗時初始化臨時列表與搜索詞
  const 打開選擇彈窗 = () => {
    設置臨時已選方案鍵名列表(選中對比方案鍵名列表)
    設置臨時已選本地方案標識符列表(選中本地方案標識符列表)
    設置臨時搜索詞('')
    設置顯示選擇彈窗(true)
  }

  // 搜索詞過濾後的可見内置方案（全選/計數均以此爲準）
  const 過濾後内置方案 = useMemo(() => {
    const 詞 = 臨時搜索詞.trim().toLowerCase()
    if (!詞) return 内置方案列表
    return 内置方案列表.filter(
      s => s.name.toLowerCase().includes(詞) || (s.description ?? '').toLowerCase().includes(詞)
    )
  }, [内置方案列表, 臨時搜索詞])

  const 過濾鍵名 = 過濾後内置方案.map(s => s.key)
  const 過濾已選數 = 過濾鍵名.filter(k => 臨時已選方案鍵名列表.includes(k)).length

  // 全選/取消全選（只作用於當前可見的方案）
  const 處理全選 = (checked: boolean) => {
    if (checked) {
      設置臨時已選方案鍵名列表(prev => [...new Set([...prev, ...過濾鍵名])])
    } else {
      設置臨時已選方案鍵名列表(prev => prev.filter(k => !過濾鍵名.includes(k)))
    }
  }

  // 選擇方案
  const 處理方案選擇 = (key: string, checked: boolean) => {
    if (checked) {
      設置臨時已選方案鍵名列表([...臨時已選方案鍵名列表, key])
    } else {
      設置臨時已選方案鍵名列表(臨時已選方案鍵名列表.filter(k => k !== key))
    }
  }

  const 同一組 = (甲: string[], 乙: string[]) => {
    if (甲.length !== 乙.length) return false
    const 乙集合 = new Set(乙)
    return 甲.every(項 => 乙集合.has(項))
  }

  // 確認選擇的方案。下載還没開始，成功提示留到這輪加載結束
  const 確認選擇方案 = () => {
    const 内置未變 = 同一組(臨時已選方案鍵名列表, 選中對比方案鍵名列表)
    const 本地未變 = 同一組(臨時已選本地方案標識符列表, 選中本地方案標識符列表)
    設置顯示選擇彈窗(false)
    if (内置未變 && 本地未變) {
      message.success('已更新對比方案列表')
      return
    }
    完成後提示.current = true
    設置選中對比方案鍵名列表(臨時已選方案鍵名列表)
    設置選中本地方案標識符列表(臨時已選本地方案標識符列表)
  }

  // 靜態重碼字數表格列定義（根據全碼/簡碼動態生成，顯示7個字符集）
  const 獲取靜態重碼字數列 = (全碼簡碼: 全碼簡碼型别): ColumnsType<對比方案數據介面> => {
    const 碼類型: 靜態數值鍵 = 全碼簡碼 === '全碼' ? '全碼重碼字數' : '簡碼重碼字數'

    return [
      方案名列,
      ...字符集配置表.map(
        ({ key, title, dataKey }): 對比列 => ({
          title,
          key,
          sorter: 包裝排序((a, b) => {
            const a值 = 取靜態數值(a, dataKey, 碼類型)
            const b值 = 取靜態數值(b, dataKey, 碼類型)
            if (a值 === undefined) return 1
            if (b值 === undefined) return -1
            return a值 - b值
          }),
          提取數值: record => 取靜態數值(record, dataKey, 碼類型),
          render: (_: unknown, record: 對比方案數據介面) =>
            取靜態數值(record, dataKey, 碼類型) ?? 靜態缺失顯示(record, dataKey),
        })
      ),
    ]
  }

  // 靜態選重個數表格列定義
  // 選重個數 = 重碼字數 - 重碼組數，爲運行時直接計算，不參與導入導出
  const 獲取靜態選重個數列 = (全碼簡碼: 全碼簡碼型别): ColumnsType<對比方案數據介面> => {
    const 字數鍵: 靜態數值鍵 = 全碼簡碼 === '全碼' ? '全碼重碼字數' : '簡碼重碼字數'
    const 組數鍵: 靜態數值鍵 = 全碼簡碼 === '全碼' ? '全碼重碼組數' : '簡碼重碼組數'

    const 計算 = (record: 對比方案數據介面, dataKey: 累積漢字集名稱型别): number | undefined => {
      const 字數 = 取靜態數值(record, dataKey, 字數鍵)
      const 組數 = 取靜態數值(record, dataKey, 組數鍵)
      if (字數 === undefined || 組數 === undefined) return undefined
      return 字數 - 組數
    }

    return [
      方案名列,
      ...字符集配置表.map(
        ({ key, title, dataKey }): 對比列 => ({
          title,
          key,
          sorter: 包裝排序((a, b) => {
            const a值 = 計算(a, dataKey)
            const b值 = 計算(b, dataKey)
            if (a值 === undefined) return 1
            if (b值 === undefined) return -1
            return a值 - b值
          }),
          提取數值: record => 計算(record, dataKey),
          render: (_: unknown, record: 對比方案數據介面) => {
            const 值 = 計算(record, dataKey)
            return 值 !== undefined ? 值.toLocaleString() : 靜態缺失顯示(record, dataKey)
          },
        })
      ),
    ]
  }

  // 速度當量列（根據字頻來源動態生成，顯示4列）
  const 獲取速度當量列 = (字頻來源: 字頻來源型别): ColumnsType<對比方案數據介面> => {
    const 前綴 = 字頻前綴映射[字頻來源]
    const 取值 = (record: 對比方案數據介面, suffix: string): number | undefined =>
      (record.速度當量分析 as Record<string, number> | null)?.[`${前綴}${suffix}`]

    return [
      方案名列,
      ...當量配置.map(
        ({ key, title, suffix }): 對比列 => ({
          title,
          key,
          sorter: 包裝排序((a, b) => {
            const a值 = 取值(a, suffix)
            const b值 = 取值(b, suffix)
            if (a值 === undefined) return 1
            if (b值 === undefined) return -1
            return a值 - b值
          }),
          提取數值: record => 取值(record, suffix),
          render: (_: unknown, record: 對比方案數據介面) => {
            const 值 = 取值(record, suffix)
            return 值 !== undefined ? 值.toFixed(3) : '-'
          },
        })
      ),
    ]
  }

  // 動態重碼率列通用生成器（frequency-desc 與 original-order 共用）
  const 建立動態重碼率列 = (
    全碼簡碼: 全碼簡碼型别,
    配置: readonly { key: string; title: string; dataKey: string }[]
  ): ColumnsType<對比方案數據介面> => {
    const 碼類型 = 全碼簡碼 === '全碼' ? '全碼' : '簡碼'
    type 動態率分析 = Record<string, Record<string, number> | undefined>

    const 取值 = (record: 對比方案數據介面, title: string, dataKey: string): number | undefined => {
      const 對應字集 = 動態選重字頻對應字集[title]
      if (對應字集) {
        const 覆蓋率 = record.靜態重碼分析?.[對應字集]?.字集覆蓋率
        if (覆蓋率 !== undefined && 覆蓋率 < 動態重碼分析字集覆蓋率閾值) return undefined
      }
      return (record.動態選重分析 as unknown as 動態率分析 | null)?.[dataKey]?.[碼類型]
    }

    const 缺字顯示 = (record: 對比方案數據介面, title: string): string => {
      const 對應字集 = 動態選重字頻對應字集[title]
      if (對應字集) {
        const 覆蓋率 = record.靜態重碼分析?.[對應字集]?.字集覆蓋率
        if (覆蓋率 !== undefined && 覆蓋率 < 動態重碼分析字集覆蓋率閾值) return '缺字'
      }
      return '-'
    }

    return [
      方案名列,
      ...配置.map(
        ({ key, title, dataKey }): 對比列 => ({
          title,
          key,
          sorter: 包裝排序((a, b) => {
            const a值 = 取值(a, title, dataKey)
            const b值 = 取值(b, title, dataKey)
            if (a值 === undefined) return 1
            if (b值 === undefined) return -1
            return a值 - b值
          }),
          提取數值: record => 取值(record, title, dataKey),
          render: (_: unknown, record: 對比方案數據介面) => {
            const 值 = 取值(record, title, dataKey)
            return 值 !== undefined ? `${(值 * 10000).toFixed(2)}‱` : 缺字顯示(record, title)
          },
        })
      ),
    ]
  }

  // 簡碼效率列（根據字頻來源動態生成，顯示6個N值）
  const 獲取簡碼效率列 = (字頻來源: 字頻來源型别): ColumnsType<對比方案數據介面> => {
    const 字頻鍵 = 字頻鍵名映射[字頻來源]

    const 取值 = (record: 對比方案數據介面, N值: number): number | undefined => {
      const result = (
        record.簡碼效率分析 as Partial<Record<string, 單個字頻簡碼效率結果介面>> | null
      )?.[字頻鍵]?.N值結果?.find((r: N值簡碼效率結果介面) => r.最有效率的簡碼個數 === N值)
      return result?.字頻加權碼長
    }

    return [
      方案名列,
      ...N值配置.map(
        ({ key, title, N值 }): 對比列 => ({
          title,
          key,
          sorter: 包裝排序((a, b) => {
            const a值 = 取值(a, N值)
            const b值 = 取值(b, N值)
            if (a值 === undefined) return 1
            if (b值 === undefined) return -1
            return a值 - b值
          }),
          提取數值: record => 取值(record, N值),
          render: (_: unknown, record: 對比方案數據介面) => {
            const 值 = 取值(record, N值)
            return 值 !== undefined ? 值.toFixed(3) : '-'
          },
        })
      ),
    ]
  }

  // 是否爲「越低越好」的指標（速度當量、簡碼效率則越高越好）
  const 越低越好 = !['速度當量', '簡碼效率'].includes(當前分析類型)

  // 給所有數值列包一層「最優值高亮」：該列最優方案的數字用青瓷緑加粗。
  // 數值直接從原始數據提取（提取數值），不再解析渲染後的字符串——後者遇到
  // toLocaleString 的千分位逗號（如 "1,234"）會被 parseFloat 錯當成 1。
  // 方案名列與 '-'/'缺字'（提取數值返回 undefined）不參與。
  type 渲染函數 = (value: unknown, record: 對比方案數據介面, index: number) => React.ReactNode
  const 高亮最優列 = (columns: ColumnsType<對比方案數據介面>) => {
    if (!對比方案列表.length) return columns
    return columns.map(col => {
      const 提取 = (col as 對比列).提取數值
      if (!提取 || !col.render) return col
      const 有效 = 對比方案列表
        .map(r => 提取(r))
        .filter((v): v is number => v !== undefined && Number.isFinite(v))
      if (!有效.length) return col
      const 最優 = 越低越好 ? Math.min(...有效) : Math.max(...有效)
      const 原渲染 = col.render as 渲染函數
      return {
        ...col,
        render: (value: unknown, record: 對比方案數據介面, index: number) => {
          const 内容 = 原渲染(value, record, index)
          return 提取(record) === 最優 ? (
            <b style={{ color: 主題色.青瓷緑, fontWeight: 700 }}>{内容}</b>
          ) : (
            内容
          )
        },
      }
    })
  }

  // 根據當前選擇動態生成列定義
  // biome-ignore lint/correctness/useExhaustiveDependencies: 获取的列函数与高亮函数为组件内纯函数（每次渲染重建，列入依赖会使memo失效）；對比方案列表与越低越好由高亮函数闭包读取，保留以触发重算
  const 當前列定義 = useMemo(() => {
    const 原始列: ColumnsType<對比方案數據介面> = (() => {
      switch (當前分析類型) {
        case '靜態重碼':
          return 獲取靜態重碼字數列(當前全碼簡碼)
        case '靜態選重個數':
          return 獲取靜態選重個數列(當前全碼簡碼)
        case '頻率降序動態選重':
          return 建立動態重碼率列(當前全碼簡碼, 動態重碼率配置)
        case '原始碼表動態選重':
          return 建立動態重碼率列(當前全碼簡碼, 動態重碼率原序配置)
        case '速度當量':
          return 獲取速度當量列(當前字頻來源)
        case '簡碼效率':
          return 獲取簡碼效率列(當前字頻來源)
        default:
          return 獲取靜態重碼字數列(當前全碼簡碼)
      }
    })()
    return 高亮最優列(原始列)
  }, [當前分析類型, 當前字頻來源, 當前全碼簡碼, 對比方案列表, 越低越好])

  return (
    <ComparisonContainer>
      <Space orientation="vertical" size="large" style={{ width: '100%' }}>
        {/* 第一行：分析種類選擇（桌面 Segmented / 手机两列按钮组） */}
        <分析類型桌面控件>
          <Segmented
            options={分析類型選項}
            value={當前分析類型}
            onChange={value => 設置當前分析類型(value as 分析型别)}
          />
        </分析類型桌面控件>
        <分析類型手機容器>
          {分析類型選項.map(選項 => (
            <分析類型手機按鈕
              key={選項.value}
              type="button"
              $選中={當前分析類型 === 選項.value}
              onClick={() => 設置當前分析類型(選項.value as 分析型别)}
            >
              {選項.label}
            </分析類型手機按鈕>
          ))}
        </分析類型手機容器>

        {/* 第二行：字頻來源選擇（僅在當量和簡碼效率時顯示） */}
        {(當前分析類型 === '速度當量' || 當前分析類型 === '簡碼效率') && (
          <横滑容器>
            <Segmented
              size="small"
              options={字頻來源選項}
              value={當前字頻來源}
              onChange={value => 設置當前字頻來源(value as 字頻來源型别)}
            />
          </横滑容器>
        )}

        {/* 第三行：全碼/簡碼選擇 */}
        {(當前分析類型 === '靜態重碼' ||
          當前分析類型 === '靜態選重個數' ||
          當前分析類型 === '頻率降序動態選重' ||
          當前分析類型 === '原始碼表動態選重') && (
          <Segmented
            size="small"
            options={全碼簡碼選項}
            value={當前全碼簡碼}
            onChange={value => 設置當前全碼簡碼(value as 全碼簡碼型别)}
          />
        )}

        {/* 操作按鈕 */}
        <Space>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={打開選擇彈窗}
            disabled={載入進度 !== null}
          >
            選擇對比方案
          </Button>
          <Button
            icon={<ReloadOutlined />}
            onClick={刷新對比數據}
            loading={載入進度 !== null}
            disabled={載入進度 !== null}
          >
            刷新
          </Button>
        </Space>

        {/* 對比表格。下載時蓋住表格，已有數字留在下面，避免卸掉再閃回來 */}
        <div style={{ position: 'relative', minHeight: 載入進度 ? 220 : undefined }}>
          <Table
            columns={當前列定義}
            dataSource={對比方案列表}
            rowKey="唯一鍵"
            pagination={false}
            // 只保留「升序 → 降序」两态循环，去掉第三态「取消排序」：
            // antd 依 sortDirections[目前索引 + 1] 切换；末尾再补一個 ascend 讓 descend 後回到 ascend，永不落在 undefined。
            sortDirections={['ascend', 'descend', 'ascend']}
            scroll={{ x: 'max-content', y: 560 }}
            locale={{ emptyText: '尚未選擇對比方案，請點「選擇對比方案」開始' }}
          />
          {載入進度 && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                zIndex: 2,
                background: 主題色.載入遮罩,
              }}
            >
              <div
                style={{
                  position: 'sticky',
                  top: 80,
                  height: 220,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 16,
                  color: 主題色.正文,
                }}
              >
                <Spin size="large" />
                <div>
                  正在載入對比方案（{載入進度.當前}/{載入進度.總數}）{載入進度.名稱}
                </div>
              </div>
            </div>
          )}
        </div>
      </Space>

      {/* 選擇方案彈窗 */}
      <Modal
        title="選擇對比方案"
        open={顯示選擇彈窗}
        onCancel={() => 設置顯示選擇彈窗(false)}
        onOk={確認選擇方案}
        width="min(600px, 92vw)"
      >
        <Space orientation="vertical" style={{ width: '100%' }}>
          {/* 本地方案區塊（有本地方案時顯示） */}
          {本地方案列表.length > 0 && (
            <div>
              <div style={{ fontWeight: 600, marginBottom: 8, color: 主題色.青瓷緑 }}>本地方案</div>
              <Space>
                <Checkbox
                  checked={臨時已選本地方案標識符列表.length === 本地方案列表.length}
                  indeterminate={
                    臨時已選本地方案標識符列表.length > 0 &&
                    臨時已選本地方案標識符列表.length < 本地方案列表.length
                  }
                  onChange={e => {
                    if (e.target.checked) {
                      設置臨時已選本地方案標識符列表(本地方案列表.map(s => s.元數據.標識符))
                    } else {
                      設置臨時已選本地方案標識符列表([])
                    }
                  }}
                >
                  全選
                </Checkbox>
                <span style={{ color: 主題色.次要文字 }}>
                  已選 {臨時已選本地方案標識符列表.length} / {本地方案列表.length}
                </span>
              </Space>
              <div style={{ maxHeight: 200, overflow: 'auto', marginTop: 8 }}>
                <Space orientation="vertical" style={{ width: '100%' }}>
                  {本地方案列表.map(方案 => {
                    const 標識符 = 方案.元數據.標識符
                    return (
                      <Checkbox
                        key={標識符}
                        checked={臨時已選本地方案標識符列表.includes(標識符)}
                        onChange={e => {
                          if (e.target.checked) {
                            設置臨時已選本地方案標識符列表([...臨時已選本地方案標識符列表, 標識符])
                          } else {
                            設置臨時已選本地方案標識符列表(
                              臨時已選本地方案標識符列表.filter(id => id !== 標識符)
                            )
                          }
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 500 }}>
                            {方案.元數據.方案名}
                            {標識符 === 當前本地方案標識符 && (
                              <span style={{ color: 主題色.青瓷緑, marginLeft: 6, fontSize: 12 }}>
                                （當前）
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: 12, color: 主題色.次要文字 }}>
                            更新於 {new Date(方案.元數據.更新時間).toLocaleString('zh-CN')}
                          </div>
                        </div>
                      </Checkbox>
                    )
                  })}
                </Space>
              </div>
            </div>
          )}

          {/* 内置方案區塊 */}
          <div>
            {本地方案列表.length > 0 && (
              <div style={{ fontWeight: 600, marginBottom: 8, marginTop: 8 }}>内置方案</div>
            )}
            <Input
              allowClear
              placeholder="搜索内置方案"
              value={臨時搜索詞}
              onChange={e => 設置臨時搜索詞(e.target.value)}
              style={{ marginBottom: 8 }}
            />
            <Space>
              <Checkbox
                checked={過濾鍵名.length > 0 && 過濾已選數 === 過濾鍵名.length}
                indeterminate={過濾已選數 > 0 && 過濾已選數 < 過濾鍵名.length}
                disabled={過濾鍵名.length === 0}
                onChange={e => 處理全選(e.target.checked)}
              >
                全選
              </Checkbox>
              <span style={{ color: 主題色.次要文字 }}>
                已選 {過濾已選數} / {過濾鍵名.length}
              </span>
            </Space>
            <div style={{ maxHeight: 400, overflow: 'auto', marginTop: 8 }}>
              <Space orientation="vertical" style={{ width: '100%' }}>
                {過濾後内置方案.map(scheme => (
                  <Checkbox
                    key={scheme.key}
                    checked={臨時已選方案鍵名列表.includes(scheme.key)}
                    onChange={e => 處理方案選擇(scheme.key, e.target.checked)}
                  >
                    <div>
                      <div style={{ fontWeight: 500 }}>{scheme.name}</div>
                      <div style={{ fontSize: 12, color: 主題色.次要文字 }}>
                        {scheme.description}
                      </div>
                    </div>
                  </Checkbox>
                ))}
                {過濾後内置方案.length === 0 && (
                  <div style={{ color: 主題色.次要文字 }}>没有匹配的方案</div>
                )}
              </Space>
            </div>
          </div>
        </Space>
      </Modal>
    </ComparisonContainer>
  )
}

export default ComparisonPage
