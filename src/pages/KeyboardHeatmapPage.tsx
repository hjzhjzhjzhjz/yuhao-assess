import { ReloadOutlined } from '@ant-design/icons'
import { Alert, Button, Card, Checkbox, message, Space, Spin, Tabs } from 'antd'
import { useAtom } from 'jotai'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import styled from 'styled-components'
import { 字頻表緩存原子狀態 } from '@/atoms/charFrequency'
import { 碼表原子狀態 } from '@/atoms/codeTable'
import type { 鍵位熱力分析結果介面 } from '@/atoms/keyboardHeatmap'
import { 鍵位熱力分析原子狀態 } from '@/atoms/keyboardHeatmap'
import { 當前方案原子狀態 } from '@/atoms/scheme'
import { 計算按鍵計數 } from '@/services/keyboardHeatmapService'
import type { 處理後的碼表結果介面 } from '@/types'
import { 默認選重鍵表 } from '@/types/scheme'

const PageContainer = styled.div`
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;

  @media (max-width: 768px) {
    padding: 12px;
  }
`

const KeyboardWrapper = styled.div`
  display: flex;
  justify-content: center;
  padding: 8px 0;
  overflow: hidden;
  width: 100%;
  flex-direction: column;

  @media (min-width: 1200px) {
    max-width: 80%;
    margin: 0 auto;
    padding: 16px 0;
  }

  /* 移動端：鍵盤保持可觸摸的鍵位尺寸，改爲橫向滑動查看，不勉強縮小 */
  @media (max-width: 768px) {
    overflow-x: auto;
    overflow-y: hidden;
    justify-content: flex-start;
    -webkit-overflow-scrolling: touch;
    padding-bottom: 12px;
  }
`

const KeyboardLayout = styled.div<{ scale: number }>`
  background-color: var(--color-bg-primary, #fffdf8);
  border-radius: 8px;
  padding: 24px;
  transform-origin: center top;
  transform: scale(${props => props.scale});
  width: 100%;
  height: 100%;
  max-width: 900px;
  max-height: none;
  min-width: 280px;
  border: 1px solid var(--color-border-secondary, #ded8c8);
  transition: transform 0.3s ease;
  margin: auto;
  display: grid;
  grid-template-rows: repeat(5, 1fr);
  gap: 8px;
  place-items: center;
`

const KeyboardRow = styled.div`
  display: grid;
  grid-template-columns: repeat(10, 1fr);
  gap: 4px;
  width: 100%;
  height: 100%;
  align-items: stretch;
`

const KeyButton = styled.button<{
  $frequency: number
  $maxFreq: number
  $hidden?: boolean
  $mode?: string
}>`
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  border: 1px solid #ded8c8;
  border-radius: 6px;
  background-color: #fffdf8;
  cursor: ${props => (props.$hidden ? 'default' : 'pointer')};
  transition: all 0.2s ease;
  user-select: none;
  overflow: hidden;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, monospace;
  width: 100%;
  height: 100%;
  aspect-ratio: 1;
  min-width: 40px;
  min-height: 40px;
  opacity: ${props => (props.$hidden ? 0 : 1)};
  pointer-events: ${props => (props.$hidden ? 'none' : 'auto')};

  &:hover {
    border-color: ${props => (props.$hidden ? 'transparent' : '#2a9d8f')};
    transform: ${props => (props.$hidden ? 'none' : 'translateY(-2px)')};
    box-shadow: ${props => (props.$hidden ? 'none' : '0 4px 6px -1px rgba(28, 43, 45, 0.16)')};
    z-index: 10;
  }

  &.wide {
    grid-column: span 3;
    aspect-ratio: 3;
  }

  &.extra-wide {
    grid-column: span 6;
    aspect-ratio: 7;
  }

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 1;
    border-radius: 4px;
    background: ${props => {
      if (props.$hidden) return 'transparent'
      const frequencyPercent = props.$frequency * 100
      const intensity = Math.min(Math.sqrt(frequencyPercent / 10), 1.5)

      if (props.$mode === 'short') {
        // 簡碼模式：暖琥珀色漸變（與全碼青色區分）
        return `linear-gradient(135deg, 
          rgba(217, 140, 63, ${intensity * 0.9 + 0.1}), 
          rgba(185, 104, 42, ${intensity * 0.8 + 0.1})
        )`
      }
      // 全碼模式：青瓷緑漸變
      return `linear-gradient(135deg, 
        rgba(42, 157, 143, ${intensity * 0.9 + 0.1}), 
        rgba(26, 110, 100, ${intensity * 0.8 + 0.1})
      )`
    }};
    transition: all 0.3s ease;
  }
`

const KeyLabel = styled.div<{ $intensity: number }>`
  position: relative;
  z-index: 2;
  font-size: max(11px, calc(0.2rem + 1.2vw));
  font-weight: 600;
  color: ${props => (props.$intensity > 0.5 ? '#ffffff' : '#1c2b2d')};
  text-shadow: ${props => (props.$intensity > 0.5 ? '0 1px 2px rgba(0, 0, 0, 0.28)' : 'none')};
  text-transform: uppercase;
  font-family: monospace;
  min-height: 1.2em;
  transition: color 0.3s ease;
`

const KeyFreq = styled.div<{ $intensity: number }>`
  position: relative;
  z-index: 2;
  font-size: max(10px, calc(0.2rem + 1vw));
  font-weight: 500;
  color: ${props => (props.$intensity > 0.06 ? '#ffffff' : '#6b6459')};
  text-shadow: ${props => (props.$intensity > 0.06 ? '0 1px 2px rgba(0, 0, 0, 0.28)' : 'none')};
  font-family: monospace;
  line-height: 1;
  margin-top: 2px;
  transition: color 0.3s ease;
`

const StatsContainer = styled.div`
  margin-top: 32px;
`

const StatsTitle = styled.h4`
  font-size: 16px;
  font-weight: 600;
  color: #2f4a47;
  margin: 0 0 20px 0;
  padding-bottom: 8px;
  border-bottom: 2px solid #2a9d8f;
`

const StatsSection = styled.div`
  margin-bottom: 28px;

  &:last-child {
    margin-bottom: 0;
  }
`

const SectionTitle = styled.h5`
  font-size: 14px;
  font-weight: 600;
  color: #4a615e;
  margin: 0 0 12px 0;
`

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 12px;

  @media (max-width: 576px) {
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  }
`

// 熱力圖顔色圖例：從低到高的漸變色條
const Legend = styled.div<{ $mode?: string }>`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin: 14px 0 4px;
  font-size: 12px;
  color: #6b6459;
`
const LegendBar = styled.span<{ $mode?: string }>`
  display: inline-block;
  width: 160px;
  height: 12px;
  border-radius: 6px;
  border: 1px solid #ded8c8;
  background: ${props =>
    props.$mode === 'short'
      ? 'linear-gradient(90deg, rgba(217,140,63,0.15), rgba(185,104,42,0.95))'
      : 'linear-gradient(90deg, rgba(42,157,143,0.15), rgba(26,110,100,0.95))'};
`

const StatItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  background: #ebe6d9;
  border-radius: 6px;
  border: 1px solid #ded8c8;
  transition: all 0.2s ease;

  &:hover {
    background: #e4f2ef;
    border-color: #9fd4cb;
  }
`

const StatLabel = styled.span`
  font-size: 13px;
  color: #6b6459;
  font-weight: 500;
`

const StatValue = styled.span`
  font-size: 14px;
  font-weight: 600;
  color: #2a9d8f;
`

const TabsContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 16px;
`

const ControlsWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`

interface KeyData {
  key: string
  count: number
  frequency: number
}

interface KeyInfo {
  key: string
  label?: string
  width?: 'normal' | 'wide' | 'extra-wide'
  hidden?: boolean
}

// 键盘布局定义
const numberRowKeys: KeyInfo[] = [
  { key: '1' },
  { key: '2' },
  { key: '3' },
  { key: '4' },
  { key: '5' },
  { key: '6' },
  { key: '7' },
  { key: '8' },
  { key: '9' },
  { key: '0' },
]

const firstRowKeys: KeyInfo[] = [
  { key: 'q' },
  { key: 'w' },
  { key: 'e' },
  { key: 'r' },
  { key: 't' },
  { key: 'y' },
  { key: 'u' },
  { key: 'i' },
  { key: 'o' },
  { key: 'p' },
]

const secondRowKeys: KeyInfo[] = [
  { key: 'a' },
  { key: 's' },
  { key: 'd' },
  { key: 'f' },
  { key: 'g' },
  { key: 'h' },
  { key: 'j' },
  { key: 'k' },
  { key: 'l' },
  { key: ';' },
]

const thirdRowKeys: KeyInfo[] = [
  { key: 'z' },
  { key: 'x' },
  { key: 'c' },
  { key: 'v' },
  { key: 'b' },
  { key: 'n' },
  { key: 'm' },
  { key: ',' },
  { key: '.' },
  { key: '/' },
]

const spaceRowKeys: KeyInfo[] = [
  { key: 'hidden-7', hidden: true },
  { key: 'hidden-8', hidden: true },
  { key: 'space', label: 'Space', width: 'extra-wide' },
  { key: 'hidden-9', hidden: true },
  { key: "'" },
]

// 手指映射
const fingerMapping: Record<string, string> = {
  '1': '左小指',
  q: '左小指',
  a: '左小指',
  z: '左小指',
  '2': '左无名指',
  w: '左无名指',
  s: '左无名指',
  x: '左无名指',
  '3': '左中指',
  e: '左中指',
  d: '左中指',
  c: '左中指',
  '4': '左食指',
  '5': '左食指',
  r: '左食指',
  t: '左食指',
  f: '左食指',
  g: '左食指',
  v: '左食指',
  b: '左食指',
  '6': '右食指',
  '7': '右食指',
  y: '右食指',
  u: '右食指',
  h: '右食指',
  j: '右食指',
  n: '右食指',
  m: '右食指',
  '8': '右中指',
  i: '右中指',
  k: '右中指',
  ',': '右中指',
  '9': '右无名指',
  o: '右无名指',
  l: '右无名指',
  '.': '右无名指',
  '0': '右小指',
  '-': '右小指',
  '=': '右小指',
  p: '右小指',
  '[': '右小指',
  ']': '右小指',
  ';': '右小指',
  "'": '右小指',
  '/': '右小指',
  space: '双拇指',
}

// 按排映射
const rowMapping: Record<string, string> = {
  '1': '数字排',
  '2': '数字排',
  '3': '数字排',
  '4': '数字排',
  '5': '数字排',
  '6': '数字排',
  '7': '数字排',
  '8': '数字排',
  '9': '数字排',
  '0': '数字排',
  q: '上排',
  w: '上排',
  e: '上排',
  r: '上排',
  t: '上排',
  y: '上排',
  u: '上排',
  i: '上排',
  o: '上排',
  p: '上排',
  a: '中排',
  s: '中排',
  d: '中排',
  f: '中排',
  g: '中排',
  h: '中排',
  j: '中排',
  k: '中排',
  l: '中排',
  ';': '中排',
  "'": '中排',
  z: '下排',
  x: '下排',
  c: '下排',
  v: '下排',
  b: '下排',
  n: '下排',
  m: '下排',
  ',': '下排',
  '.': '下排',
  '/': '下排',
  space: '空格排',
}

// 标点符号按键映射（占总字符13%）
const punctuationKeys: Record<string, number> = {
  ';': 0.1,
  ',': 0.4,
  '.': 0.4,
  '/': 0.05,
  "'": 0.05,
}

const PUNCTUATION_CHAR_RATIO = 0.13

/**
 * 從按鍵計數即時演算統計數據（手指負擔、按排分布、左右手平衡）
 */
function 從按鍵分布計算統計(keyDist: Map<string, number>) {
  const fingerLoad = new Map<string, number>()
  const rowDist = new Map<string, number>()
  let leftHand = 0
  let rightHand = 0

  for (const [key, count] of keyDist.entries()) {
    const finger = fingerMapping[key]
    if (finger) {
      fingerLoad.set(finger, (fingerLoad.get(finger) || 0) + count)
      if (finger.startsWith('左')) leftHand += count
      else if (finger.startsWith('右')) rightHand += count
    }
    const row = rowMapping[key]
    if (row) {
      rowDist.set(row, (rowDist.get(row) || 0) + count)
    }
  }

  const total = leftHand + rightHand
  const fingerTotal = Array.from(fingerLoad.values()).reduce((s, v) => s + v, 0)
  const rowTotal = Array.from(rowDist.values()).reduce((s, v) => s + v, 0)

  // 轉換手指負擔爲百分比
  const fingerPct = new Map<string, number>()
  for (const [finger, load] of fingerLoad.entries()) {
    fingerPct.set(finger, fingerTotal > 0 ? (load / fingerTotal) * 100 : 0)
  }

  // 轉換按排分布爲百分比
  const rowPct = new Map<string, number>()
  for (const [row, count] of rowDist.entries()) {
    rowPct.set(row, rowTotal > 0 ? (count / rowTotal) * 100 : 0)
  }

  return {
    fingerLoad: fingerPct,
    rowDist: rowPct,
    handBalance: {
      left: total > 0 ? (leftHand / total) * 100 : 0,
      right: total > 0 ? (rightHand / total) * 100 : 0,
    },
  }
}

export default function KeyboardHeatmapPage() {
  const [碼表數據] = useAtom(碼表原子狀態)
  const [當前方案] = useAtom(當前方案原子狀態)
  const [字頻表緩存] = useAtom(字頻表緩存原子狀態)
  const [分析結果, 設置分析結果] = useAtom(鍵位熱力分析原子狀態)
  const [activeTab, setActiveTab] = useState('full')
  const [simulatePunctuation, setSimulatePunctuation] = useState(true)
  const [keyboardScale] = useState(1.0)
  const [計算中, 設置計算中] = useState(false)
  const [錯誤信息, 設置錯誤信息] = useState<string | null>(null)
  const keyboardWrapperRef = useRef(null)
  const 已初始化計算 = useRef(false)

  // 類型斷言：碼表數據實際上是 處理後的碼表結果
  const 處理後碼表 = 碼表數據

  // 獲取當前字頻數據（使用北語簡體字頻）
  const 當前字頻 = useMemo(() => {
    return 字頻表緩存.get('北語簡體字頻') || {}
  }, [字頻表緩存])

  // 重新計算：從碼表計算全碼和簡碼的按鍵計數並寫入 atom
  const 重新計算 = async () => {
    if (!處理後碼表) {
      設置錯誤信息('請先上傳碼表')
      return
    }

    設置計算中(true)
    設置錯誤信息(null)

    try {
      const 選重鍵表 = 當前方案?.方案參數?.選重鍵表 ?? 默認選重鍵表
      const 全碼數據 = 計算按鍵計數(處理後碼表.全碼加選重鍵表, 當前字頻, 選重鍵表)
      const 簡碼數據 = 計算按鍵計數(處理後碼表.簡碼加選重鍵表, 當前字頻, 選重鍵表)

      const 新結果: 鍵位熱力分析結果介面 = {
        全碼: 全碼數據,
        簡碼: 簡碼數據,
        更新時間: new Date().toISOString(),
      }

      設置分析結果(新結果)
      message.success('鍵位熱力分析完成')
    } catch (e) {
      const msg = e instanceof Error ? e.message : '計算失敗'
      設置錯誤信息(msg)
    } finally {
      設置計算中(false)
    }
  }

  // 自動計算：碼表就緒且無分析結果時自動觸發
  // biome-ignore lint/correctness/useExhaustiveDependencies: 已初始化計算 ref 守衛確保只自動計算一次；補全依賴會重複觸發
  useEffect(() => {
    if (!分析結果 && 處理後碼表 && !已初始化計算.current) {
      已初始化計算.current = true
      重新計算()
    }
  }, [處理後碼表, 字頻表緩存])

  // 從 atom 中取得當前模式的按鍵計數
  const 當前模式按鍵計數 = useMemo(() => {
    if (!分析結果) return null
    return activeTab === 'full' ? 分析結果.全碼 : 分析結果.簡碼
  }, [分析結果, activeTab])

  // 從 atom 數據中構建 keyDistribution Map
  const keyDistribution = useMemo(() => {
    if (!當前模式按鍵計數) return new Map<string, number>()
    return new Map(Object.entries(當前模式按鍵計數))
  }, [當前模式按鍵計數])

  // 統計數據從按鍵分布即時演算
  const stats = useMemo(() => {
    return 從按鍵分布計算統計(keyDistribution)
  }, [keyDistribution])

  const getKeyData = (key: string): KeyData => {
    const keyLower = key.toLowerCase()
    let count = keyDistribution.get(keyLower) || 0
    let frequency: number

    const totalWeightedKeyUsage = Array.from(keyDistribution.values()).reduce(
      (sum, val) => sum + val,
      0
    )

    if (simulatePunctuation && totalWeightedKeyUsage > 0) {
      // 計算平均碼長（使用帶選重鍵的碼表，遍歷所有編碼）
      let totalCodeLength = 0
      let totalCodes = 0
      const 當前碼表 =
        activeTab === 'full' ? 處理後碼表?.全碼加選重鍵表 : 處理後碼表?.簡碼加選重鍵表
      if (當前碼表) {
        for (const [, codes] of 當前碼表.entries()) {
          if (!codes || codes.length === 0) continue
          // 遍歷該字符的所有編碼
          for (const code of codes) {
            if (code) {
              totalCodeLength += code.length
              totalCodes++
            }
          }
        }
      }
      const avgCodeLen = totalCodes > 0 ? totalCodeLength / totalCodes : 2

      // 標點模擬邏輯
      const punctuationRatio = PUNCTUATION_CHAR_RATIO
      const hanziRatio = 1 - punctuationRatio
      const punctuationKeyRatio = punctuationRatio / (punctuationRatio + hanziRatio * avgCodeLen)

      const rawFrequency = count / totalWeightedKeyUsage
      const remainingRatio = 1 - punctuationKeyRatio
      const compressedRawFrequency = rawFrequency * remainingRatio

      if (punctuationKeys[keyLower]) {
        const punctuationFrequency = punctuationKeyRatio * (punctuationKeys[keyLower] || 0)
        frequency = compressedRawFrequency + punctuationFrequency
        count = (totalWeightedKeyUsage * frequency) / remainingRatio
        if (count < 0.0001) count = 0.0001
      } else {
        frequency = compressedRawFrequency
      }
    } else {
      frequency = totalWeightedKeyUsage > 0 ? count / totalWeightedKeyUsage : 0
    }

    return {
      key: keyLower,
      count,
      frequency,
    }
  }

  const renderKey = (keyInfo: KeyInfo) => {
    if (keyInfo.hidden) {
      return <KeyButton key={keyInfo.key} $frequency={0} $maxFreq={1} $hidden />
    }

    const data = getKeyData(keyInfo.key)
    const widthClass =
      keyInfo.width === 'wide' ? 'wide' : keyInfo.width === 'extra-wide' ? 'extra-wide' : ''
    const frequencyPercent = data.frequency * 100

    return (
      <KeyButton
        key={keyInfo.key}
        className={widthClass}
        $frequency={data.frequency}
        $maxFreq={1}
        $mode={activeTab}
        title={`${keyInfo.label || keyInfo.key.toUpperCase()}\n${(data.frequency * 100).toFixed(2)}%`}
      >
        <KeyLabel $intensity={frequencyPercent / 100}>
          {keyInfo.label || keyInfo.key.toUpperCase()}
        </KeyLabel>
        {data.count > 0 && (
          <KeyFreq $intensity={frequencyPercent / 100}>
            {(data.frequency * 100).toFixed(1)}%
          </KeyFreq>
        )}
      </KeyButton>
    )
  }

  // 無碼表且無已導入的分析結果時顯示提示
  if (!處理後碼表 && !分析結果) {
    return (
      <PageContainer>
        <Card>
          <Alert
            title="等待數據"
            description="請先在「碼表解析」頁面上傳碼表，或導入包含鍵位熱力數據的方案 JSON"
            type="info"
            showIcon
          />
        </Card>
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <Card
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span>⌨️ 鍵位熱力</span>
            {當前方案 && (
              <span style={{ fontSize: '14px', fontWeight: 'normal', opacity: 0.7 }}>
                {當前方案.元數據.方案名}
              </span>
            )}
          </div>
        }
        extra={
          <Space>
            <Button
              type="primary"
              icon={<ReloadOutlined />}
              onClick={重新計算}
              loading={計算中}
              disabled={!處理後碼表}
            >
              重新計算
            </Button>
          </Space>
        }
      >
        {錯誤信息 && (
          <Alert
            title={錯誤信息}
            type="error"
            closable
            onClose={() => 設置錯誤信息(null)}
            style={{ marginBottom: 16 }}
          />
        )}

        {計算中 && (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <Spin size="large" />
            <p style={{ marginTop: 16 }}>正在計算鍵位熱力...</p>
          </div>
        )}

        {!計算中 && !分析結果 && !錯誤信息 && (
          <Alert
            title="請點擊「重新計算」來查看鍵位熱力分析結果"
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        {!計算中 && 分析結果 && (
          <>
            <TabsContainer>
              <Tabs
                activeKey={activeTab}
                onChange={setActiveTab}
                items={[
                  { key: 'full', label: '全碼' },
                  { key: 'short', label: '出簡' },
                ]}
              />

              <ControlsWrapper>
                <Checkbox
                  checked={simulatePunctuation}
                  onChange={e => setSimulatePunctuation(e.target.checked)}
                >
                  模擬標點使用頻率
                </Checkbox>
              </ControlsWrapper>
            </TabsContainer>

            <KeyboardWrapper ref={keyboardWrapperRef}>
              <KeyboardLayout scale={keyboardScale}>
                <KeyboardRow>{numberRowKeys.map(renderKey)}</KeyboardRow>
                <KeyboardRow>{firstRowKeys.map(renderKey)}</KeyboardRow>
                <KeyboardRow>{secondRowKeys.map(renderKey)}</KeyboardRow>
                <KeyboardRow>{thirdRowKeys.map(renderKey)}</KeyboardRow>
                <KeyboardRow>{spaceRowKeys.map(renderKey)}</KeyboardRow>
              </KeyboardLayout>
            </KeyboardWrapper>

            <Legend $mode={activeTab}>
              <span>低</span>
              <LegendBar $mode={activeTab} />
              <span>高</span>
              <span style={{ marginInlineStart: 8 }}>
                （{activeTab === 'short' ? '簡碼' : '全碼'}按鍵使用頻率）
              </span>
            </Legend>

            <StatsContainer>
              <StatsTitle>統計分析</StatsTitle>

              <StatsSection>
                <SectionTitle>左右手平衡</SectionTitle>
                <StatsGrid>
                  <StatItem>
                    <StatLabel>左手</StatLabel>
                    <StatValue>{stats.handBalance.left.toFixed(1)}%</StatValue>
                  </StatItem>
                  <StatItem>
                    <StatLabel>右手</StatLabel>
                    <StatValue>{stats.handBalance.right.toFixed(1)}%</StatValue>
                  </StatItem>
                </StatsGrid>
              </StatsSection>

              <StatsSection>
                <SectionTitle>按排分布</SectionTitle>
                <StatsGrid>
                  {Array.from(stats.rowDist.entries()).map(([row, pct]) => {
                    return (
                      <StatItem key={row}>
                        <StatLabel>{row}</StatLabel>
                        <StatValue>{pct.toFixed(1)}%</StatValue>
                      </StatItem>
                    )
                  })}
                </StatsGrid>
              </StatsSection>

              <StatsSection>
                <SectionTitle>手指負擔</SectionTitle>
                <StatsGrid>
                  {[
                    '左小指',
                    '左无名指',
                    '左中指',
                    '左食指',
                    '双拇指',
                    '右食指',
                    '右中指',
                    '右无名指',
                    '右小指',
                  ].map(finger => {
                    const load = stats.fingerLoad.get(finger) || 0
                    return (
                      <StatItem key={finger}>
                        <StatLabel>{finger}</StatLabel>
                        <StatValue>{load.toFixed(1)}%</StatValue>
                      </StatItem>
                    )
                  })}
                </StatsGrid>
              </StatsSection>
            </StatsContainer>
          </>
        )}
      </Card>
    </PageContainer>
  )
}
