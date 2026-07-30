<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useThemeStore } from '@/stores/theme'
import {
  ANIMATION_PRESETS,
  BUTTON_EFFECT_PRESETS,
  BORDER_STYLE_OPTIONS,
  BORDER_ANIMATION_OPTIONS,
  IMAGE_FIT_OPTIONS,
  BACKGROUND_FILL_OPTIONS,
  ICON_OPTIONS,
  type ElementThemeStyle,
  type ButtonEffect,
  type GlobalThemeTokens,
  type BorderStyleMode,
  type BorderAnimation,
  type ImageFitMode,
  type BackgroundFillMode,
} from '@/types'
import { toHex } from '@/utils/color'
import {
  loadCustomIcons,
  addCustomIcon,
  removeCustomIcon,
  downloadIconFromSource,
  ICON_SOURCES,
  fetchIconAsDataUrl,
  fileToDataUrl,
  type CustomIcon,
  type IconSourceId,
} from '@/utils/customIcons'
import SliderField from '@/components/theme/SliderField.vue'
import {
  X,
  RotateCcw,
  Save,
  Type,
  Palette,
  Image as ImageIcon,
  Sparkles,
  Box,
  Download,
  Upload,
  Link,
  Trash2,
  MousePointerClick,
} from '@lucide/vue'

const theme = useThemeStore()
const saveName = ref('')
const saveDesc = ref('')
const showSaveDialog = ref(false)
const tab = ref<'style' | 'content' | 'global'>('style')
const toast = ref('')

const customIcons = ref<CustomIcon[]>(loadCustomIcons())
const iconUrlInput = ref('')
const iconNameInput = ref('')
const iconDownloading = ref(false)
const iconSource = ref<IconSourceId>('lucide')
const iconFileRef = ref<HTMLInputElement | null>(null)
const imageFileRef = ref<HTMLInputElement | null>(null)
const bgImageFileRef = ref<HTMLInputElement | null>(null)
const globalBgFileRefs = ref<Record<string, HTMLInputElement | null>>({})

const style = computed(() => theme.selectedStyle || ({} as ElementThemeStyle))

function patch(p: Partial<ElementThemeStyle>) {
  theme.updateSelectedStyle(p)
}

function num(v: number | string | undefined, fallback: number) {
  if (v == null || v === '') return fallback
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

function showToast(msg: string) {
  toast.value = msg
  setTimeout(() => {
    toast.value = ''
  }, 2200)
}

const MAX_BG_IMAGE_BYTES = 2 * 1024 * 1024

function readImageFile(
  file: File,
  onOk: (dataUrl: string) => void,
) {
  if (file.size > MAX_BG_IMAGE_BYTES) {
    showToast('图片请小于 2MB')
    return
  }
  if (!file.type.startsWith('image/')) {
    showToast('请选择图片文件')
    return
  }
  const reader = new FileReader()
  reader.onload = () => onOk(String(reader.result))
  reader.onerror = () => showToast('图片读取失败')
  reader.readAsDataURL(file)
}

function handleSaveAs() {
  if (!saveName.value.trim()) {
    showToast('请输入主题名称')
    return
  }
  theme.saveAsTheme(saveName.value.trim(), saveDesc.value.trim())
  showSaveDialog.value = false
  saveName.value = ''
  saveDesc.value = ''
  showToast('主题已保存，可在主题管理中一键替换')
}

function handleOverwrite() {
  if (theme.overwriteCurrentTheme()) {
    showToast('已覆盖保存当前主题')
  } else {
    showToast('内置主题不可覆盖，请「另存为」')
    showSaveDialog.value = true
  }
}

function handleReset() {
  if (theme.selectedId) {
    theme.resetElement(theme.selectedId)
    showToast('已重置该元素')
  }
}

/* ---------- 内容图片 ---------- */
function onImageFile(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  readImageFile(file, (dataUrl) => {
    patch({
      image: dataUrl,
      imageOpacity: style.value.imageOpacity ?? 1,
      imageFit: style.value.imageFit || 'cover',
    })
    showToast('图片已上传')
  })
  input.value = ''
}

/* ---------- 元素背景图 ---------- */
function onBgImageFile(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  readImageFile(file, (dataUrl) => {
    patch({
      backgroundImage: dataUrl,
      backgroundImageOpacity: style.value.backgroundImageOpacity ?? 1,
      backgroundImageFit: style.value.backgroundImageFit || 'cover',
      backgroundColor: style.value.backgroundColor || '#ffffff',
      backgroundOpacity: style.value.backgroundOpacity ?? 1,
    })
    showToast('背景图已上传')
  })
  input.value = ''
}

function clearBgImage() {
  patch({
    backgroundImage: '',
    backgroundImageOpacity: 1,
    backgroundImageFit: 'cover',
  })
  showToast('已清除背景图')
}

/* ---------- 全局各位置背景图 ---------- */
function onGlobalBgImageFile(e: Event, imageKey: keyof GlobalThemeTokens) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  readImageFile(file, (dataUrl) => {
    theme.updateGlobal({ [imageKey]: dataUrl } as Partial<GlobalThemeTokens>)
    showToast('背景图已上传')
  })
  input.value = ''
}

function clearGlobalBgImage(imageKey: keyof GlobalThemeTokens) {
  theme.updateGlobal({ [imageKey]: '' } as Partial<GlobalThemeTokens>)
  showToast('已清除背景图')
}

function globalImage(key: keyof GlobalThemeTokens): string {
  const v = theme.global[key]
  return typeof v === 'string' ? v : ''
}

function setGlobalBgFileRef(key: string, el: unknown) {
  globalBgFileRefs.value[key] = (el as HTMLInputElement | null) || null
}

/* ---------- 图标：上传 / 在线下载 ---------- */
function refreshCustomIcons() {
  customIcons.value = loadCustomIcons()
}

async function uploadIconFile(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  try {
    const src = await fileToDataUrl(file)
    const name = iconNameInput.value.trim() || file.name.replace(/\.[^.]+$/, '')
    const item = addCustomIcon({ name, src, source: 'upload' })
    refreshCustomIcons()
    patch({ iconUrl: `custom:${item.id}`, icon: '' })
    showToast(`已上传图标：${name}`)
  } catch (err) {
    showToast((err as Error).message || '上传失败')
  }
  input.value = ''
}

async function downloadFromSource() {
  const name = iconNameInput.value.trim()
  if (!name) {
    showToast('请输入图标名称')
    return
  }
  iconDownloading.value = true
  try {
    const src = await downloadIconFromSource(iconSource.value, name)
    const item = addCustomIcon({ name, src, source: 'download' })
    refreshCustomIcons()
    patch({ iconUrl: `custom:${item.id}`, icon: '' })
    showToast(`已下载图标：${name}`)
  } catch (err) {
    showToast((err as Error).message || '下载失败，请检查网络或图标名称')
  } finally {
    iconDownloading.value = false
  }
}

async function downloadFromUrl() {
  const url = iconUrlInput.value.trim()
  if (!url) {
    showToast('请输入图标 URL')
    return
  }
  iconDownloading.value = true
  try {
    const src = await fetchIconAsDataUrl(url)
    const name = iconNameInput.value.trim() || 'online-icon'
    const item = addCustomIcon({ name, src, source: 'url' })
    refreshCustomIcons()
    patch({ iconUrl: `custom:${item.id}`, icon: '' })
    iconUrlInput.value = ''
    showToast(`已导入在线图标：${name}`)
  } catch (err) {
    // CORS 失败时直接使用 URL
    try {
      const name = iconNameInput.value.trim() || 'online-icon'
      const item = addCustomIcon({ name, src: url, source: 'url' })
      refreshCustomIcons()
      patch({ iconUrl: `custom:${item.id}`, icon: '' })
      iconUrlInput.value = ''
      showToast('已使用在线 URL（跨域未本地化）')
    } catch {
      showToast((err as Error).message || '导入失败')
    }
  } finally {
    iconDownloading.value = false
  }
}

function selectCustomIcon(item: CustomIcon) {
  patch({ iconUrl: `custom:${item.id}`, icon: '' })
  showToast(`已应用：${item.name}`)
}

function deleteCustomIcon(id: string) {
  removeCustomIcon(id)
  if (style.value.iconUrl === `custom:${id}`) {
    patch({ iconUrl: '' })
  }
  refreshCustomIcons()
  showToast('已删除自定义图标')
}

function clearIcon() {
  patch({ icon: '', iconUrl: '' })
}

/* ---------- 全局颜色 + 透明度 ---------- */
const GLOBAL_COLORS: { key: keyof GlobalThemeTokens; label: string }[] = [
  { key: 'primary', label: '主色' },
  { key: 'primaryHover', label: '主色悬停' },
  { key: 'secondary', label: '辅色' },
  { key: 'success', label: '成功' },
  { key: 'warning', label: '警告' },
  { key: 'danger', label: '危险' },
  { key: 'textPrimary', label: '主文字' },
  { key: 'textSecondary', label: '次文字' },
  { key: 'border', label: '边框' },
]

const GLOBAL_BGS: {
  colorKey: keyof GlobalThemeTokens
  opacityKey: keyof GlobalThemeTokens
  imageKey: keyof GlobalThemeTokens
  label: string
}[] = [
  {
    colorKey: 'bgPage',
    opacityKey: 'bgPageOpacity',
    imageKey: 'bgPageImage',
    label: '页面背景',
  },
  {
    colorKey: 'bgCard',
    opacityKey: 'bgCardOpacity',
    imageKey: 'bgCardImage',
    label: '卡片背景',
  },
  {
    colorKey: 'bgSidebar',
    opacityKey: 'bgSidebarOpacity',
    imageKey: 'bgSidebarImage',
    label: '侧栏背景',
  },
  {
    colorKey: 'bgHeader',
    opacityKey: 'bgHeaderOpacity',
    imageKey: 'bgHeaderImage',
    label: '顶栏背景',
  },
]

function globalColor(key: keyof GlobalThemeTokens): string {
  return toHex(String(theme.global[key] || '#ffffff'))
}

function setGlobalColor(key: keyof GlobalThemeTokens, value: string) {
  theme.updateGlobal({ [key]: value } as Partial<GlobalThemeTokens>)
}

function globalOpacity(key: keyof GlobalThemeTokens): number {
  const v = theme.global[key]
  return typeof v === 'number' ? v : 1
}

function setGlobalOpacity(key: keyof GlobalThemeTokens, value: number) {
  theme.updateGlobal({ [key]: value } as Partial<GlobalThemeTokens>)
}

watch(
  () => theme.editMode,
  (v) => {
    if (v) refreshCustomIcons()
  },
)
</script>

<template>
  <aside
    v-if="theme.editMode && theme.panelOpen"
    class="editor-panel"
    @click.stop
  >
    <header class="editor-panel__header">
      <div>
        <h3>主题编辑器</h3>
        <p v-if="theme.selectedId" class="sub">
          选中：{{ theme.selectedLabel || theme.selectedId }}
        </p>
        <p v-else class="sub">点击页面任意高亮区域进行编辑</p>
      </div>
      <button class="icon-btn" title="关闭编辑模式" @click="theme.exitEditMode()">
        <X :size="18" />
      </button>
    </header>

    <div class="editor-panel__tabs">
      <button :class="{ active: tab === 'style' }" @click="tab = 'style'">
        <Palette :size="14" /> 样式
      </button>
      <button :class="{ active: tab === 'content' }" @click="tab = 'content'">
        <Type :size="14" /> 内容
      </button>
      <button :class="{ active: tab === 'global' }" @click="tab = 'global'">
        <Box :size="14" /> 全局
      </button>
    </div>

    <div class="editor-panel__body">
      <!-- ========== 样式（全部拉杆） ========== -->
      <template v-if="tab === 'style'">
        <div v-if="!theme.selectedId" class="empty-hint">
          请先点击页面中的可编辑窗口
        </div>
        <template v-else>
          <div class="section-title">颜色与透明度</div>

          <div class="color-block">
            <div class="color-block__row">
              <span>背景色</span>
              <input
                type="color"
                :value="toHex(style.backgroundColor || '#ffffff')"
                @input="patch({ backgroundColor: ($event.target as HTMLInputElement).value })"
              />
            </div>
            <SliderField
              label="背景透明度"
              :model-value="num(style.backgroundOpacity, 1)"
              :min="0"
              :max="1"
              :step="0.01"
              :format="(v) => Math.round(v * 100) + '%'"
              @update:model-value="patch({ backgroundOpacity: $event, backgroundColor: style.backgroundColor || '#ffffff' })"
            />

            <div class="section-sub">背景填充</div>
            <div class="chip-group">
              <button
                v-for="f in BACKGROUND_FILL_OPTIONS"
                :key="f.value"
                type="button"
                class="chip"
                :class="{ active: (style.backgroundFill || 'solid') === f.value }"
                @click="patch({ backgroundFill: f.value as BackgroundFillMode })"
              >
                {{ f.label }}
              </button>
            </div>

            <template v-if="style.backgroundFill === 'linear' || style.backgroundFill === 'radial'">
              <div class="color-block__row">
                <span>渐变终点色</span>
                <input
                  type="color"
                  :value="toHex(style.backgroundColor2 || '#6366f1')"
                  @input="
                    patch({
                      backgroundColor2: ($event.target as HTMLInputElement).value,
                      backgroundFill: style.backgroundFill || 'linear',
                    })
                  "
                />
              </div>
              <SliderField
                v-if="style.backgroundFill === 'linear'"
                label="渐变角度"
                :model-value="num(style.backgroundGradientAngle, 135)"
                :min="0"
                :max="360"
                :step="1"
                unit="°"
                @update:model-value="patch({ backgroundGradientAngle: $event })"
              />
              <SliderField
                label="渐变起点"
                :model-value="num(style.backgroundGradientStart, 0)"
                :min="0"
                :max="100"
                :step="1"
                unit="%"
                @update:model-value="patch({ backgroundGradientStart: $event })"
              />
              <SliderField
                label="渐变终点"
                :model-value="num(style.backgroundGradientEnd, 100)"
                :min="0"
                :max="100"
                :step="1"
                unit="%"
                @update:model-value="patch({ backgroundGradientEnd: $event })"
              />
            </template>

            <input
              ref="bgImageFileRef"
              type="file"
              accept="image/*"
              hidden
              @change="onBgImageFile"
            />
            <button type="button" class="upload-btn upload-btn--sm" @click="bgImageFileRef?.click()">
              <Upload :size="14" /> 上传背景图
            </button>
            <SliderField
              label="图片透明度"
              :model-value="num(style.backgroundImageOpacity, 1)"
              :min="0"
              :max="1"
              :step="0.01"
              :format="(v) => Math.round(v * 100) + '%'"
              :disabled="!style.backgroundImage"
              @update:model-value="patch({ backgroundImageOpacity: $event })"
            />
            <div class="section-sub">填充模式</div>
            <div class="chip-group">
              <button
                v-for="f in IMAGE_FIT_OPTIONS"
                :key="f.value"
                type="button"
                class="chip"
                :class="{ active: (style.backgroundImageFit || 'cover') === f.value }"
                :disabled="!style.backgroundImage"
                @click="patch({ backgroundImageFit: f.value as ImageFitMode })"
              >
                {{ f.label }}
              </button>
            </div>
            <div v-if="style.backgroundImage" class="img-preview-wrap">
              <img
                :src="style.backgroundImage"
                class="preview-img preview-img--bg"
                alt="background"
                :style="{
                  opacity: num(style.backgroundImageOpacity, 1),
                  objectFit: style.backgroundImageFit || 'cover',
                }"
              />
              <button type="button" class="link-btn" @click="clearBgImage">
                清除背景图
              </button>
            </div>
          </div>

          <div class="color-block">
            <div class="color-block__row">
              <span>文字色</span>
              <input
                type="color"
                :value="toHex(style.color || '#0f172a')"
                @input="patch({ color: ($event.target as HTMLInputElement).value })"
              />
            </div>
          </div>

          <div class="color-block">
            <div class="color-block__row">
              <span>边框色</span>
              <input
                type="color"
                :value="toHex(style.borderColor || '#e2e8f0')"
                @input="patch({ borderColor: ($event.target as HTMLInputElement).value })"
              />
            </div>
          </div>

          <SliderField
            label="边框粗细"
            :model-value="num(style.borderWidth, 1)"
            :min="0"
            :max="12"
            :step="1"
            unit="px"
            @update:model-value="patch({ borderWidth: $event })"
          />

          <div class="section-sub">边框模式</div>
          <div class="chip-group">
            <button
              v-for="b in BORDER_STYLE_OPTIONS"
              :key="b.value"
              type="button"
              class="chip"
              :class="{ active: (style.borderStyle || 'solid') === b.value }"
              @click="patch({ borderStyle: b.value as BorderStyleMode })"
            >
              {{ b.label }}
            </button>
          </div>

          <div class="section-sub">边框动画</div>
          <div class="chip-group">
            <button
              v-for="b in BORDER_ANIMATION_OPTIONS"
              :key="b.value || 'none'"
              type="button"
              class="chip"
              :class="{ active: (style.borderAnimation || '') === b.value }"
              @click="patch({ borderAnimation: b.value as BorderAnimation })"
            >
              {{ b.label }}
            </button>
          </div>
          <SliderField
            label="边框动画速度"
            :model-value="num(style.borderAnimationSpeed, 1600)"
            :min="300"
            :max="4000"
            :step="100"
            unit="ms"
            :disabled="!style.borderAnimation"
            @update:model-value="patch({ borderAnimationSpeed: $event })"
          />

          <div class="section-title">尺寸与阴影</div>

          <SliderField
            label="圆角"
            :model-value="num(style.borderRadius, 12)"
            :min="0"
            :max="48"
            :step="1"
            unit="px"
            @update:model-value="patch({ borderRadius: $event })"
          />

          <SliderField
            label="阴影强度"
            :model-value="num(style.shadowLevel, 2)"
            :min="0"
            :max="5"
            :step="1"
            :format="(v) => ['无', '极轻', '轻', '中', '重', '光晕'][v] || String(v)"
            @update:model-value="
              patch({
                shadowLevel: $event,
                shadowColor: undefined,
                shadowX: undefined,
                shadowY: undefined,
                shadowBlur: undefined,
                shadowSpread: undefined,
                shadowOpacity: undefined,
              })
            "
          />

          <div class="color-block">
            <div class="color-block__row">
              <span>阴影颜色</span>
              <input
                type="color"
                :value="toHex(style.shadowColor || '#000000')"
                @input="
                  patch({
                    shadowColor: ($event.target as HTMLInputElement).value,
                    shadowLevel: undefined,
                  })
                "
              />
            </div>
          </div>

          <SliderField
            label="阴影透明度"
            :model-value="num(style.shadowOpacity, 0.15)"
            :min="0"
            :max="1"
            :step="0.01"
            :format="(v) => Math.round(v * 100) + '%'"
            @update:model-value="patch({ shadowOpacity: $event, shadowLevel: undefined })"
          />

          <SliderField
            label="阴影 X"
            :model-value="num(style.shadowX, 0)"
            :min="-40"
            :max="40"
            :step="1"
            unit="px"
            @update:model-value="patch({ shadowX: $event, shadowLevel: undefined })"
          />

          <SliderField
            label="阴影 Y"
            :model-value="num(style.shadowY, 4)"
            :min="-40"
            :max="40"
            :step="1"
            unit="px"
            @update:model-value="patch({ shadowY: $event, shadowLevel: undefined })"
          />

          <SliderField
            label="阴影模糊"
            :model-value="num(style.shadowBlur, 12)"
            :min="0"
            :max="80"
            :step="1"
            unit="px"
            @update:model-value="patch({ shadowBlur: $event, shadowLevel: undefined })"
          />

          <SliderField
            label="阴影范围"
            :model-value="num(style.shadowSpread, 0)"
            :min="-20"
            :max="40"
            :step="1"
            unit="px"
            @update:model-value="patch({ shadowSpread: $event, shadowLevel: undefined })"
          />

          <SliderField
            label="字号"
            :model-value="num(style.fontSize, 14)"
            :min="10"
            :max="48"
            :step="1"
            unit="px"
            @update:model-value="patch({ fontSize: $event })"
          />

          <SliderField
            label="字重"
            :model-value="num(style.fontWeight, 400)"
            :min="300"
            :max="800"
            :step="100"
            @update:model-value="patch({ fontWeight: $event })"
          />

          <SliderField
            label="内边距"
            :model-value="num(style.padding, 12)"
            :min="0"
            :max="48"
            :step="1"
            unit="px"
            @update:model-value="patch({ padding: $event })"
          />

          <SliderField
            label="整体透明度"
            :model-value="num(style.opacity, 1)"
            :min="0.1"
            :max="1"
            :step="0.01"
            :format="(v) => Math.round(v * 100) + '%'"
            @update:model-value="patch({ opacity: $event })"
          />

          <div class="section-title"><Sparkles :size="12" /> 入场动画</div>

          <div class="chip-group">
            <button
              v-for="a in ANIMATION_PRESETS"
              :key="a.value"
              type="button"
              class="chip"
              :class="{ active: (style.animation || '') === a.value }"
              @click="patch({ animation: a.value })"
            >
              {{ a.label }}
            </button>
          </div>

          <SliderField
            label="动画时长"
            :model-value="num(style.animationDuration, 600)"
            :min="100"
            :max="3000"
            :step="50"
            unit="ms"
            :disabled="!style.animation"
            @update:model-value="patch({ animationDuration: $event })"
          />

          <div class="section-title"><MousePointerClick :size="12" /> 按键特效</div>
          <p class="mini-hint">应用到按钮/可点击区域，非编辑模式下点击可见效果</p>

          <div class="effect-grid">
            <button
              v-for="ef in BUTTON_EFFECT_PRESETS"
              :key="ef.value"
              type="button"
              class="effect-card"
              :class="[
                { active: (style.buttonEffect || '') === ef.value },
                ef.value ? `theme-btn--${ef.value}` : '',
              ]"
              @click="patch({ buttonEffect: ef.value as ButtonEffect })"
            >
              <strong>{{ ef.label }}</strong>
              <small>{{ ef.desc }}</small>
            </button>
          </div>
        </template>
      </template>

      <!-- ========== 内容：文案 / 图标 / 图片 ========== -->
      <template v-else-if="tab === 'content'">
        <div v-if="!theme.selectedId" class="empty-hint">
          请先点击页面中的可编辑窗口
        </div>
        <template v-else>
          <div class="section-title">文案</div>
          <label class="field">
            <textarea
              rows="3"
              :value="style.text || ''"
              placeholder="覆盖默认文案，留空则用组件默认"
              @change="patch({ text: ($event.target as HTMLTextAreaElement).value })"
            />
          </label>

          <div class="section-title">内置图标</div>
          <div class="chip-group">
            <button
              type="button"
              class="chip"
              :class="{ active: !style.icon && !style.iconUrl }"
              @click="clearIcon"
            >
              默认
            </button>
            <button
              v-for="ic in ICON_OPTIONS"
              :key="ic"
              type="button"
              class="chip"
              :class="{ active: style.icon === ic && !style.iconUrl }"
              @click="patch({ icon: ic, iconUrl: '' })"
            >
              {{ ic }}
            </button>
          </div>

          <SliderField
            label="图标尺寸"
            :model-value="num(style.iconSize, 18)"
            :min="12"
            :max="64"
            :step="1"
            unit="px"
            @update:model-value="patch({ iconSize: $event })"
          />

          <div class="section-title"><Download :size="12" /> 在线下载图标</div>
          <p class="mini-hint">选择图标源网址，输入图标名下载；或直接粘贴任意图片/SVG 链接</p>

          <div class="icon-download-row">
            <select v-model="iconSource" class="select">
              <option v-for="s in ICON_SOURCES" :key="s.id" :value="s.id">
                {{ s.label }}
              </option>
            </select>
          </div>

          <div class="url-row">
            <input
              v-model="iconNameInput"
              class="text-input"
              placeholder="图标名称，如 home / shopping-cart"
            />
            <button
              type="button"
              class="mini-btn"
              :disabled="iconDownloading"
              @click="downloadFromSource"
            >
              <Download :size="14" />
              {{ iconDownloading ? '…' : '下载' }}
            </button>
          </div>
          <div class="url-row">
            <input
              v-model="iconUrlInput"
              class="text-input"
              placeholder="或粘贴 https://... 图标 URL"
            />
            <button
              type="button"
              class="mini-btn"
              :disabled="iconDownloading"
              @click="downloadFromUrl"
            >
              <Link :size="14" />
              {{ iconDownloading ? '…' : '导入' }}
            </button>
          </div>

          <div class="section-title"><Upload :size="12" /> 本地上传图标</div>
          <input
            ref="iconFileRef"
            type="file"
            accept="image/*,.svg"
            hidden
            @change="uploadIconFile"
          />
          <button type="button" class="upload-btn" @click="iconFileRef?.click()">
            <Upload :size="16" /> 选择 SVG / PNG / WebP
          </button>

          <div v-if="customIcons.length" class="custom-icons">
            <div class="section-title">我的图标库</div>
            <div class="icon-lib">
              <div
                v-for="item in customIcons"
                :key="item.id"
                class="icon-lib__item"
                :class="{ active: style.iconUrl === `custom:${item.id}` }"
                @click="selectCustomIcon(item)"
              >
                <img :src="item.src" alt="" />
                <span>{{ item.name }}</span>
                <button
                  type="button"
                  class="icon-lib__del"
                  title="删除"
                  @click.stop="deleteCustomIcon(item.id)"
                >
                  <Trash2 :size="12" />
                </button>
              </div>
            </div>
          </div>

          <div class="section-title"><ImageIcon :size="12" /> 图片</div>
          <input
            ref="imageFileRef"
            type="file"
            accept="image/*"
            hidden
            @change="onImageFile"
          />
          <button type="button" class="upload-btn" @click="imageFileRef?.click()">
            <Upload :size="16" /> 上传图片
          </button>

          <SliderField
            label="图片透明度"
            :model-value="num(style.imageOpacity, 1)"
            :min="0"
            :max="1"
            :step="0.01"
            :format="(v) => Math.round(v * 100) + '%'"
            :disabled="!style.image"
            @update:model-value="patch({ imageOpacity: $event })"
          />

          <div class="section-sub">填充模式</div>
          <div class="chip-group">
            <button
              v-for="f in IMAGE_FIT_OPTIONS"
              :key="'img-' + f.value"
              type="button"
              class="chip"
              :class="{ active: (style.imageFit || 'cover') === f.value }"
              :disabled="!style.image"
              @click="patch({ imageFit: f.value as ImageFitMode })"
            >
              {{ f.label }}
            </button>
          </div>

          <div v-if="style.image" class="img-preview-wrap">
            <img
              :src="style.image"
              class="preview-img"
              alt="preview"
              :style="{
                opacity: num(style.imageOpacity, 1),
                objectFit: style.imageFit || 'cover',
              }"
            />
            <button
              type="button"
              class="link-btn"
              @click="patch({ image: '', imageOpacity: 1, imageFit: 'cover' })"
            >
              清除图片
            </button>
          </div>
        </template>
      </template>

      <!-- ========== 全局 ========== -->
      <template v-else>
        <p class="hint">全局色板与各区域背景透明度会写入 CSS 变量，保存主题后可一键切换。</p>

        <div class="section-title">品牌色</div>
        <div
          v-for="item in GLOBAL_COLORS"
          :key="item.key"
          class="color-block compact"
        >
          <div class="color-block__row">
            <span>{{ item.label }}</span>
            <input
              type="color"
              :value="globalColor(item.key)"
              @input="setGlobalColor(item.key, ($event.target as HTMLInputElement).value)"
            />
          </div>
        </div>

        <div class="section-title">各位置背景 + 透明度 / 图片</div>
        <p class="mini-hint">每个区域可单独设颜色、透明度，并上传背景图（cover 铺满）</p>
        <div
          v-for="bg in GLOBAL_BGS"
          :key="bg.colorKey"
          class="color-block"
        >
          <div class="color-block__row">
            <span>{{ bg.label }}</span>
            <input
              type="color"
              :value="globalColor(bg.colorKey)"
              @input="setGlobalColor(bg.colorKey, ($event.target as HTMLInputElement).value)"
            />
          </div>
          <SliderField
            :label="bg.label + ' 透明度'"
            :model-value="globalOpacity(bg.opacityKey)"
            :min="0"
            :max="1"
            :step="0.01"
            :format="(v) => Math.round(v * 100) + '%'"
            @update:model-value="setGlobalOpacity(bg.opacityKey, $event)"
          />
          <input
            :ref="(el) => setGlobalBgFileRef(bg.imageKey, el)"
            type="file"
            accept="image/*"
            hidden
            @change="onGlobalBgImageFile($event, bg.imageKey)"
          />
          <button
            type="button"
            class="upload-btn upload-btn--sm"
            @click="globalBgFileRefs[bg.imageKey]?.click()"
          >
            <Upload :size="14" /> 上传{{ bg.label }}图片
          </button>
          <div v-if="globalImage(bg.imageKey)" class="img-preview-wrap">
            <img
              :src="globalImage(bg.imageKey)"
              class="preview-img preview-img--bg"
              alt=""
            />
            <button
              type="button"
              class="link-btn"
              @click="clearGlobalBgImage(bg.imageKey)"
            >
              清除背景图
            </button>
          </div>
        </div>

        <div class="section-title">其它</div>
        <SliderField
          label="全局圆角"
          :model-value="num(theme.global.radius, 12)"
          :min="0"
          :max="32"
          :step="1"
          unit="px"
          @update:model-value="theme.updateGlobal({ radius: $event })"
        />
      </template>
    </div>

    <footer class="editor-panel__footer">
      <button class="btn ghost" :disabled="!theme.selectedId" @click="handleReset">
        <RotateCcw :size="14" /> 重置元素
      </button>
      <button class="btn primary" @click="handleOverwrite">
        <Save :size="14" /> 保存主题
      </button>
      <button class="btn" @click="showSaveDialog = true">另存为</button>
    </footer>

    <div v-if="showSaveDialog" class="dialog-mask" @click.self="showSaveDialog = false">
      <div class="dialog">
        <h4>另存为新主题</h4>
        <label class="field">
          <span>主题名称</span>
          <input v-model="saveName" class="text-input" placeholder="如：门店春节主题" />
        </label>
        <label class="field">
          <span>描述</span>
          <input v-model="saveDesc" class="text-input" placeholder="可选" />
        </label>
        <div class="dialog-actions">
          <button class="btn ghost" @click="showSaveDialog = false">取消</button>
          <button class="btn primary" @click="handleSaveAs">保存</button>
        </div>
      </div>
    </div>

    <div v-if="toast" class="toast">{{ toast }}</div>
  </aside>
</template>

<style scoped>
.editor-panel {
  position: fixed;
  top: 0;
  right: 0;
  width: 360px;
  height: 100vh;
  background: var(--theme-bg-card, #fff);
  border-left: 1px solid var(--theme-border, #e2e8f0);
  box-shadow: -8px 0 32px rgba(0, 0, 0, 0.08);
  z-index: 1000;
  display: flex;
  flex-direction: column;
  color: var(--theme-text-primary, #0f172a);
}

.editor-panel__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 16px 16px 8px;
  border-bottom: 1px solid var(--theme-border, #e2e8f0);
}

.editor-panel__header h3 {
  margin: 0;
  font-size: 16px;
}

.sub {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--theme-text-muted, #94a3b8);
}

.icon-btn {
  border: none;
  background: transparent;
  cursor: pointer;
  padding: 6px;
  border-radius: 8px;
  color: inherit;
}

.icon-btn:hover {
  background: var(--theme-bg-page, #f1f5f9);
}

.editor-panel__tabs {
  display: flex;
  gap: 4px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--theme-border, #e2e8f0);
}

.editor-panel__tabs button {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  border: none;
  background: transparent;
  padding: 8px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
  color: var(--theme-text-secondary, #475569);
}

.editor-panel__tabs button.active {
  background: color-mix(in srgb, var(--theme-primary, #4f46e5) 12%, transparent);
  color: var(--theme-primary, #4f46e5);
  font-weight: 600;
}

.editor-panel__body {
  flex: 1;
  overflow-y: auto;
  padding: 12px 16px 24px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 700;
  color: var(--theme-text-primary);
  margin: 12px 0 10px;
  letter-spacing: 0.02em;
}

.section-title:first-child {
  margin-top: 0;
}

.section-sub {
  font-size: 12px;
  color: var(--theme-text-secondary);
  margin: 4px 0 6px;
}

.mini-hint {
  margin: -4px 0 10px;
  font-size: 11px;
  color: var(--theme-text-muted);
  line-height: 1.4;
}

.color-block {
  background: var(--theme-bg-page, #f8fafc);
  border: 1px solid var(--theme-border, #e2e8f0);
  border-radius: 10px;
  padding: 10px 12px 4px;
  margin-bottom: 10px;
}

.color-block.compact {
  padding-bottom: 10px;
  margin-bottom: 8px;
}

.color-block__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  color: var(--theme-text-secondary);
  margin-bottom: 4px;
}

.color-block__row input[type='color'] {
  width: 40px;
  height: 28px;
  border: 1px solid var(--theme-border);
  border-radius: 6px;
  padding: 2px;
  cursor: pointer;
  background: transparent;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 12px;
  font-size: 12px;
  color: var(--theme-text-secondary);
}

.field textarea,
.text-input,
.select {
  border: 1px solid var(--theme-border, #e2e8f0);
  border-radius: 8px;
  padding: 8px 10px;
  font-size: 13px;
  background: var(--theme-bg-page, #f8fafc);
  color: var(--theme-text-primary, #0f172a);
  font-family: inherit;
  width: 100%;
  box-sizing: border-box;
}

.chip-group {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 12px;
}

.chip {
  border: 1px solid var(--theme-border);
  background: var(--theme-bg-page);
  color: var(--theme-text-secondary);
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 11px;
  cursor: pointer;
  font-family: inherit;
}

.chip.active {
  background: var(--theme-primary);
  border-color: var(--theme-primary);
  color: #fff;
}

.chip:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.effect-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-bottom: 12px;
}

.effect-card {
  border: 1px solid var(--theme-border);
  background: var(--theme-bg-page);
  border-radius: 10px;
  padding: 10px 8px;
  text-align: left;
  cursor: pointer;
  font-family: inherit;
  color: inherit;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-height: 56px;
}

.effect-card strong {
  font-size: 12px;
}

.effect-card small {
  font-size: 10px;
  color: var(--theme-text-muted);
}

.effect-card.active {
  border-color: var(--theme-primary);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--theme-primary) 25%, transparent);
  background: color-mix(in srgb, var(--theme-primary) 8%, transparent);
}

.url-row,
.icon-download-row {
  display: flex;
  gap: 6px;
  margin-bottom: 8px;
}

.mini-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: 1px solid var(--theme-border);
  background: var(--theme-primary);
  color: #fff;
  border-radius: 8px;
  padding: 0 12px;
  font-size: 12px;
  cursor: pointer;
  white-space: nowrap;
  font-family: inherit;
}

.mini-btn:disabled {
  opacity: 0.6;
  cursor: wait;
}

.upload-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 1px dashed var(--theme-primary);
  background: color-mix(in srgb, var(--theme-primary) 6%, transparent);
  color: var(--theme-primary);
  border-radius: 10px;
  padding: 12px;
  font-size: 13px;
  cursor: pointer;
  font-family: inherit;
  margin-bottom: 12px;
}

.upload-btn--sm {
  padding: 8px;
  font-size: 12px;
  margin-top: 8px;
  margin-bottom: 0;
}

.upload-btn:hover {
  background: color-mix(in srgb, var(--theme-primary) 12%, transparent);
}

.icon-lib {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-bottom: 12px;
}

.icon-lib__item {
  position: relative;
  border: 1px solid var(--theme-border);
  border-radius: 10px;
  padding: 10px 8px 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  background: var(--theme-bg-page);
  font-size: 11px;
  color: var(--theme-text-secondary);
}

.icon-lib__item img {
  width: 28px;
  height: 28px;
  object-fit: contain;
}

.icon-lib__item.active {
  border-color: var(--theme-primary);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--theme-primary) 25%, transparent);
}

.icon-lib__del {
  position: absolute;
  top: 4px;
  right: 4px;
  border: none;
  background: transparent;
  color: var(--theme-danger);
  cursor: pointer;
  padding: 2px;
  display: grid;
  place-items: center;
  opacity: 0.5;
}

.icon-lib__item:hover .icon-lib__del {
  opacity: 1;
}

.img-preview-wrap {
  margin-top: 4px;
}

.preview-img {
  max-width: 100%;
  border-radius: 8px;
  border: 1px solid var(--theme-border);
  display: block;
  background:
    linear-gradient(45deg, #ccc 25%, transparent 25%),
    linear-gradient(-45deg, #ccc 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #ccc 75%),
    linear-gradient(-45deg, transparent 75%, #ccc 75%);
  background-size: 12px 12px;
  background-position: 0 0, 0 6px, 6px -6px, -6px 0;
  background-color: #fff;
}

.preview-img--bg {
  width: 100%;
  height: 72px;
  object-fit: cover;
  margin-top: 8px;
}

.link-btn {
  border: none;
  background: none;
  color: var(--theme-danger, #ef4444);
  cursor: pointer;
  font-size: 12px;
  text-align: left;
  padding: 8px 0 0;
}

.empty-hint,
.hint {
  font-size: 13px;
  color: var(--theme-text-muted);
  line-height: 1.6;
  padding: 12px;
  background: var(--theme-bg-page);
  border-radius: 8px;
  margin-bottom: 12px;
}

.editor-panel__footer {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid var(--theme-border);
  background: var(--theme-bg-card);
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: 1px solid var(--theme-border);
  background: var(--theme-bg-page);
  color: var(--theme-text-primary);
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 12px;
  cursor: pointer;
  font-family: inherit;
}

.btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.btn.primary {
  background: var(--theme-primary);
  border-color: var(--theme-primary);
  color: #fff;
}

.btn.ghost {
  background: transparent;
}

.dialog-mask {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1100;
}

.dialog {
  width: 360px;
  background: var(--theme-bg-card);
  border-radius: 12px;
  padding: 20px;
  box-shadow: var(--theme-shadow);
}

.dialog h4 {
  margin: 0 0 16px;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 8px;
}

.toast {
  position: absolute;
  bottom: 72px;
  left: 16px;
  right: 16px;
  background: #0f172a;
  color: #fff;
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 13px;
  text-align: center;
  animation: theme-slide-up 0.3s ease;
  z-index: 20;
}

/* 编辑器内特效预览也需要基础类（全局 style.css 提供动画） */
</style>
