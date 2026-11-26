import { useEffect } from 'react'
import { useRoutes } from 'react-router-dom'
import MainLayout from './components/layout/MainLayout'
import { ThemeProvider } from './components/ThemeProvider'
import ComparisonPage from './pages/ComparisonPage'
import HomePage from './pages/HomePage'
import KeyboardHeatmapPage from './pages/KeyboardHeatmapPage'
import ProcessTablePage from './pages/ProcessTablePage'
import SettingsPage from './pages/SettingsPage'
import ShortCodeEfficiencyPage from './pages/ShortCodeEfficiencyPage'
import StaticDuplicateAnalysisPage from './pages/StaticDuplicateAnalysisPage'
import { 數據預加載服務類别 } from './services/dataPreloadService'

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
        path: '/process',
        element: <ProcessTablePage />,
      },
      {
        path: '/static',
        element: <StaticDuplicateAnalysisPage />,
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
      {
        path: '/settings',
        element: <SettingsPage />,
      },
    ],
  },
]

// 定義所有分析頁面路徑，用於編譯時檢查
// TypeScript 7 下只保留型别别名，不再生成没有執行期用途的常量陣列
export type 分析頁面路徑型别 = '/static' | '/efficiency' | '/heatmap'

function App() {
  const element = useRoutes(routes)

  // 應用啓動時預加載數據
  useEffect(() => {
    數據預加載服務類别.啓動預加載()
  }, [])

  return <ThemeProvider>{element}</ThemeProvider>
}

export default App
