<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import Themeable from '@/components/theme/Themeable.vue'
import { useThemeStore } from '@/stores/theme'
import { Paintbrush, Eye, EyeOff } from '@lucide/vue'

const auth = useAuthStore()
const theme = useThemeStore()
const router = useRouter()
const route = useRoute()

const username = ref('admin')
const password = ref('admin123')
const loading = ref(false)
const error = ref('')
const showPwd = ref(false)

async function submit() {
  error.value = ''
  loading.value = true
  try {
    const res = await auth.loginApi(username.value.trim(), password.value)
    if (!res.ok) {
      error.value = res.message
      return
    }
    const redirect = (route.query.redirect as string) || '/dashboard'
    router.replace(redirect)
  } finally {
    loading.value = false
  }
}

function fill(u: string) {
  const demo = [
    { username: 'admin', password: 'admin123' },
    { username: 'cashier', password: '123456' },
    { username: 'kitchen', password: '123456' },
    { username: 'warehouse', password: '123456' },
    { username: 'finance', password: '123456' },
    { username: 'viewer', password: '123456' },
  ].find((x) => x.username === u)
  if (demo) {
    username.value = demo.username
    password.value = demo.password
  }
}
</script>

<template>
  <div class="login-page">
    <div class="bg-orbs">
      <span class="orb o1" />
      <span class="orb o2" />
      <span class="orb o3" />
    </div>

    <div class="login-card">
      <Themeable
        id="login.logo"
        label="登录 Logo 区"
        tag="div"
        class="logo-area"
        default-text="ThemeAdmin"
        default-icon="Layers"
      />

      <Themeable
        id="login.subtitle"
        label="登录副标题"
        tag="p"
        class="subtitle"
        default-text="统一登录 · 权限分发 · 全量主题可替换"
      />

      <form class="form" @submit.prevent="submit">
        <label>
          <span>用户名</span>
          <input v-model="username" autocomplete="username" placeholder="请输入用户名" />
        </label>
        <label>
          <span>密码</span>
          <div class="pwd-wrap">
            <input
              v-model="password"
              :type="showPwd ? 'text' : 'password'"
              autocomplete="current-password"
              placeholder="请输入密码"
            />
            <button type="button" class="eye" @click="showPwd = !showPwd">
              <Eye v-if="!showPwd" :size="16" />
              <EyeOff v-else :size="16" />
            </button>
          </div>
        </label>

        <p v-if="error" class="error">{{ error }}</p>

        <Themeable
          id="login.submit"
          label="登录按钮"
          tag="button"
          class="submit"
          default-text="登 录"
          default-icon="LogIn"
          @click.prevent="submit"
        />
      </form>

      <div class="demo-box">
        <div class="demo-title">演示账号（点击填入）</div>
        <div class="demo-list">
          <button type="button" @click="fill('admin')">管理员 admin / admin123</button>
          <button type="button" @click="fill('cashier')">收银 cashier / 123456</button>
          <button type="button" @click="fill('kitchen')">出品 kitchen / 123456</button>
          <button type="button" @click="fill('warehouse')">仓库 warehouse / 123456</button>
          <button type="button" @click="fill('finance')">财务 finance / 123456</button>
          <button type="button" @click="fill('viewer')">访客 viewer / 123456</button>
        </div>
      </div>

      <button
        v-if="false"
        type="button"
        class="theme-hint"
        @click="theme.enterEditMode()"
      >
        <Paintbrush :size="14" /> 登录页也可主题编辑
      </button>
    </div>

    <Themeable
      id="login.footer"
      label="登录页页脚"
      tag="footer"
      class="page-footer"
      default-text="© Theme Admin System · 颜色 / 图标 / 阴影 / 动画 / 文案 / 图片 全量可编辑"
    />
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: linear-gradient(
    135deg,
    var(--theme-bg-sidebar, #0f172a) 0%,
    color-mix(in srgb, var(--theme-primary, #4f46e5) 40%, #0f172a) 100%
  );
  position: relative;
  overflow: hidden;
  font-family: var(--theme-font);
}

.bg-orbs .orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(60px);
  opacity: 0.45;
  pointer-events: none;
}
.o1 {
  width: 320px;
  height: 320px;
  background: var(--theme-primary);
  top: -80px;
  left: -60px;
}
.o2 {
  width: 280px;
  height: 280px;
  background: var(--theme-secondary);
  bottom: -40px;
  right: 10%;
}
.o3 {
  width: 200px;
  height: 200px;
  background: #a855f7;
  top: 40%;
  right: -40px;
}

.login-card {
  width: min(420px, 100%);
  background: var(--theme-bg-card, #fff);
  border-radius: calc(var(--theme-radius, 12px) + 4px);
  padding: 32px 28px 24px;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.28);
  position: relative;
  z-index: 1;
  color: var(--theme-text-primary);
}

.logo-area {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  font-size: 24px;
  font-weight: 700;
  color: var(--theme-primary);
  margin-bottom: 8px;
}

.subtitle {
  text-align: center;
  color: var(--theme-text-secondary);
  font-size: 13px;
  margin: 0 0 24px;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.form label {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
  color: var(--theme-text-secondary);
}

.form input {
  border: 1px solid var(--theme-border);
  border-radius: 10px;
  padding: 11px 12px;
  font-size: 14px;
  font-family: inherit;
  background: var(--theme-bg-page);
  color: var(--theme-text-primary);
}

.pwd-wrap {
  position: relative;
}
.pwd-wrap input {
  width: 100%;
  box-sizing: border-box;
  padding-right: 40px;
}
.eye {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  border: none;
  background: none;
  cursor: pointer;
  color: var(--theme-text-muted);
  display: grid;
  place-items: center;
  padding: 4px;
}

.error {
  color: var(--theme-danger);
  font-size: 13px;
  margin: 0;
}

.submit {
  margin-top: 4px;
  width: 100%;
  display: flex !important;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: none;
  background: var(--theme-primary);
  color: #fff;
  border-radius: 10px;
  padding: 12px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
}

.submit:hover {
  background: var(--theme-primary-hover);
}

.demo-box {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px dashed var(--theme-border);
}

.demo-title {
  font-size: 12px;
  color: var(--theme-text-muted);
  margin-bottom: 8px;
}

.demo-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.demo-list button {
  border: none;
  background: var(--theme-bg-page);
  text-align: left;
  padding: 8px 10px;
  border-radius: 8px;
  font-size: 12px;
  cursor: pointer;
  color: var(--theme-text-secondary);
  font-family: inherit;
}

.demo-list button:hover {
  background: color-mix(in srgb, var(--theme-primary) 12%, transparent);
  color: var(--theme-primary);
}

.page-footer {
  margin-top: 24px;
  color: rgba(255, 255, 255, 0.65);
  font-size: 12px;
  text-align: center;
  z-index: 1;
  position: relative;
}

.theme-hint {
  margin-top: 12px;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: 1px dashed var(--theme-border);
  background: transparent;
  padding: 8px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 12px;
  color: var(--theme-text-muted);
}
</style>
