<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter, RouterView } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'
import { useSettingsStore } from '@/stores/settings'
import { MENU_ITEMS } from '@/router'
import Themeable from '@/components/theme/Themeable.vue'
import ThemeEditorPanel from '@/components/theme/ThemeEditorPanel.vue'
import { resolveIcon, ICONS } from '@/utils/icons'
import {
  Paintbrush,
  LogOut,
  Bell,
  Menu,
} from '@lucide/vue'
import { ref } from 'vue'

const auth = useAuthStore()
const theme = useThemeStore()
const settings = useSettingsStore()
const route = useRoute()
const router = useRouter()
const sidebarCollapsed = ref(false)

const menus = computed(() =>
  MENU_ITEMS.filter((m) => auth.hasPermission(m.permission)),
)

function iconOf(name: string) {
  return resolveIcon(name) || ICONS.Circle
}

function logout() {
  auth.logout()
  router.push({ name: 'login' })
}

function toggleEdit() {
  if (!auth.hasPermission('theme_edit')) return
  if (theme.editMode) theme.exitEditMode()
  else theme.enterEditMode()
}
</script>

<template>
  <div class="layout" :class="{ 'layout--editing': theme.editMode, 'layout--collapsed': sidebarCollapsed }">
    <aside class="sidebar">
      <Themeable
        id="layout.sidebar.brand"
        label="侧栏品牌"
        tag="div"
        class="brand"
        :default-text="settings.business.shopName || 'ThemeAdmin'"
        default-icon="Layers"
      />

      <nav class="nav">
        <RouterLink
          v-for="m in menus"
          :key="m.path"
          :to="m.path"
          class="nav-item"
          :class="{ active: route.path === m.path }"
        >
          <component :is="iconOf(m.icon)" :size="18" />
          <span v-show="!sidebarCollapsed">{{ m.title }}</span>
        </RouterLink>
      </nav>

      <div class="sidebar-foot">
        <Themeable
          id="layout.sidebar.footer"
          label="侧栏页脚文案"
          tag="div"
          class="foot-text"
          default-text="主题可全量替换"
        />
      </div>
    </aside>

    <div class="main">
      <header class="header">
        <div class="header-left">
          <button class="icon-btn" @click="sidebarCollapsed = !sidebarCollapsed">
            <Menu :size="18" />
          </button>
          <Themeable
            id="layout.header.title"
            label="顶栏标题"
            tag="h1"
            class="page-title"
            :default-text="(route.meta.title as string) || '工作台'"
          />
        </div>

        <div class="header-right">
          <button
            v-if="auth.hasPermission('theme_edit')"
            class="edit-btn"
            :class="{ active: theme.editMode }"
            @click="toggleEdit"
          >
            <Paintbrush :size="16" />
            {{ theme.editMode ? '退出编辑' : '主题编辑' }}
          </button>

          <button class="icon-btn" title="通知">
            <Bell :size="18" />
          </button>

          <div class="user-chip">
            <div class="avatar">{{ auth.user?.displayName?.charAt(0) }}</div>
            <div class="user-meta" v-if="!sidebarCollapsed">
              <strong>{{ auth.user?.displayName }}</strong>
              <small>{{ auth.user?.role }}</small>
            </div>
            <button class="icon-btn" title="退出" @click="logout">
              <LogOut :size="16" />
            </button>
          </div>
        </div>
      </header>

      <main class="content" :class="{ 'content--panel': theme.editMode }">
        <div v-if="theme.editMode" class="edit-banner">
          主题编辑模式：点击虚线框选中窗口，可改颜色 / 图标 / 阴影 / 动画 / 文案 / 图片
        </div>
        <RouterView />
      </main>
    </div>

    <ThemeEditorPanel />
  </div>
</template>

<style scoped>
.layout {
  display: flex;
  min-height: 100vh;
  background: var(--theme-bg-page);
  color: var(--theme-text-primary);
  font-family: var(--theme-font);
}

.sidebar {
  width: 240px;
  background: var(--theme-bg-sidebar);
  color: #e2e8f0;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  transition: width 0.2s;
  z-index: 20;
}

.layout--collapsed .sidebar {
  width: 72px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 20px 16px;
  font-weight: 700;
  font-size: 18px;
  color: #fff;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.nav {
  flex: 1;
  padding: 12px 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  overflow-y: auto;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 10px;
  color: #94a3b8;
  text-decoration: none;
  font-size: 14px;
  transition: 0.15s;
}

.nav-item:hover {
  background: rgba(255, 255, 255, 0.06);
  color: #fff;
}

.nav-item.active {
  background: var(--theme-primary);
  color: #fff;
}

.sidebar-foot {
  padding: 12px 16px 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.foot-text {
  font-size: 12px;
  color: #64748b;
}

.main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.header {
  height: 60px;
  background: var(--theme-bg-header);
  border-bottom: 1px solid var(--theme-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  gap: 12px;
  position: sticky;
  top: 0;
  z-index: 15;
  box-shadow: 0 1px 0 var(--theme-border);
}

.header-left,
.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.page-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.icon-btn {
  border: none;
  background: transparent;
  cursor: pointer;
  padding: 8px;
  border-radius: 8px;
  color: var(--theme-text-secondary);
  display: inline-flex;
}

.icon-btn:hover {
  background: var(--theme-bg-page);
}

.edit-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid var(--theme-border);
  background: var(--theme-bg-card);
  color: var(--theme-text-primary);
  border-radius: 999px;
  padding: 8px 14px;
  font-size: 13px;
  cursor: pointer;
  font-family: inherit;
}

.edit-btn.active {
  background: var(--theme-primary);
  border-color: var(--theme-primary);
  color: #fff;
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--theme-primary) 25%, transparent);
}

.user-chip {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-left: 8px;
  border-left: 1px solid var(--theme-border);
}

.avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--theme-primary);
  color: #fff;
  display: grid;
  place-items: center;
  font-weight: 600;
  font-size: 13px;
}

.user-meta {
  display: flex;
  flex-direction: column;
  line-height: 1.2;
}

.user-meta strong {
  font-size: 13px;
}

.user-meta small {
  font-size: 11px;
  color: var(--theme-text-muted);
}

.content {
  flex: 1;
  padding: 20px 24px 40px;
  transition: margin-right 0.2s;
}

.content--panel {
  margin-right: 360px;
}

.edit-banner {
  background: linear-gradient(90deg, var(--theme-primary), var(--theme-secondary));
  color: #fff;
  padding: 10px 16px;
  border-radius: var(--theme-radius);
  margin-bottom: 16px;
  font-size: 13px;
  animation: theme-pulse 2s infinite;
}

@media (max-width: 900px) {
  .sidebar {
    position: fixed;
    height: 100%;
    transform: translateX(0);
  }
  .layout--collapsed .sidebar {
    transform: translateX(-100%);
    width: 240px;
  }
  .content--panel {
    margin-right: 0;
  }
}
</style>
