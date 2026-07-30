<script setup lang="ts">
import { ref } from 'vue'
import Themeable from '@/components/theme/Themeable.vue'
import { useThemeStore } from '@/stores/theme'
import { buildBackgroundValue, exportThemeJson, importThemeJson } from '@/utils/themeEngine'
import {
  Check,
  Download,
  Upload,
  Trash2,
  Paintbrush,
  RefreshCw,
} from '@lucide/vue'

const theme = useThemeStore()
const toast = ref('')
const fileInput = ref<HTMLInputElement | null>(null)

function showToast(msg: string) {
  toast.value = msg
  setTimeout(() => {
    toast.value = ''
  }, 2200)
}

function apply(id: string) {
  if (theme.applyTheme(id)) {
    showToast('主题已一键替换全站')
  }
}

function remove(id: string) {
  if (!confirm('确定删除该自定义主题？')) return
  if (theme.deleteTheme(id)) showToast('已删除')
  else showToast('内置主题不可删除')
}

function download(id: string) {
  const t = theme.allThemes.find((x) => x.id === id)
  if (!t) return
  const blob = new Blob([exportThemeJson(t)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${t.name}.theme.json`
  a.click()
  URL.revokeObjectURL(url)
}

function onImport(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    try {
      const data = importThemeJson(String(reader.result))
      theme.importTheme(data)
      showToast(`已导入主题：${data.name}`)
    } catch (err) {
      showToast((err as Error).message || '导入失败')
    }
  }
  reader.readAsText(file)
  ;(e.target as HTMLInputElement).value = ''
}

function resetDefault() {
  theme.applyTheme('default')
  showToast('已恢复默认主题')
}
</script>

<template>
  <div class="tm">
    <Themeable
      id="tm.header"
      label="主题管理页头"
      tag="div"
      class="page-head"
      default-text="主题管理 · 保存 / 导入 / 一键全站替换"
    />

    <div class="toolbar">
      <button class="btn" @click="theme.enterEditMode()">
        <Paintbrush :size="14" /> 进入编辑模式
      </button>
      <button class="btn" @click="fileInput?.click()">
        <Upload :size="14" /> 导入主题
      </button>
      <input ref="fileInput" type="file" accept=".json,application/json" hidden @change="onImport" />
      <button class="btn ghost" @click="resetDefault">
        <RefreshCw :size="14" /> 恢复默认
      </button>
      <span v-if="toast" class="toast-inline">{{ toast }}</span>
    </div>

    <Themeable id="tm.current" label="当前主题卡片" tag="div" class="current">
      <div>
        <div class="label">当前生效主题</div>
        <div class="name">{{ theme.activeTheme.name }}</div>
        <div class="desc">{{ theme.activeTheme.description || '—' }}</div>
      </div>
      <div class="swatches">
        <span
          v-for="(c, i) in theme.activeTheme.previewColors"
          :key="i"
          :style="{ background: c }"
        />
      </div>
    </Themeable>

    <div class="theme-grid">
      <Themeable
        v-for="t in theme.allThemes"
        :key="t.id"
        :id="`tm.card.${t.id}`"
        :label="`主题卡-${t.name}`"
        tag="article"
        class="theme-card"
        :class="{ active: t.id === theme.activeThemeId }"
      >
        <div
          class="preview"
          :style="{
            background: buildBackgroundValue(
              t.global.bgPage,
              t.global.bgPageOpacity ?? 1,
              t.global.bgPageImage,
            ),
          }"
        >
          <div
            class="preview-side"
            :style="{
              background: buildBackgroundValue(
                t.global.bgSidebar,
                t.global.bgSidebarOpacity ?? 1,
                t.global.bgSidebarImage,
              ),
            }"
          />
          <div class="preview-main">
            <div class="preview-bar" :style="{ background: t.global.primary }" />
            <div
              class="preview-card"
              :style="{
                background: buildBackgroundValue(
                  t.global.bgCard,
                  t.global.bgCardOpacity ?? 1,
                  t.global.bgCardImage,
                ),
                borderColor: t.global.border,
              }"
            />
          </div>
        </div>
        <div class="meta">
          <h4>{{ t.name }}</h4>
          <p>{{ t.description || '自定义主题' }}</p>
          <div class="colors">
            <i v-for="(c, i) in t.previewColors" :key="i" :style="{ background: c }" />
          </div>
        </div>
        <div class="actions">
          <button class="primary" @click="apply(t.id)">
            <Check :size="14" />
            {{ t.id === theme.activeThemeId ? '使用中' : '一键替换' }}
          </button>
          <button title="导出" @click="download(t.id)"><Download :size="14" /></button>
          <button
            v-if="!['default', 'ocean', 'sunset', 'forest', 'midnight', 'rose'].includes(t.id)"
            title="删除"
            class="danger"
            @click="remove(t.id)"
          >
            <Trash2 :size="14" />
          </button>
        </div>
      </Themeable>
    </div>

    <Themeable id="tm.help" label="使用说明" tag="section" class="help panel">
      <Themeable id="tm.help.title" label="说明标题" tag="h3" class="sec-title" default-text="使用说明" />
      <ol>
        <li>任意业务页点击右上角「主题编辑」，进入编辑模式。</li>
        <li>点击页面虚线框选中窗口，右侧面板可改颜色、阴影、动画、图标、文案、图片。</li>
        <li>「全局」页签可改整站 CSS 变量（主色、侧栏、背景等）；页面/卡片/侧栏/顶栏均可上传背景图。</li>
        <li>「样式」页签中的元素背景也可单独上传背景图。</li>
        <li>「保存主题 / 另存为」后，在此页可对任意主题「一键替换」全站生效。</li>
        <li>支持 JSON 导入导出，便于多门店主题分发。</li>
      </ol>
    </Themeable>
  </div>
</template>

<style scoped>
.tm {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.page-head {
  font-size: 15px;
  font-weight: 600;
  color: var(--theme-text-secondary);
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid var(--theme-border);
  background: var(--theme-bg-card);
  color: var(--theme-text-primary);
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 13px;
  cursor: pointer;
  font-family: inherit;
}

.btn.ghost {
  background: transparent;
}

.toast-inline {
  font-size: 13px;
  color: var(--theme-success);
}

.current {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  background: var(--theme-bg-card);
  border: 1px solid var(--theme-border);
  border-radius: var(--theme-radius);
  padding: 18px 20px;
  box-shadow: var(--theme-shadow);
}

.current .label {
  font-size: 12px;
  color: var(--theme-text-muted);
}
.current .name {
  font-size: 20px;
  font-weight: 700;
  margin: 4px 0;
}
.current .desc {
  font-size: 13px;
  color: var(--theme-text-secondary);
}

.swatches {
  display: flex;
  gap: 8px;
}
.swatches span {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 2px solid #fff;
  box-shadow: 0 0 0 1px var(--theme-border);
}

.theme-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 14px;
}

.theme-card {
  background: var(--theme-bg-card);
  border: 1px solid var(--theme-border);
  border-radius: var(--theme-radius);
  overflow: hidden;
  box-shadow: var(--theme-shadow);
  display: flex;
  flex-direction: column;
}

.theme-card.active {
  border-color: var(--theme-primary);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--theme-primary) 30%, transparent);
}

.preview {
  height: 100px;
  display: flex;
  position: relative;
}

.preview-side {
  width: 28%;
  height: 100%;
}

.preview-main {
  flex: 1;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.preview-bar {
  height: 10px;
  border-radius: 4px;
  width: 40%;
}

.preview-card {
  flex: 1;
  border-radius: 6px;
  border: 1px solid;
}

.meta {
  padding: 12px 14px 4px;
}

.meta h4 {
  margin: 0 0 4px;
  font-size: 14px;
}

.meta p {
  margin: 0;
  font-size: 12px;
  color: var(--theme-text-muted);
  min-height: 32px;
}

.colors {
  display: flex;
  gap: 4px;
  margin-top: 8px;
}

.colors i {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  display: block;
}

.actions {
  display: flex;
  gap: 6px;
  padding: 12px 14px 14px;
}

.actions button {
  border: 1px solid var(--theme-border);
  background: var(--theme-bg-page);
  border-radius: 8px;
  padding: 6px 10px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-family: inherit;
  color: var(--theme-text-secondary);
}

.actions button.primary {
  flex: 1;
  justify-content: center;
  background: var(--theme-primary);
  border-color: var(--theme-primary);
  color: #fff;
}

.actions button.danger {
  color: var(--theme-danger);
}

.help.panel {
  background: var(--theme-bg-card);
  border: 1px solid var(--theme-border);
  border-radius: var(--theme-radius);
  padding: 16px 18px;
  box-shadow: var(--theme-shadow);
}

.sec-title {
  margin: 0 0 10px;
  font-size: 15px;
}

.help ol {
  margin: 0;
  padding-left: 18px;
  font-size: 13px;
  color: var(--theme-text-secondary);
  line-height: 1.8;
}
</style>
