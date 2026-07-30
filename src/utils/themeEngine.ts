import type { ElementThemeStyle, GlobalThemeTokens, ThemePackage } from '@/types'
import { SHADOW_LEVELS } from '@/types'
import { toHex, withOpacity, parseColor } from '@/utils/color'

const COLOR_KEYS = [
  'primary',
  'primaryHover',
  'secondary',
  'success',
  'warning',
  'danger',
  'info',
  'textPrimary',
  'textSecondary',
  'textMuted',
  'border',
] as const

const BG_MAP = [
  {
    color: 'bgPage',
    opacity: 'bgPageOpacity',
    image: 'bgPageImage',
    imageOpacity: 'bgPageImageOpacity',
    css: '--theme-bg-page',
  },
  {
    color: 'bgCard',
    opacity: 'bgCardOpacity',
    image: 'bgCardImage',
    imageOpacity: 'bgCardImageOpacity',
    css: '--theme-bg-card',
  },
  {
    color: 'bgSidebar',
    opacity: 'bgSidebarOpacity',
    image: 'bgSidebarImage',
    imageOpacity: 'bgSidebarImageOpacity',
    css: '--theme-bg-sidebar',
  },
  {
    color: 'bgHeader',
    opacity: 'bgHeaderOpacity',
    image: 'bgHeaderImage',
    imageOpacity: 'bgHeaderImageOpacity',
    css: '--theme-bg-header',
  },
] as const

/**
 * 颜色/透明度 + 可选图片/图片透明度 → 可用于 background 简写的 CSS 值
 * 图片透明度通过「同色半透明遮罩叠在图上」实现（纯 CSS 无法单独给 background-image 设 opacity）
 */
export function buildBackgroundValue(
  color: string,
  opacity: number,
  image?: string,
  imageOpacity = 1,
  fit: string = 'cover',
): string {
  const solid = withOpacity(color, opacity, color)
  const src = (image || '').trim()
  if (!src) return solid

  const safe = src.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
  const size = fit || 'cover'
  const imgLayer = `url("${safe}") center / ${size} no-repeat`
  const imgOp = Math.max(0, Math.min(1, Number(imageOpacity)))

  if (!Number.isFinite(imgOp) || imgOp <= 0) return solid
  if (imgOp >= 1) return `${imgLayer}, ${solid}`

  // 用背景色做遮罩：alpha = 1 - 图片透明度，叠在图上实现淡出
  const fade = withOpacity(color, 1 - imgOp, color)
  return `linear-gradient(${fade}, ${fade}), ${imgLayer}, ${solid}`
}

const SIMPLE_VAR_MAP: Partial<Record<keyof GlobalThemeTokens, string>> = {
  primary: '--theme-primary',
  primaryHover: '--theme-primary-hover',
  secondary: '--theme-secondary',
  success: '--theme-success',
  warning: '--theme-warning',
  danger: '--theme-danger',
  info: '--theme-info',
  textPrimary: '--theme-text-primary',
  textSecondary: '--theme-text-secondary',
  textMuted: '--theme-text-muted',
  border: '--theme-border',
  shadow: '--theme-shadow',
  fontFamily: '--theme-font',
}

/** 规范化全局 tokens（兼容旧主题缺字段） */
export function normalizeGlobal(raw: Partial<GlobalThemeTokens> | undefined): GlobalThemeTokens {
  const g = raw || {}
  return {
    primary: g.primary || '#4f46e5',
    primaryHover: g.primaryHover || '#4338ca',
    secondary: g.secondary || '#0ea5e9',
    success: g.success || '#10b981',
    warning: g.warning || '#f59e0b',
    danger: g.danger || '#ef4444',
    info: g.info || '#6366f1',
    bgPage: toHex(g.bgPage || '#f1f5f9'),
    bgCard: toHex(g.bgCard || '#ffffff'),
    bgSidebar: toHex(g.bgSidebar || '#0f172a'),
    bgHeader: toHex(g.bgHeader || '#ffffff'),
    bgPageOpacity: g.bgPageOpacity ?? 1,
    bgCardOpacity: g.bgCardOpacity ?? 1,
    bgSidebarOpacity: g.bgSidebarOpacity ?? 1,
    bgHeaderOpacity: g.bgHeaderOpacity ?? 1,
    bgPageImage: g.bgPageImage || '',
    bgCardImage: g.bgCardImage || '',
    bgSidebarImage: g.bgSidebarImage || '',
    bgHeaderImage: g.bgHeaderImage || '',
    bgPageImageOpacity: g.bgPageImageOpacity ?? 1,
    bgCardImageOpacity: g.bgCardImageOpacity ?? 1,
    bgSidebarImageOpacity: g.bgSidebarImageOpacity ?? 1,
    bgHeaderImageOpacity: g.bgHeaderImageOpacity ?? 1,
    textPrimary: g.textPrimary || '#0f172a',
    textSecondary: g.textSecondary || '#475569',
    textMuted: g.textMuted || '#94a3b8',
    border: g.border || '#e2e8f0',
    shadow: g.shadow || '0 4px 12px rgba(15,23,42,0.08)',
    radius: typeof g.radius === 'number' ? g.radius : parseInt(String(g.radius || '12'), 10) || 12,
    fontFamily: g.fontFamily || '"Inter", "PingFang SC", "Microsoft YaHei", sans-serif',
  }
}

/** 将全局 tokens 写入 document CSS 变量 */
export function applyGlobalTokens(tokens: GlobalThemeTokens) {
  const g = normalizeGlobal(tokens)
  const root = document.documentElement

  for (const key of COLOR_KEYS) {
    const cssVar = SIMPLE_VAR_MAP[key]
    if (cssVar) root.style.setProperty(cssVar, g[key] as string)
  }

  for (const item of BG_MAP) {
    const color = g[item.color] as string
    const op = g[item.opacity] as number
    const image = g[item.image] as string
    const imgOp = g[item.imageOpacity] as number
    root.style.setProperty(item.css, buildBackgroundValue(color, op, image, imgOp))
    root.style.setProperty(`${item.css}-solid`, toHex(color))
    root.style.setProperty(`${item.css}-opacity`, String(op))
    root.style.setProperty(`${item.css}-image`, image ? `url("${image.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}")` : 'none')
    root.style.setProperty(`${item.css}-image-opacity`, String(imgOp))
  }

  root.style.setProperty('--theme-shadow', g.shadow)
  root.style.setProperty('--theme-radius', `${g.radius}px`)
  root.style.setProperty('--theme-font', g.fontFamily)
}

function shadowFromStyle(style: ElementThemeStyle): string | undefined {
  // 自定义阴影参数优先
  if (
    style.shadowColor != null ||
    style.shadowX != null ||
    style.shadowY != null ||
    style.shadowBlur != null ||
    style.shadowSpread != null
  ) {
    const c = parseColor(style.shadowColor || '#000000') || { r: 0, g: 0, b: 0 }
    const op = Math.max(0, Math.min(1, style.shadowOpacity ?? 0.15))
    const x = Number(style.shadowX ?? 0)
    const y = Number(style.shadowY ?? 4)
    const blur = Number(style.shadowBlur ?? 12)
    const spread = Number(style.shadowSpread ?? 0)
    return `${x}px ${y}px ${blur}px ${spread}px rgba(${Math.round(c.r)},${Math.round(c.g)},${Math.round(c.b)},${op})`
  }
  if (style.shadowLevel != null) {
    const found = SHADOW_LEVELS.find((s) => s.level === style.shadowLevel)
    return found?.value
  }
  return style.boxShadow
}

function asNum(v: unknown): number | undefined {
  if (v == null || v === '') return undefined
  if (typeof v === 'number' && Number.isFinite(v)) return v
  const n = parseFloat(String(v))
  return Number.isFinite(n) ? n : undefined
}

/** 构建纯色或渐变背景层 */
function buildFillLayer(style: ElementThemeStyle): string | undefined {
  const op = style.backgroundOpacity ?? 1
  const c1 = style.backgroundColor || '#ffffff'
  const fill = style.backgroundFill || 'solid'
  const solid = withOpacity(c1, op, c1)

  if (fill === 'solid' || !style.backgroundColor2) {
    return style.backgroundColor ? solid : undefined
  }

  const c2 = withOpacity(style.backgroundColor2, op, style.backgroundColor2)
  const start = Math.max(0, Math.min(100, style.backgroundGradientStart ?? 0))
  const end = Math.max(0, Math.min(100, style.backgroundGradientEnd ?? 100))
  if (fill === 'radial') {
    return `radial-gradient(circle, ${solid} ${start}%, ${c2} ${end}%)`
  }
  const angle = style.backgroundGradientAngle ?? 135
  return `linear-gradient(${angle}deg, ${solid} ${start}%, ${c2} ${end}%)`
}

/** 将元素样式对象转为 CSS 属性（兼容旧字符串字段） */
export function styleToCss(style: ElementThemeStyle): Record<string, string> {
  const css: Record<string, string> = {}

  const bgImage = (style.backgroundImage || '').trim()
  const fillLayer = buildFillLayer(style)
  const imgOp = style.backgroundImageOpacity ?? 1
  const fit = style.backgroundImageFit || 'cover'

  if (bgImage) {
    // 有背景图时：图 + 渐变/纯色底
    const color = style.backgroundColor || '#ffffff'
    const op = style.backgroundOpacity ?? 1
    if (fillLayer && (style.backgroundFill === 'linear' || style.backgroundFill === 'radial')) {
      const safe = bgImage.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
      const imgLayer = `url("${safe}") center / ${fit} no-repeat`
      if (imgOp >= 1) {
        css.background = `${imgLayer}, ${fillLayer}`
      } else if (imgOp <= 0) {
        css.background = fillLayer
      } else {
        const fade = withOpacity(color, 1 - imgOp, color)
        css.background = `linear-gradient(${fade}, ${fade}), ${imgLayer}, ${fillLayer}`
      }
    } else {
      css.background = buildBackgroundValue(
        color,
        style.backgroundColor ? op : 0,
        bgImage,
        imgOp,
        fit,
      )
    }
  } else if (fillLayer) {
    if (style.backgroundFill === 'linear' || style.backgroundFill === 'radial') {
      css.background = fillLayer
    } else {
      css.backgroundColor = fillLayer
    }
  }

  if (style.color) css.color = style.color

  if (style.borderColor || style.borderWidth != null || style.borderStyle) {
    css.borderColor = style.borderColor || 'transparent'
    css.borderStyle = style.borderStyle || 'solid'
    const bw = asNum(style.borderWidth)
    css.borderWidth = `${bw != null ? bw : 1}px`
    if (style.borderColor) {
      css['--theme-border-anim-color'] = style.borderColor
    }
  }

  // 边框动画速度（周期 ms），直接作用在元素自身 border/box-shadow 上
  const borderSpeed = asNum(style.borderAnimationSpeed) ?? 1600
  css['--theme-border-anim-speed'] = `${borderSpeed}ms`

  const radius = asNum(style.borderRadius)
  if (radius != null) css.borderRadius = `${radius}px`
  else if (typeof style.borderRadius === 'string' && style.borderRadius) {
    css.borderRadius = style.borderRadius
  }

  const shadow = shadowFromStyle(style)
  if (shadow) css.boxShadow = shadow

  const fontSize = asNum(style.fontSize)
  if (fontSize != null) css.fontSize = `${fontSize}px`
  else if (typeof style.fontSize === 'string' && style.fontSize) {
    css.fontSize = style.fontSize
  }

  const fontWeight = asNum(style.fontWeight)
  if (fontWeight != null) css.fontWeight = String(fontWeight)
  else if (typeof style.fontWeight === 'string' && style.fontWeight) {
    css.fontWeight = style.fontWeight
  }

  const padding = asNum(style.padding)
  if (padding != null) css.padding = `${padding}px`
  else if (typeof style.padding === 'string' && style.padding) {
    css.padding = style.padding
  }

  const opacity = asNum(style.opacity)
  if (opacity != null) css.opacity = String(opacity)

  // 入场动画 + 边框动画可同时存在（逗号拼接）
  const animParts: string[] = []
  const durParts: string[] = []
  const fillParts: string[] = []
  const iterParts: string[] = []

  if (style.animation) {
    const dur = asNum(style.animationDuration) ?? 600
    animParts.push(style.animation)
    durParts.push(`${dur}ms`)
    fillParts.push('both')
    iterParts.push('1')
  }
  if (style.borderAnimation) {
    animParts.push(`theme-border-${style.borderAnimation}`)
    durParts.push(`${borderSpeed}ms`)
    fillParts.push('none')
    iterParts.push('infinite')
  }
  if (animParts.length) {
    css.animationName = animParts.join(', ')
    css.animationDuration = durParts.join(', ')
    css.animationFillMode = fillParts.join(', ')
    css.animationIterationCount = iterParts.join(', ')
  }
  return css
}

/** 深度合并主题 */
export function mergeTheme(base: ThemePackage, patch: Partial<ThemePackage>): ThemePackage {
  return {
    ...base,
    ...patch,
    global: normalizeGlobal({ ...base.global, ...(patch.global || {}) }),
    elements: { ...base.elements, ...(patch.elements || {}) },
    updatedAt: new Date().toISOString(),
  }
}

export function exportThemeJson(theme: ThemePackage): string {
  return JSON.stringify(theme, null, 2)
}

export function importThemeJson(json: string): ThemePackage {
  const data = JSON.parse(json) as ThemePackage
  if (!data.id || !data.name || !data.global) {
    throw new Error('无效的主题文件')
  }
  return {
    ...data,
    global: normalizeGlobal(data.global),
    elements: data.elements || {},
    updatedAt: new Date().toISOString(),
  }
}

export function uid(prefix = 'id'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

const THEMES_KEY = 'tas_themes'
const ACTIVE_KEY = 'tas_active_theme'
const DRAFT_KEY = 'tas_draft_elements'

export function loadStoredThemes(): ThemePackage[] {
  try {
    const raw = localStorage.getItem(THEMES_KEY)
    if (!raw) return []
    const list = JSON.parse(raw) as ThemePackage[]
    return list.map((t) => ({ ...t, global: normalizeGlobal(t.global) }))
  } catch {
    return []
  }
}

export function saveStoredThemes(themes: ThemePackage[]) {
  localStorage.setItem(THEMES_KEY, JSON.stringify(themes))
}

export function loadActiveThemeId(): string | null {
  return localStorage.getItem(ACTIVE_KEY)
}

export function saveActiveThemeId(id: string) {
  localStorage.setItem(ACTIVE_KEY, id)
}

export function loadDraftElements(): Record<string, ElementThemeStyle> {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    return raw ? (JSON.parse(raw) as Record<string, ElementThemeStyle>) : {}
  } catch {
    return {}
  }
}

export function saveDraftElements(elements: Record<string, ElementThemeStyle>) {
  localStorage.setItem(DRAFT_KEY, JSON.stringify(elements))
}
