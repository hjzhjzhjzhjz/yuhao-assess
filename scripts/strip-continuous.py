#!/usr/bin/env python3
"""
部署期裁剪：「连续文本当量」功能不随 GitHub Pages 发布。

此脚本由 .github/workflows/deploy-pages.yml 在 CI 中、建置之前调用，
仅改变 CI 工作副本，不会触碰仓库源码。目的：线上站点不提供该功能入口与页面，
但仓库源码保留完整实现，方便日后恢复。

策略：删除 5 个核心文件，并清理全部引用（路由、菜单、服务/原子导出、
状态重置、导入导出、本地同步、类型定义、页面与顶栏）。每处替换带断言，
确保命中预期文本；任一未命中即非零退出，让 CI 立即失败，避免发布半成品。
"""
import pathlib
import sys

ROOT = pathlib.Path('src')
failures: list[str] = []


def edit(rel: str, replacements: list[tuple[str, str]]) -> None:
    p = ROOT / rel
    if not p.exists():
        failures.append(f'文件不存在: {rel}')
        return
    s = p.read_text(encoding='utf-8')
    for old, new in replacements:
        if old not in s:
            failures.append(f'未命中 [{rel}]: {old[:70]!r}')
            continue
        s = s.replace(old, new, 1)
    p.write_text(s, encoding='utf-8')


# 1) 删除核心文件
for f in (
    'src/services/continuousEquivalentService.ts',
    'src/services/continuousEquivalentReference.ts',
    'src/pages/ContinuousSpeedEquivalentPage.tsx',
    'src/atoms/continuousEquivalent.ts',
    'src/components/ContinuousEquivalentChart.tsx',
):
    p = pathlib.Path(f)
    if p.exists():
        p.unlink()
    else:
        failures.append(f'待删文件不存在: {f}')

# 2) App.tsx：路由、导入、路径型别
edit('App.tsx', [
    ("import ContinuousSpeedEquivalentPage from './pages/ContinuousSpeedEquivalentPage'\n", ""),
    ("      {\n        path: '/continuous',\n        element: <ContinuousSpeedEquivalentPage />,\n      },\n", ""),
    ("  '/dynamic' | '/static' | '/candidates' | '/speed' | '/continuous' | '/efficiency' | '/heatmap'",
     "  '/dynamic' | '/static' | '/candidates' | '/speed' | '/efficiency' | '/heatmap'"),
])

# 3) Sidebar：菜单项与图标
edit('components/layout/Sidebar.tsx', [
    ("  AreaChartOutlined,\n", ""),
    ("    {\n      key: '/continuous',\n      icon: <AreaChartOutlined />, // 面積圖圖標，呼應連續文本當量的分佈圖\n      label: '連續當量', // 側邊欄只放得下四個字，正式名稱是「連續文本當量」\n    },\n", ""),
])

# 4) 触发分析路径
edit('services/triggerAnalysisService.ts', [
    ("      '/continuous',\n", ""),
])

# 5) 服务统一导出
edit('services/index.ts', [
    ("// 連續文本當量分析服務\nexport {\n  加載連續文本,\n  清洗連續文本,\n  構建字符按鍵映射,\n  文本轉按鍵序列,\n  計算序列當量,\n  蒙特卡洛連續文本當量,\n  分佈重新分箱,\n} from './continuousEquivalentService'\nexport type {\n  連續文本當量統計介面,\n  窗口當量結果介面,\n  分佈項介面,\n  抽樣選項介面,\n} from './continuousEquivalentService'\n\n", ""),
])

# 6) 原子统一导出
edit('atoms/index.ts', [
    ("// 連續文本當量分析原子狀態\nexport { 連續文本當量分析原子狀態 } from './continuousEquivalent'\nexport type { 連續文本當量分析結果介面, 連續文本當量碼表口徑 } from './continuousEquivalent'\n\n", ""),
])

# 7) 状态重置/套用
edit('services/atomResetService.ts', [
    ("import { 展開連續文本當量結果 } from '@/atoms/continuousEquivalent'\n", ""),
    ("  設置連續文本當量分析結果: (value: any) => void\n", ""),
    ("  // 連續文本當量必須一併清空：它不會隨碼表變化自動失效，\n  // 漏清就會在新方案的頁面上繼續顯示上一個方案的分佈圖\n  setters.設置連續文本當量分析結果(null)\n", ""),
    ("  const 數據中的連續文本當量結果 = 展開連續文本當量結果(測評結果?.連續文本當量)\n\n", ""),
    ("    {\n      名稱: '連續文本當量分析',\n      值: 數據中的連續文本當量結果,\n      寫入: setters.設置連續文本當量分析結果,\n    },\n", ""),
])

# 8) 导入导出服务
edit('services/exportService.ts', [
    ("import type { 連續文本當量分析結果介面 } from '@/atoms/continuousEquivalent'\n", ""),
    ("import { 壓縮連續文本當量結果 } from '@/atoms/continuousEquivalent'\n", ""),
    ("  連續文本當量分析結果?: 連續文本當量分析結果介面 | null\n", ""),
    ("    連續文本當量: 分析結果.連續文本當量分析結果\n      ? 壓縮連續文本當量結果(分析結果.連續文本當量分析結果)\n      : undefined,\n", ""),
    ("      分析結果.連續文本當量分析結果 && '連續文本當量分析',\n", ""),
    (" * 這是 `應用方案數據` 的反方向。那一支的註釋説「邏輯抄三份遲早會漏掉某一項\n * 結果」——收集這一側同樣抄過三份（導出、克隆、本地方案自動同步），而且\n * 真的漏了：`連續文本當量` 只有導出那一份寫了，另兩份都没有。\n *\n * 連續文本當量一律壓成緊湊格點（存檔格式），恢復時由 `應用方案數據`\n * 裏的 `展開連續文本當量結果` 還原。",
     " * 這是 `應用方案數據` 的反方向：把各 atom 的結果收成存檔格式，\n * 與導出、克隆、本地方案自動同步共用同一支。"),
])

# 9) 本地方案同步 hook
edit('hooks/useLocalSchemeSyncMetrics.ts', [
    ("import { 連續文本當量分析原子狀態 } from '@/atoms/continuousEquivalent'\n", ""),
    ("  const 連續文本當量 = useAtomValue(連續文本當量分析原子狀態)\n", ""),
    ("                連續文本當量分析結果: 連續文本當量,\n", ""),
    ("    連續文本當量,\n", ""),
    (" * - 收結果走 `收集測評結果`，與導出、克隆同一支：七項一次收齊，\n *   連續文本當量按緊湊格點存檔，否則幾萬個原始樣本值會把 localStorage 撑爆。\n",
     " * - 收結果走 `收集測評結果`，與導出、克隆同一支，一次收齊。\n"),
])

# 10) 方案类型定义
edit('types/scheme.ts', [
    ("import type { 連續文本當量存檔介面 } from '../atoms/continuousEquivalent'\n", ""),
    ("  // 連續文本當量分析（分佈存成緊湊格點形式，導入後無需重算即可出圖）\n  連續文本當量?: 連續文本當量存檔介面\n", ""),
])

# 11) 设置页
edit('pages/SettingsPage.tsx', [
    ("import { 連續文本當量分析原子狀態 } from '@/atoms/continuousEquivalent'\n", ""),
    ("  const 設置連續文本當量分析結果 = useSetAtom(連續文本當量分析原子狀態)\n", ""),
    ("      設置連續文本當量分析結果(null)\n", ""),
    ("      const 連續文本當量分析結果 = store.get(連續文本當量分析原子狀態)\n", ""),
    ("      console.log('  - 連續文本當量:', 連續文本當量分析結果 ? '✓ 有数据' : '✗ 无数据')\n", ""),
    ("          連續文本當量分析結果,\n", ""),
])

# 12) 首页
edit('pages/HomePage.tsx', [
    ("import { 連續文本當量分析原子狀態 } from '@/atoms/continuousEquivalent'\n", ""),
    ("  const 設置連續文本當量分析結果 = useSetAtom(連續文本當量分析原子狀態)\n", ""),
    ("    設置連續文本當量分析結果,\n", ""),
])

# 13) 顶栏
edit('components/layout/AppHeader.tsx', [
    ("import { 連續文本當量分析原子狀態 } from '@/atoms/continuousEquivalent'\n", ""),
    ("  const [連續文本當量分析結果, 設置連續文本當量分析結果] = useAtom(連續文本當量分析原子狀態)\n", ""),
    ("    連續文本當量分析結果,\n", ""),
    ("    設置連續文本當量分析結果,\n", ""),
])

# 14) 简码效率服务残留注释
edit('services/shortCodeEfficiencyService.ts', [
    (" * 排序鍵是字頻 ×（全碼長 − 簡碼長），大者在前。連續當量的 top N 與此共用同一份順序。\n",
     " * 排序鍵是字頻 ×（全碼長 − 簡碼長），大者在前。\n"),
])

if failures:
    print('❌ 以下替换未命中，裁剪中止：', file=sys.stderr)
    for f in failures:
        print('  -', f, file=sys.stderr)
    sys.exit(1)
print('✅ 连续文本当量功能已从 CI 工作副本裁剪')
