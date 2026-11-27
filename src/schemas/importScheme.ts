/**
 * 方案導入的 Zod 校驗層
 *
 * 設計原則：
 * 1. 方案配置（元數據 / 方案參數 / 碼表元數據）嚴格校驗——骨架错就無法用。
 * 2. 測評結果寬鬆校驗——每類結果各自 safeParse，某一類损坏只跳過那一類，
 *    不讓整份導入失败（用户可能有一份大致可用、但某項結果舊格式的存檔）。
 * 3. 未知字段一律 passthrough 保留：測評結果實際有「候選個數分析」「連續文本當量」
 *    等尚未寫進 TypeScript 介面的鍵，不能因爲 schema 没列就把它們丢掉或拒收。
 * 4. 錯誤訊息精確到字段路徑（zod issue.path），讓用户知道到底哪一格错了。
 */

import { z } from 'zod'

// ============================================================
// 方案配置骨架（嚴格）
// ============================================================

const 選重鍵表Schema = z.record(z.string(), z.string())

const 編碼規則Schema = z
  .object({
    單字編碼規則: z.string().optional(),
    詞語編碼規則: z.string().optional(),
  })
  .passthrough()

const 必填字串 = (名稱: string) =>
  z.string({ error: `缺少${名稱}或格式不正確` }).min(1, `${名稱}不能爲空`)

const 方案元數據Schema = z
  .object({
    方案名: 必填字串('方案名'),
    標識符: 必填字串('標識符'),
    版本: 必填字串('版本'),
    創建時間: 必填字串('創建時間'),
    更新時間: 必填字串('更新時間'),
    // 可選字段
    作者: z.string().optional(),
    官網: z.string().optional(),
    相關資源鏈接: z.array(z.string()).optional(),
    碼表下載鏈接: z.string().optional(),
    描述: z.string().optional(),
    標籤: z.array(z.string()).optional(),
  })
  .passthrough()

const 方案參數Schema = z
  .object({
    最大碼長: z
      .number({ error: '最大碼長必須是數字' })
      .int('最大碼長必須是整數')
      .positive('最大碼長必須是正整數'),
    編碼終止指示符列表: z.array(z.string()).optional(),
    選重鍵表: 選重鍵表Schema.default({ '2': ';', '3': "'" }),
    選重編碼化: z.boolean().default(false),
    出簡不出全: z.boolean().default(false),
    編碼規則: 編碼規則Schema.optional(),
  })
  .passthrough()

const 分隔符Schema = z.enum(['空格', '製表符', '逗號', '分號'], {
  error: '分隔符必須是「空格」「製表符」「逗號」或「分號」',
})
const 第一列類型Schema = z.enum(['字符', '編碼'], {
  error: '第一列類型必須是「字符」或「編碼」',
})

const 碼表元數據Schema = z
  .object({
    分隔符: 分隔符Schema.optional(),
    第一列類型: 第一列類型Schema.optional(),
    總字符數: z.number().optional(),
    哈希值: z.string().optional(),
  })
  .passthrough()

/**
 * 方案配置 Schema：元數據 + 方案參數必填，碼表元數據可選
 * 測評結果不放在這裏做嚴格校驗，改由下面的 測評結果Schemas 逐類處理
 */
export const 方案配置Schema = z
  .object({
    元數據: 方案元數據Schema,
    方案參數: 方案參數Schema,
    碼表元數據: 碼表元數據Schema.optional(),
  })
  .passthrough()

// ============================================================
// 測評結果：5 類核心結果各自 Schema
// ============================================================

/** 某字符集的靜態重碼數據 */
const 某字符集靜態重碼Schema = z.object({
  全碼重碼組數: z.number(),
  簡碼重碼組數: z.number(),
  全碼重碼字數: z.number(),
  簡碼重碼字數: z.number(),
  實際字符數: z.number(),
  理論字符數: z.number(),
  字集覆蓋率: z.number(),
})

const 字符集鍵名 = [
  'GB2312',
  '通用規範',
  '常用國字',
  'CJK基本',
  '到CJK擴A',
  '到CJK擴B',
  '到CJK擴C',
  '到CJK擴D',
  '到CJK擴E',
  '到CJK擴F',
  '到CJK擴G',
  '到CJK擴H',
  '到CJK擴I',
  '到CJK擴J',
] as const

/** 靜態重碼分析：14 個字符集必備，其餘（更新時間等）passthrough */
export const 靜態重碼分析Schema = z
  .object(
    Object.fromEntries(字符集鍵名.map(鍵 => [鍵, 某字符集靜態重碼Schema])) as {
      [K in (typeof 字符集鍵名)[number]]: typeof 某字符集靜態重碼Schema
    }
  )
  .passthrough()

/** 動態選重結果（全碼 / 簡碼兩個比率） */
const 動態選重結果Schema = z.object({
  全碼: z.number(),
  簡碼: z.number(),
})

const 字頻來源 = ['知乎簡體', '北語簡體', '臺標繁體', '古籍繁體', '繁簡聯合'] as const

/**
 * 「至少有一個有效字段」的精煉器：避免 `{}` 空對象被當成有效結果寫進 atom。
 * 容忍用户只算了部分字頻 / 部分當量類型的存檔。
 */
const 至少一個有效字段 = <T extends object>(obj: T) => Object.values(obj).some(v => v !== undefined)

/** 動態選重分析：5 個字頻來源 × (重排 + 原序)，全部可選，但至少要有 1 項 */
export const 動態選重分析Schema = z
  .object(
    Object.fromEntries(
      字頻來源.flatMap(源 => [
        [`${源}動態選重率`, 動態選重結果Schema.optional()],
        [`${源}動態選重率原序`, 動態選重結果Schema.optional()],
      ])
    )
  )
  .passthrough()
  .refine(至少一個有效字段, '動態選重分析没有任何有效結果')

/** 速度當量分析：5 字頻 × 4 當量類型，全部可選 number，至少 1 項 */
const 速度當量字段 = Object.fromEntries(
  字頻來源.flatMap(源 =>
    ['全碼', '一級簡碼', '二級簡碼', '全部簡碼'].map(類型 => [
      `${源}字頻${類型}速度當量`,
      z.number().optional(),
    ])
  )
) as Record<string, z.ZodOptional<z.ZodNumber>>

export const 速度當量分析Schema = z
  .object({
    ...速度當量字段,
    scWordEquiv: z.number().optional(),
    scWordFirstShortEquiv: z.number().optional(),
    scWordSecondShortEquiv: z.number().optional(),
    scWordShortEquiv: z.number().optional(),
  })
  .passthrough()
  .refine(至少一個有效字段, '速度當量分析没有任何有效結果')

/** 單一字頻的簡碼效率結果 */
const 單個字頻簡碼效率Schema = z.object({
  完整字符字符串: z.string(),
  N值結果: z.array(
    z.object({
      最有效率的簡碼個數: z.number(),
      字頻加權碼長: z.number(),
    })
  ),
})

/** 簡碼效率分析：5 個字頻結果（可選），至少 1 項 */
export const 簡碼效率分析Schema = z
  .object(
    Object.fromEntries(
      字頻來源.map(源 => [`${源}字頻下之簡碼效率`, 單個字頻簡碼效率Schema.optional()])
    )
  )
  .passthrough()
  .refine(至少一個有效字段, '簡碼效率分析没有任何有效結果')

/** 鍵位熱力分析：全碼 / 簡碼各一張 Record<string, number>，至少 1 項 */
export const 鍵位熱力分析Schema = z
  .object({
    全碼: z.record(z.string(), z.number()).optional(),
    簡碼: z.record(z.string(), z.number()).optional(),
  })
  .passthrough()
  .refine(至少一個有效字段, '鍵位熱力分析没有任何有效結果')

/**
 * 測評結果的 5 類核心 Schema 對照表。
 * key 同時是 方案測評結果介面 的字段名、以及提示語顯示的名稱。
 */
export const 測評結果Schemas = {
  靜態重碼分析: 靜態重碼分析Schema,
  動態選重分析: 動態選重分析Schema,
  速度當量分析: 速度當量分析Schema,
  簡碼效率分析: 簡碼效率分析Schema,
  鍵位熱力: 鍵位熱力分析Schema,
} as const

export type 測評結果鍵 = keyof typeof 測評結果Schemas

// ============================================================
// 解析入口與錯誤格式化
// ============================================================

/** 把 zod issue 的路徑 + 訊息轉成一行人類可讀的字串 */
function 格式化issue(issue: { path: PropertyKey[]; message: string }): string {
  const 路徑 = issue.path.map(p => String(p)).join('.')
  return 路徑 ? `「${路徑}」${issue.message}` : issue.message
}

/** 把 ZodError 轉成中文多行提示（最多列 6 條，避免刷屏） */
export function 格式化校驗錯誤(error: z.ZodError): string {
  const 全部 = error.issues.map(格式化issue)
  const 顯示 = 全部.slice(0, 6)
  const 尾巴 = 全部.length > 6 ? `（還有 ${全部.length - 6} 處錯誤）` : ''
  return `${顯示.join('；')}${尾巴}`
}

export interface 導入校驗成功結果 {
  成功: true
  方案: z.infer<typeof 方案配置Schema>
  /** 通過校驗、可安全寫入 atom 的測評結果（只含 5 類核心結果） */
  測評結果: Partial<Record<測評結果鍵, unknown>>
  /** 存在但校驗未通過、被跳過的結果名稱 */
  跳過的結果: string[]
  /** 測評結果之外的未知字段（如候選個數分析、連續文本當量），原樣保留 */
  未知結果字段: Record<string, unknown>
}

export interface 導入校驗失敗結果 {
  成功: false
  錯誤: string
}

export type 導入校驗結果 = 導入校驗成功結果 | 導入校驗失敗結果

/**
 * 校驗一份已 JSON.parse 的導入數據。
 *
 * @param 原始數據 JSON.parse 後的任意值
 */
export function 校驗導入數據(原始數據: unknown): 導入校驗結果 {
  // 1. 先校驗方案配置骨架
  const 配置結果 = 方案配置Schema.safeParse(原始數據)
  if (!配置結果.success) {
    return { 成功: false, 錯誤: 格式化校驗錯誤(配置結果.error) }
  }

  // 2. 逐類校驗測評結果：損壞的類别跳過，不連累整份導入
  const 原始對象 = 原始數據 as Record<string, unknown>
  const 原始測評結果 =
    原始對象.測評結果 && typeof 原始對象.測評結果 === 'object'
      ? (原始對象.測評結果 as Record<string, unknown>)
      : {}

  const 測評結果: Partial<Record<測評結果鍵, unknown>> = {}
  const 跳過的結果: string[] = []
  const 已知鍵 = new Set<string>(Object.keys(測評結果Schemas))

  for (const [鍵, schema] of Object.entries(測評結果Schemas)) {
    const 值 = 原始測評結果[鍵]
    if (值 === undefined) continue
    const 結果 = schema.safeParse(值)
    if (結果.success) {
      測評結果[鍵 as 測評結果鍵] = 結果.data
    } else {
      跳過的結果.push(鍵)
    }
  }

  // 3. 保留未知結果字段（候選個數分析 / 連續文本當量 等），原樣透傳
  const 未知結果字段: Record<string, unknown> = {}
  for (const [鍵, 值] of Object.entries(原始測評結果)) {
    if (!已知鍵.has(鍵)) 未知結果字段[鍵] = 值
  }

  return {
    成功: true,
    方案: 配置結果.data,
    測評結果,
    跳過的結果,
    未知結果字段,
  }
}

/**
 * 從 JSON 文本解析並校驗導入數據。
 * 把 JSON 語法錯誤也統一成用户可讀的中文提示。
 */
export function 解析導入JSON(json文本: string): 導入校驗結果 {
  let 原始數據: unknown
  try {
    原始數據 = JSON.parse(json文本)
  } catch (錯誤) {
    const 訊息 = 錯誤 instanceof Error ? 錯誤.message : String(錯誤)
    return { 成功: false, 錯誤: `JSON 格式錯誤：${訊息}` }
  }
  return 校驗導入數據(原始數據)
}
