#!/usr/bin/env python3
"""
部署期裁剪：各页面的「説明/说明」提示内容不随 GitHub Pages 发布。

此脚本由 .github/workflows/deploy-pages.yml 在 CI 中、建置之前调用，
在 strip-candidates.py、strip-comparison-note.py 之后执行。
仅改变 CI 工作副本，不会触碰仓库源码；源码完整保留，方便日后恢复。

删除范围（纯说明性内容）：
  1) 动态选重页、速度当量页、简码效率页的「説明」Alert
  2) 设置页的「提示」Alert 与「CSS 變量機制説明」Card
  3) 热力图页的「説明」按钮 + 说明 Modal + showHelp state + 相关 import

严格保留（功能性内容，非说明）：
  - 各分析表格里的「説明」数据列
  - 设置页含导出按钮的「開發者功能」Alert
  - 错误提示、无数据提示、加载/等待状态提示
  - 仍被其他 Alert 使用处的 Alert import

每处替换带断言，任一未命中即非零退出，让 CI 立即失败，避免发布半成品。
"""
import pathlib
import sys

ROOT = pathlib.Path('src')
failures: list[str] = []


def edit(rel: str, replacements: list[tuple[str, str]]) -> None:
    """精确字符串替换，每处带命中断言。"""
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


def cut_between(rel: str, start: str, end: str) -> None:
    """删除 [start, end) 区间（保留 end 起点的文本），用于长 JSX 块。"""
    p = ROOT / rel
    if not p.exists():
        failures.append(f'文件不存在: {rel}')
        return
    s = p.read_text(encoding='utf-8')
    i = s.find(start)
    if i < 0:
        failures.append(f'起点未命中 [{rel}]: {start!r}')
        return
    j = s.find(end, i + len(start))
    if j < 0:
        failures.append(f'终点未命中 [{rel}]: {end!r}')
        return
    s = s[:i] + s[j:]
    p.write_text(s, encoding='utf-8')


# 1) 动态选重页：删「説明信息」Alert 整块（到紧随的 </Space> 前）
cut_between(
    'pages/DynamicDuplicateAnalysisPage.tsx',
    '        {/* 説明信息 */}\n',
    '      </Space>\n\n      {/* 重碼詳情 Modal */}',
)

# 2) 速度当量页：删「提示信息」Alert 整块
cut_between(
    'pages/SpeedEquivalentPage.tsx',
    '        {/* 提示信息 */}\n',
    '      </Space>\n\n      {/* 當量分佈 Modal */}',
)

# 3) 简码效率页：删「説明」Alert 整块（至方案名块前）
cut_between(
    'pages/ShortCodeEfficiencyPage.tsx',
    '            <Alert\n              title="説明"',
    '            {當前方案?.元數據?.方案名 && (',
)

# 4) 设置页：删「提示」Alert 与「CSS 變量機制説明」Card（保留開發者功能 Alert）
edit('pages/SettingsPage.tsx', [
    (
        '        <Alert\n'
        '          title="提示"\n'
        '          description="所有設置僅在當前會話有效，刷新頁面後將恢復默認值。"\n'
        '          type="info"\n'
        '          showIcon\n'
        '        />\n\n',
        '',
    ),
])
cut_between(
    'pages/SettingsPage.tsx',
    '        {/* 说明 */}\n',
    '      </Space>\n    </div>\n  )\n}',
)

# 5) 热力图页：删説明按钮 + 说明 Modal + showHelp state + 相关 import
edit('pages/KeyboardHeatmapPage.tsx', [
    (
        "import { Card, Tabs, Checkbox, Button, Space, Alert, Modal, Spin, message } from 'antd'\n",
        "import { Card, Tabs, Checkbox, Button, Space, Alert, Spin, message } from 'antd'\n",
    ),
    (
        "import { ReloadOutlined, QuestionCircleOutlined } from '@ant-design/icons'\n",
        "import { ReloadOutlined } from '@ant-design/icons'\n",
    ),
    ('  const [showHelp, setShowHelp] = useState(false)\n', ''),
    (
        '            <Button icon={<QuestionCircleOutlined />} onClick={() => setShowHelp(true)}>\n'
        '              説明\n'
        '            </Button>\n',
        '',
    ),
])
cut_between(
    'pages/KeyboardHeatmapPage.tsx',
    '      <Modal\n        title="模擬標點使用頻率説明"',
    '    </PageContainer>',
)

if failures:
    print('❌ 以下替换未命中，裁剪中止：', file=sys.stderr)
    for f in failures:
        print('  -', f, file=sys.stderr)
    sys.exit(1)
print('✅ 各页面「説明/说明」内容已從 CI 工作副本裁剪')
