/**
 * 側邊欄導航組件
 */

import {
  BarChartOutlined,
  DashboardOutlined,
  FireOutlined,
  HomeOutlined,
  LineChartOutlined,
  RocketOutlined,
  SettingOutlined,
  SwapOutlined,
  UploadOutlined,
} from '@ant-design/icons'
import { Layout, Menu } from 'antd'
import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import styled from 'styled-components'
import { 公開路徑 } from '@/utils/publicPath'

const { Sider } = Layout

const StyledSider = styled(Sider)`
  .ant-layout-sider-trigger {
    background: #1c2b2d;
  }

  /* 移動端抽屜：窄屏時側欄浮在内容之上，滑入滑出，不擠壓正文寬度 */
  @media (max-width: 768px) {
    position: fixed !important;
    top: 0;
    bottom: 0;
    left: 0;
    z-index: 1002;
    height: 100vh;
    box-shadow: 2px 0 8px rgba(0, 0, 0, 0.15);
    transition: transform 0.2s ease;
  }
`

/* 移動端抽屜打開時的半透明遮罩，點一下即關閉側欄 */
const DrawerMask = styled.div<{ $open: boolean }>`
  display: none;

  @media (max-width: 768px) {
    display: block;
    position: fixed;
    inset: 0;
    z-index: 1001;
    background: rgba(0, 0, 0, 0.45);
    opacity: ${props => (props.$open ? 1 : 0)};
    pointer-events: ${props => (props.$open ? 'auto' : 'none')};
    transition: opacity 0.2s ease;
  }
`

/* 移動端固定在左上角的漢堡按鈕，用來喚出抽屜 */
const MenuToggle = styled.button<{ $open: boolean }>`
  display: none;

  @media (max-width: 768px) {
    display: flex;
    align-items: center;
    justify-content: center;
    position: fixed;
    top: 10px;
    left: 10px;
    z-index: 1003;
    width: 40px;
    height: 40px;
    padding: 0;
    border: none;
    border-radius: 6px;
    background: rgba(255, 255, 255, 0.15);
    color: #fff;
    font-size: 20px;
    line-height: 1;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;

    /* 觸摸目標至少 40px，符合手指點按 */
    touch-action: manipulation;
  }
`

const LogoContainer = styled.div<{ $collapsed: boolean }>`
  padding: ${props => (props.$collapsed ? '16px 8px' : '20px 16px')};
  display: flex;
  align-items: center;
  justify-content: center;
  background: #1c2b2d;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: #16332f;
  }

  img {
    width: ${props => (props.$collapsed ? '32px' : '48px')};
    height: ${props => (props.$collapsed ? '32px' : '48px')};
    transition: all 0.2s;
  }
`

export interface SidebarProps {
  collapsed?: boolean
  onCollapse?: (collapsed: boolean) => void
}

export function Sidebar({ collapsed = false, onCollapse }: SidebarProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const [内部折疊狀態, 設置内部折疊狀態] = useState(collapsed)
  // 是否爲移動端（窄屏）。移動端側欄改爲抽屜，默認收起，避免一進來就擋住正文。
  const [是移動端, 設置是移動端] = useState(
    typeof window !== 'undefined' ? window.innerWidth <= 768 : false
  )

  useEffect(() => {
    const 更新視口 = () => {
      const 窄屏 = window.innerWidth <= 768
      設置是移動端(窄屏)
      // 切換到移動端時收起抽屜，回到桌面端時展開側欄
      if (窄屏) {
        if (onCollapse) onCollapse(true)
        else 設置内部折疊狀態(true)
      } else {
        if (onCollapse) onCollapse(false)
        else 設置内部折疊狀態(false)
      }
    }
    更新視口()
    window.addEventListener('resize', 更新視口)
    return () => window.removeEventListener('resize', 更新視口)
  }, [onCollapse])

  const 折疊狀態 = onCollapse !== undefined ? collapsed : 内部折疊狀態
  // 抽屜是否打開：移動端下「非折疊」即爲打開
  const 抽屜打開 = 是移動端 && !折疊狀態

  const 切換折疊 = () => {
    const 新狀態 = !折疊狀態
    if (onCollapse) {
      onCollapse(新狀態)
    } else {
      設置内部折疊狀態(新狀態)
    }
  }

  // 點菜單導航後，移動端順手收起抽屜
  const 導航並收起 = (key: string) => {
    navigate(key)
    if (是移動端) {
      if (onCollapse) onCollapse(true)
      else 設置内部折疊狀態(true)
    }
  }

  const 菜單項 = [
    {
      key: '/',
      icon: <HomeOutlined />, // 首頁圖標
      label: '首頁',
    },
    {
      key: '/process',
      icon: <UploadOutlined />, // 上傳/處理圖標
      label: '碼表解析',
    },
    {
      key: '/static',
      icon: <BarChartOutlined />, // 柱狀圖圖標（可換成：LineChartOutlined, PieChartOutlined, FundOutlined）
      label: '靜態重碼',
    },
    {
      key: '/dynamic',
      icon: <LineChartOutlined />, // 折線圖圖標（可換成：AreaChartOutlined, DotChartOutlined, RadarChartOutlined）
      label: '動態選重',
    },
    {
      key: '/speed',
      icon: <DashboardOutlined />, // 儀表盤圖標（可換成：ThunderboltOutlined, FastForwardOutlined, ClockCircleOutlined）
      label: '速度當量',
    },
    {
      key: '/efficiency',
      icon: <RocketOutlined />, // 火箭圖標（可換成：RiseOutlined, BulbOutlined, ExperimentOutlined）
      label: '簡碼效率',
    },
    {
      key: '/heatmap',
      icon: <FireOutlined />, // 火焰圖標（可換成：HeatMapOutlined, RadarChartOutlined）
      label: '鍵位熱力',
    },
    {
      key: '/comparison',
      icon: <SwapOutlined />, // 交換圖標（可換成：FundOutlined, PieChartOutlined）
      label: '方案對比',
    },
    {
      key: '/settings',
      icon: <SettingOutlined />, // 設置圖標
      label: '設置',
    },
  ]

  const 當前路徑 = location.pathname

  /**
   * 朱按：摺疊功能暫時不考慮，故而把相關按鈕和狀態都註釋掉
   */
  return (
    <>
      <MenuToggle $open={抽屜打開} onClick={切換折疊} aria-label="打開導航選單">
        ☰
      </MenuToggle>
      <DrawerMask $open={抽屜打開} onClick={切換折疊} />
      <StyledSider
        collapsible
        collapsed={折疊狀態}
        collapsedWidth={是移動端 ? 0 : 80}
        trigger={null}
        width={150}
        theme="dark"
      >
        <LogoContainer $collapsed={折疊狀態} onClick={切換折疊}>
          <img src={公開路徑('/logo_blue.png')} alt="宇浩輸入法" />
        </LogoContainer>

        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[當前路徑]}
          items={菜單項}
          onClick={({ key }) => 導航並收起(key)}
        />
      </StyledSider>
    </>
  )
}
