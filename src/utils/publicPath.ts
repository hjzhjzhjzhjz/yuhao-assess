/**
 * 公開目錄（public/）資源路徑前綴
 *
 * 開發時 Vite 的 BASE_URL 為 '/'；部署到 GitHub Pages 子路徑時為 '/yuhao-assess/'。
 * 所有 public/ 下的資源必須經由此函數拼接，不能以 '/' 開頭寫死。
 */
export function 公開路徑(路徑: string): string {
  const 前綴 = import.meta.env.BASE_URL
  return 前綴 + 路徑.replace(/^\//, '')
}
