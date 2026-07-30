/** 按键特效 */
export type ButtonEffect =
  | ''
  | 'ripple'
  | 'bounce'
  | 'scale'
  | 'shine'
  | 'press'
  | 'glow'
  | 'float'
  | 'jelly'
  | 'flash'

/** 边框模式 */
export type BorderStyleMode = 'solid' | 'dashed' | 'dotted' | 'double' | 'none'

/** 边框动画 */
export type BorderAnimation = '' | 'pulse' | 'glow' | 'blink' | 'dash' | 'flow'

/** 背景/图片填充模式 */
export type ImageFitMode = 'cover' | 'contain' | 'fill' | 'none' | 'scale-down'

/** 背景填充类型 */
export type BackgroundFillMode = 'solid' | 'linear' | 'radial'

/** 元素级主题样式 */
export interface ElementThemeStyle {
  /** 背景色（纯色 hex 推荐） */
  backgroundColor?: string
  /** 背景第二色（渐变终点） */
  backgroundColor2?: string
  /** 背景填充：纯色 / 线性渐变 / 径向渐变 */
  backgroundFill?: BackgroundFillMode
  /** 线性渐变角度 0–360 */
  backgroundGradientAngle?: number
  /** 渐变起点位置 0–100（%） */
  backgroundGradientStart?: number
  /** 渐变终点位置 0–100（%） */
  backgroundGradientEnd?: number
  /** 背景透明度 0–1 */
  backgroundOpacity?: number
  /** 背景图片（data URL 或远程 URL） */
  backgroundImage?: string
  /** 背景图片透明度 0–1 */
  backgroundImageOpacity?: number
  /** 背景图填充模式 */
  backgroundImageFit?: ImageFitMode
  /** 文字颜色 */
  color?: string
  /** 边框颜色 */
  borderColor?: string
  /** 边框粗细 px */
  borderWidth?: number
  /** 边框模式 */
  borderStyle?: BorderStyleMode
  /** 边框动画 */
  borderAnimation?: BorderAnimation
  /** 边框动画速度（周期 ms） */
  borderAnimationSpeed?: number
  /** 边框圆角 px */
  borderRadius?: number
  /** 阴影强度 0–5（映射预设） */
  shadowLevel?: number
  /** 自定义阴影（兼容旧数据） */
  boxShadow?: string
  /** 阴影颜色 */
  shadowColor?: string
  /** 阴影透明度 0–1 */
  shadowOpacity?: number
  /** 阴影 X 偏移 px */
  shadowX?: number
  /** 阴影 Y 偏移 px */
  shadowY?: number
  /** 阴影模糊 px */
  shadowBlur?: number
  /** 阴影扩散 px */
  shadowSpread?: number
  /** 字体大小 px */
  fontSize?: number
  /** 字体粗细 400–800 */
  fontWeight?: number
  /** 内边距 px（统一） */
  padding?: number
  /** 入场动画名称 */
  animation?: string
  /** 动画时长 ms */
  animationDuration?: number
  /** 按键特效 */
  buttonEffect?: ButtonEffect
  /** 自定义文案（覆盖默认） */
  text?: string
  /** 内置图标名称（lucide） */
  icon?: string
  /** 自定义图标 data URL / 在线 URL / custom:id */
  iconUrl?: string
  /** 图标尺寸 px */
  iconSize?: number
  /** 图片 URL（data URL 或远程） */
  image?: string
  /** 图片透明度 0–1 */
  imageOpacity?: number
  /** 内容图片填充模式 */
  imageFit?: ImageFitMode
  /** 整体不透明度 0–1 */
  opacity?: number
  /** 额外 CSS */
  customCss?: string
}

/** 边框模式选项 */
export const BORDER_STYLE_OPTIONS: { value: BorderStyleMode; label: string }[] = [
  { value: 'solid', label: '实线' },
  { value: 'dashed', label: '虚线' },
  { value: 'dotted', label: '点线' },
  { value: 'double', label: '双线' },
  { value: 'none', label: '无' },
]

/** 边框动画选项 */
export const BORDER_ANIMATION_OPTIONS: { value: BorderAnimation; label: string }[] = [
  { value: '', label: '无' },
  { value: 'pulse', label: '呼吸' },
  { value: 'glow', label: '发光' },
  { value: 'blink', label: '闪烁' },
  { value: 'dash', label: '虚线流动' },
  { value: 'flow', label: '流光' },
]

/** 填充模式选项 */
export const IMAGE_FIT_OPTIONS: { value: ImageFitMode; label: string }[] = [
  { value: 'cover', label: '覆盖' },
  { value: 'contain', label: '包含' },
  { value: 'fill', label: '拉伸' },
  { value: 'none', label: '原尺寸' },
  { value: 'scale-down', label: '缩小' },
]

/** 背景填充选项 */
export const BACKGROUND_FILL_OPTIONS: { value: BackgroundFillMode; label: string }[] = [
  { value: 'solid', label: '纯色' },
  { value: 'linear', label: '线性渐变' },
  { value: 'radial', label: '径向渐变' },
]

/** 全局主题 tokens */
export interface GlobalThemeTokens {
  primary: string
  primaryHover: string
  secondary: string
  success: string
  warning: string
  danger: string
  info: string
  bgPage: string
  bgCard: string
  bgSidebar: string
  bgHeader: string
  /** 各位置背景透明度 0–1 */
  bgPageOpacity: number
  bgCardOpacity: number
  bgSidebarOpacity: number
  bgHeaderOpacity: number
  /** 各位置背景图片（data URL 或远程 URL，空字符串表示无） */
  bgPageImage: string
  bgCardImage: string
  bgSidebarImage: string
  bgHeaderImage: string
  /** 各位置背景图片透明度 0–1 */
  bgPageImageOpacity: number
  bgCardImageOpacity: number
  bgSidebarImageOpacity: number
  bgHeaderImageOpacity: number
  textPrimary: string
  textSecondary: string
  textMuted: string
  border: string
  shadow: string
  radius: number
  fontFamily: string
}

/** 完整主题包 */
export interface ThemePackage {
  id: string
  name: string
  description?: string
  createdAt: string
  updatedAt: string
  global: GlobalThemeTokens
  elements: Record<string, ElementThemeStyle>
  previewColors: string[]
}

/** 权限码 */
export type Permission =
  | 'dashboard'
  | 'settings'
  | 'pos'
  | 'kitchen'
  | 'warehouse'
  | 'finance'
  | 'theme_edit'
  | 'theme_manage'
  | 'user_manage'

export interface UserInfo {
  id: string
  username: string
  displayName: string
  role: string
  avatar?: string
  permissions: Permission[]
}

export interface LoginForm {
  username: string
  password: string
}

/** 入场动画预设 */
export const ANIMATION_PRESETS = [
  { value: '', label: '无动画' },
  { value: 'theme-fade-in', label: '淡入' },
  { value: 'theme-slide-up', label: '上滑' },
  { value: 'theme-slide-down', label: '下滑' },
  { value: 'theme-scale-in', label: '缩放' },
  { value: 'theme-bounce', label: '弹跳' },
  { value: 'theme-pulse', label: '脉冲' },
  { value: 'theme-shake', label: '抖动' },
  { value: 'theme-glow', label: '发光' },
] as const

/** 按键特效预设 */
export const BUTTON_EFFECT_PRESETS: { value: ButtonEffect; label: string; desc: string }[] = [
  { value: '', label: '无特效', desc: '默认' },
  { value: 'ripple', label: '水波涟漪', desc: '点击扩散波纹' },
  { value: 'bounce', label: '点击弹跳', desc: '按下回弹' },
  { value: 'scale', label: '缩放按压', desc: '缩小再回弹' },
  { value: 'shine', label: '流光扫过', desc: '高光掠过' },
  { value: 'press', label: '下沉按压', desc: '立体下沉' },
  { value: 'glow', label: '发光脉冲', desc: '外发光闪烁' },
  { value: 'float', label: '悬浮抬起', desc: '悬停上浮' },
  { value: 'jelly', label: '果冻抖动', desc: '弹性形变' },
  { value: 'flash', label: '闪白反馈', desc: '点击闪白' },
]

/** 阴影强度 → CSS */
export const SHADOW_LEVELS = [
  { level: 0, value: 'none', label: '无' },
  { level: 1, value: '0 1px 2px rgba(0,0,0,0.06)', label: '极轻' },
  { level: 2, value: '0 4px 12px rgba(0,0,0,0.08)', label: '轻' },
  { level: 3, value: '0 8px 24px rgba(0,0,0,0.12)', label: '中' },
  { level: 4, value: '0 12px 40px rgba(0,0,0,0.16)', label: '重' },
  { level: 5, value: '0 0 20px rgba(99,102,241,0.35)', label: '光晕' },
] as const

/** 兼容旧 SHADOW_PRESETS */
export const SHADOW_PRESETS = SHADOW_LEVELS.map((s) => ({
  value: s.value,
  label: s.label,
}))

/** 图标选项（lucide 名称） */
export const ICON_OPTIONS = [
  'Home', 'Settings', 'ShoppingCart', 'ChefHat', 'Warehouse', 'Wallet',
  'Users', 'Package', 'BarChart3', 'FileText', 'Bell', 'Search',
  'Plus', 'Trash2', 'Edit', 'Save', 'Download', 'Upload', 'RefreshCw',
  'Check', 'X', 'Star', 'Heart', 'Zap', 'Shield', 'Lock', 'Unlock',
  'CreditCard', 'Receipt', 'ClipboardList', 'Boxes', 'Truck', 'Store',
  'Palette', 'Paintbrush', 'Image', 'Type', 'Layers', 'Layout',
] as const
