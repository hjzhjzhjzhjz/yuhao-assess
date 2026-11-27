import { DownloadOutlined, ThunderboltOutlined, UploadOutlined } from '@ant-design/icons'
import type { UploadProps } from 'antd'
import { App, Button, Space, Upload } from 'antd'
import { useAtomValue, useSetAtom } from 'jotai'
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import styled from 'styled-components'
import { 原始碼表原子狀態, 碼表原子狀態, 編碼預覽數據原子狀態 } from '@/atoms/codeTable'
import { 動態選重分析原子狀態 } from '@/atoms/dynamicDuplicate'
import { 鍵位熱力分析原子狀態 } from '@/atoms/keyboardHeatmap'
import { 當前本地方案標識符原子狀態 } from '@/atoms/localSchemes'
import { 方案列表原子狀態, 當前方案原子狀態 } from '@/atoms/scheme'
import { 簡碼效率分析原子狀態 } from '@/atoms/shortCodeEfficiency'
import { 當量詳情原子狀態, 速度當量分析原子狀態 } from '@/atoms/speedEquivalent'
import { 靜態重碼分析原子狀態 } from '@/atoms/staticDuplicate'
import { 解析導入JSON } from '@/schemas/importScheme'
import { 應用方案數據, type 方案應用Setters } from '@/services/atomResetService'
import { 導出方案配置JSON } from '@/services/exportService'
import { 列出可用方案, 加載方案 } from '@/services/schemeService'
import { 觸發所有分析計算 } from '@/services/triggerAnalysisService'
import type { 方案列表項介面 } from '@/types/scheme'

/** antd 6 主入口未直接導出 RcFile，從 UploadProps 推導等價類型 */
type RcFile = Parameters<NonNullable<UploadProps['beforeUpload']>>[0]

const HeaderContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;

  /* 頂欄底色是深的，而 antd 的禁用態是 4% 黑底 ＋ 25% 黑字——兩者在深色上
     都看不見，整顆按鈕連字帶框一起消失。「重算」在没有碼表時就是禁用的，
     於是頂欄上會憑空出現一個黑方塊。這裏把禁用態改成淺色的半透明。 */
  button:disabled {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 255, 255, 0.25);
    color: rgba(255, 255, 255, 0.45);
  }

  /* 移動端：標題與操作區上下排列，避免橫向擠壓 */
  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
  }
`

const PageTitle = styled.h1`
  margin: 0;
  color: white;
  font-size: 18px;
  font-weight: 500;
  flex-shrink: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 280px;

  @media (max-width: 768px) {
    font-size: 16px;
    max-width: 100%;
  }
`

export function AppHeader() {
  const navigate = useNavigate()
  const { message } = App.useApp()
  const 當前方案 = useAtomValue(當前方案原子狀態)
  const 設置方案列表 = useSetAtom(方案列表原子狀態)
  const 設置當前方案 = useSetAtom(當前方案原子狀態)
  const 設置當前本地方案標識符 = useSetAtom(當前本地方案標識符原子狀態)
  const 設置靜態重碼分析結果 = useSetAtom(靜態重碼分析原子狀態)
  const 設置動態選重分析結果 = useSetAtom(動態選重分析原子狀態)
  const 設置速度當量分析結果 = useSetAtom(速度當量分析原子狀態)
  const 設置簡碼效率分析結果 = useSetAtom(簡碼效率分析原子狀態)
  const 設置鍵位熱力分析結果 = useSetAtom(鍵位熱力分析原子狀態)
  const 設置碼表數據 = useSetAtom(碼表原子狀態)
  const 設置原始碼表 = useSetAtom(原始碼表原子狀態)
  const 設置編碼預覽數據 = useSetAtom(編碼預覽數據原子狀態)

  // 讀取分析結果用於導出
  const 靜態重碼分析結果 = useAtomValue(靜態重碼分析原子狀態)
  const 動態選重分析結果 = useAtomValue(動態選重分析原子狀態)
  const 速度當量分析結果 = useAtomValue(速度當量分析原子狀態)
  const 設置當量詳情 = useSetAtom(當量詳情原子狀態)
  const 簡碼效率分析結果 = useAtomValue(簡碼效率分析原子狀態)
  const 鍵位熱力分析結果 = useAtomValue(鍵位熱力分析原子狀態)
  const 編碼預覽數據 = useAtomValue(編碼預覽數據原子狀態)

  /** 導出用，收在一處 */
  const 當前分析結果 = {
    靜態重碼分析結果,
    動態選重分析結果,
    速度當量分析結果,
    簡碼效率分析結果,
    鍵位熱力分析結果,
  }

  const 顯示標題 = 當前方案 ? 當前方案.元數據.方案名 : '未選擇方案'
  const 可以全局重算 = 編碼預覽數據.length > 0

  // 所有寫入方案狀態的 setter，供 atomResetService 統一調度（導入用）
  const 方案Setters: 方案應用Setters = {
    設置當前方案,
    設置碼表數據,
    設置原始碼表,
    設置編碼預覽數據,
    設置靜態重碼分析結果,
    設置動態選重分析結果,
    設置速度當量分析結果,
    設置當量詳情,
    設置簡碼效率分析結果,
    設置鍵位熱力分析結果,
  }

  /**
   * 加載預設方案列表
   *
   * 方案列表由頂欄統一拉取，首頁的方案卡片依賴這份數據。
   */
  useEffect(() => {
    let 已卸載 = false
    async function 初始化方案列表() {
      try {
        const 方案鍵名列表 = await 列出可用方案()
        const 加載的方案列表 = await Promise.all(
          方案鍵名列表.map(鍵名 =>
            加載方案(鍵名)
              .then(配置 => ({ 鍵名, 配置 }))
              .catch(錯誤 => {
                console.error(`❌ [AppHeader] 方案 ${鍵名} 加載失敗:`, 錯誤)
                return null
              })
          )
        )
        if (已卸載) return
        設置方案列表(加載的方案列表.filter((項): 項 is 方案列表項介面 => 項 !== null))
      } catch (錯誤) {
        console.error('❌ [AppHeader] 加載方案列表失敗:', 錯誤)
      }
    }
    初始化方案列表()
    return () => {
      已卸載 = true
    }
  }, [設置方案列表])

  // 導入配置：Zod 校驗（方案骨架 + 5 類測評結果逐類），錯誤精確到字段
  const 處理導入JSON = (file: RcFile): boolean => {
    const reader = new FileReader()
    reader.onload = e => {
      try {
        const 文本 = e.target?.result as string
        const 校驗 = 解析導入JSON(文本)
        if (!校驗.成功) {
          // 校驗失败时不动任何 atom，用户当前工作方案保持原样
          message.error({ content: `導入失敗：${校驗.錯誤}`, duration: 8 })
          return
        }

        const { 方案, 已載入結果, 跳過的結果 } = 應用方案數據(校驗.方案, 方案Setters)
        設置當前本地方案標識符(null)

        const 完整提示 = 已載入結果.length > 0 ? `（包含${已載入結果.join('、')}結果）` : ''
        message.success(`已導入配置「${方案.元數據.方案名}」${完整提示}`)
        if (跳過的結果.length > 0) {
          message.warning({
            content: `以下結果格式不正確已跳過：${跳過的結果.join('、')}。方案配置已正常導入。`,
            duration: 8,
          })
        }
      } catch (錯誤) {
        console.error('[AppHeader] 導入配置失敗:', 錯誤)
        message.error({
          content: `導入失敗：${錯誤 instanceof Error ? 錯誤.message : '文件格式不正確'}`,
          duration: 8,
        })
      }
    }
    reader.onerror = () => message.error('讀取文件失敗，請重試')
    reader.readAsText(file)
    return false
  }

  // 導出配置
  const 處理導出JSON = () => {
    if (!當前方案) {
      message.warning('請先選擇或創建方案')
      return
    }
    const 結果 = 導出方案配置JSON(當前方案, 當前分析結果, false)
    if (結果.success) {
      message.success(結果.message || '導出成功')
    } else {
      message.error(結果.message || '導出失敗')
    }
  }

  // 全局重算
  const 處理全局重算 = async () => {
    設置靜態重碼分析結果(null)
    設置動態選重分析結果(null)
    設置速度當量分析結果(null)
    設置簡碼效率分析結果(null)
    設置鍵位熱力分析結果(null)
    message.loading('正在清除舊數據並觸發重新計算...', 1)
    await 觸發所有分析計算(navigate, '/')
    message.success('所有分析已觸發！')
  }

  return (
    <HeaderContainer>
      <PageTitle title={顯示標題}>{顯示標題}</PageTitle>
      <Space wrap size="small">
        <Upload beforeUpload={處理導入JSON} showUploadList={false} accept="application/json,.json">
          <Button icon={<UploadOutlined />} size="small">
            導入
          </Button>
        </Upload>
        <Button
          icon={<DownloadOutlined />}
          onClick={處理導出JSON}
          disabled={!當前方案}
          size="small"
        >
          導出
        </Button>
        <Button
          icon={<ThunderboltOutlined />}
          onClick={處理全局重算}
          disabled={!可以全局重算}
          size="small"
          type="primary"
        >
          重算
        </Button>
      </Space>
    </HeaderContainer>
  )
}
