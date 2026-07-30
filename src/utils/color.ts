/** 解析 #RGB / #RRGGBB / rgb() / rgba() 为通道 */
export function parseColor(input: string): { r: number; g: number; b: number; a: number } | null {
  if (!input) return null
  const s = input.trim()

  const hex = s.match(/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i)
  if (hex) {
    let h = hex[1]
    if (h.length === 3) h = h.split('').map((c) => c + c).join('')
    const r = parseInt(h.slice(0, 2), 16)
    const g = parseInt(h.slice(2, 4), 16)
    const b = parseInt(h.slice(4, 6), 16)
    const a = h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1
    return { r, g, b, a }
  }

  const rgb = s.match(
    /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$/i,
  )
  if (rgb) {
    return {
      r: Number(rgb[1]),
      g: Number(rgb[2]),
      b: Number(rgb[3]),
      a: rgb[4] != null ? Number(rgb[4]) : 1,
    }
  }

  return null
}

/** 取纯色 hex（去掉 alpha） */
export function toHex(input: string, fallback = '#ffffff'): string {
  const c = parseColor(input)
  if (!c) return fallback
  const h = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0')
  return `#${h(c.r)}${h(c.g)}${h(c.b)}`
}

/** 颜色 + 透明度 → rgba 字符串 */
export function withOpacity(color: string, opacity: number | string, fallback = '#ffffff'): string {
  const c = parseColor(color) || parseColor(fallback)!
  const a = Math.max(0, Math.min(1, Number(opacity)))
  return `rgba(${Math.round(c.r)}, ${Math.round(c.g)}, ${Math.round(c.b)}, ${a})`
}

/** 从已有颜色读出透明度，读不到则返回 defaultA */
export function readOpacity(color: string | undefined, defaultA = 1): number {
  if (!color) return defaultA
  const c = parseColor(color)
  return c ? Math.round(c.a * 100) / 100 : defaultA
}
