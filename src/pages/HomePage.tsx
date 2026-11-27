import {
  CheckCircleFilled,
  CloudDownloadOutlined,
  CopyOutlined,
  DeleteOutlined,
  PlusCircleOutlined,
  PlusOutlined,
  UserOutlined,
} from '@ant-design/icons'
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Input,
  InputNumber,
  Modal,
  message,
  Popconfirm,
  Space,
  Tag,
  Tooltip,
  Typography,
} from 'antd'
import { useAtom, useAtomValue, useSetAtom } from 'jotai'
import { useState } from 'react'
import styled from 'styled-components'
import { 原始碼表原子狀態, 碼表原子狀態, 編碼預覽數據原子狀態 } from '@/atoms/codeTable'
import { 動態選重分析原子狀態 } from '@/atoms/dynamicDuplicate'
import { 鍵位熱力分析原子狀態 } from '@/atoms/keyboardHeatmap'
import {
  本地方案列表原子狀態,
  生成克隆後綴,
  生成本地標識符,
  當前本地方案標識符原子狀態,
} from '@/atoms/localSchemes'
import { 方案列表原子狀態, 當前方案原子狀態, 頂欄方案載入名原子狀態 } from '@/atoms/scheme'
import { 簡碼效率分析原子狀態 } from '@/atoms/shortCodeEfficiency'
import { 當量詳情原子狀態, 速度當量分析原子狀態 } from '@/atoms/speedEquivalent'
import { 靜態重碼分析原子狀態 } from '@/atoms/staticDuplicate'
import { 應用方案數據, type 方案應用Setters, 清空所有Atom } from '@/services/atomResetService'
import { 收集測評結果 } from '@/services/exportService'
import { 創建空白方案, 加載方案, 查找方案鍵名 } from '@/services/schemeService'
import type { 方案列表項介面, 方案配置介面 } from '@/types/scheme'
import { 等界面繪製 } from '@/utils/wait-for-paint'

const { Title, Text, Paragraph } = Typography
const { TextArea } = Input

/* ============================================================
   樣式
   ============================================================ */

const Page = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
`

const Hero = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 24px 28px;
  border-radius: var(--radius-lg);
  background: linear-gradient(135deg, #1c2b2d 0%, #24413e 55%, #2a9d8f 160%);
  color: #fff;
  overflow: hidden;

  &::after {
    content: '';
    position: absolute;
    right: -60px;
    top: -80px;
    width: 260px;
    height: 260px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.07);
    pointer-events: none;
  }

  @media (max-width: 768px) {
    padding: 18px;
    flex-direction: column;
    align-items: flex-start;
  }
`

const HeroTitle = styled(Title)`
  && {
    margin: 0 0 4px;
    color: #fff;
    font-weight: 600;
    letter-spacing: 0.5px;
  }
`

const HeroSubtitle = styled(Text)`
  && {
    color: rgba(255, 255, 255, 0.75);
  }
`

const HeroMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 20px;
  position: relative;
  z-index: 1;

  @media (max-width: 768px) {
    gap: 12px;
    flex-wrap: wrap;
  }
`

const MetaItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 64px;
`

const MetaLabel = styled.span`
  font-size: 11px;
  color: rgba(255, 255, 255, 0.6);
  letter-spacing: 1px;
`

const MetaValue = styled.span`
  font-size: 15px;
  font-weight: 600;
  color: #fff;
  white-space: nowrap;
`

const SectionHead = styled.div`
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 12px;
`

const SectionTitle = styled(Title)`
  && {
    margin: 0;
    font-size: 17px;
    font-weight: 600;
    color: var(--color-text-primary);
  }
`

const SectionHint = styled(Text)`
  && {
    font-size: 12px;
  }
`

const SchemeGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
  gap: 14px;

  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }
`

const SchemeCard = styled.button<{ $active: boolean }>`
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  min-height: 138px;
  padding: 16px;
  text-align: left;
  cursor: pointer;
  border: 1.5px solid
    ${p => (p.$active ? 'var(--color-primary)' : 'var(--color-border-primary)')};
  border-radius: var(--radius-lg);
  background: ${p => (p.$active ? 'var(--color-primary-light)' : 'var(--color-bg-card)')};
  box-shadow: ${p => (p.$active ? '0 4px 14px rgba(42,157,143,0.16)' : 'var(--shadow-sm)')};
  transition: all var(--transition-base);

  &:hover:not(:disabled) {
    border-color: var(--color-primary);
    transform: translateY(-2px);
    box-shadow: var(--shadow-md);
  }

  &:disabled {
    cursor: default;
    opacity: 0.7;
  }

  @media (max-width: 768px) {
    min-height: 120px;
    padding: 12px;
  }
`

const CardTop = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  gap: 8px;
`

const SchemeName = styled.span`
  font-size: 17px;
  font-weight: 700;
  color: var(--color-text-primary);
  line-height: 1.2;
`

const ActiveBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 600;
  color: var(--color-primary);
  white-space: nowrap;
`

const SchemeDesc = styled.span`
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  overflow: hidden;
  font-size: 13px;
  color: var(--color-text-secondary);
  line-height: 1.4;
  min-height: 36px;
`

const CardFoot = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  margin-top: auto;
  gap: 8px;
`

const Author = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--color-text-secondary);
`

const Version = styled.span`
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--color-text-tertiary);
`

const TagRow = styled.div`
  display: flex;
  flex-wrap: nowrap;
  gap: 4px;
  max-width: 100%;
  overflow: hidden;
  min-height: 20px;

  .ant-tag {
    margin: 0;
    font-size: 11px;
    line-height: 18px;
    padding: 0 6px;
    flex-shrink: 0;
  }
`

const ConfigGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;

  @media (max-width: 1100px) {
    grid-template-columns: 1fr;
  }
`

const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

const FieldLabel = styled(Text)`
  && {
    font-size: 12px;
  }
`

/* 新建方案入口卡片 */
const NewSchemeCard = styled.button`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 138px;
  padding: 16px;
  cursor: pointer;
  border: 1.5px dashed var(--color-primary);
  border-radius: var(--radius-lg);
  background: transparent;
  color: var(--color-primary);
  transition: all var(--transition-base);

  &:hover {
    background: var(--color-primary-light);
    box-shadow: var(--shadow-md);
  }

  .anticon {
    font-size: 26px;
  }

  @media (max-width: 768px) {
    min-height: 120px;
    padding: 12px;
  }
`

/* 卡片右上角操作按钮容器 */
const CardActions = styled.div`
  display: flex;
  gap: 2px;
  opacity: 0;
  transition: opacity var(--transition-fast);

  ${SchemeCard}:hover & {
    opacity: 1;
  }

  @media (hover: none) {
    opacity: 1;
  }
`

function HomePage() {
  const [當前方案, 設置當前方案] = useAtom(當前方案原子狀態)
  const 方案列表 = useAtomValue(方案列表原子狀態)
  const 動態選重分析結果 = useAtomValue(動態選重分析原子狀態)
  const 靜態重碼分析結果 = useAtomValue(靜態重碼分析原子狀態)
  const 速度當量分析結果 = useAtomValue(速度當量分析原子狀態)
  const 簡碼效率分析結果 = useAtomValue(簡碼效率分析原子狀態)
  const 鍵位熱力分析結果 = useAtomValue(鍵位熱力分析原子狀態)
  const 設置動態選重分析結果 = useSetAtom(動態選重分析原子狀態)
  const 設置靜態重碼分析結果 = useSetAtom(靜態重碼分析原子狀態)
  const 設置速度當量分析結果 = useSetAtom(速度當量分析原子狀態)
  const 設置簡碼效率分析結果 = useSetAtom(簡碼效率分析原子狀態)
  const 設置鍵位熱力分析結果 = useSetAtom(鍵位熱力分析原子狀態)
  const 設置當量詳情 = useSetAtom(當量詳情原子狀態)
  const 設置碼表數據 = useSetAtom(碼表原子狀態)
  const 碼表數據 = useAtomValue(碼表原子狀態)
  const 設置原始碼表 = useSetAtom(原始碼表原子狀態)
  const 設置編碼預覽數據 = useSetAtom(編碼預覽數據原子狀態)
  const [本地方案列表, 設置本地方案列表] = useAtom(本地方案列表原子狀態)
  const [當前本地方案標識符, 設置當前本地方案標識符] = useAtom(當前本地方案標識符原子狀態)
  const [加載中, 設置加載中] = useState(false)
  const 頂欄方案載入名 = useAtomValue(頂欄方案載入名原子狀態)
  const 設置頂欄方案載入名 = useSetAtom(頂欄方案載入名原子狀態)
  const 方案載入中 = 加載中 || 頂欄方案載入名 !== null
  const [標籤對話框, 設置標籤對話框] = useState(false)
  const [標籤草稿, 設置標籤草稿] = useState('')
  const [鏈接對話框, 設置鏈接對話框] = useState(false)
  const [鏈接草稿, 設置鏈接草稿] = useState('')

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

  const 當前鍵名 = 查找方案鍵名(方案列表, 當前方案)

  /** 導出與克隆都要這一份，收在一處免得兩邊各列各的 */
  const 當前分析結果 = {
    靜態重碼分析結果,
    動態選重分析結果,
    速度當量分析結果,
    簡碼效率分析結果,
    鍵位熱力分析結果,
  }

  // 加載預設方案（卡片點擊）
  const 處理選擇方案 = async (方案鍵名: string) => {
    if (方案鍵名 === 當前鍵名 && 當前方案) return
    const 方案名 = 方案列表.find(項 => 項.鍵名 === 方案鍵名)?.配置.元數據.方案名 ?? 方案鍵名
    設置加載中(true)
    設置頂欄方案載入名(方案名)
    try {
      await 等界面繪製()
      const 加載的數據 = await 加載方案(方案鍵名)
      const { 方案, 已載入結果 } = 應用方案數據(加載的數據, 方案Setters)
      const 完整提示 = 已載入結果.length > 0 ? `（包含${已載入結果.join('、')}結果）` : ''
      message.success(`已加載方案「${方案.元數據.方案名}」${完整提示}`)
    } catch (錯誤) {
      console.error('[HomePage] 加載方案失敗:', 錯誤)
      message.error(錯誤 instanceof Error ? 錯誤.message : '加載方案失敗')
    } finally {
      設置加載中(false)
      設置頂欄方案載入名(null)
    }
  }

  // 新建空白方案（與頂欄「新建」按鈕同一套邏輯）
  const 處理新建方案 = () => {
    清空所有Atom(方案Setters)
    const 新方案 = 創建空白方案()
    設置當前方案(新方案)
    設置本地方案列表(prev => [...prev, 新方案])
    設置當前本地方案標識符(新方案.元數據.標識符)
    message.success('已創建新方案')
  }

  // 克隆當前方案：原方案快照 + 當前方案改爲克隆名，都帶上測評結果
  const 處理克隆方案 = (方案: 方案配置介面) => {
    const 現在 = new Date().toISOString()
    const 快照結果 = 收集測評結果(當前分析結果)

    // 1. 源方案快照存入本地方案列表（若源是按鍵名加載的預設方案，這一步让它成爲可持久化本地方案）
    const 快照: 方案配置介面 = { ...方案, 測評結果: 快照結果 }
    const 原標識符 = 方案.元數據.標識符
    設置本地方案列表(prev => {
      const 已存在 = prev.some(s => s.元數據.標識符 === 原標識符)
      return 已存在 ? prev.map(s => (s.元數據.標識符 === 原標識符 ? 快照 : s)) : [...prev, 快照]
    })

    // 2. 克隆體作爲新的當前方案
    const 新標識符 = 生成本地標識符()
    const 新方案名 = 方案.元數據.方案名 + 生成克隆後綴()
    const 克隆方案: 方案配置介面 = {
      ...方案,
      元數據: {
        ...方案.元數據,
        方案名: 新方案名,
        標識符: 新標識符,
        創建時間: 現在,
        更新時間: 現在,
      },
      測評結果: 快照結果,
    }
    設置本地方案列表(prev => [...prev.filter(s => s.元數據.標識符 !== 新標識符), 克隆方案])
    應用方案數據(克隆方案, 方案Setters)
    設置當前本地方案標識符(新標識符)
    message.success(`已克隆爲「${新方案名}」`)
  }

  // 切換本地方案
  const 處理切換本地方案 = (標識符: string) => {
    if (標識符 === 當前本地方案標識符 && 當前方案) return
    const 目標 = 本地方案列表.find(s => s.元數據.標識符 === 標識符)
    if (!目標) return
    應用方案數據(目標, 方案Setters)
    設置當前本地方案標識符(標識符)
    message.success(`已切換到「${目標.元數據.方案名}」`)
  }

  // 删除本地方案
  const 處理删除本地方案 = (標識符: string) => {
    const 被删 = 本地方案列表.find(s => s.元數據.標識符 === 標識符)
    const 新列表 = 本地方案列表.filter(s => s.元數據.標識符 !== 標識符)
    設置本地方案列表(新列表)
    if (標識符 === 當前本地方案標識符) {
      if (新列表.length > 0) {
        const 末尾 = 新列表[新列表.length - 1]!
        應用方案數據(末尾, 方案Setters)
        設置當前本地方案標識符(末尾.元數據.標識符)
      } else {
        清空所有Atom(方案Setters)
        設置當前方案(null)
        設置當前本地方案標識符(null)
      }
    }
    message.success(`已删除「${被删?.元數據.方案名 ?? '方案'}」`)
  }

  const 更新元數據 = (字段名: keyof 方案配置介面['元數據'], 值: string | string[]) => {
    if (!當前方案) return
    設置當前方案({
      ...當前方案,
      元數據: {
        ...當前方案.元數據,
        [字段名]: 值,
        更新時間: new Date().toISOString(),
      },
    })
  }

  const 更新方案參數 = <K extends keyof 方案配置介面['方案參數']>(
    字段名: K,
    值: 方案配置介面['方案參數'][K]
  ) => {
    if (!當前方案) return
    設置當前方案({
      ...當前方案,
      方案參數: {
        ...當前方案.方案參數,
        [字段名]: 值,
      },
      元數據: {
        ...當前方案.元數據,
        更新時間: new Date().toISOString(),
      },
    })
  }

  const 更新選重鍵 = (位次: string, 按鍵: string) => {
    if (!當前方案) return
    const 新表 = { ...(當前方案.方案參數.選重鍵表 ?? {}) }
    const 值 = 按鍵.trim()
    if (值 === '') delete 新表[位次]
    else 新表[位次] = 值
    更新方案參數('選重鍵表', 新表)
  }

  const 選重鍵衝突列表 = (() => {
    const 全碼表 = 碼表數據?.全碼加選重鍵表
    const 選重鍵表 = 當前方案?.方案參數.選重鍵表
    if (!全碼表 || !選重鍵表) return []
    const 編碼用鍵 = new Set<string>()
    for (const codes of 全碼表.values()) {
      const code = codes?.[0]
      if (!code) continue
      for (const ch of code.replace(/[0-9]+$/, '').replace(/_/g, '')) 編碼用鍵.add(ch)
    }
    return [...new Set(Object.values(選重鍵表))].filter(鍵 => 編碼用鍵.has(鍵))
  })()

  const 添加標籤 = () => {
    const 標籤 = 標籤草稿.trim()
    if (!當前方案 || !標籤) return
    if ((當前方案.元數據.標籤 || []).includes(標籤)) {
      message.warning('標籤已存在')
      return
    }
    更新元數據('標籤', [...(當前方案.元數據.標籤 || []), 標籤])
    設置標籤草稿('')
    設置標籤對話框(false)
  }

  const 删除標籤 = (索引: number) => {
    if (!當前方案) return
    const 新標籤 = [...(當前方案.元數據.標籤 || [])]
    新標籤.splice(索引, 1)
    更新元數據('標籤', 新標籤)
  }

  const 添加鏈接 = () => {
    const 鏈接 = 鏈接草稿.trim()
    if (!當前方案 || !鏈接) return
    if ((當前方案.元數據.相關資源鏈接 || []).includes(鏈接)) {
      message.warning('鏈接已存在')
      return
    }
    更新元數據('相關資源鏈接', [...(當前方案.元數據.相關資源鏈接 || []), 鏈接])
    設置鏈接草稿('')
    設置鏈接對話框(false)
  }

  const 删除鏈接 = (索引: number) => {
    if (!當前方案) return
    const 新鏈接 = [...(當前方案.元數據.相關資源鏈接 || [])]
    新鏈接.splice(索引, 1)
    更新元數據('相關資源鏈接', 新鏈接)
  }

  const 普通字段 = (
    標籤: string,
    字段: '方案名' | '標識符' | '作者' | '版本' | '官網' | '碼表下載鏈接',
    可選 = false
  ) => (
    <Field key={字段}>
      <FieldLabel type="secondary">{標籤}</FieldLabel>
      <Input
        value={(當前方案?.元數據[字段] as string) || ''}
        placeholder={可選 ? '可選' : undefined}
        onChange={e =>
          設置當前方案({
            ...當前方案!,
            元數據: { ...當前方案!.元數據, [字段]: e.target.value },
          })
        }
        onBlur={e => 更新元數據(字段, e.target.value)}
      />
    </Field>
  )

  return (
    <Page className="home-root">
      {/* Hero 概览 */}
      <Hero>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <HeroTitle level={2}>方案工作台</HeroTitle>
          <HeroSubtitle>選擇一個輸入方案開始測評，或繼續編輯當前方案</HeroSubtitle>
        </div>
        <HeroMeta>
          <MetaItem>
            <MetaLabel>預設方案</MetaLabel>
            <MetaValue>{方案列表.length} 個</MetaValue>
          </MetaItem>
          <MetaItem>
            <MetaLabel>當前方案</MetaLabel>
            <MetaValue>{當前方案?.元數據.方案名 ?? '未選擇'}</MetaValue>
          </MetaItem>
          <MetaItem>
            <MetaLabel>本地方案</MetaLabel>
            <MetaValue>{本地方案列表.length} 個</MetaValue>
          </MetaItem>
        </HeroMeta>
      </Hero>

      {/* 本地方案区 */}
      {本地方案列表.length > 0 && (
        <div>
          <SectionHead>
            <SectionTitle level={4}>本地方案</SectionTitle>
            <SectionHint type="secondary">導入或克隆的方案，自動保存在本機</SectionHint>
          </SectionHead>
          <SchemeGrid>
            {本地方案列表.map(方案 => {
              const 元數據 = 方案.元數據
              const 標識符 = 元數據.標識符
              const 活化 = 標識符 === 當前本地方案標識符
              return (
                <SchemeCard
                  key={標識符}
                  type="button"
                  $active={活化}
                  disabled={方案載入中}
                  onClick={() => 處理切換本地方案(標識符)}
                  aria-pressed={活化}
                >
                  <CardTop>
                    <SchemeName>{元數據.方案名}</SchemeName>
                    {活化 && (
                      <ActiveBadge>
                        <CheckCircleFilled /> 當前
                      </ActiveBadge>
                    )}
                  </CardTop>
                  {元數據.描述 && <SchemeDesc>{元數據.描述}</SchemeDesc>}
                  {!!元數據.標籤?.length && (
                    <TagRow>
                      {元數據.標籤.slice(0, 3).map(標籤 => (
                        <Tag key={標籤} color={活化 ? 'cyan' : undefined}>
                          {標籤}
                        </Tag>
                      ))}
                    </TagRow>
                  )}
                  <CardFoot>
                    <Author>
                      <UserOutlined /> {元數據.作者 || '本地'}
                    </Author>
                    <CardActions>
                      <Tooltip title="克隆">
                        <Button
                          type="text"
                          size="small"
                          icon={<CopyOutlined />}
                          disabled={方案載入中}
                          onClick={e => {
                            e.stopPropagation()
                            處理克隆方案(方案)
                          }}
                        />
                      </Tooltip>
                      <Popconfirm
                        title="删除此本地方案？"
                        onConfirm={e => {
                          e?.stopPropagation()
                          處理删除本地方案(標識符)
                        }}
                      >
                        <Tooltip title="删除">
                          <Button
                            type="text"
                            size="small"
                            danger
                            icon={<DeleteOutlined />}
                            onClick={e => e.stopPropagation()}
                          />
                        </Tooltip>
                      </Popconfirm>
                    </CardActions>
                  </CardFoot>
                </SchemeCard>
              )
            })}
          </SchemeGrid>
        </div>
      )}

      {/* 预设方案卡片网格 */}
      <div>
        <SectionHead>
          <SectionTitle level={4}>預設方案</SectionTitle>
          <SectionHint type="secondary">點擊卡片即可加载方案與其測評結果</SectionHint>
        </SectionHead>
        <SchemeGrid>
          {方案列表.map((項: 方案列表項介面) => {
            const 元數據 = 項.配置.元數據
            const 活化 = 項.鍵名 === 當前鍵名
            return (
              <SchemeCard
                key={項.鍵名}
                type="button"
                $active={活化}
                disabled={方案載入中}
                onClick={() => 處理選擇方案(項.鍵名)}
                aria-pressed={活化}
              >
                <CardTop>
                  <SchemeName>{元數據.方案名}</SchemeName>
                  {活化 && (
                    <ActiveBadge>
                      <CheckCircleFilled /> 當前
                    </ActiveBadge>
                  )}
                </CardTop>
                {元數據.描述 && <SchemeDesc>{元數據.描述}</SchemeDesc>}
                {!!元數據.標籤?.length && (
                  <TagRow>
                    {元數據.標籤.slice(0, 3).map(標籤 => (
                      <Tag key={標籤} color={活化 ? 'cyan' : undefined}>
                        {標籤}
                      </Tag>
                    ))}
                  </TagRow>
                )}
                <CardFoot>
                  <Author>
                    <UserOutlined /> {元數據.作者 || '佚名'}
                  </Author>
                  <Space size={4}>
                    <Version>{元數據.版本}</Version>
                    <CardActions>
                      <Tooltip title="克隆爲本地方案">
                        <Button
                          type="text"
                          size="small"
                          icon={<CopyOutlined />}
                          disabled={方案載入中}
                          onClick={e => {
                            e.stopPropagation()
                            處理克隆方案(項.配置)
                          }}
                        />
                      </Tooltip>
                    </CardActions>
                  </Space>
                </CardFoot>
              </SchemeCard>
            )
          })}
          {/* 新建方案入口 */}
          <NewSchemeCard type="button" onClick={處理新建方案} disabled={方案載入中}>
            <PlusCircleOutlined />
            <span>新建空白方案</span>
          </NewSchemeCard>
        </SchemeGrid>
        {方案列表.length === 0 && (
          <Paragraph type="secondary" style={{ marginTop: 8 }}>
            未讀取到預設方案，請檢查數據文件。
          </Paragraph>
        )}
      </div>

      {/* 当前方案配置：分组卡片 */}
      {當前方案 && (
        <>
          <div>
            <SectionHead>
              <SectionTitle level={4}>當前方案配置</SectionTitle>
              <SectionHint type="secondary">修改後自動保存</SectionHint>
            </SectionHead>
            <ConfigGrid>
              <Card title="基本信息" size="small">
                <div
                  className="responsive-grid"
                  style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px' }}
                >
                  {普通字段('方案名', '方案名')}
                  {普通字段('標識符', '標識符')}
                  {普通字段('作者', '作者', true)}
                  {普通字段('版本', '版本')}
                  <div style={{ gridColumn: 'span 2' }}>
                    <Field>
                      <FieldLabel type="secondary">描述</FieldLabel>
                      <TextArea
                        value={當前方案.元數據.描述 || ''}
                        placeholder="可選"
                        rows={2}
                        onChange={e =>
                          設置當前方案({
                            ...當前方案,
                            元數據: { ...當前方案.元數據, 描述: e.target.value },
                          })
                        }
                        onBlur={e => 更新元數據('描述', e.target.value)}
                      />
                    </Field>
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <Field>
                      <FieldLabel type="secondary">官網</FieldLabel>
                      <Input
                        value={當前方案.元數據.官網 || ''}
                        placeholder="可選"
                        onChange={e =>
                          設置當前方案({
                            ...當前方案,
                            元數據: { ...當前方案.元數據, 官網: e.target.value },
                          })
                        }
                        onBlur={e => 更新元數據('官網', e.target.value)}
                      />
                    </Field>
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <FieldLabel type="secondary">標籤</FieldLabel>
                    <Space wrap style={{ marginTop: 6 }}>
                      {(當前方案.元數據.標籤 || []).map((標籤, index) => (
                        <Tag key={index} closable onClose={() => 删除標籤(index)}>
                          {標籤}
                        </Tag>
                      ))}
                      <Tag
                        icon={<PlusCircleOutlined />}
                        style={{ cursor: 'pointer', borderStyle: 'dashed' }}
                        onClick={() => {
                          設置標籤草稿('')
                          設置標籤對話框(true)
                        }}
                      >
                        添加標籤
                      </Tag>
                    </Space>
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <FieldLabel type="secondary">相關資源鏈接</FieldLabel>
                    <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {(當前方案.元數據.相關資源鏈接 || []).map((鏈接, index) => (
                        <Space.Compact key={index} style={{ width: '100%' }}>
                          <Input
                            value={鏈接}
                            onChange={e => {
                              const 新鏈接 = [...(當前方案.元數據.相關資源鏈接 || [])]
                              新鏈接[index] = e.target.value
                              設置當前方案({
                                ...當前方案,
                                元數據: { ...當前方案.元數據, 相關資源鏈接: 新鏈接 },
                              })
                            }}
                            onBlur={e => {
                              const 新鏈接 = [...(當前方案.元數據.相關資源鏈接 || [])]
                              新鏈接[index] = e.target.value
                              更新元數據('相關資源鏈接', 新鏈接)
                            }}
                          />
                          <Button danger onClick={() => 删除鏈接(index)}>
                            删除
                          </Button>
                        </Space.Compact>
                      ))}
                      <Button
                        type="dashed"
                        icon={<PlusOutlined />}
                        onClick={() => {
                          設置鏈接草稿('')
                          設置鏈接對話框(true)
                        }}
                        block
                      >
                        添加鏈接
                      </Button>
                    </div>
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    {普通字段('碼表下載鏈接', '碼表下載鏈接', true)}
                  </div>
                </div>
              </Card>

              <Card title="編碼參數" size="small">
                <div
                  className="responsive-grid"
                  style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px' }}
                >
                  <div style={{ gridColumn: 'span 2' }}>
                    <Field>
                      <FieldLabel type="secondary">編碼終止指示符（直接連寫，可選）</FieldLabel>
                      <Input
                        value={(當前方案.方案參數.編碼終止指示符列表 || []).join('')}
                        placeholder="例如：aoeiu_"
                        onChange={e =>
                          設置當前方案({
                            ...當前方案,
                            方案參數: {
                              ...當前方案.方案參數,
                              編碼終止指示符列表: e.target.value.trim().split(''),
                            },
                          })
                        }
                        onBlur={e => {
                          const 指示符 = e.target.value.trim().split('')
                          更新方案參數('編碼終止指示符列表', 指示符.length > 0 ? 指示符 : undefined)
                        }}
                      />
                    </Field>
                  </div>
                  <Field>
                    <FieldLabel type="secondary">最大碼長</FieldLabel>
                    <InputNumber
                      value={當前方案.方案參數.最大碼長}
                      min={1}
                      max={10}
                      style={{ width: '100%' }}
                      onChange={值 => 更新方案參數('最大碼長', 值 as number)}
                    />
                  </Field>
                  <Field>
                    <FieldLabel type="secondary">碼表選項</FieldLabel>
                    <Space size={16} wrap>
                      <Checkbox
                        checked={!!當前方案.方案參數.選重編碼化}
                        onChange={e => 更新方案參數('選重編碼化', e.target.checked)}
                      >
                        選重編碼化
                      </Checkbox>
                      <Checkbox
                        checked={!!當前方案.方案參數.出簡不出全}
                        onChange={e => 更新方案參數('出簡不出全', e.target.checked)}
                      >
                        出簡不出全
                      </Checkbox>
                    </Space>
                  </Field>
                  <div style={{ gridColumn: 'span 2' }}>
                    <FieldLabel type="secondary">
                      選重鍵（首選由空格上屏；留空則沿用數字鍵）
                    </FieldLabel>
                    <Space size={12} wrap style={{ marginTop: 6 }}>
                      {['2', '3'].map(位次 => (
                        <Space key={位次} size={6}>
                          <Text type="secondary" style={{ whiteSpace: 'nowrap' }}>
                            第 {位次} 選
                          </Text>
                          <Input
                            value={當前方案.方案參數.選重鍵表?.[位次] ?? ''}
                            maxLength={1}
                            placeholder={位次}
                            style={{ width: 56, textAlign: 'center', fontFamily: 'monospace' }}
                            onChange={e => 更新選重鍵(位次, e.target.value)}
                          />
                        </Space>
                      ))}
                      {選重鍵衝突列表.length > 0 && (
                        <Text type="warning">
                          {選重鍵衝突列表.join('、')} 也出現在編碼裏，實際輸入時會衝突
                        </Text>
                      )}
                    </Space>
                  </div>
                </div>
              </Card>
            </ConfigGrid>
          </div>

          {/* 只读信息 */}
          <Card title="碼表與時間信息" size="small">
            <div
              className="responsive-grid"
              style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px' }}
            >
              {當前方案.碼表元數據?.總字符數 != null && (
                <Field>
                  <FieldLabel type="secondary">總字符數（已解析）</FieldLabel>
                  <Input value={當前方案.碼表元數據.總字符數.toLocaleString()} disabled />
                </Field>
              )}
              {當前方案.碼表元數據?.哈希值 && (
                <Field>
                  <FieldLabel type="secondary">哈希值（SHA-256）</FieldLabel>
                  <Input value={當前方案.碼表元數據.哈希值} disabled />
                </Field>
              )}
              <div style={{ gridColumn: 'span 2' }}>
                <Space wrap size={24}>
                  <Text type="secondary">
                    創建時間：{new Date(當前方案.元數據.創建時間).toLocaleString('zh-CN')}
                  </Text>
                  <Text type="secondary">
                    更新時間：{new Date(當前方案.元數據.更新時間).toLocaleString('zh-CN')}
                  </Text>
                </Space>
              </div>
            </div>
          </Card>
        </>
      )}

      {!當前方案 && (
        <Alert
          title="尚未選擇方案"
          description="請從上方卡片選擇一個預設方案，或點擊「新建空白方案」開始自訂配置。"
          type="info"
          showIcon
          icon={<CloudDownloadOutlined />}
        />
      )}

      {/* 添加标签对话框 */}
      <Modal
        title="添加標籤"
        open={標籤對話框}
        onOk={添加標籤}
        onCancel={() => 設置標籤對話框(false)}
        okText="添加"
        cancelText="取消"
      >
        <Input
          autoFocus
          value={標籤草稿}
          placeholder="輸入新標籤"
          onChange={e => 設置標籤草稿(e.target.value)}
          onPressEnter={添加標籤}
        />
      </Modal>

      {/* 添加链接对话框 */}
      <Modal
        title="添加資源鏈接"
        open={鏈接對話框}
        onOk={添加鏈接}
        onCancel={() => 設置鏈接對話框(false)}
        okText="添加"
        cancelText="取消"
      >
        <Input
          autoFocus
          value={鏈接草稿}
          placeholder="輸入資源鏈接"
          onChange={e => 設置鏈接草稿(e.target.value)}
          onPressEnter={添加鏈接}
        />
      </Modal>
    </Page>
  )
}

export default HomePage
