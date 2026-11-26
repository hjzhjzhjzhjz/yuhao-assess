import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  // 本地/單文件 exe 用 '/'，GitHub Pages 部署時由 CI 設爲 '/yuhao-assess/'
  base: process.env.VITE_BASE || '/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(import.meta.dirname, 'src'),
    },
  },
  server: {
    port: 3000,
    open: true,
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        // Vite 8 / Rolldown 只接受函数形式；按模块 id 归类
        manualChunks(id: string) {
          if (!id.includes('node_modules')) return
          if (/node_modules[\\/](react|react-dom|react-router-dom|scheduler)[\\/]/.test(id))
            return 'react-vendor'
          if (/node_modules[\\/](antd|@ant-design|styled-components|@antv|rc-)[\\/]/.test(id))
            return 'ui-vendor'
          if (/node_modules[\\/]jotai[\\/]/.test(id)) return 'state-vendor'
        },
      },
    },
  },
})
