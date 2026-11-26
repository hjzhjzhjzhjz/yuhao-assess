/**
 * 简码效率优化后的对照测试
 *
 * 用原实现（28 次 Set 遍历）作为参考，随机生成多组码表+字频，
 * 验证前缀和实现的输出字符串与每个 N 值的加权码长都一致。
 *
 *   pnpm exec tsx tests/shortcode-efficiency.mts
 */
import {
  簡碼效率N值列表,
  計算指定字頻下之簡碼效率,
} from '../src/services/shortCodeEfficiencyService.ts'

type 項 = { 字符: string; 簡碼長度: number; 全碼長度: number; 字頻: number; 乘積: number }

// 参考实现：优化前的原始算法（保留在测试里作为对照基准）
function 參考實現(
  字頻數據: Record<string, number>,
  簡碼映射: Map<string, string>,
  全碼映射: Map<string, string>,
  最大碼長: number,
  N值列表: number[]
) {
  const 處理後字符: 項[] = []
  for (const [字符, 字頻] of Object.entries(字頻數據)) {
    if (字頻 <= 0) continue
    const 簡碼 = 簡碼映射.get(字符)
    const 全碼 = 全碼映射.get(字符)
    if (!簡碼 || !全碼) continue
    處理後字符.push({
      字符,
      簡碼長度: 簡碼.length,
      全碼長度: 全碼.length,
      字頻,
      乘積: 字頻 * (全碼.length - 簡碼.length),
    })
  }
  const 有效 = 處理後字符.filter(c => c.簡碼長度 < c.全碼長度 && c.簡碼長度 < 最大碼長)
  const 按乘積排序 = [...有效].sort((a, b) => b.乘積 - a.乘積)
  const 最大N = Math.max(...N值列表)
  const 完整字符字符串 = 按乘積排序
    .slice(0, Math.min(最大N, 按乘積排序.length))
    .map(c => c.字符)
    .join('')
  const N值結果 = []
  for (const N of N值列表) {
    const 選中 = new Set(按乘積排序.slice(0, Math.min(N, 按乘積排序.length)).map(c => c.字符))
    let 總字頻碼長 = 0,
      總字頻 = 0
    for (const c of 處理後字符) {
      const 碼長 = 選中.has(c.字符) ? c.簡碼長度 : c.全碼長度
      總字頻碼長 += c.字頻 * 碼長
      總字頻 += c.字頻
    }
    N值結果.push({ 最有效率的簡碼個數: N, 字頻加權碼長: 總字頻 > 0 ? 總字頻碼長 / 總字頻 : 0 })
  }
  return { 完整字符字符串, N值結果 }
}

function 造數據(規模: number, seedBase: number) {
  const 字頻數據: Record<string, number> = {}
  const 簡碼映射 = new Map<string, string>()
  const 全碼映射 = new Map<string, string>()
  let seed = seedBase
  const rnd = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff
    return seed / 0x7fffffff
  }
  for (let i = 0; i < 規模; i++) {
    const ch = String.fromCodePoint(0x4e00 + i)
    // 含零频/负频字符，覆盖边界
    字頻數據[ch] = i % 97 === 0 ? 0 : rnd() * 100 + 0.01
    const sl = 1 + Math.floor(rnd() * 4)
    const fl = sl + Math.floor(rnd() * (5 - sl))
    簡碼映射.set(ch, 'x'.repeat(sl))
    全碼映射.set(ch, 'y'.repeat(fl))
  }
  return { 字頻數據, 簡碼映射, 全碼映射 }
}

let 失敗 = 0
function 檢查(通過: boolean, 説的是: string, 附註 = '') {
  console.log(`${通過 ? '✅' : '❌'}  ${説的是}${附註 ? '   [' + 附註 + ']' : ''}`)
  if (!通過) 失敗 += 1
}

const N列表 = [...簡碼效率N值列表]
const 場景 = [
  { 規模: 15000, 最大碼長: 4, seed: 1 },
  { 規模: 15000, 最大碼長: 5, seed: 2 },
  { 規模: 8000, 最大碼長: 4, seed: 3 },
  { 規模: 200, 最大碼長: 4, seed: 4 }, // 有效简码不足 N
  { 規模: 50, 最大碼長: 3, seed: 5 },
]

for (const { 規模, 最大碼長, seed } of 場景) {
  const { 字頻數據, 簡碼映射, 全碼映射 } = 造數據(規模, seed)
  const 新 = 計算指定字頻下之簡碼效率(字頻數據, 簡碼映射, 全碼映射, 最大碼長, N列表)
  const 舊 = 參考實現(字頻數據, 簡碼映射, 全碼映射, 最大碼長, N列表)

  檢查(新.完整字符字符串 === 舊.完整字符字符串, `规模${規模}/码长${最大碼長}: 完整字符字符串一致`)
  檢查(新.N值結果.length === 舊.N值結果.length, `规模${規模}/码长${最大碼長}: N值数量一致`)

  let 最大誤差 = 0
  for (let i = 0; i < N列表.length; i++) {
    最大誤差 = Math.max(
      最大誤差,
      Math.abs(新.N值結果[i]!.字頻加權碼長 - 舊.N值結果[i]!.字頻加權碼長)
    )
  }
  檢查(
    最大誤差 < 1e-10,
    `规模${規模}/码长${最大碼長}: 加权码长一致`,
    `最大误差 ${最大誤差.toExponential(2)}`
  )
}

console.log('')
if (失敗 > 0) {
  console.error(`❌ ${失敗} 项检查失败`)
  process.exit(1)
}
console.log('🎉 全部检查通过：优化实现与原实现数值一致')
