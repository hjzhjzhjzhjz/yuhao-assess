/**
 * 導航抽屜組件
 *
 * 全平台統一：從左側滑出的導航抽屜，由頂欄按鈕或頁面空白處喚出。
 */
import {
  BarChartOutlined,
  DashboardOutlined,
  FireOutlined,
  HomeOutlined,
  LineChartOutlined,
  RocketOutlined,
  SwapOutlined,
} from '@ant-design/icons'
import { Drawer, Menu } from 'antd'
import { useLocation, useNavigate } from 'react-router-dom'
import styled from 'styled-components'
import { 公開路徑 } from '@/utils/publicPath'

const StyledDrawer = styled(Drawer)`
  .ant-drawer-body {
    padding: 0;
    background: #1c2b2d;
  }
`

const LogoContainer = styled.div`
  padding: 20px 16px;
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
    width: 48px;
    height: 48px;
  }
`

export interface SidebarProps {
  open: boolean
  onClose: () => void
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const navigate = useNavigate()
  const location = useLocation()

  const 菜單項 = [
    {
      key: '/',
      icon: <HomeOutlined />,
      label: '首頁',
    },
    {
      key: '/static',
      icon: <BarChartOutlined />,
      label: '靜態重碼',
    },
    {
      key: '/dynamic',
      icon: <LineChartOutlined />,
      label: '動態選重',
    },
    {
      key: '/speed',
      icon: <DashboardOutlined />,
      label: '速度當量',
    },
    {
      key: '/efficiency',
      icon: <RocketOutlined />,
      label: '簡碼效率',
    },
    {
      key: '/heatmap',
      icon: <FireOutlined />,
      label: '鍵位熱力',
    },
    {
      key: '/comparison',
      icon: <SwapOutlined />,
      label: '方案對比',
    },
  ]

  const 導航並關閉 = (key: string) => {
    navigate(key)
    onClose()
  }

  return (
    <StyledDrawer
      placement="left"
      width={220}
      open={open}
      onClose={onClose}
      closable={false}
      rootClassName="nav-drawer"
    >
      <LogoContainer onClick={() => 導航並關閉('/')}>
        <img src={公開路徑('/logo_blue.png')} alt="宇浩輸入法" />
      </LogoContainer>
      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={[location.pathname]}
        items={菜單項}
        onClick={({ key }) => 導航並關閉(key)}
      />
    </StyledDrawer>
  )
}
