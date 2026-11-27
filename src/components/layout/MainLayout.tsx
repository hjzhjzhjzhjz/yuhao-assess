import { MenuOutlined } from '@ant-design/icons'
import { Layout, Spin } from 'antd'
import { useAtomValue, useStore } from 'jotai'
import { type MouseEvent, Suspense, useEffect, useRef, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import styled from 'styled-components'
import { 碼表原子狀態 } from '@/atoms/codeTable'
import { 動態選重分析原子狀態 } from '@/atoms/dynamicDuplicate'
import { 鍵位熱力分析原子狀態 } from '@/atoms/keyboardHeatmap'
import { 頂欄方案載入名原子狀態 } from '@/atoms/scheme'
import { 簡碼效率分析原子狀態 } from '@/atoms/shortCodeEfficiency'
import { 速度當量分析原子狀態 } from '@/atoms/speedEquivalent'
import { 靜態重碼分析原子狀態 } from '@/atoms/staticDuplicate'
import { useLocalSchemeSyncMetrics } from '@/hooks/useLocalSchemeSyncMetrics'
import { 原地重算所有分析 } from '@/services/inPlaceRecomputeService'
import { AppHeader } from './AppHeader'
import { Sidebar } from './Sidebar'

const { Header, Content, Footer } = Layout

const StyledLayout = styled(Layout)`
  min-height: 100vh;
`

const StyledHeader = styled(Header)`
  background: #1c2b2d;
  color: white;
  padding: 0 24px;
  display: flex;
  align-items: center;
  height: 56px;
  line-height: 56px;

  @media (max-width: 768px) {
    padding: 6px 12px;
    height: auto;
    min-height: 56px;
    line-height: normal;
  }
`

/* 頂欄左側的導航觸發按鈕，點一下喚出左側導航抽屜 */
const NavTrigger = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  margin-right: 12px;
  padding: 0;
  border: none;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
  transition: background 0.2s;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;

  &:hover {
    background: rgba(255, 255, 255, 0.25);
  }
`

/* 包住顶栏原有内容，避免其 width:100% 与导航按钮相加溢出 */
const HeaderContent = styled.div`
  flex: 1;
  min-width: 0;
`

const StyledContent = styled(Content)`
  padding: 24px;
  background: #f5f2ea;
  overflow: auto;

  @media (max-width: 768px) {
    padding: 12px;
  }
`

/* 對比頁表格列多，放寬容器減少大屏留白；其餘頁面維持 1400px */
const ContentInner = styled.div<{ $wide?: boolean }>`
  max-width: ${p => (p.$wide ? '1800px' : '1400px')};
  margin: 0 auto;
  background: #fffdf8;
  padding: 24px;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(28, 43, 45, 0.08);

  @media (max-width: 768px) {
    padding: 12px;
    border-radius: 6px;
  }
`

/* 懶加載分析頁時的内容區佔位，尺寸與内容區一致避免布局跳動 */
const PageLoading = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 320px;
`

const StyledFooter = styled(Footer)`
  text-align: center;
  background: #f5f2ea;
  color: rgba(0, 0, 0, 0.45);
`

const MainColumn = styled(Layout)`
  position: relative;
`

/* 蓋住頂欄以下的主欄，側欄和頂欄留在外面。
   内層用 sticky 把轉圈釘在當前視口正中，長頁面滚下去也能看見。 */
const SchemeLoadingMask = styled.div`
  position: absolute;
  z-index: 20;
  top: 56px;
  right: 0;
  bottom: 0;
  left: 0;
  background: rgba(255, 255, 255, 0.72);
`

const SchemeLoadingContent = styled.div`
  position: sticky;
  top: 56px;
  height: calc(100vh - 56px);
  max-height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  color: rgba(0, 0, 0, 0.65);
`

/* 點擊「空白處」時視爲喚出導航。這裏列出所有不應觸發導航的可交互元素，
   命中其中任一個就跳過，避免誤觸（按鈕、連結、表單、表格、卡片、ant 组件等）。 */
const 交互元素選擇器 = [
  'a',
  'button',
  'input',
  'textarea',
  'select',
  'label',
  'summary',
  '[role="button"]',
  '[role="menuitem"]',
  '[role="tab"]',
  '[role="checkbox"]',
  '[role="radio"]',
  '[role="switch"]',
  '[role="link"]',
  'table',
  'th',
  'td',
  'tr',
  '.ant-btn',
  '.ant-select',
  '.ant-input',
  '.ant-table',
  '.ant-segmented',
  '.ant-upload',
  '.ant-card',
  '.ant-alert',
  '.ant-tag',
  '.ant-checkbox-wrapper',
  '.ant-radio-wrapper',
  '.ant-switch',
  '.ant-slider',
  '.ant-menu',
  '.ant-modal',
  '.ant-drawer',
  '.ant-popover',
  '.ant-tooltip',
  '.ant-dropdown',
].join(',')

function MainLayout() {
  useLocalSchemeSyncMetrics()
  const store = useStore()
  const 位置 = useLocation()
  const 是對比頁 = 位置.pathname === '/comparison'
  const 碼表 = useAtomValue(碼表原子狀態)
  const 頂欄方案載入名 = useAtomValue(頂欄方案載入名原子狀態)
  const [導航打開, 設置導航打開] = useState(false)
  const 已調度補算 = useRef<unknown>(null)

  // 自動補齊：若有碼表但五類分析結果全缺（導入無結果方案、舊數據等），
  // 延遲一小段時間後原地重算一次。延遲是爲讓碼表解析彈窗自身的重算先完成，
  // 避免重複計算——檢查時只要任一結果非空就跳過。
  useEffect(() => {
    if (!碼表 || 已調度補算.current === 碼表) return
    const 定時器 = window.setTimeout(() => {
      if (已調度補算.current === 碼表) return
      const 結果完備 =
        store.get(靜態重碼分析原子狀態) !== null ||
        store.get(動態選重分析原子狀態) !== null ||
        store.get(速度當量分析原子狀態) !== null ||
        store.get(簡碼效率分析原子狀態) !== null ||
        store.get(鍵位熱力分析原子狀態) !== null
      if (結果完備) return
      已調度補算.current = 碼表
      void 原地重算所有分析(store)
    }, 1200)
    return () => window.clearTimeout(定時器)
  }, [碼表, store])

  const 打開導航 = () => 設置導航打開(true)

  // 點内容區空白處彈出導航；點在交互元素上、或正在選中文字時不觸發
  const 處理内容點擊 = (event: MouseEvent<HTMLDivElement>) => {
    const 目標 = event.target as HTMLElement
    if (窗口有選中文字()) return
    if (目標.closest(交互元素選擇器)) return
    打開導航()
  }

  return (
    <StyledLayout>
      <MainColumn>
        <StyledHeader>
          <NavTrigger onClick={打開導航} aria-label="打開導航選單">
            <MenuOutlined />
          </NavTrigger>
          <HeaderContent>
            <AppHeader />
          </HeaderContent>
        </StyledHeader>
        <StyledContent>
          <ContentInner $wide={是對比頁} onClick={處理内容點擊}>
            <Suspense
              fallback={
                <PageLoading>
                  <Spin size="large" />
                </PageLoading>
              }
            >
              <Outlet />
            </Suspense>
          </ContentInner>
        </StyledContent>
        <StyledFooter>宇浩漢字輸入法測評系統 © {new Date().getFullYear()}</StyledFooter>
        {頂欄方案載入名 && (
          <SchemeLoadingMask>
            <SchemeLoadingContent>
              <Spin size="large" />
              <div>正在載入方案「{頂欄方案載入名}」</div>
            </SchemeLoadingContent>
          </SchemeLoadingMask>
        )}
      </MainColumn>
      <Sidebar open={導航打開} onClose={() => 設置導航打開(false)} />
    </StyledLayout>
  )
}

/** 使用者正在選中文字時不彈導航，避免干擾複製等操作 */
function 窗口有選中文字(): boolean {
  return typeof window !== 'undefined' && (window.getSelection()?.toString().length ?? 0) > 0
}

export default MainLayout
