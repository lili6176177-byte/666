<script setup lang="ts">
import Themeable from '@/components/theme/Themeable.vue'
import { useAuthStore } from '@/stores/auth'
import { TrendingUp, ShoppingBag, Package, Wallet } from '@lucide/vue'

const auth = useAuthStore()

const stats = [
  { id: 'dash.stat.sales', label: '今日营业额', value: '¥28,460', icon: TrendingUp, tip: '较昨日 +12%' },
  { id: 'dash.stat.orders', label: '订单数', value: '186', icon: ShoppingBag, tip: '进行中 12' },
  { id: 'dash.stat.stock', label: '库存预警', value: '7', icon: Package, tip: '需补货' },
  { id: 'dash.stat.profit', label: '毛利预估', value: '¥9,320', icon: Wallet, tip: '毛利率 32.7%' },
]
</script>

<template>
  <div class="dash">
    <Themeable
      id="dash.welcome"
      label="欢迎横幅"
      tag="div"
      class="welcome"
      :default-text="`你好，${auth.user?.displayName || ''} · 欢迎使用主题可编辑管理系统`"
    />

    <div class="stat-grid">
      <Themeable
        v-for="s in stats"
        :key="s.id"
        :id="s.id"
        :label="s.label"
        tag="div"
        class="stat-card"
      >
        <div class="stat-icon">
          <component :is="s.icon" :size="22" />
        </div>
        <div>
          <div class="stat-label">{{ s.label }}</div>
          <div class="stat-value">{{ s.value }}</div>
          <div class="stat-tip">{{ s.tip }}</div>
        </div>
      </Themeable>
    </div>

    <div class="grid-2">
      <Themeable id="dash.panel.quick" label="快捷入口面板" tag="section" class="panel">
        <Themeable
          id="dash.panel.quick.title"
          label="快捷入口标题"
          tag="h3"
          class="panel-title"
          default-text="快捷入口"
        />
        <div class="quick-links">
          <Themeable id="dash.quick.pos" label="快捷-收银" tag="div" class="quick" default-text="去收银" default-icon="ShoppingCart" />
          <Themeable id="dash.quick.kitchen" label="快捷-出品" tag="div" class="quick" default-text="看出品" default-icon="ChefHat" />
          <Themeable id="dash.quick.wh" label="快捷-仓库" tag="div" class="quick" default-text="查库存" default-icon="Warehouse" />
          <Themeable id="dash.quick.fin" label="快捷-财务" tag="div" class="quick" default-text="看报表" default-icon="Wallet" />
        </div>
      </Themeable>

      <Themeable id="dash.panel.activity" label="动态面板" tag="section" class="panel">
        <Themeable
          id="dash.panel.activity.title"
          label="动态标题"
          tag="h3"
          class="panel-title"
          default-text="最近动态"
        />
        <ul class="timeline">
          <li>
            <Themeable id="dash.act.1" label="动态1" tag="span" default-text="收银完成订单 #A1024 · ¥128.00" />
          </li>
          <li>
            <Themeable id="dash.act.2" label="动态2" tag="span" default-text="出品完成桌号 12 · 宫保鸡丁" />
          </li>
          <li>
            <Themeable id="dash.act.3" label="动态3" tag="span" default-text="仓库入库 大米 50kg" />
          </li>
          <li>
            <Themeable id="dash.act.4" label="动态4" tag="span" default-text="财务确认日结 · 差额 0" />
          </li>
        </ul>
      </Themeable>
    </div>

    <Themeable id="dash.banner" label="运营 Banner" tag="div" class="banner" default-text="开启「主题编辑」模式，点选任意窗口即可定制颜色、图标、阴影、动画、文案与图片，保存后可一键全站替换。">
      <template #extra />
    </Themeable>
  </div>
</template>

<style scoped>
.dash {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.welcome {
  background: linear-gradient(120deg, var(--theme-primary), var(--theme-secondary));
  color: #fff;
  padding: 20px 24px;
  border-radius: var(--theme-radius);
  font-size: 16px;
  font-weight: 500;
  box-shadow: var(--theme-shadow);
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.stat-card {
  background: var(--theme-bg-card);
  border: 1px solid var(--theme-border);
  border-radius: var(--theme-radius);
  padding: 16px;
  display: flex;
  gap: 14px;
  align-items: flex-start;
  box-shadow: var(--theme-shadow);
}

.stat-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: color-mix(in srgb, var(--theme-primary) 12%, transparent);
  color: var(--theme-primary);
  display: grid;
  place-items: center;
}

.stat-label {
  font-size: 12px;
  color: var(--theme-text-muted);
}

.stat-value {
  font-size: 22px;
  font-weight: 700;
  margin: 2px 0;
}

.stat-tip {
  font-size: 12px;
  color: var(--theme-success);
}

.grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.panel {
  background: var(--theme-bg-card);
  border: 1px solid var(--theme-border);
  border-radius: var(--theme-radius);
  padding: 18px;
  box-shadow: var(--theme-shadow);
}

.panel-title {
  margin: 0 0 14px;
  font-size: 15px;
}

.quick-links {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.quick {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px;
  border-radius: 10px;
  background: var(--theme-bg-page);
  border: 1px solid var(--theme-border);
  font-size: 14px;
  font-weight: 500;
  cursor: default;
}

.timeline {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.timeline li {
  padding-left: 14px;
  border-left: 3px solid var(--theme-primary);
  font-size: 13px;
  color: var(--theme-text-secondary);
}

.banner {
  background: var(--theme-bg-card);
  border: 1px dashed var(--theme-primary);
  border-radius: var(--theme-radius);
  padding: 16px 20px;
  font-size: 13px;
  color: var(--theme-text-secondary);
  line-height: 1.6;
}

@media (max-width: 1100px) {
  .stat-grid {
    grid-template-columns: 1fr 1fr;
  }
  .grid-2 {
    grid-template-columns: 1fr;
  }
}
</style>
