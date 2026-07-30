<script setup lang="ts">
import { ref, onMounted } from 'vue'
import Themeable from '@/components/theme/Themeable.vue'
import { useWarehouseStore } from '@/stores/warehouse'
import { useSettingsStore } from '@/stores/settings'
import { Package, AlertTriangle, ArrowDownToLine, ArrowUpFromLine, RefreshCw, Truck } from '@lucide/vue'

const wh = useWarehouseStore()
const settings = useSettingsStore()
onMounted(() => wh.syncItems())

const tab = ref<'stock' | 'io' | 'check' | 'supplier' | 'report'>('stock')
const toast = ref('')
function showToast(m: string) {
  toast.value = m
  setTimeout(() => { toast.value = '' }, 2000)
}

const form = ref({ itemId: '', qty: 1, note: '', from: 'A-01', to: 'B-02', actual: 0 })

function doIn() {
  if (!form.value.itemId) return
  if (wh.stockIn(form.value.itemId, form.value.qty, form.value.note || '入库')) showToast('入库成功')
  else showToast('入库失败')
}
function doOut() {
  if (!form.value.itemId) return
  if (wh.stockOut(form.value.itemId, form.value.qty, form.value.note || '出库')) showToast('出库成功')
  else showToast('出库失败（可能库存不足）')
}
function doTransfer() {
  if (!form.value.itemId) return
  if (wh.transfer(form.value.itemId, form.value.qty, form.value.from, form.value.to)) showToast('调拨成功')
}
function doCheck() {
  if (!form.value.itemId) return
  if (wh.check(form.value.itemId, form.value.actual)) showToast('盘点已登记')
}
</script>

<template>
  <div class="wh">
    <Themeable id="wh.header" label="仓库页头" tag="div" class="page-head" default-text="仓库系统 · 进销存管理" />
    <div v-if="toast" class="toast">{{ toast }}</div>

    <div class="kpi">
      <Themeable id="wh.kpi.sku" label="SKU" tag="div" class="card"><Package :size="18" /><div><div class="l">SKU</div><div class="v">{{ wh.rows.length }}</div></div></Themeable>
      <Themeable id="wh.kpi.low" label="低库存" tag="div" class="card warn"><AlertTriangle :size="18" /><div><div class="l">低库存</div><div class="v">{{ wh.lowCount }}</div></div></Themeable>
      <Themeable id="wh.kpi.sup" label="供货商" tag="div" class="card"><Truck :size="18" /><div><div class="l">供货商</div><div class="v">{{ wh.suppliers.length }}</div></div></Themeable>
    </div>

    <div class="tabs">
      <button v-for="t in [{id:'stock',l:'实时库存'},{id:'io',l:'出入库/调拨'},{id:'check',l:'盘点'},{id:'supplier',l:'供货商'},{id:'report',l:'进销存报表'}]" :key="t.id" type="button" class="chip" :class="{ active: tab === t.id }" @click="tab = t.id as typeof tab">{{ t.l }}</button>
    </div>

    <section v-if="tab === 'stock'" class="panel">
      <table class="tbl">
        <thead><tr><th>编号</th><th>名称</th><th>库位</th><th>库存</th><th>安全库存</th><th>成本</th><th>状态</th></tr></thead>
        <tbody>
          <tr v-for="r in wh.rows" :key="r.itemId" :class="{ low: r.low }">
            <td>{{ r.code }}</td><td>{{ r.name }}</td><td>{{ r.location }}</td>
            <td>{{ r.qty }}</td><td>{{ r.min }}</td>
            <td>{{ settings.business.currency }}{{ r.cost }}</td>
            <td><span class="tag" :class="r.low ? 'danger' : 'ok'">{{ r.low ? '需补货' : '正常' }}</span></td>
          </tr>
        </tbody>
      </table>
    </section>

    <section v-else-if="tab === 'io'" class="panel">
      <div class="form-row">
        <select v-model="form.itemId">
          <option value="">选择货品</option>
          <option v-for="r in wh.rows" :key="r.itemId" :value="r.itemId">{{ r.name }}</option>
        </select>
        <input v-model.number="form.qty" type="number" min="1" placeholder="数量" />
        <input v-model="form.note" placeholder="备注" />
        <button type="button" class="btn primary" @click="doIn"><ArrowDownToLine :size="14" /> 入库</button>
        <button type="button" class="btn" @click="doOut"><ArrowUpFromLine :size="14" /> 出库</button>
      </div>
      <div class="form-row">
        <input v-model="form.from" placeholder="调出库位" />
        <input v-model="form.to" placeholder="调入库位" />
        <button type="button" class="btn" @click="doTransfer"><RefreshCw :size="14" /> 调拨</button>
      </div>
      <h4>最近流水</h4>
      <table class="tbl">
        <thead><tr><th>时间</th><th>类型</th><th>品名</th><th>数量</th><th>备注</th></tr></thead>
        <tbody>
          <tr v-for="l in wh.logs.slice(0, 30)" :key="l.id">
            <td>{{ l.at.slice(5, 16).replace('T', ' ') }}</td>
            <td>{{ { in: '入库', out: '出库', transfer: '调拨', check: '盘点' }[l.type] }}</td>
            <td>{{ l.itemName }}</td><td>{{ l.qty }}</td><td>{{ l.note }}</td>
          </tr>
        </tbody>
      </table>
    </section>

    <section v-else-if="tab === 'check'" class="panel">
      <p class="hint">录入实盘数量，系统自动记盘盈/盘亏</p>
      <div class="form-row">
        <select v-model="form.itemId">
          <option value="">选择货品</option>
          <option v-for="r in wh.rows" :key="r.itemId" :value="r.itemId">{{ r.name }}（账面 {{ r.qty }}）</option>
        </select>
        <input v-model.number="form.actual" type="number" placeholder="实盘数量" />
        <button type="button" class="btn primary" @click="doCheck">登记盘点</button>
      </div>
    </section>

    <section v-else-if="tab === 'supplier'" class="panel">
      <table class="tbl">
        <thead><tr><th>名称</th><th>联系人</th><th>电话</th></tr></thead>
        <tbody>
          <tr v-for="s in wh.suppliers" :key="s.id">
            <td><input v-model="s.name" class="inp" /></td>
            <td><input v-model="s.contact" class="inp" /></td>
            <td><input v-model="s.phone" class="inp" /></td>
          </tr>
        </tbody>
      </table>
      <button type="button" class="btn" @click="wh.suppliers.push({ id: 's'+Date.now(), name: '新供货商', contact: '', phone: '' })">添加供货商</button>
    </section>

    <section v-else class="panel">
      <h4>进销存分析（演示）</h4>
      <table class="tbl">
        <thead><tr><th>品名</th><th>当前库存</th><th>成本单价</th><th>库存金额</th></tr></thead>
        <tbody>
          <tr v-for="r in wh.rows" :key="r.itemId">
            <td>{{ r.name }}</td><td>{{ r.qty }}</td>
            <td>{{ settings.business.currency }}{{ r.cost }}</td>
            <td>{{ settings.business.currency }}{{ (r.qty * r.cost).toFixed(2) }}</td>
          </tr>
        </tbody>
      </table>
    </section>
  </div>
</template>

<style scoped>
.wh{display:flex;flex-direction:column;gap:12px}
.page-head{font-size:15px;font-weight:600;color:var(--theme-text-secondary)}
.toast{background:var(--theme-success);color:#fff;padding:8px 12px;border-radius:8px;font-size:13px}
.kpi{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
.card{display:flex;gap:10px;align-items:center;background:var(--theme-bg-card);border:1px solid var(--theme-border);border-radius:12px;padding:12px;box-shadow:var(--theme-shadow);color:var(--theme-primary)}
.card.warn{color:var(--theme-warning)}
.l{font-size:11px;color:var(--theme-text-muted)}.v{font-size:20px;font-weight:700;color:var(--theme-text-primary)}
.tabs{display:flex;flex-wrap:wrap;gap:6px}
.chip{border:1px solid var(--theme-border);background:var(--theme-bg-card);border-radius:999px;padding:6px 12px;font-size:12px;cursor:pointer;font-family:inherit}
.chip.active{background:var(--theme-primary);border-color:var(--theme-primary);color:#fff}
.panel{background:var(--theme-bg-card);border:1px solid var(--theme-border);border-radius:12px;padding:14px;box-shadow:var(--theme-shadow)}
.tbl{width:100%;border-collapse:collapse;font-size:12px}
.tbl th,.tbl td{padding:8px 6px;border-bottom:1px solid var(--theme-border);text-align:left}
.tbl tr.low{background:color-mix(in srgb,var(--theme-danger) 6%,transparent)}
.tag{font-size:11px;padding:2px 8px;border-radius:999px}
.tag.ok{background:color-mix(in srgb,var(--theme-success) 15%,transparent);color:var(--theme-success)}
.tag.danger{background:color-mix(in srgb,var(--theme-danger) 15%,transparent);color:var(--theme-danger)}
.form-row{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px;align-items:center}
.form-row select,.form-row input,.inp{border:1px solid var(--theme-border);border-radius:8px;padding:6px 10px;font-family:inherit;background:var(--theme-bg-page)}
.btn{display:inline-flex;align-items:center;gap:4px;border:1px solid var(--theme-border);background:var(--theme-bg-page);border-radius:8px;padding:6px 12px;font-size:12px;cursor:pointer;font-family:inherit}
.btn.primary{background:var(--theme-primary);border-color:var(--theme-primary);color:#fff}
.hint{font-size:12px;color:var(--theme-text-muted)}
h4{margin:12px 0 8px;font-size:14px}
@media(max-width:700px){.kpi{grid-template-columns:1fr}}
</style>
