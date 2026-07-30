<script setup lang="ts">
import { computed, useSlots, ref } from 'vue'
import { useThemeStore } from '@/stores/theme'
import { styleToCss } from '@/utils/themeEngine'
import { resolveIcon } from '@/utils/icons'
import { findCustomIcon } from '@/utils/customIcons'

const props = withDefaults(
  defineProps<{
    id: string
    label?: string
    defaultText?: string
    defaultIcon?: string
    defaultImage?: string
    tag?: string
    class?: string | Record<string, boolean> | (string | Record<string, boolean>)[]
  }>(),
  {
    label: '',
    defaultText: '',
    defaultIcon: '',
    defaultImage: '',
    tag: 'div',
  },
)

const theme = useThemeStore()
const slots = useSlots()
const ripples = ref<{ id: number; x: number; y: number }[]>([])
let rippleSeq = 0

const rawStyle = computed(() => theme.getElementStyle(props.id))

const styleObj = computed(() => styleToCss(rawStyle.value))

const displayText = computed(() => rawStyle.value.text ?? props.defaultText)

const displayIcon = computed(() => rawStyle.value.icon || props.defaultIcon)

const displayImage = computed(() => rawStyle.value.image || props.defaultImage)

const customIconSrc = computed(() => {
  const url = rawStyle.value.iconUrl
  if (!url) return ''
  if (url.startsWith('custom:')) {
    return findCustomIcon(url.slice(7))?.src || ''
  }
  return url
})

const IconComp = computed(() => {
  if (customIconSrc.value) return null
  return resolveIcon(displayIcon.value)
})

const iconSize = computed(() => rawStyle.value.iconSize ?? 18)

const imageOpacity = computed(() => rawStyle.value.imageOpacity ?? 1)

const imageFit = computed(() => rawStyle.value.imageFit || 'cover')

const buttonEffect = computed(() => rawStyle.value.buttonEffect || '')

const borderAnimation = computed(() => rawStyle.value.borderAnimation || '')

const isSelected = computed(
  () => theme.editMode && theme.selectedId === props.id,
)

function onClick(e: MouseEvent) {
  if (theme.editMode) {
    e.preventDefault()
    e.stopPropagation()
    theme.selectElement(props.id, props.label || props.id)
    return
  }

  if (buttonEffect.value === 'ripple') {
    const el = e.currentTarget as HTMLElement
    const rect = el.getBoundingClientRect()
    const id = ++rippleSeq
    ripples.value.push({
      id,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    })
    setTimeout(() => {
      ripples.value = ripples.value.filter((r) => r.id !== id)
    }, 600)
  }
}
</script>

<template>
  <component
    :is="tag"
    :data-theme-id="id"
    :data-theme-label="label || id"
    class="themeable"
    :class="[
      props.class,
      buttonEffect ? `theme-btn--${buttonEffect}` : '',
      borderAnimation ? `theme-border--${borderAnimation}` : '',
      {
        'themeable--edit': theme.editMode,
        'themeable--selected': isSelected,
        'themeable--has-effect': !!buttonEffect,
      },
    ]"
    :style="styleObj"
    @click="onClick"
  >
    <span
      v-for="r in ripples"
      :key="r.id"
      class="themeable__ripple"
      :style="{ left: r.x + 'px', top: r.y + 'px' }"
    />

    <img
      v-if="displayImage"
      :src="displayImage"
      class="themeable__img"
      alt=""
      draggable="false"
      :style="{ opacity: imageOpacity, objectFit: imageFit, width: '100%', height: '100%' }"
    />

    <img
      v-else-if="customIconSrc"
      :src="customIconSrc"
      class="themeable__icon-img"
      alt=""
      draggable="false"
      :style="{ width: iconSize + 'px', height: iconSize + 'px' }"
    />

    <component
      :is="IconComp"
      v-else-if="IconComp"
      class="themeable__icon"
      :size="iconSize"
    />

    <span v-if="displayText" class="themeable__text">{{ displayText }}</span>
    <!-- 始终渲染默认插槽，避免「有 defaultText 时子节点（含嵌套 Themeable）不显示」 -->
    <slot />
    <slot name="extra" />

    <span v-if="theme.editMode" class="themeable__badge" :title="label || id">
      {{ label || id }}
    </span>
  </component>
</template>

<style scoped>
.themeable {
  position: relative;
  transition: outline 0.15s, box-shadow 0.15s, transform 0.2s, filter 0.2s;
  overflow: hidden;
}

.themeable--edit {
  cursor: crosshair !important;
  outline: 1px dashed rgba(99, 102, 241, 0.35);
  outline-offset: 2px;
  overflow: visible;
  /* 编辑模式：子控件不抢点击，便于选中本区域 Themeable */
  pointer-events: auto !important;
}

/* 非 Themeable 子节点（input/button 等）禁用指针，点击落到本层 */
.themeable--edit :deep(> *:not(.themeable):not(.themeable__badge):not(.themeable__text):not(.themeable__icon):not(.themeable__img):not(.themeable__icon-img):not(.themeable__ripple)) {
  pointer-events: none !important;
}
.themeable--edit :deep(input),
.themeable--edit :deep(select),
.themeable--edit :deep(textarea),
.themeable--edit :deep(button:not(.themeable)) {
  pointer-events: none !important;
}
/* 嵌套的 Themeable 仍可点选 */
.themeable--edit :deep(.themeable) {
  pointer-events: auto !important;
}

.themeable--edit:hover {
  outline: 2px solid rgba(99, 102, 241, 0.7);
  outline-offset: 2px;
  z-index: 5;
}

.themeable--selected {
  outline: 2px solid var(--theme-primary, #4f46e5) !important;
  outline-offset: 2px;
  box-shadow: 0 0 0 4px rgba(79, 70, 229, 0.2);
  z-index: 6;
}

.themeable__badge {
  position: absolute;
  top: -10px;
  left: 4px;
  font-size: 10px;
  line-height: 1;
  padding: 2px 6px;
  border-radius: 4px;
  background: var(--theme-primary, #4f46e5);
  color: #fff;
  white-space: nowrap;
  pointer-events: none;
  z-index: 10;
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  opacity: 0;
  transition: opacity 0.15s;
}

.themeable--edit:hover .themeable__badge,
.themeable--selected .themeable__badge {
  opacity: 1;
}

.themeable__img {
  max-width: 100%;
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  border-radius: inherit;
  transition: opacity 0.2s;
}

.themeable__icon {
  flex-shrink: 0;
  vertical-align: middle;
}

.themeable__icon-img {
  flex-shrink: 0;
  vertical-align: middle;
  object-fit: contain;
  display: inline-block;
}

.themeable__text {
  vertical-align: middle;
}

.themeable__ripple {
  position: absolute;
  width: 8px;
  height: 8px;
  margin: -4px 0 0 -4px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.55);
  pointer-events: none;
  transform: scale(0);
  animation: theme-ripple-spread 0.6s ease-out forwards;
  z-index: 2;
}
</style>
