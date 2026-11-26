#!/usr/bin/env python3
"""
部署期裁剪：「方案对比页」底部的「説明」Alert 区块不随 GitHub Pages 发布。

此脚本由 .github/workflows/deploy-pages.yml 在 CI 中、建置之前调用，
在 strip-candidates.py 之后执行。仅改变 CI 工作副本，不会触碰仓库源码。
目的：线上站点对比页不再显示那段说明提示，但仓库源码完整保留，方便日后恢复。

策略：删除 ComparisonPage.tsx 里的说明 Alert 整块，并从 antd import 中移除
不再使用的 Alert。每处替换带断言，确保命中预期文本；任一未命中即非零退出，
让 CI 立即失败，避免发布半成品。

注意：本脚本在 strip-continuous.py、strip-candidates.py 之后运行。
说明区块与 antd import 行都不含候选项/连续当量字样，前两个脚本不会改动它们。
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


# 说明 Alert 整块（含前置注释与尾随换行）
NOTE_BLOCK = """        {/* 説明信息 */}
        <Alert
          title="説明"
          description={
            <div>
              <p>如果某方案缺字超過當前字集1%，部分單元格不顯示數據。</p>
              <p>
                方案名旁邊的 <strong>†</strong> 標記表示該方案啓用了「出簡不出全」，
                <strong>‡</strong> 標記表示該方案啓用了「選重編碼化」，
                重碼計算方式與普通方案不可直接比較，排序時會被置於表格末尾。
              </p>
            </div>
          }
          type="success"
          showIcon
        />
"""

# ComparisonPage：删说明区块 + 从 antd import 移除 Alert（该页仅此一处使用）
edit('pages/ComparisonPage.tsx', [
    (NOTE_BLOCK, ""),
    (
        "import { Button, Space, Typography, Table, Modal, Checkbox, message, Alert, Spin, Tag } from 'antd'\n",
        "import { Button, Space, Typography, Table, Modal, Checkbox, message, Spin, Tag } from 'antd'\n",
    ),
])

if failures:
    print('❌ 以下替换未命中，裁剪中止：', file=sys.stderr)
    for f in failures:
        print('  -', f, file=sys.stderr)
    sys.exit(1)
print('✅ 方案对比页「説明」Alert 区块已從 CI 工作副本裁剪')
