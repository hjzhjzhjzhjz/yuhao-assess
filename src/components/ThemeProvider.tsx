import React, { useEffect } from 'react'

/**
 * 主题提供者组件
 * 将固化主题应用到 CSS 变量（墨青主题）
 */
export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useEffect(() => {
    // 获取根元素
    const root = document.documentElement

    // 应用全局字体大小到 CSS 变量
    root.style.setProperty('--font-size-base', `14px`)
    root.style.setProperty('--line-height-base', `1.4`)

    // 应用表格相关样式到 CSS 变量
    root.style.setProperty('--table-font-size', `13px`)
    root.style.setProperty('--table-cell-padding-block', `4px`)
    root.style.setProperty('--table-cell-padding-inline', `8px`)
    root.style.setProperty('--table-header-bg', '#ebe6d9')
    root.style.setProperty('--table-header-color', '#1c2b2d')
  }, [])

  return <>{children}</>
}
