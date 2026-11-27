import { App as AntdApp, ConfigProvider } from 'antd'
import zhTW from 'antd/locale/zh_TW'
import React from 'react'

/**
 * Ant Design 配置提供者
 * 应用固化的墨青主题到 Ant Design
 */
export const AntdConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <ConfigProvider
      locale={zhTW}
      theme={{
        token: {
          // 墨青主題主色（青瓷緑），統一 antd 組件
          colorPrimary: '#2a9d8f',
          colorLink: '#2a9d8f',
          colorSuccess: '#2a9d8f',
          colorInfo: '#2a9d8f',
          colorBgLayout: '#f5f2ea',
          colorBgContainer: '#fffdf8',
          colorText: '#1c2b2d',
          colorBorder: '#ded8c8',
          colorBorderSecondary: '#ebe6d9',
          // 全局字體大小（影響所有文字和組件）
          fontSize: 14,
          // 全局行高（文字垂直間距）
          lineHeight: 1.4,
        },
        components: {
          Table: {
            // 表格字體大小（統一應用到所有表格單元格）
            fontSize: 13,

            // 表格單元格 padding（上下、左右）
            cellPaddingBlock: 4,
            cellPaddingInline: 8,

            // 表頭樣式
            headerBg: '#ebe6d9',
            headerColor: '#1c2b2d',
          },
        },
      }}
    >
      <AntdApp>{children}</AntdApp>
    </ConfigProvider>
  )
}
