import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import type { ElementThemeStyle, GlobalThemeTokens, ThemePackage } from '@/types'
import { BUILTIN_THEMES, DEFAULT_GLOBAL } from '@/themes/presets'
import {
  applyGlobalTokens,
  loadActiveThemeId,
  loadDraftElements,
  loadStoredThemes,
  normalizeGlobal,
  saveActiveThemeId,
  saveDraftElements,
  saveStoredThemes,
  uid,
} from '@/utils/themeEngine'

export const useThemeStore = defineStore('theme', () => {
  /** 是否处于主题编辑模式 */
  const editMode = ref(false)
  /** 当前选中的可编辑元素 theme-id */
  const selectedId = ref<string | null>(null)
  /** 选中元素的标签/描述 */
  const selectedLabel = ref('')
  /** 编辑面板是否展开 */
  const panelOpen = ref(false)

  /** 用户自定义主题 + 内置 */
  const customThemes = ref<ThemePackage[]>(loadStoredThemes())
  const activeThemeId = ref(loadActiveThemeId() || 'default')

  /** 当前生效的全局 tokens */
  const global = ref<GlobalThemeTokens>({ ...DEFAULT_GLOBAL })
  /** 当前生效的元素样式（含草稿） */
  const elements = ref<Record<string, ElementThemeStyle>>({})

  const allThemes = computed(() => {
    const customIds = new Set(customThemes.value.map((t) => t.id))
    const builtins = BUILTIN_THEMES.filter((t) => !customIds.has(t.id))
    return [...builtins, ...customThemes.value]
  })

  const activeTheme = computed(
    () => allThemes.value.find((t) => t.id === activeThemeId.value) || BUILTIN_THEMES[0],
  )

  const selectedStyle = computed(() => {
    if (!selectedId.value) return null
    return elements.value[selectedId.value] || {}
  })

  function findTheme(id: string): ThemePackage | undefined {
    return allThemes.value.find((t) => t.id === id)
  }

  /** 应用主题（一键替换） */
  function applyTheme(id: string, mergeDraft = false) {
    const theme = findTheme(id)
    if (!theme) return false
    activeThemeId.value = id
    saveActiveThemeId(id)
    global.value = normalizeGlobal(theme.global)
    applyGlobalTokens(global.value)
    if (mergeDraft) {
      const draft = loadDraftElements()
      elements.value = { ...theme.elements, ...draft }
    } else {
      elements.value = { ...theme.elements }
      saveDraftElements({})
    }
    return true
  }

  /** 初始化 */
  function init() {
    const id = activeThemeId.value
    const theme = findTheme(id) || BUILTIN_THEMES[0]
    global.value = normalizeGlobal(theme.global)
    applyGlobalTokens(global.value)
    const draft = loadDraftElements()
    elements.value = { ...theme.elements, ...draft }
  }

  function enterEditMode() {
    editMode.value = true
    panelOpen.value = true
  }

  function exitEditMode() {
    editMode.value = false
    selectedId.value = null
    selectedLabel.value = ''
  }

  function selectElement(id: string, label = '') {
    if (!editMode.value) return
    selectedId.value = id
    selectedLabel.value = label || id
    panelOpen.value = true
  }

  function clearSelection() {
    selectedId.value = null
    selectedLabel.value = ''
  }

  /** 更新当前选中元素样式 */
  function updateSelectedStyle(patch: Partial<ElementThemeStyle>) {
    if (!selectedId.value) return
    const id = selectedId.value
    elements.value = {
      ...elements.value,
      [id]: { ...(elements.value[id] || {}), ...patch },
    }
    saveDraftElements(elements.value)
  }

  /** 重置某元素 */
  function resetElement(id: string) {
    const next = { ...elements.value }
    delete next[id]
    elements.value = next
    saveDraftElements(elements.value)
  }

  /** 更新全局 token */
  function updateGlobal(patch: Partial<GlobalThemeTokens>) {
    global.value = normalizeGlobal({ ...global.value, ...patch })
    applyGlobalTokens(global.value)
  }

  /** 保存为新主题 */
  function saveAsTheme(name: string, description = ''): ThemePackage {
    const g = normalizeGlobal(global.value)
    const theme: ThemePackage = {
      id: uid('theme'),
      name,
      description,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      global: g,
      elements: { ...elements.value },
      previewColors: [g.primary, g.bgSidebar, g.bgPage, g.success],
    }
    customThemes.value = [...customThemes.value, theme]
    saveStoredThemes(customThemes.value)
    activeThemeId.value = theme.id
    saveActiveThemeId(theme.id)
    saveDraftElements({})
    return theme
  }

  /** 覆盖保存当前主题（仅自定义） */
  function overwriteCurrentTheme(): boolean {
    const idx = customThemes.value.findIndex((t) => t.id === activeThemeId.value)
    if (idx < 0) return false
    const g = normalizeGlobal(global.value)
    const updated: ThemePackage = {
      ...customThemes.value[idx],
      global: g,
      elements: { ...elements.value },
      updatedAt: new Date().toISOString(),
      previewColors: [g.primary, g.bgSidebar, g.bgPage, g.success],
    }
    const list = [...customThemes.value]
    list[idx] = updated
    customThemes.value = list
    saveStoredThemes(list)
    saveDraftElements({})
    return true
  }

  function deleteTheme(id: string) {
    if (BUILTIN_THEMES.some((t) => t.id === id)) return false
    customThemes.value = customThemes.value.filter((t) => t.id !== id)
    saveStoredThemes(customThemes.value)
    if (activeThemeId.value === id) applyTheme('default')
    return true
  }

  function importTheme(theme: ThemePackage) {
    const exists = customThemes.value.findIndex((t) => t.id === theme.id)
    const next = { ...theme, updatedAt: new Date().toISOString() }
    if (exists >= 0) {
      const list = [...customThemes.value]
      list[exists] = next
      customThemes.value = list
    } else {
      customThemes.value = [...customThemes.value, next]
    }
    saveStoredThemes(customThemes.value)
  }

  function getElementStyle(id: string): ElementThemeStyle {
    return elements.value[id] || {}
  }

  /** 编辑模式时 body class */
  watch(editMode, (v) => {
    document.body.classList.toggle('theme-edit-mode', v)
  })

  return {
    editMode,
    selectedId,
    selectedLabel,
    panelOpen,
    customThemes,
    activeThemeId,
    global,
    elements,
    allThemes,
    activeTheme,
    selectedStyle,
    init,
    applyTheme,
    enterEditMode,
    exitEditMode,
    selectElement,
    clearSelection,
    updateSelectedStyle,
    resetElement,
    updateGlobal,
    saveAsTheme,
    overwriteCurrentTheme,
    deleteTheme,
    importTheme,
    getElementStyle,
  }
})
