import { lazy, useEffect } from 'react'
import { Navigate, useRoutes } from 'react-router-dom'
import MainLayout from './components/layout/MainLayout'
import { ThemeProvider } from './components/ThemeProvider'
import HomePage from './pages/HomePage'
import { 數據預加載服務類别 } from './services/dataPreloadService'

// 分析頁按路由懶加載：首屏只下載框架與首頁，其餘頁面進入時才下載，降低初始 JS 體積
const StaticDuplicateAnalysisPage = lazy(() => import('./pages/StaticDuplicateAnalysisPage'))
const DynamicDuplicateAnalysisPage = lazy(() => import('./pages/DynamicDuplicateAnalysisPage'))
const SpeedEquivalentPage = lazy(() => import('./pages/SpeedEquivalentPage'))
const ShortCodeEfficiencyPage = lazy(() => import('./pages/ShortCodeEfficiencyPage'))
const KeyboardHeatmapPage = lazy(() => import('./pages/KeyboardHeatmapPage'))
const ComparisonPage = lazy(() => import('./pages/ComparisonPage'))

const routes = [
  {
    path: '/',
    element: <MainLayout />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        path: '/static',
        element: <StaticDuplicateAnalysisPage />,
      },
      {
        path: '/dynamic',
        element: <DynamicDuplicateAnalysisPage />,
      },
      {
        path: '/speed',
        element: <SpeedEquivalentPage />,
      },
      {
        path: '/efficiency',
        element: <ShortCodeEfficiencyPage />,
      },
      {
        path: '/heatmap',
        element: <KeyboardHeatmapPage />,
      },
      {
        path: '/comparison',
        element: <ComparisonPage />,
      },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]

// 定義所有分析頁面路徑，用於編譯時檢查
// TypeScript 7 下只保留型别别名，不再生成没有執行期用途的常量陣列
export type 分析頁面路徑型别 = '/dynamic' | '/static' | '/speed' | '/efficiency' | '/heatmap'

function App() {
  const element = useRoutes(routes)

  // 應用啓動時預加載數據
  useEffect(() => {
    數據預加載服務類别.啓動預加載()
  }, [])

  return <ThemeProvider>{element}</ThemeProvider>
}

export default App
