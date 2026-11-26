import js from '@eslint/js'
import { defineConfig, globalIgnores } from 'eslint/config'
import tsPlugin from '@typescript-eslint/eslint-plugin'
import tsParser from '@typescript-eslint/parser'
import reactPlugin from 'eslint-plugin-react'
import reactHooksPlugin from 'eslint-plugin-react-hooks'

export default defineConfig([
  js.configs.recommended,
  {
    name: 'app/linter-options',
    // ESLint 10 新增：過期的 eslint-disable / eslint-enable 註釋也要報告
    linterOptions: {
      reportUnusedInlineConfigs: 'warn',
    },
  },
  {
    name: 'app/tsx',
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        document: 'readonly',
        window: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        fetch: 'readonly',
        localStorage: 'readonly',
        Blob: 'readonly',
        URL: 'readonly',
        FileReader: 'readonly',
        prompt: 'readonly',
        HTMLDivElement: 'readonly',
        ResizeObserver: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      ...reactPlugin.configs.recommended.rules,
      ...reactHooksPlugin.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      // react-hooks 7.x 新增的 React Compiler 規則：現有頁面在 effect 裏同步觸發重算，
      // 重構超出依賴升級範圍，先降為 warn 保留提示
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
    },
    settings: {
      react: {
        // ESLint 10 移除了 context.getFilename()，插件的 detect 模式會調用它；
        // 這裏直接聲明項目鎖定的 React 大版本，避開已失效的探測邏輯
        version: '19.3',
      },
    },
  },
  // Node.js 環境配置（用於CLI工具）
  {
    name: 'app/node',
    files: [
      'src/utils/normalize-traditional-chars.ts',
      'scripts/**/*.js',
      'scripts/**/*.mjs',
      'src/cli/**/*.ts',
      '打包/**/*.ts',
    ],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
      globals: {
        console: 'readonly',
        process: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        Buffer: 'readonly',
        NodeJS: 'readonly',
        // 打包啓動器跑在 Bun 裏
        Bun: 'readonly',
        Blob: 'readonly',
        Response: 'readonly',
        URL: 'readonly',
        performance: 'readonly',
        // Node 24 起 fetch / navigator / AbortSignal 都是穩定全局
        fetch: 'readonly',
        navigator: 'readonly',
        AbortSignal: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
  // E2E 測試腳本：Node + 瀏覽器 globals（flat config 不會自動帶入）
  {
    name: 'app/e2e',
    files: ['tests/**/*.mjs'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        console: 'readonly',
        process: 'readonly',
        fetch: 'readonly',
        setTimeout: 'readonly',
        localStorage: 'readonly',
      },
    },
  },
  // ESLint 10：用 globalIgnores 取代只有 ignores 的配置項
  globalIgnores(['dist/**', 'node_modules/**', '*.config.ts', '*.config.js', 'vite.config.ts']),
])
