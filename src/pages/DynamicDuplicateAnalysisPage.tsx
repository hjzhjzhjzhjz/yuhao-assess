import { ReloadOutlined } from '@ant-design/icons'
import { Alert, Button, Input, Modal, message, Space, Spin, Table, Tooltip, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useAtom } from 'jotai'
import React, { useEffect, useState } from 'react'
import { 碼表原子狀態 } from '../atoms/codeTable'
import type { 動態選重分析結果介面 } from '../atoms/dynamicDuplicate'
import { 動態選重分析原子狀態 } from '../atoms/dynamicDuplicate'
import { 字頻表服務類别 } from '../services/charFrequencyService'
import {
  構建出簡重排組映射,
  計算出簡重排選重率,
  計算動態選重率,
  計算原始碼表的動態選重率,
} from '../services/duplicateAnalysisService'
import type { 處理後的碼表結果介面 } from '../types'

const { Paragraph, Link } = Typography

/**
 * 動態選重率分析頁面
 * 展示基於不同字頻表的動態選重率數據
 */
const DynamicDuplicateAnalysisPage: React.FC = () => {
  const [碼表數據] = useAtom(碼表原子狀態)
  const [分析結果, 設置分析結果] = useAtom(動態選重分析原子狀態)
  const [計算中, 設置計算中] = useState(false)
  const [錯誤信息, 設置錯誤信息] = useState<string | null>(null)

  // 重碼詳情 Modal
  const [顯示詳情, 設置顯示詳情] = useState(false)
  const [詳情標題, 設置詳情標題] = useState('')
  const [詳情搜索關鍵詞, 設置詳情搜索關鍵詞] = useState('')
  const [重碼詳情列表, 設置重碼詳情列表] = useState<
    Array<{
      序號: number
      字符: string
      編碼: string
      字頻: number
      重碼字符列表: string
    }>
  >([])
  const [詳情計算中, 設置詳情計算中] = useState(false)

  // 類型斷言：碼表數據實際上是 處理後的碼表結果
  const 處理後碼表 = 碼表數據 as 處理後的碼表結果介面 | null

  /**
   * 檢查數據是否完整
   */
  const 檢查數據完整性 = (): boolean => {
    if (!分析結果) {
      return false
    }

    const 必需字段 = [
      '知乎簡體動態選重率',
      '北語簡體動態選重率',
      '臺標繁體動態選重率',
      '古籍繁體動態選重率',
      '繁簡聯合動態選重率',
      '知乎簡體動態選重率原序',
    ]

    const 完整 = 必需字段.every(字段 => 字段 in 分析結果)
    return 完整
  }

  /**
   * 重新計算重碼數據
   */
  const 重新計算 = async () => {
    if (!處理後碼表) {
      設置錯誤信息('請先在「碼表解析」頁面上傳碼表')
      return
    }

    設置計算中(true)
    設置錯誤信息(null)

    try {
      const 全碼表 = 處理後碼表.全碼表
      const 簡碼表 = 處理後碼表.簡碼表
      const 全碼加選重鍵表 = 處理後碼表.全碼加選重鍵表

      // 加載字頻數據
      const [知乎字頻, 北語字頻, 臺標字頻, 古籍字頻] = await Promise.all([
        字頻表服務類别.加載知乎簡體字頻(),
        字頻表服務類别.加載北語簡體字頻(),
        字頻表服務類别.加載臺標繁體字頻(),
        字頻表服務類别.加載古籍繁體字頻(),
      ])

      // 計算繁簡聯合字頻（北語 + 臺標）
      const 繁簡聯合字頻 = await 字頻表服務類别.計算繁簡聯合字頻()

      // ========== 動態選重率（按字頻重排） ==========
      const 知乎簡體動態選重率 = {
        全碼: 計算動態選重率(全碼表, 知乎字頻, true),
        簡碼: 計算出簡重排選重率(全碼加選重鍵表, 簡碼表, 知乎字頻, true),
      }

      const 北語簡體動態選重率 = {
        全碼: 計算動態選重率(全碼表, 北語字頻, true),
        簡碼: 計算出簡重排選重率(全碼加選重鍵表, 簡碼表, 北語字頻, true),
      }

      const 臺標繁體動態選重率 = {
        全碼: 計算動態選重率(全碼表, 臺標字頻, true),
        簡碼: 計算出簡重排選重率(全碼加選重鍵表, 簡碼表, 臺標字頻, true),
      }

      const 古籍繁體動態選重率 = {
        全碼: 計算動態選重率(全碼表, 古籍字頻, true),
        簡碼: 計算出簡重排選重率(全碼加選重鍵表, 簡碼表, 古籍字頻, true),
      }

      const 繁簡聯合動態選重率 = {
        全碼: 計算動態選重率(全碼表, 繁簡聯合字頻, true),
        簡碼: 計算出簡重排選重率(全碼加選重鍵表, 簡碼表, 繁簡聯合字頻, true),
      }

      // ========== 動態選重率（保持原序） ==========
      const 知乎簡體動態選重率原序 = {
        全碼: 計算原始碼表的動態選重率(全碼加選重鍵表, 知乎字頻),
        簡碼: 計算出簡重排選重率(全碼加選重鍵表, 簡碼表, 知乎字頻, false),
      }

      const 北語簡體動態選重率原序 = {
        全碼: 計算原始碼表的動態選重率(全碼加選重鍵表, 北語字頻),
        簡碼: 計算出簡重排選重率(全碼加選重鍵表, 簡碼表, 北語字頻, false),
      }

      const 臺標繁體動態選重率原序 = {
        全碼: 計算原始碼表的動態選重率(全碼加選重鍵表, 臺標字頻),
        簡碼: 計算出簡重排選重率(全碼加選重鍵表, 簡碼表, 臺標字頻, false),
      }

      const 古籍繁體動態選重率原序 = {
        全碼: 計算原始碼表的動態選重率(全碼加選重鍵表, 古籍字頻),
        簡碼: 計算出簡重排選重率(全碼加選重鍵表, 簡碼表, 古籍字頻, false),
      }

      const 繁簡聯合動態選重率原序 = {
        全碼: 計算原始碼表的動態選重率(全碼加選重鍵表, 繁簡聯合字頻),
        簡碼: 計算出簡重排選重率(全碼加選重鍵表, 簡碼表, 繁簡聯合字頻, false),
      }

      const 新結果: 動態選重分析結果介面 = {
        知乎簡體動態選重率,
        北語簡體動態選重率,
        臺標繁體動態選重率,
        古籍繁體動態選重率,
        繁簡聯合動態選重率,
        知乎簡體動態選重率原序,
        北語簡體動態選重率原序,
        臺標繁體動態選重率原序,
        古籍繁體動態選重率原序,
        繁簡聯合動態選重率原序,
        更新時間: new Date().toISOString(),
      }

      設置分析結果(新結果)
      message.success('動態選重率計算完成')
    } catch (error) {
      設置錯誤信息(error instanceof Error ? error.message : '計算失敗')
    } finally {
      設置計算中(false)
    }
  }

  /**
   * 組件掛載時檢查數據
   */
  useEffect(() => {
    if (!分析結果 || !檢查數據完整性()) {
      // 數據不完整，自動觸發計算
      if (處理後碼表) {
        重新計算()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /**
   * 顯示重碼詳情（臨時計算，不存到 atom）
   */
  const 顯示重碼字符詳情 = async (
    字頻類型: string,
    碼表類型: '全碼' | '簡碼',
    是否按字頻排序: boolean = true
  ) => {
    if (!處理後碼表) return

    設置詳情計算中(true)
    設置顯示詳情(true)

    try {
      // 加載對應字頻
      let 字頻數據: Record<string, number>
      if (字頻類型 === 'zhihu') {
        字頻數據 = await 字頻表服務類别.加載知乎簡體字頻()
        設置詳情標題(`知乎簡體${碼表類型}動態選重詳情${是否按字頻排序 ? '' : '（原序）'}`)
      } else if (字頻類型 === 'sc') {
        字頻數據 = await 字頻表服務類别.加載北語簡體字頻()
        設置詳情標題(`北語簡體${碼表類型}動態選重詳情${是否按字頻排序 ? '' : '（原序）'}`)
      } else if (字頻類型 === 'tc') {
        字頻數據 = await 字頻表服務類别.加載臺標繁體字頻()
        設置詳情標題(`臺標繁體${碼表類型}動態選重詳情${是否按字頻排序 ? '' : '（原序）'}`)
      } else if (字頻類型 === 'guji') {
        字頻數據 = await 字頻表服務類别.加載古籍繁體字頻()
        設置詳情標題(`古籍繁體${碼表類型}動態選重詳情${是否按字頻排序 ? '' : '（原序）'}`)
      } else if (字頻類型 === 'unified') {
        字頻數據 = await 字頻表服務類别.計算繁簡聯合字頻()
        設置詳情標題(`繁簡聯合${碼表類型}動態選重詳情${是否按字頻排序 ? '' : '（原序）'}`)
      } else {
        throw new Error('未知的字頻類型')
      }

      // 計算重碼詳情
      const 詳情列表: Array<{
        序號: number
        字符: string
        編碼: string
        字頻: number
        重碼字符列表: string
      }> = []

      if (碼表類型 === '簡碼') {
        // 出簡不出全：以全碼組爲基礎，剔除擁有更短簡碼的字後重排位次，
        // 與「出簡」列共用同一套邏輯，使詳情與彙總同源。
        const 組映射 = 構建出簡重排組映射(
          處理後碼表.全碼加選重鍵表,
          處理後碼表.簡碼表,
          字頻數據,
          是否按字頻排序
        )
        let 序號 = 1
        for (const [基礎編碼, 組] of 組映射.entries()) {
          const 字符列表文字 = 組.map(c => `${c.字}(${(c.字頻 * 10000).toFixed(2)}‱)`).join('、')
          for (const x of 組) {
            if (!x.需選重) continue
            詳情列表.push({
              序號,
              字符: x.字,
              編碼: 基礎編碼,
              字頻: x.字頻,
              重碼字符列表: 字符列表文字,
            })
            序號++
          }
        }
      } else {
        // 全碼：按全碼表的原始編碼分組
        const 編碼映射 = new Map<string, Array<{ 字符: string; 字頻: number }>>()
        for (const [字符, 編碼數組] of 處理後碼表.全碼表.entries()) {
          const 編碼 = 編碼數組[0]
          if (編碼) {
            const 字頻 = 字頻數據[字符] || 0
            if (!編碼映射.has(編碼)) {
              編碼映射.set(編碼, [])
            }
            編碼映射.get(編碼)!.push({ 字符, 字頻 })
          }
        }

        let 序號 = 1
        for (const [編碼, 字符列表] of 編碼映射.entries()) {
          if (字符列表.length > 1) {
            // 按字頻排序
            if (是否按字頻排序) {
              字符列表.sort((a, b) => b.字頻 - a.字頻)
            }

            // 爲每個需要選重的字符（除首選外）添加一行
            const 字符列表文字 = 字符列表
              .map(c => `${c.字符}(${(c.字頻 * 10000).toFixed(2)}‱)`)
              .join('、')
            for (let i = 1; i < 字符列表.length; i++) {
              const 當前字符 = 字符列表[i]
              if (!當前字符) continue // 類型守衛

              詳情列表.push({
                序號,
                字符: 當前字符.字符,
                編碼,
                字頻: 當前字符.字頻,
                重碼字符列表: 字符列表文字,
              })
              序號++
            }
          }
        }
      }

      // 按字頻降序排列詳情列表
      詳情列表.sort((a, b) => b.字頻 - a.字頻)

      // 重新編號
      詳情列表.forEach((item, index) => {
        item.序號 = index + 1
      })

      設置重碼詳情列表(詳情列表)
    } catch (error) {
      設置錯誤信息(error instanceof Error ? error.message : '計算詳情失敗')
    } finally {
      設置詳情計算中(false)
    }
  }

  /**
   * 渲染數據表格
   */
  const 渲染表格 = () => {
    if (!分析結果) return null

    type 表格數據項 = {
      key: string
      指標: string
      全碼: string
      簡碼: string
      説明: React.ReactNode
      提示?: string
      可點擊?: boolean
      點擊處理?: (碼表類型: '全碼' | '簡碼') => void
    }

    const 動態選重率數據: 表格數據項[] = [
      {
        key: '1',
        指標: '知乎簡體·頻率降序',
        全碼: 分析結果.知乎簡體動態選重率
          ? (分析結果.知乎簡體動態選重率.全碼 * 10000).toFixed(2) + '‱'
          : '-',
        簡碼: 分析結果.知乎簡體動態選重率
          ? (分析結果.知乎簡體動態選重率.簡碼 * 10000).toFixed(2) + '‱'
          : '-',
        説明: (
          <>
            基於
            <Link href="https://github.com/forfudan/chinese-characters-frequency" target="_blank">
              知乎字頻表
            </Link>
            的加權選重率。
          </>
        ),
        提示: '計算動態選衝率時，會使用字頻數據對漢字進行降序重排，以方便不同方案進行比較。因此上，計算結果可能會稍低於真實選重率。',
        可點擊: true,
        點擊處理: (碼表類型: '全碼' | '簡碼') => 顯示重碼字符詳情('zhihu', 碼表類型, true),
      },
      {
        key: '2',
        指標: '北語簡體·頻率降序',
        全碼: 分析結果.北語簡體動態選重率
          ? (分析結果.北語簡體動態選重率.全碼 * 10000).toFixed(2) + '‱'
          : '-',
        簡碼: 分析結果.北語簡體動態選重率
          ? (分析結果.北語簡體動態選重率.簡碼 * 10000).toFixed(2) + '‱'
          : '-',
        説明: (
          <>
            基於北京語言大學邢紅兵
            <Link
              href="https://faculty.blcu.edu.cn/xinghb/zh_CN/article/167473/content/1437.htm"
              target="_blank"
            >
              簡體字頻表
            </Link>
            的加權選重率
          </>
        ),
        提示: '計算動態選衝率時，會使用字頻數據對漢字進行降序重排，以方便不同方案進行比較。因此上，計算結果可能會稍低於真實選重率。',
        可點擊: true,
        點擊處理: (碼表類型: '全碼' | '簡碼') => 顯示重碼字符詳情('sc', 碼表類型, true),
      },
      {
        key: '3',
        指標: '臺標繁體·頻率降序',
        全碼: 分析結果.臺標繁體動態選重率
          ? (分析結果.臺標繁體動態選重率.全碼 * 10000).toFixed(2) + '‱'
          : '-',
        簡碼: 分析結果.臺標繁體動態選重率
          ? (分析結果.臺標繁體動態選重率.簡碼 * 10000).toFixed(2) + '‱'
          : '-',
        説明: (
          <>
            基於
            <Link
              href="https://language.moe.gov.tw/001/Upload/files/SITE_CONTENT/M0001/PIN/biau1.htm"
              target="_blank"
            >
              臺灣繁體字頻表
            </Link>
            的加權選重率
          </>
        ),
        提示: '計算動態選衝率時，會使用字頻數據對漢字進行降序重排，以方便不同方案進行比較。因此上，計算結果可能會稍低於真實選重率。',
        可點擊: true,
        點擊處理: (碼表類型: '全碼' | '簡碼') => 顯示重碼字符詳情('tc', 碼表類型, true),
      },
      {
        key: '4',
        指標: '古籍繁體·頻率降序',
        全碼: 分析結果.古籍繁體動態選重率
          ? (分析結果.古籍繁體動態選重率.全碼 * 10000).toFixed(2) + '‱'
          : '-',
        簡碼: 分析結果.古籍繁體動態選重率
          ? (分析結果.古籍繁體動態選重率.簡碼 * 10000).toFixed(2) + '‱'
          : '-',
        説明: '基於史書（史記、漢書、後漢書、三國志等）字頻的加權選重率',
        提示: '計算動態選衝率時，會使用字頻數據對漢字進行降序重排，以方便不同方案進行比較。因此上，計算結果可能會稍低於真實選重率。',
        可點擊: true,
        點擊處理: (碼表類型: '全碼' | '簡碼') => 顯示重碼字符詳情('guji', 碼表類型, true),
      },
      {
        key: '5',
        指標: '繁簡聯合·頻率降序',
        全碼: 分析結果.繁簡聯合動態選重率
          ? (分析結果.繁簡聯合動態選重率.全碼 * 10000).toFixed(2) + '‱'
          : '-',
        簡碼: 分析結果.繁簡聯合動態選重率
          ? (分析結果.繁簡聯合動態選重率.簡碼 * 10000).toFixed(2) + '‱'
          : '-',
        説明: '基於繁簡聯合字頻表（北語字頻+臺標字頻）的加權選重率',
        提示: '計算動態選衝率時，會使用字頻數據對漢字進行降序重排，以方便不同方案進行比較。因此上，計算結果可能會稍低於真實選重率。',
        可點擊: true,
        點擊處理: (碼表類型: '全碼' | '簡碼') => 顯示重碼字符詳情('unified', 碼表類型, true),
      },
      {
        key: '6',
        指標: '知乎簡體·原始碼表',
        全碼: 分析結果.知乎簡體動態選重率原序
          ? (分析結果.知乎簡體動態選重率原序.全碼 * 10000).toFixed(2) + '‱'
          : '-',
        簡碼: 分析結果.知乎簡體動態選重率原序
          ? (分析結果.知乎簡體動態選重率原序.簡碼 * 10000).toFixed(2) + '‱'
          : '-',
        説明: '基於知乎字頻，保持碼表原始排序的加權選重率',
        提示: '不對重碼字符按字頻重新排序，保持碼表原始順序進行選重率計算。反映碼表實際使用時的選重率。',
        可點擊: true,
        點擊處理: (碼表類型: '全碼' | '簡碼') => 顯示重碼字符詳情('zhihu', 碼表類型, false),
      },
      {
        key: '7',
        指標: '北語簡體·原始碼表',
        全碼: 分析結果.北語簡體動態選重率原序
          ? (分析結果.北語簡體動態選重率原序.全碼 * 10000).toFixed(2) + '‱'
          : '-',
        簡碼: 分析結果.北語簡體動態選重率原序
          ? (分析結果.北語簡體動態選重率原序.簡碼 * 10000).toFixed(2) + '‱'
          : '-',
        説明: '基於北語字頻，保持碼表原始排序的加權選重率',
        提示: '不對重碼字符按字頻重新排序，保持碼表原始順序進行選重率計算。反映碼表實際使用時的選重率。',
        可點擊: true,
        點擊處理: (碼表類型: '全碼' | '簡碼') => 顯示重碼字符詳情('sc', 碼表類型, false),
      },
      {
        key: '8',
        指標: '臺標繁體·原始碼表',
        全碼: 分析結果.臺標繁體動態選重率原序
          ? (分析結果.臺標繁體動態選重率原序.全碼 * 10000).toFixed(2) + '‱'
          : '-',
        簡碼: 分析結果.臺標繁體動態選重率原序
          ? (分析結果.臺標繁體動態選重率原序.簡碼 * 10000).toFixed(2) + '‱'
          : '-',
        説明: '基於臺標字頻，保持碼表原始排序的加權選重率',
        提示: '不對重碼字符按字頻重新排序，保持碼表原始順序進行選重率計算。反映碼表實際使用時的選重率。',
        可點擊: true,
        點擊處理: (碼表類型: '全碼' | '簡碼') => 顯示重碼字符詳情('tc', 碼表類型, false),
      },
      {
        key: '9',
        指標: '古籍繁體·原始碼表',
        全碼: 分析結果.古籍繁體動態選重率原序
          ? (分析結果.古籍繁體動態選重率原序.全碼 * 10000).toFixed(2) + '‱'
          : '-',
        簡碼: 分析結果.古籍繁體動態選重率原序
          ? (分析結果.古籍繁體動態選重率原序.簡碼 * 10000).toFixed(2) + '‱'
          : '-',
        説明: '基於古籍字頻，保持碼表原始排序的加權選重率',
        提示: '不對重碼字符按字頻重新排序，保持碼表原始順序進行選重率計算。反映碼表實際使用時的選重率。',
        可點擊: true,
        點擊處理: (碼表類型: '全碼' | '簡碼') => 顯示重碼字符詳情('guji', 碼表類型, false),
      },
      {
        key: '10',
        指標: '繁簡聯合·原始碼表',
        全碼: 分析結果.繁簡聯合動態選重率原序
          ? (分析結果.繁簡聯合動態選重率原序.全碼 * 10000).toFixed(2) + '‱'
          : '-',
        簡碼: 分析結果.繁簡聯合動態選重率原序
          ? (分析結果.繁簡聯合動態選重率原序.簡碼 * 10000).toFixed(2) + '‱'
          : '-',
        説明: '基於繁簡聯合字頻表（北語字頻+臺標字頻），保持碼表原始排序的加權選重率',
        提示: '不對重碼字符按字頻重新排序，保持碼表原始順序進行選重率計算。反映碼表實際使用時的選重率。',
        可點擊: true,
        點擊處理: (碼表類型: '全碼' | '簡碼') => 顯示重碼字符詳情('unified', 碼表類型, false),
      },
    ]

    const 列定義: ColumnsType<表格數據項> = [
      {
        title: '單字指標',
        dataIndex: '指標',
        key: '指標',
        render: (text, record) =>
          record.提示 ? (
            <Tooltip title={record.提示}>
              <span style={{ cursor: 'help', borderBottom: '1px dotted #999' }}>{text}</span>
            </Tooltip>
          ) : (
            text
          ),
      },
      {
        title: '全碼',
        dataIndex: '全碼',
        key: '全碼',
        align: 'right',
        render: (text, record) =>
          record.可點擊 ? (
            <span
              style={{ cursor: 'pointer', color: '#2a9d8f' }}
              onClick={() => record.點擊處理?.('全碼')}
            >
              {text}
            </span>
          ) : (
            text
          ),
      },
      {
        title: (
          <Tooltip title="「出簡」列採用「出簡不出全」重排：擁有更短簡碼的字退出其全碼候選組，剩餘字重新編排選重位次後再計算動態選重率。故簡碼確實降低的重碼（如杏、束）會如實反映；與「全碼」列共用同一分母，可直接比較。">
            <span style={{ cursor: 'help', borderBottom: '1px dotted #999' }}>出簡</span>
          </Tooltip>
        ),
        dataIndex: '簡碼',
        key: '簡碼',
        align: 'right',
        render: (text, record) =>
          record.可點擊 ? (
            <span
              style={{ cursor: 'pointer', color: '#2a9d8f' }}
              onClick={() => record.點擊處理?.('簡碼')}
            >
              {text}
            </span>
          ) : (
            text
          ),
      },
      {
        title: '説明',
        dataIndex: '説明',
        key: '説明',
      },
    ]

    return (
      <Table
        columns={列定義}
        dataSource={動態選重率數據}
        pagination={false}
        bordered
        style={{ marginTop: 16 }}
      />
    )
  }

  /**
   * 重碼詳情表格列定義
   */
  type 詳情表格數據項 = {
    序號: number
    字符: string
    編碼: string
    字頻: number
    重碼字符列表: string
  }

  const 詳情列定義: ColumnsType<詳情表格數據項> = [
    { title: '#', dataIndex: '序號', key: '序號', width: 60 },
    { title: '重碼字', dataIndex: '字符', key: '字符', width: 80 },
    { title: '編碼', dataIndex: '編碼', key: '編碼', width: 100 },
    {
      title: '字頻（‱）',
      dataIndex: '字頻',
      key: '字頻',
      width: 100,
      render: (v: number) => (v * 10000).toFixed(2),
    },
    {
      title: '該編碼上的字符（字頻降序）',
      dataIndex: '重碼字符列表',
      key: '重碼字符列表',
      ellipsis: true,
    },
  ]

  return (
    <div style={{ padding: 24 }}>
      <Space orientation="vertical" size="large" style={{ width: '100%' }}>
        {/* 頁面標題 */}
        <div>
          <Paragraph>
            分析不同字頻數據下的選重率。閲讀
            <Link href="https://shurufa.app/docs/concepts.html" target="_blank">
              瓊林擷英
            </Link>
            瞭解詳細定義。
          </Paragraph>
        </div>

        {/* 操作按鈕 */}
        <Space>
          <Button
            type="primary"
            icon={<ReloadOutlined />}
            onClick={重新計算}
            loading={計算中}
            disabled={!碼表數據}
          >
            重新計算
          </Button>
        </Space>

        {/* 錯誤提示 */}
        {錯誤信息 && (
          <Alert title={錯誤信息} type="error" closable onClose={() => 設置錯誤信息(null)} />
        )}

        {/* 加載中 */}
        {計算中 && (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <Spin size="large" />
            <p style={{ marginTop: 16 }}>正在計算重碼數據...</p>
          </div>
        )}

        {/* 數據表格 */}
        {!計算中 && 分析結果 && 渲染表格()}

        {/* 無數據提示 */}
        {!計算中 && !分析結果 && !錯誤信息 && (
          <Alert
            title="請點擊「重新計算」來查看分析結果"
            type="info"
            showIcon
            style={{ marginTop: 16 }}
          />
        )}
      </Space>

      {/* 重碼詳情 Modal */}
      <Modal
        title={詳情標題}
        open={顯示詳情}
        onCancel={() => {
          設置顯示詳情(false)
          設置詳情搜索關鍵詞('')
        }}
        width={1200}
        footer={[
          <Button
            key="close"
            onClick={() => {
              設置顯示詳情(false)
              設置詳情搜索關鍵詞('')
            }}
          >
            關閉
          </Button>,
        ]}
      >
        {詳情計算中 ? (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Spin size="large" />
            <p style={{ marginTop: 16 }}>正在計算重碼詳情...</p>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 16 }}>
              <Input.Search
                placeholder="搜索字符、編碼或重碼字符列表..."
                value={詳情搜索關鍵詞}
                onChange={e => 設置詳情搜索關鍵詞(e.target.value)}
                allowClear
                style={{ width: 400 }}
              />
            </div>
            <Table
              columns={詳情列定義}
              dataSource={重碼詳情列表.filter(item => {
                if (!詳情搜索關鍵詞) return true
                const keyword = 詳情搜索關鍵詞.toLowerCase()
                return (
                  item.字符.includes(詳情搜索關鍵詞) ||
                  item.編碼.toLowerCase().includes(keyword) ||
                  item.重碼字符列表.includes(詳情搜索關鍵詞)
                )
              })}
              pagination={{
                defaultPageSize: 50,
                pageSizeOptions: ['20', '50', '100', '200'],
                showSizeChanger: true,
                showTotal: (total, range) => `顯示 ${range[0]}-${range[1]} 條，共 ${total} 條`,
              }}
              bordered
              size="small"
              scroll={{ y: 500 }}
            />
          </>
        )}
      </Modal>
    </div>
  )
}

export default DynamicDuplicateAnalysisPage
