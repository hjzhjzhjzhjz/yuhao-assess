import { Button, Result } from 'antd'
import { Component, type ErrorInfo, type ReactNode } from 'react'

interface 錯誤邊界属性 {
  children: ReactNode
}

interface 錯誤邊界状态 {
  錯誤: Error | null
}

/** 捕獲子樹渲染錯誤，顯示友好降級頁，避免單一分析頁出錯導致整站白屏 */
export class ErrorBoundary extends Component<錯誤邊界属性, 錯誤邊界状态> {
  state: 錯誤邊界状态 = { 錯誤: null }

  static getDerivedStateFromError(錯誤: Error): 錯誤邊界状态 {
    return { 錯誤 }
  }

  componentDidCatch(錯誤: Error, 資訊: ErrorInfo): void {
    console.error('[ErrorBoundary] 頁面渲染錯誤:', 錯誤, 資訊.componentStack)
  }

  render(): ReactNode {
    if (this.state.錯誤) {
      return (
        <Result
          status="error"
          title="頁面載入失敗"
          subTitle="發生了意外錯誤，請重新載入頁面後重試。"
          extra={
            <Button type="primary" onClick={() => window.location.reload()}>
              重新載入
            </Button>
          }
        />
      )
    }
    return this.props.children
  }
}
