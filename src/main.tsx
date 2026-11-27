import { Provider } from 'jotai'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AntdConfigProvider } from './components/AntdConfigProvider'
import { ErrorBoundary } from './components/ErrorBoundary'
import './styles/global.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Provider>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <AntdConfigProvider>
          <ErrorBoundary>
            <App />
          </ErrorBoundary>
        </AntdConfigProvider>
      </BrowserRouter>
    </Provider>
  </React.StrictMode>
)
