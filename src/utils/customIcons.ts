/** 用户上传 / 在线下载的自定义图标 */

export interface CustomIcon {
  id: string
  name: string
  /** data URL 或 http(s) */
  src: string
  source: 'upload' | 'download' | 'url'
  createdAt: string
}

const KEY = 'tas_custom_icons'

export function loadCustomIcons(): CustomIcon[] {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as CustomIcon[]) : []
  } catch {
    return []
  }
}

export function saveCustomIcons(list: CustomIcon[]) {
  localStorage.setItem(KEY, JSON.stringify(list))
}

export function addCustomIcon(icon: Omit<CustomIcon, 'id' | 'createdAt'>): CustomIcon {
  const item: CustomIcon = {
    ...icon,
    id: `icon_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    createdAt: new Date().toISOString(),
  }
  const list = [...loadCustomIcons(), item]
  saveCustomIcons(list)
  return item
}

export function removeCustomIcon(id: string) {
  saveCustomIcons(loadCustomIcons().filter((i) => i.id !== id))
}

export function findCustomIcon(idOrName: string): CustomIcon | undefined {
  return loadCustomIcons().find((i) => i.id === idOrName || i.name === idOrName)
}

export type IconSourceId = 'lucide' | 'tabler' | 'heroicons' | 'bootstrap' | 'iconify'

export const ICON_SOURCES: { id: IconSourceId; label: string; template: string }[] = [
  {
    id: 'lucide',
    label: 'Lucide CDN',
    template: 'https://cdn.jsdelivr.net/npm/lucide-static@0.468.0/icons/{n}.svg',
  },
  {
    id: 'tabler',
    label: 'Tabler Icons',
    template: 'https://cdn.jsdelivr.net/npm/@tabler/icons@3.12.0/icons/outline/{n}.svg',
  },
  {
    id: 'heroicons',
    label: 'Heroicons',
    template: 'https://cdn.jsdelivr.net/npm/heroicons@2.1.1/24/outline/{n}.svg',
  },
  {
    id: 'bootstrap',
    label: 'Bootstrap Icons',
    template: 'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/icons/{n}.svg',
  },
  {
    id: 'iconify',
    label: 'Iconify (mdi:home)',
    template: 'https://api.iconify.design/{n}.svg',
  },
]

function toKebab(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase()
}

/** 从指定图标源下载 SVG */
export async function downloadIconFromSource(
  sourceId: IconSourceId,
  name: string,
): Promise<string> {
  const source = ICON_SOURCES.find((s) => s.id === sourceId) || ICON_SOURCES[0]
  let slug = toKebab(name)
  if (sourceId === 'iconify' && !name.includes(':')) {
    slug = `lucide:${slug}`
  }
  const url = source.template.replace('{n}', slug)
  return fetchIconAsDataUrl(url)
}

/** 从 Lucide 静态 CDN 下载 SVG（兼容旧调用） */
export async function downloadLucideIcon(name: string): Promise<string> {
  return downloadIconFromSource('lucide', name)
}

/** 任意在线图片/SVG URL → data URL（尽量本地化，避免跨域丢失） */
export async function fetchIconAsDataUrl(url: string): Promise<string> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`下载失败 HTTP ${res.status}`)
  const ct = res.headers.get('content-type') || ''
  if (ct.includes('svg') || url.endsWith('.svg')) {
    const svg = await res.text()
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
  }
  const blob = await res.blob()
  return await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('读取失败'))
    reader.readAsDataURL(blob)
  })
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (file.size > 1.5 * 1024 * 1024) {
      reject(new Error('图标文件请小于 1.5MB'))
      return
    }
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('读取失败'))
    reader.readAsDataURL(file)
  })
}
