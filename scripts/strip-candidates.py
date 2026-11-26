#!/usr/bin/env python3
"""
部署期裁剪：「候選個數」（最大候選數）功能不隨 GitHub Pages 發布。

此脚本由 .github/workflows/deploy-pages.yml 在 CI 中、建置之前调用，
在 strip-continuous.py 之后执行。仅改变 CI 工作副本，不会触碰仓库源码。
目的：线上站点不提供该功能入口、页面与对比列，但仓库源码保留完整实现，方便日后恢复。

策略：删除 4 个核心文件，并清理全部引用（路由、菜单、服务/原子导出、
状态重置、导入导出、本地同步、类型定义、各页面、顶栏、对比页、CLI 分析器、
方案完成度计数）。每处替换带断言，确保命中预期文本；任一未命中即非零退出，
让 CI 立即失败，避免发布半成品。

注意：本脚本在 strip-continuous.py 之后运行，故部分文件的行已不含连续当量代码。
所有匹配文本均以「连续当量已裁剪」后的工作副本为准。
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


# 1) 删除核心文件（4 个）
for f in (
    'src/services/maximumCandidatesService.ts',
    'src/pages/MaximumCandidatesPage.tsx',
    'src/atoms/maximumCandidates.ts',
    'src/cli/analyses/maximum-candidates.ts',
):
    p = pathlib.Path(f)
    if p.exists():
        p.unlink()
    else:
        failures.append(f'待删文件不存在: {f}')

# 2) App.tsx：导入、路由、路径型别
# 路径型别行在连续当量裁剪后已变为 '/dynamic' | '/static' | '/candidates' | '/speed' | '/efficiency' | '/heatmap'
edit('App.tsx', [
    ("import MaximumCandidatesPage from './pages/MaximumCandidatesPage'\n", ""),
    ("      {\n        path: '/candidates',\n        element: <MaximumCandidatesPage />,\n      },\n", ""),
    ("  '/dynamic' | '/static' | '/candidates' | '/speed' | '/efficiency' | '/heatmap'",
     "  '/dynamic' | '/static' | '/speed' | '/efficiency' | '/heatmap'"),
])

# 3) Sidebar：菜单项与图标
edit('components/layout/Sidebar.tsx', [
    ("  NumberOutlined,\n", ""),
    ("    {\n      key: '/candidates',\n      icon: <NumberOutlined />, // 數字圖標（可換成：FunnelPlotOutlined, StockOutlined）\n      label: '候選個數',\n    },\n", ""),
])

# 4) 触发分析路径
edit('services/triggerAnalysisService.ts', [
    ("      '/candidates',\n", ""),
])

# 5) 服务统一导出
edit('services/index.ts', [
    ("// 導出最大候選數服務\nexport {\n  getMaximumCandidates,\n  getAllMaximumCandidates,\n  type 最大候選個數結果,\n} from './maximumCandidatesService'\n\n", ""),
])

# 6) 状态重置/套用
edit('services/atomResetService.ts', [
    ("  設置候選個數分析結果: (value: any) => void\n", ""),
    ("  setters.設置候選個數分析結果(null)\n", ""),
    ("    { 名稱: '候選個數分析', 值: 測評結果?.候選個數分析, 寫入: setters.設置候選個數分析結果 },\n", ""),
])

# 7) 导入导出服务
edit('services/exportService.ts', [
    ("import type { 最大候選個數分析結果 } from '@/atoms/maximumCandidates'\n", ""),
    ("  候選個數分析結果: 最大候選個數分析結果 | null\n", ""),
    ("    候選個數分析: 分析結果.候選個數分析結果 ?? undefined,\n", ""),
    ("      分析結果.候選個數分析結果 && '候選個數分析',\n", ""),
])

# 8) 本地方案同步 hook
edit('hooks/useLocalSchemeSyncMetrics.ts', [
    ("import { 候選個數分析原子狀態 } from '@/atoms/maximumCandidates'\n", ""),
    ("  const 候選個數 = useAtomValue(候選個數分析原子狀態)\n", ""),
    ("                候選個數分析結果: 候選個數,\n", ""),
    ("    候選個數,\n", ""),
])

# 9) 方案类型定义
edit('types/scheme.ts', [
    ("import type { 最大候選個數分析結果 } from '../atoms/maximumCandidates'\n", ""),
    ("  // 最大候選數分析\n  候選個數分析?: 最大候選個數分析結果\n\n", ""),
])

# 10) 设置页
edit('pages/SettingsPage.tsx', [
    ("import { 候選個數分析原子狀態 } from '@/atoms/maximumCandidates'\n", ""),
    ("  const 設置候選個數分析結果 = useSetAtom(候選個數分析原子狀態)\n", ""),
    ("      設置候選個數分析結果(null)\n", ""),
    ("      const 候選個數分析結果 = store.get(候選個數分析原子狀態)\n", ""),
    ("      console.log('  - 候選個數:', 候選個數分析結果 ? '✓ 有数据' : '✗ 无数据')\n", ""),
    ("          候選個數分析結果,\n", ""),
])

# 11) 首页
edit('pages/HomePage.tsx', [
    ("import { 候選個數分析原子狀態 } from '@/atoms/maximumCandidates'\n", ""),
    ("  const 設置候選個數分析結果 = useSetAtom(候選個數分析原子狀態)\n", ""),
    ("    設置候選個數分析結果,\n", ""),
])

# 12) 顶栏
edit('components/layout/AppHeader.tsx', [
    ("import { 候選個數分析原子狀態 } from '@/atoms/maximumCandidates'\n", ""),
    ("  const 設置候選個數分析結果 = useSetAtom(候選個數分析原子狀態)\n", ""),
    ("  const 候選個數分析結果 = useAtomValue(候選個數分析原子狀態)\n", ""),
    ("    候選個數分析結果,\n", ""),
    ("    設置候選個數分析結果,\n", ""),
    ("    設置候選個數分析結果(null)\n", ""),
])

# 13) 方案完成度计数
edit('services/schemeService.ts', [
    ("  if (配置.測評結果.候選個數分析) 已完成數++\n", ""),
])

# 14) 字符集服务注释
edit('services/charsetService.ts', [
    (" * 靜態重碼與候選個數分析各要跑 14 個字符集，舊版每次呼叫",
     " * 靜態重碼分析要跑 14 個字符集，舊版每次呼叫"),
])

# 15) CLI 分析器
edit('cli/analyzer.ts', [
    ("import { analyzeMaximumCandidates } from './analyses/maximum-candidates'\n", ""),
    ("  // 3. 候選個數分析\n  {\n    const step = '候選個數分析'\n    onStepStart(step)\n    const t0 = Date.now()\n    result.候選個數分析 = await analyzeMaximumCandidates(全碼表)\n    onStepDone(step, Date.now() - t0)\n  }\n\n", ""),
])

# 16) 方案对比页（Analysis 型别、数据字段、三个赋值、依赖、列定义、切换按钮）
edit('pages/ComparisonPage.tsx', [
    ("import { 候選個數分析原子狀態 } from '@/atoms/maximumCandidates'\n", ""),
    ("import type { 最大候選個數分析結果 } from '@/atoms/maximumCandidates'\n", ""),
    ("  候選個數分析?: 最大候選個數分析結果 | null\n", ""),
    ("  | '候選個數'\n", ""),
    ("  const 候選個數分析結果 = useAtomValue(候選個數分析原子狀態)\n", ""),
    ("          候選個數分析: 候選個數分析結果,\n", ""),
    ("          候選個數分析: 本地方案.測評結果?.候選個數分析 ?? null,\n", ""),
    ("            候選個數分析: 測評結果?.候選個數分析 || null,\n", ""),
    ("    候選個數分析結果,\n", ""),
    ("      case '候選個數':\n        return 最大候選數列\n", ""),
    ("          <Button\n            type={當前分析類型 === '候選個數' ? 'primary' : 'default'}\n            onClick={() => 設置當前分析類型('候選個數')}\n          >\n            候選數\n          </Button>\n", ""),
])

# 17) 方案对比页：删除「最大候選數列」整块（含注释，到「速度當量列」注释前）
def cut_between(rel: str, start_marker: str, end_marker: str) -> None:
    p = ROOT / rel
    if not p.exists():
        return
    s = p.read_text(encoding='utf-8')
    i = s.find(start_marker)
    j = s.find(end_marker, i + len(start_marker)) if i >= 0 else -1
    if i < 0 or j < 0:
        failures.append(f'区块未命中 [{rel}]: {start_marker!r} ... {end_marker!r}')
        return
    s = s[:i] + s[j:]
    p.write_text(s, encoding='utf-8')


cut_between(
    'pages/ComparisonPage.tsx',
    '  // 最大候選數列\n',
    '  // 速度當量列（根據字頻來源動態生成',
)

if failures:
    print('❌ 以下替换未命中，裁剪中止：', file=sys.stderr)
    for f in failures:
        print('  -', f, file=sys.stderr)
    sys.exit(1)
print('✅ 候選個數功能已從 CI 工作副本裁剪')
