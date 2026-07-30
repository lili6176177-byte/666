import type { GlobalThemeTokens, ThemePackage } from '@/types'

export const DEFAULT_GLOBAL: GlobalThemeTokens = {
  primary: '#4f46e5',
  primaryHover: '#4338ca',
  secondary: '#0ea5e9',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#6366f1',
  bgPage: '#f1f5f9',
  bgCard: '#ffffff',
  bgSidebar: '#0f172a',
  bgHeader: '#ffffff',
  bgPageOpacity: 1,
  bgCardOpacity: 1,
  bgSidebarOpacity: 1,
  bgHeaderOpacity: 1,
  bgPageImage: '',
  bgCardImage: '',
  bgSidebarImage: '',
  bgHeaderImage: '',
  bgPageImageOpacity: 1,
  bgCardImageOpacity: 1,
  bgSidebarImageOpacity: 1,
  bgHeaderImageOpacity: 1,
  textPrimary: '#0f172a',
  textSecondary: '#475569',
  textMuted: '#94a3b8',
  border: '#e2e8f0',
  shadow: '0 4px 12px rgba(15,23,42,0.08)',
  radius: 12,
  fontFamily: '"Inter", "PingFang SC", "Microsoft YaHei", sans-serif',
}

function withDefaults(partial: Partial<GlobalThemeTokens>): GlobalThemeTokens {
  return { ...DEFAULT_GLOBAL, ...partial }
}

function pack(
  id: string,
  name: string,
  description: string,
  global: GlobalThemeTokens,
  elements: ThemePackage['elements'] = {},
): ThemePackage {
  const now = new Date().toISOString()
  return {
    id,
    name,
    description,
    createdAt: now,
    updatedAt: now,
    global,
    elements,
    previewColors: [global.primary, global.bgSidebar, global.bgPage, global.success],
  }
}

/** 内置主题预设 */
export const BUILTIN_THEMES: ThemePackage[] = [
  pack('default', '默认靛蓝', '清爽商务默认主题', DEFAULT_GLOBAL),

  pack(
    'ocean',
    '深海青蓝',
    '冷静专业的海洋配色',
    withDefaults({
      primary: '#0891b2',
      primaryHover: '#0e7490',
      secondary: '#06b6d4',
      bgPage: '#ecfeff',
      bgCard: '#ffffff',
      bgSidebar: '#083344',
      bgHeader: '#f0fdfa',
      textPrimary: '#164e63',
      textSecondary: '#0e7490',
      border: '#a5f3fc',
      shadow: '0 4px 16px rgba(8,145,178,0.12)',
    }),
  ),

  pack(
    'sunset',
    '落日橙红',
    '热情活力的暖色主题',
    withDefaults({
      primary: '#ea580c',
      primaryHover: '#c2410c',
      secondary: '#f97316',
      success: '#84cc16',
      bgPage: '#fff7ed',
      bgCard: '#ffffff',
      bgSidebar: '#7c2d12',
      bgHeader: '#ffedd5',
      textPrimary: '#7c2d12',
      textSecondary: '#9a3412',
      border: '#fed7aa',
      shadow: '0 4px 16px rgba(234,88,12,0.14)',
    }),
  ),

  pack(
    'forest',
    '森林墨绿',
    '自然稳重的绿色主题',
    withDefaults({
      primary: '#059669',
      primaryHover: '#047857',
      secondary: '#34d399',
      bgPage: '#ecfdf5',
      bgCard: '#ffffff',
      bgSidebar: '#064e3b',
      bgHeader: '#d1fae5',
      textPrimary: '#064e3b',
      textSecondary: '#047857',
      border: '#a7f3d0',
      shadow: '0 4px 16px rgba(5,150,105,0.12)',
    }),
  ),

  pack(
    'midnight',
    '午夜暗黑',
    '护眼深色模式',
    withDefaults({
      primary: '#818cf8',
      primaryHover: '#a5b4fc',
      secondary: '#38bdf8',
      success: '#34d399',
      warning: '#fbbf24',
      danger: '#f87171',
      bgPage: '#0b1120',
      bgCard: '#1e293b',
      bgSidebar: '#020617',
      bgHeader: '#0f172a',
      textPrimary: '#f1f5f9',
      textSecondary: '#cbd5e1',
      textMuted: '#64748b',
      border: '#334155',
      shadow: '0 4px 20px rgba(0,0,0,0.4)',
      radius: 10,
    }),
  ),

  pack(
    'rose',
    '玫瑰粉紫',
    '柔和时尚的粉色主题',
    withDefaults({
      primary: '#db2777',
      primaryHover: '#be185d',
      secondary: '#ec4899',
      bgPage: '#fdf2f8',
      bgCard: '#ffffff',
      bgSidebar: '#831843',
      bgHeader: '#fce7f3',
      textPrimary: '#831843',
      textSecondary: '#9d174d',
      border: '#fbcfe8',
      shadow: '0 4px 16px rgba(219,39,119,0.12)',
    }),
  ),
]
