import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import type { Permission } from '@/types'

declare module 'vue-router' {
  interface RouteMeta {
    title?: string
    permission?: Permission
    public?: boolean
    icon?: string
  }
}

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/LoginView.vue'),
    meta: { title: '登录', public: true },
  },
  {
    path: '/',
    component: () => import('@/components/layout/AppLayout.vue'),
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'dashboard',
        component: () => import('@/views/DashboardView.vue'),
        meta: { title: '工作台', permission: 'dashboard', icon: 'Home' },
      },
      {
        path: 'pos',
        name: 'pos',
        component: () => import('@/views/pos/PosView.vue'),
        meta: { title: '收银系统', permission: 'pos', icon: 'ShoppingCart' },
      },
      {
        path: 'kitchen',
        name: 'kitchen',
        component: () => import('@/views/kitchen/KitchenView.vue'),
        meta: { title: '出品系统', permission: 'kitchen', icon: 'ChefHat' },
      },
      {
        path: 'warehouse',
        name: 'warehouse',
        component: () => import('@/views/warehouse/WarehouseView.vue'),
        meta: { title: '仓库系统', permission: 'warehouse', icon: 'Warehouse' },
      },
      {
        path: 'finance',
        name: 'finance',
        component: () => import('@/views/finance/FinanceView.vue'),
        meta: { title: '财务系统', permission: 'finance', icon: 'Wallet' },
      },
      {
        path: 'settings',
        name: 'settings',
        component: () => import('@/views/settings/SettingsView.vue'),
        meta: { title: '系统设置', permission: 'settings', icon: 'Settings' },
      },
      {
        path: 'themes',
        name: 'themes',
        component: () => import('@/views/settings/ThemeManagerView.vue'),
        meta: { title: '主题管理', permission: 'theme_manage', icon: 'Palette' },
      },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/dashboard',
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to) => {
  const auth = useAuthStore()
  document.title = `${to.meta.title || '系统'} · 主题管理系统`

  if (to.meta.public) {
    if (auth.isLoggedIn && to.name === 'login') return { name: 'dashboard' }
    return true
  }

  if (!auth.isLoggedIn) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  const perm = to.meta.permission
  if (perm && !auth.hasPermission(perm)) {
    return { name: 'dashboard' }
  }

  return true
})

export default router

/** 侧边栏菜单（按权限过滤） */
export const MENU_ITEMS = [
  { path: '/dashboard', title: '工作台', icon: 'Home', permission: 'dashboard' as Permission },
  { path: '/pos', title: '收银系统', icon: 'ShoppingCart', permission: 'pos' as Permission },
  { path: '/kitchen', title: '出品系统', icon: 'ChefHat', permission: 'kitchen' as Permission },
  { path: '/warehouse', title: '仓库系统', icon: 'Warehouse', permission: 'warehouse' as Permission },
  { path: '/finance', title: '财务系统', icon: 'Wallet', permission: 'finance' as Permission },
  { path: '/settings', title: '系统设置', icon: 'Settings', permission: 'settings' as Permission },
  { path: '/themes', title: '主题管理', icon: 'Palette', permission: 'theme_manage' as Permission },
]
