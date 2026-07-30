<script setup lang="ts">
import { ref, computed } from 'vue'
import Themeable from '@/components/theme/Themeable.vue'
import { usePosStore } from '@/stores/pos'
import { useSettingsStore } from '@/stores/settings'
import { BarChart3, Download, Printer } from '@lucide/vue'

const pos = usePosStore()
const settings = useSettingsStore()
const toast = ref('')
function showToast(m: string) {
  toast.value = m
  setTimeout(() => { toast.value = '' }, 2000)
}

const reports = [
  { id: 'sales', name: '营业额统计', desc: '今日实收与开台' },
  { id: 'rooms', name: '房台经营', desc: '各房状态与消费' },
  { id: 'credit', name: '挂账统计', desc: '挂账与回收' },
  { id: 'member', name: '会员金额', desc: '充值与余额' },
  { id: 'gift', name: '赠送统计', desc: '赠送明细' },
  { id: 'shift', name: '班次汇总', desc: '演示班次数据' },
]
const active = ref('sales')

const roomFinance = computed(() =>
  pos.rooms.map((r) => {
    const pay = pos.payableOf(r.id)
    return {
      ...r,
      consume: pay.afterDiscount,
      payable: pay.payable,
    }
  }),
)

const creditUnpaid = computed(() =>
  pos.credits.filter((c) => !c.paid).reduce((s, c) => s + c.amount, 0),
)
const creditPaid = computed(() =>
  pos.credits.filter((c) => c.paid).reduce((s, c) => s + c.amount, 0),
)

const history = ref([
  { date: '2026-07-28', sales: 12860, opens: 12, label: '今日' },
  { date: '2026-07-27', sales: 11240, opens: 10, label: '昨日' },
  { date: '2026-07-26', sales: 9860, opens: 9, label: '前日' },
])

function exportCsv() {
  showToast('已导出报表（演示）')
}
</script>

<template>
  <div class="fin">
    <Themeable id="fin.header" label="财务页头" tag="div" class="page-head" default-text="财务系统 · 经营数据可视化" />
    <div v-if="toast" class="toast">{{ toast }}</div>

    <div class="kpi">
      <Themeable id="fin.kpi.sales" label="今日营业额" tag="div" class="card">
        <div class="l">今日营业额</div>
        <div class="v">{{ pos.formatMoney(pos.todaySales) }}</div>
      </Themeable>
      <Themeable id="fin.kpi.opens" label="今日开台" tag="div" class="card">
        <div class="l">今日开台</div>
        <div class="v">{{ pos.todayOpens }}</div>
      </Themeable>
      <Themeable id="fin.kpi.credit" label="未收挂账" tag="div" class="card warn">
        <div class="l">未收挂账</div>
        <div class="v">{{ pos.formatMoney(creditUnpaid) }}</div>
      </Themeable>
      <Themeable id="fin.kpi.member" label="会员余额合计" tag="div" class="card">
        <div class="l">会员余额合计</div>
        <div class="v">{{ pos.formatMoney(pos.members.reduce((s, m) => s + m.balance, 0)) }}</div>
      </Themeable>
    </div>

    <div class="grid">
      <button
        v-for="r in reports"
        :key="r.id"
        type="button"
        class="rep"
        :class="{ active: active === r.id }"
        @click="active = r.id"
      >
        <BarChart3 :size="16" />
        <strong>{{ r.name }}</strong>
        <small>{{ r.desc }}</small>
      </button>
    </div>

    <section class="panel">
      <div class="panel-h">
        <h3>{{ reports.find((r) => r.id === active)?.name }}</h3>
        <div class="row">
          <button type="button" class="btn" @click="showToast('已发送打印')"><Printer :size="14" /> 打印</button>
          <button type="button" class="btn" @click="exportCsv"><Download :size="14" /> 导出</button>
        </div>
      </div>

      <template v-if="active === 'sales'">
        <table class="tbl">
          <thead><tr><th>日期</th><th>说明</th><th>开台</th><th>营业额</th></tr></thead>
          <tbody>
            <tr v-for="h in history" :key="h.date">
              <td>{{ h.date }}</td><td>{{ h.label }}</td><td>{{ h.opens }}</td>
              <td>{{ pos.formatMoney(h.sales) }}</td>
            </tr>
          </tbody>
        </table>
      </template>

      <template v-else-if="active === 'rooms'">
        <div class="room-fin">
          <Themeable
            v-for="r in roomFinance"
            :key="r.id"
            :id="`fin.room.${r.id}`"
            :label="`财务房台-${r.name}`"
            tag="div"
            class="rf"
            :style="{ borderColor: pos.statusMeta[r.status].color }"
          >
            <div class="rf-name">{{ r.name }}</div>
            <div class="rf-st" :style="{ color: pos.statusMeta[r.status].color }">{{ pos.statusMeta[r.status].label }}</div>
            <div class="rf-amt">消费 {{ pos.formatMoney(r.consume) }}</div>
            <div class="rf-pay">应付 {{ pos.formatMoney(r.payable) }}</div>
          </Themeable>
        </div>
      </template>

      <template v-else-if="active === 'credit'">
        <p>已回收 {{ pos.formatMoney(creditPaid) }} · 未收 {{ pos.formatMoney(creditUnpaid) }}</p>
        <table class="tbl">
          <thead><tr><th>日期</th><th>房台</th><th>挂账人</th><th>金额</th><th>状态</th></tr></thead>
          <tbody>
            <tr v-for="c in pos.credits" :key="c.id">
              <td>{{ c.date }}</td><td>{{ c.roomName }}</td><td>{{ c.person }}</td>
              <td>{{ pos.formatMoney(c.amount) }}</td><td>{{ c.paid ? '已回收' : '未付' }}</td>
            </tr>
          </tbody>
        </table>
      </template>

      <template v-else-if="active === 'member'">
        <table class="tbl">
          <thead><tr><th>卡号</th><th>姓名</th><th>余额</th><th>累计充值</th><th>累计消费</th></tr></thead>
          <tbody>
            <tr v-for="m in pos.members" :key="m.id">
              <td>{{ m.cardNo }}</td><td>{{ m.name }}</td>
              <td>{{ pos.formatMoney(m.balance) }}</td>
              <td>{{ pos.formatMoney(m.totalRecharge) }}</td>
              <td>{{ pos.formatMoney(m.totalConsume) }}</td>
            </tr>
          </tbody>
        </table>
      </template>

      <template v-else>
        <p class="hint">与收银、系统设置数据联动；真实环境对接后端历史库。</p>
        <table class="tbl">
          <thead><tr><th>项目</th><th>数值</th></tr></thead>
          <tbody>
            <tr><td>货币</td><td>{{ settings.business.currency }}</td></tr>
            <tr><td>抹零规则</td><td>{{ settings.business.roundingRule }}</td></tr>
            <tr><td>今日营业额</td><td>{{ pos.formatMoney(pos.todaySales) }}</td></tr>
            <tr><td>门店</td><td>{{ settings.business.shopName }}</td></tr>
          </tbody>
        </table>
      </template>
    </section>
  </div>
</template>

<style scoped>
.fin{display:flex;flex-direction:column;gap:12px}
.page-head{font-size:15px;font-weight:600;color:var(--theme-text-secondary)}
.toast{background:var(--theme-success);color:#fff;padding:8px 12px;border-radius:8px;font-size:13px}
.kpi{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
.card{background:var(--theme-bg-card);border:1px solid var(--theme-border);border-radius:12px;padding:14px;box-shadow:var(--theme-shadow)}
.card.warn{border-color:var(--theme-warning)}
.l{font-size:11px;color:var(--theme-text-muted)}.v{font-size:20px;font-weight:700;margin-top:4px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:8px}
.rep{display:flex;flex-direction:column;gap:4px;align-items:flex-start;border:1px solid var(--theme-border);background:var(--theme-bg-card);border-radius:10px;padding:12px;cursor:pointer;font-family:inherit;text-align:left}
.rep.active{border-color:var(--theme-primary);box-shadow:0 0 0 2px color-mix(in srgb,var(--theme-primary) 25%,transparent)}
.rep small{font-size:11px;color:var(--theme-text-muted)}
.panel{background:var(--theme-bg-card);border:1px solid var(--theme-border);border-radius:12px;padding:14px;box-shadow:var(--theme-shadow)}
.panel-h{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}
.panel-h h3{margin:0;font-size:15px}
.row{display:flex;gap:8px}
.btn{display:inline-flex;align-items:center;gap:4px;border:1px solid var(--theme-border);background:var(--theme-bg-page);border-radius:8px;padding:6px 10px;font-size:12px;cursor:pointer;font-family:inherit}
.tbl{width:100%;border-collapse:collapse;font-size:12px}
.tbl th,.tbl td{padding:8px 6px;border-bottom:1px solid var(--theme-border);text-align:left}
.room-fin{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px}
.rf{border:2px solid;border-radius:10px;padding:10px;background:var(--theme-bg-page)}
.rf-name{font-weight:700}.rf-st{font-size:11px;margin:4px 0}
.rf-amt,.rf-pay{font-size:12px;color:var(--theme-text-secondary)}
.hint{font-size:12px;color:var(--theme-text-muted)}
@media(max-width:800px){.kpi{grid-template-columns:1fr 1fr}}
</style>
