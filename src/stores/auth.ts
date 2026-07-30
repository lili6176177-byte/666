import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Permission, UserInfo } from '@/types'

/** 演示账号（生产环境请接真实 API） */
const DEMO_USERS: Array<UserInfo & { password: string }> = [
  {
    id: '1',
    username: 'admin',
    password: 'admin123',
    displayName: '系统管理员',
    role: '超级管理员',
    permissions: [
      'dashboard',
      'settings',
      'pos',
      'kitchen',
      'warehouse',
      'finance',
      'theme_edit',
      'theme_manage',
      'user_manage',
    ],
  },
  {
    id: '2',
    username: 'cashier',
    password: '123456',
    displayName: '前台收银员',
    role: '收银员',
    permissions: ['dashboard', 'pos', 'theme_edit'],
  },
  {
    id: '3',
    username: 'kitchen',
    password: '123456',
    displayName: '出品主管',
    role: '出品',
    permissions: ['dashboard', 'kitchen', 'theme_edit'],
  },
  {
    id: '4',
    username: 'warehouse',
    password: '123456',
    displayName: '仓管员',
    role: '仓库',
    permissions: ['dashboard', 'warehouse', 'theme_edit'],
  },
  {
    id: '5',
    username: 'finance',
    password: '123456',
    displayName: '财务专员',
    role: '财务',
    permissions: ['dashboard', 'finance', 'theme_edit'],
  },
  {
    id: '6',
    username: 'viewer',
    password: '123456',
    displayName: '只读访客',
    role: '访客',
    permissions: ['dashboard'],
  },
]

const TOKEN_KEY = 'tas_token'
const USER_KEY = 'tas_user'

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem(TOKEN_KEY))
  const user = ref<UserInfo | null>(null)

  try {
    const raw = localStorage.getItem(USER_KEY)
    if (raw) user.value = JSON.parse(raw) as UserInfo
  } catch {
    /* ignore */
  }

  const isLoggedIn = computed(() => !!token.value && !!user.value)
  const permissions = computed(() => user.value?.permissions ?? [])

  function hasPermission(perm: Permission | Permission[]): boolean {
    const list = Array.isArray(perm) ? perm : [perm]
    return list.some((p) => permissions.value.includes(p))
  }

  function login(username: string, password: string): { ok: boolean; message: string } {
    const found = DEMO_USERS.find(
      (u) => u.username === username && u.password === password,
    )
    if (!found) {
      return { ok: false, message: '用户名或密码错误' }
    }
    const { password: _, ...info } = found
    const t = `token_${info.id}_${Date.now()}`
    token.value = t
    user.value = info
    localStorage.setItem(TOKEN_KEY, t)
    localStorage.setItem(USER_KEY, JSON.stringify(info))
    return { ok: true, message: '登录成功' }
  }

  function logout() {
    token.value = null
    user.value = null
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
  }

  /** 统一登录接口（可替换为真实 HTTP） */
  async function loginApi(username: string, password: string) {
    await new Promise((r) => setTimeout(r, 400))
    return login(username, password)
  }

  return {
    token,
    user,
    isLoggedIn,
    permissions,
    hasPermission,
    login,
    loginApi,
    logout,
    demoUsers: DEMO_USERS.map(({ password: _, ...u }) => u),
  }
})
