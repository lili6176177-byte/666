# 主题可编辑管理系统 (Theme Admin System)

一套支持**全量主题编辑与一键替换**的多模块管理系统演示项目。

## 功能模块

| 模块 | 路径 | 说明 |
|------|------|------|
| 统一登录 | `/login` | 账号密码登录，按角色下发权限 |
| 工作台 | `/dashboard` | 经营概览 |
| 收银系统 | `/pos` | 点单、购物车、收款 |
| 出品系统 | `/kitchen` | 出餐看板、状态流转 |
| 仓库系统 | `/warehouse` | 库存、出入库、低库存预警 |
| 财务系统 | `/finance` | 收支、趋势、流水 |
| 系统设置 | `/settings` | 门店与业务参数 |
| 主题管理 | `/themes` | 主题列表、导入导出、一键替换 |

## 主题编辑能力

每个业务页右上角 **「主题编辑」** 可进入编辑模式：

- 点击页面任意带虚线框的窗口选中
- 编辑：**颜色 / 图标 / 阴影 / 动画 / 文案 / 图片**
- **全局**页签修改整站 CSS 变量（主色、侧栏、背景等）
- **保存主题 / 另存为** 后，在主题管理页 **一键替换** 全站

主题数据持久化在 `localStorage`，支持 JSON 导入导出。

## 演示账号

| 用户名 | 密码 | 角色 | 可访问 |
|--------|------|------|--------|
| admin | admin123 | 超级管理员 | 全部 |
| cashier | 123456 | 收银员 | 工作台 + 收银 |
| kitchen | 123456 | 出品 | 工作台 + 出品 |
| warehouse | 123456 | 仓库 | 工作台 + 仓库 |
| finance | 123456 | 财务 | 工作台 + 财务 |
| viewer | 123456 | 访客 | 仅工作台 |

## 快速开始

```bash
cd theme-admin-system
npm install
npm run dev
```

浏览器打开 http://localhost:5173

```bash
npm run build   # 生产构建
npm run preview # 预览构建产物
```

## 技术栈

- Vue 3 + TypeScript + Vite
- Vue Router（路由守卫 + 权限）
- Pinia（登录态 / 主题态）
- `@lucide/vue` 图标
- CSS Variables 主题引擎

## 对接真实登录

将 `src/stores/auth.ts` 中的 `loginApi` 替换为后端 HTTP 调用即可，例如：

```ts
async function loginApi(username: string, password: string) {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  // 解析 token / permissions 后写入 store
}
```

## 目录结构

```
src/
  components/layout/     # 布局、侧栏
  components/theme/      # Themeable 可编辑组件、编辑器面板
  stores/                # auth / theme
  themes/presets.ts      # 内置主题
  utils/themeEngine.ts   # CSS 变量与持久化
  views/                 # 各业务页
  router/                # 路由与菜单
```
