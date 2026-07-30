<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import Themeable from '@/components/theme/Themeable.vue'
import {
  useSettingsStore,
  type StoreItem,
  type PackageDef,
  type OpenPackageDef,
  type Employee,
  type RoomBox,
} from '@/stores/settings'
import {
  Settings, Package, Users, DoorOpen, CreditCard, Printer, BarChart3, Palette, LayoutGrid,
  Plus, Trash2, Save, MapPin, ChefHat,
} from '@lucide/vue'
import { toPinyin, toPinyinInitials, pinyinIndex } from '@/utils/pinyin'

const store = useSettingsStore()
const tab = ref('business')
const toast = ref('')
function showToast(m: string) {
  toast.value = m
  setTimeout(() => { toast.value = '' }, 2000)
}
function saveAll() { showToast('已保存') }

const tabs = [
  { id: 'business', label: '营业参数', icon: Settings },
  { id: 'items', label: '物品管理', icon: Package },
  { id: 'hr', label: '人事', icon: Users },
  { id: 'area', label: '区域/出品点', icon: MapPin },
  { id: 'rooms', label: '包厢', icon: DoorOpen },
  { id: 'member', label: '会员', icon: CreditCard },
  { id: 'print', label: '打印模板', icon: Printer },
  { id: 'stats', label: '统计表格', icon: BarChart3 },
  { id: 'theme-market', label: '主题市场', icon: Palette },
  { id: 'card-market', label: '卡片市场', icon: LayoutGrid },
]

/* 物品 */
const itemSub = ref<'items' | 'flavors' | 'units' | 'packages' | 'openPackages'>('items')
const selectedMajorId = ref<string | null>(null)
const selectedMinorId = ref<string | null>(null)
const itemKeyword = ref('')
const showItemDlg = ref(false)
const editingItem = ref<StoreItem | null>(null)
const itemForm = ref<Partial<StoreItem>>({})
const roomPriceLock = ref(false) // 用户改过超市/会员价后，包房价不再带动

const filteredItems = computed(() => {
  let list = [...store.items]
  if (selectedMinorId.value) list = list.filter((i) => i.categoryId === selectedMinorId.value)
  else if (selectedMajorId.value) {
    const ids = store.minorCategories(selectedMajorId.value).map((c) => c.id)
    list = list.filter((i) => ids.includes(i.categoryId))
  }
  if (itemKeyword.value.trim()) {
    const k = itemKeyword.value.trim().toLowerCase()
    list = list.filter((i) => i.name.toLowerCase().includes(k) || i.code.includes(k))
  }
  return list.sort((a, b) => a.sort - b.sort || a.code.localeCompare(b.code))
})

function selectMajor(id: string | null) {
  selectedMajorId.value = id
  selectedMinorId.value = null
}
function selectMinor(id: string) {
  selectedMinorId.value = id
  const cat = store.categories.find((c) => c.id === id)
  if (cat?.parentId) selectedMajorId.value = cat.parentId
}
function addMajor() {
  const n = store.majorCategories.length + 1
  store.categories.push({ id: `c${Date.now()}`, name: `大类${n}`, code: String(n), sort: n, parentId: null })
}
function addMinor() {
  if (!selectedMajorId.value) { showToast('请先选大类'); return }
  const maj = store.categories.find((c) => c.id === selectedMajorId.value)
  const minors = store.minorCategories(selectedMajorId.value)
  store.categories.push({
    id: `c${Date.now()}`, name: '新小类', code: `${maj?.code || ''}${minors.length + 1}`,
    sort: minors.length + 1, parentId: selectedMajorId.value,
  })
}
/** 删除小类：若仍有物品归属则禁止 */
function removeMinor(id: string) {
  const used = store.items.filter((i) => i.categoryId === id)
  if (used.length) {
    showToast(`该小类下还有 ${used.length} 个物品，请先改分类或删除物品`)
    return
  }
  if (!confirm('确定删除该小类？')) return
  store.categories = store.categories.filter((c) => c.id !== id)
  if (selectedMinorId.value === id) selectedMinorId.value = null
  showToast('小类已删除')
}
/** 删除大类：同时删其下小类（小类无物品时） */
function removeMajor(id: string) {
  const minors = store.minorCategories(id)
  const minorIds = minors.map((m) => m.id)
  const used = store.items.filter((i) => minorIds.includes(i.categoryId))
  if (used.length) {
    showToast(`该大类下还有 ${used.length} 个物品，请先改分类或删除物品`)
    return
  }
  if (!confirm(`确定删除大类及其下 ${minors.length} 个小类？`)) return
  store.categories = store.categories.filter((c) => c.id !== id && c.parentId !== id)
  if (selectedMajorId.value === id) {
    selectedMajorId.value = null
    selectedMinorId.value = null
  }
  showToast('大类已删除')
}
function openAddItem() {
  const catId = selectedMinorId.value || store.categories.find((c) => c.parentId)?.id || ''
  const maxSort = Math.max(0, ...store.items.map((i) => i.sort))
  itemForm.value = {
    id: '', name: '', code: '', categoryId: catId, enabled: true, sort: maxSort + 1, barcode: '',
    roomPrice: 0, marketPrice: 0, memberPrice: 0, costPrice: 0, allowNegativeStock: false,
    kitchenDept: '吧台', countMinConsume: false, isPackage: false, isRoomPackage: false, soldOut: false,
    commission: 0, commissionPercent: 0, flavorIds: [], unitId: store.units[0]?.id || '',
    buyQty: 0, giftQty: 0, giftAccumulate: false, allowDiscount: true, pinyin: '',
  }
  editingItem.value = null
  roomPriceLock.value = false
  showItemDlg.value = true
}
function openEditItem(it: StoreItem) {
  itemForm.value = { ...it, flavorIds: [...(it.flavorIds || [])] }
  editingItem.value = it
  roomPriceLock.value = true
  showItemDlg.value = true
}
function onRoomPriceInput(v: number) {
  itemForm.value.roomPrice = v
  if (!roomPriceLock.value) {
    itemForm.value.marketPrice = v
    itemForm.value.memberPrice = v
  }
}
function onMarketOrMemberChange() {
  roomPriceLock.value = true
}
/** 名称变化时自动生成拼音（可再手动改） */
function onItemNameInput() {
  const n = itemForm.value.name || ''
  itemForm.value.pinyin = pinyinIndex(n)
}
function saveItem() {
  const f = itemForm.value
  if (!f.name || !f.categoryId) { showToast('请填写名称并选择小类'); return }
  if (!f.pinyin) f.pinyin = pinyinIndex(f.name)
  if (editingItem.value) {
    Object.assign(editingItem.value, f)
  } else {
    store.items.push({
      ...(f as StoreItem),
      id: `i${Date.now()}`,
      flavorIds: f.flavorIds || [],
      pinyin: f.pinyin || pinyinIndex(f.name || ''),
    })
  }
  showItemDlg.value = false
  showToast('物品已保存')
}
function removeItem(id: string) {
  if (!confirm('删除该物品？')) return
  store.items = store.items.filter((i) => i.id !== id)
}

/* 套餐：选中左侧套餐物品 */
const pkgSelectedId = ref('')
const selectedPkg = computed(() => store.packages.find((p) => p.id === pkgSelectedId.value) || null)
function ensurePkgForItem(itemId: string) {
  let p = store.packages.find((x) => x.itemId === itemId)
  if (!p) {
    const it = store.items.find((i) => i.id === itemId)
    p = {
      id: `p${Date.now()}`, itemId, name: it?.name || '', code: it?.code || '', price: it?.roomPrice || 0,
      items: [{ itemId, qty: 1, multiSelect: false }], enabled: true,
    }
    store.packages.push(p)
  }
  pkgSelectedId.value = p.id
}
function addPkgLine() {
  if (!selectedPkg.value) return
  const first = store.items[0]
  if (!first) return
  selectedPkg.value.items.push({ itemId: first.id, qty: 1, multiSelect: false, groupId: '' })
}

const opSelectedId = ref('')
const selectedOp = computed(() => store.openPackages.find((p) => p.id === opSelectedId.value) || null)
function ensureOpForItem(itemId: string) {
  let p = store.openPackages.find((x) => x.itemId === itemId)
  if (!p) {
    const it = store.items.find((i) => i.id === itemId)
    p = {
      id: `op${Date.now()}`, itemId, name: it?.name || '', code: it?.code || '', price: it?.roomPrice || 0,
      lines: [{ itemId, qty: 1 }], autoKitchen: true, enabled: true,
    }
    store.openPackages.push(p)
  }
  opSelectedId.value = p.id
}
function unitName(uid: string) {
  return store.units.find((u) => u.id === uid)?.name || ''
}
function itemName(id: string) {
  return store.items.find((i) => i.id === id)?.name || id
}

/* 人事 */
const hrSub = ref<'emp' | 'dept' | 'pos'>('emp')
const empForm = ref<Partial<Employee>>({})
const showEmpDlg = ref(false)
function openAddEmp() {
  empForm.value = { id: '', name: '', code: '', deptId: store.depts[0]?.id || '', positionId: store.positions[0]?.id || '', password: '123456' }
  showEmpDlg.value = true
}
function saveEmp() {
  const f = empForm.value
  if (!f.name) return
  if (f.id) {
    const e = store.employees.find((x) => x.id === f.id)
    if (e) Object.assign(e, f)
  } else {
    store.employees.push({ ...(f as Employee), id: `e${Date.now()}` })
  }
  showEmpDlg.value = false
  showToast('员工已保存')
}

/* 当月统计 · 13 类报表 */
const statReports = [
  { id: 'sales', name: '1 营业额统计', unit: '元' },
  { id: 'daily', name: '2 销售日报', unit: '元' },
  { id: 'credit', name: '3 挂账统计', unit: '元' },
  { id: 'shift', name: '4 班次统计', unit: '元' },
  { id: 'gift', name: '5 员工赠送统计', unit: '元' },
  { id: 'free', name: '6 免单统计', unit: '元' },
  { id: 'kitchen', name: '7 出品统计', unit: '单' },
  { id: 'commission', name: '8 业绩提成统计', unit: '元' },
  { id: 'reserve', name: '9 订台统计', unit: '次' },
  { id: 'room-status', name: '10 房态统计', unit: '%' },
  { id: 'member', name: '11 会员统计', unit: '人' },
  { id: 'member-money', name: '12 会员金额统计', unit: '元' },
  { id: 'room-sales', name: '13 房台统计', unit: '元' },
]
const activeStat = ref('sales')
const chartDays = ref([
  { d: '07-22', v: 8200 }, { d: '07-23', v: 9100 }, { d: '07-24', v: 10500 },
  { d: '07-25', v: 9800 }, { d: '07-26', v: 11200 }, { d: '07-27', v: 12100 }, { d: '07-28', v: 12860 },
])
const chartMax = computed(() => Math.max(...chartDays.value.map((x) => x.v), 1))
const dateFrom = ref('2026-07-01')
const dateTo = ref('2026-07-28')
/** 历史明细（演示，按报表切换可扩展） */
const historyRows = computed(() => {
  const base = [
    { date: '2026-07-28', name: '今日', value: 12860, extra: '开台 12' },
    { date: '2026-07-27', name: '昨日', value: 12100, extra: '开台 11' },
    { date: '2026-07-26', name: '前日', value: 11200, extra: '开台 10' },
    { date: '2026-07-25', name: '历史', value: 9800, extra: '开台 9' },
    { date: '2026-07-24', name: '历史', value: 10500, extra: '开台 10' },
  ]
  const scale: Record<string, number> = {
    sales: 1, daily: 0.92, credit: 0.15, shift: 0.5, gift: 0.08, free: 0.05,
    kitchen: 0.02, commission: 0.06, reserve: 0.01, 'room-status': 0.005,
    member: 0.003, 'member-money': 0.4, 'room-sales': 0.7,
  }
  const s = scale[activeStat.value] ?? 1
  return base.map((r) => ({
    ...r,
    value: Math.round(r.value * s * 100) / 100,
  }))
})
function exportStat() {
  const name = statReports.find((r) => r.id === activeStat.value)?.name || '报表'
  const header = '日期,说明,数值,备注\n'
  const body = historyRows.value
    .map((r) => `${r.date},${r.name},${r.value},${r.extra}`)
    .join('\n')
  const blob = new Blob(['\ufeff' + header + body], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `${name}_${dateFrom.value}_${dateTo.value}.csv`
  a.click()
  showToast('已导出 Excel/CSV')
}
function printStat() {
  showToast('已发送打印（演示）')
}

const kitchenDeptOptions = ['吧台', '厨房', '外卖', '水果', '收银']
</script>

<template>
  <div class="settings">
    <Themeable id="set.header" label="设置页头" tag="div" class="page-head" default-text="系统设置" />
    <div class="layout">
      <nav class="nav">
        <button v-for="t in tabs" :key="t.id" type="button" class="nav-btn" :class="{ active: tab === t.id }" @click="tab = t.id">
          <component :is="t.icon" :size="15" /> {{ t.label }}
        </button>
      </nav>
      <div class="main">
        <div v-if="toast" class="toast">{{ toast }}</div>

        <!-- 营业参数：整洁两列，无演示框 -->
        <section v-if="tab === 'business'" class="panel">
          <h3>营业参数</h3>
          <p class="hint">买单时程序按抹零规则自动计算实收，无需在此演示。</p>
          <div class="form-2">
            <label class="f"><span>门店名称</span><input v-model="store.business.shopName" /></label>
            <label class="f"><span>营业时间</span>
              <div class="row"><input v-model="store.business.openTime" type="time" /><span>至</span><input v-model="store.business.closeTime" type="time" /></div>
            </label>
            <label class="f"><span>货币符号</span>
              <select v-model="store.business.currency">
                <option value="¥">¥</option><option value="$">$</option><option value="HK$">HK$</option><option value="€">€</option>
              </select>
            </label>
            <label class="f"><span>抹零规则</span>
              <select v-model="store.business.roundingRule">
                <option value="none">不抹零</option>
                <option value="round">四舍五入到十位</option>
                <option value="floor">向下抹零</option>
                <option value="ceil">向上进位</option>
              </select>
            </label>
            <label class="sw"><input v-model="store.business.autoDeliver" type="checkbox" /><span>出品自动送达</span></label>
            <label class="sw"><input v-model="store.business.showPackageChildren" type="checkbox" /><span>开房套餐显示子商品</span></label>
            <label class="sw"><input v-model="store.business.refundRequireSwipe" type="checkbox" /><span>退单需刷卡授权</span></label>
            <label class="sw"><input v-model="store.business.freeOrderRequireSwipe" type="checkbox" /><span>免单需刷卡授权</span></label>
            <div class="f full row-fields">
              <label class="sw"><input v-model="store.business.reserveAutoCancelEnabled" type="checkbox" /><span>预定自动取消</span></label>
              <label class="f inline" v-if="store.business.reserveAutoCancelEnabled">
                <span>超时（分钟）</span>
                <input v-model.number="store.business.reserveAutoCancelMinutes" type="number" min="5" style="width:80px" />
              </label>
            </div>
            <div class="f">
              <span>赠送额度模式</span>
              <div class="row">
                <label><input v-model="store.business.giftAmountMode" type="radio" value="monthly_reset" /> 每月初始</label>
                <label><input v-model="store.business.giftAmountMode" type="radio" value="accumulate" /> 累加</label>
              </div>
            </div>
          </div>
          <button type="button" class="save" @click="saveAll"><Save :size="14" /> 保存</button>
        </section>

        <!-- 物品 -->
        <section v-else-if="tab === 'items'" class="panel">
          <div class="sub">
            <button v-for="s in [{id:'items',l:'物品'},{id:'flavors',l:'口味'},{id:'units',l:'单位'},{id:'packages',l:'套餐'},{id:'openPackages',l:'开房套餐'}]" :key="s.id" type="button" class="chip" :class="{ active: itemSub===s.id }" @click="itemSub=s.id as any">{{ s.l }}</button>
          </div>

          <div v-if="itemSub==='items'" class="item-layout">
            <aside class="tree">
              <div class="tree-h">分类 <button type="button" class="mini" @click="addMajor">+大类</button></div>
              <button type="button" class="ti" :class="{ on: !selectedMajorId }" @click="selectMajor(null)">全部</button>
              <div v-for="maj in store.majorCategories" :key="maj.id">
                <div class="ti-row">
                  <button type="button" class="ti" :class="{ on: selectedMajorId===maj.id && !selectedMinorId }" @click="selectMajor(maj.id)">{{ maj.code }}</button>
                  <input v-model="maj.name" class="cat-name" @click.stop />
                  <button type="button" class="mini danger cat-del" title="删除大类" @click.stop="removeMajor(maj.id)">删</button>
                </div>
                <div v-for="min in store.minorCategories(maj.id)" :key="min.id" class="ti-row sub">
                  <button type="button" class="ti" :class="{ on: selectedMinorId===min.id }" @click="selectMinor(min.id)">{{ min.code }}</button>
                  <input v-model="min.name" class="cat-name" @click.stop />
                  <button type="button" class="mini danger cat-del" title="删除小类" @click.stop="removeMinor(min.id)">删</button>
                </div>
              </div>
              <button type="button" class="mini" :disabled="!selectedMajorId" @click="addMinor">+小类</button>
            </aside>
            <div>
              <div class="row gap">
                <input v-model="itemKeyword" class="search" placeholder="搜索" />
                <button type="button" class="mini primary" @click="openAddItem">+ 添加物品</button>
              </div>
              <table class="tbl">
                <thead>
                  <tr>
                    <th>序号</th><th>启用</th><th>编号</th><th>名称</th>
                    <th>包房价</th><th>超市价</th><th>会员价</th>
                    <th>出品</th><th>套餐</th><th>开房套餐</th><th>打折</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="it in filteredItems" :key="it.id" @dblclick="openEditItem(it)">
                    <td><input v-model.number="it.sort" type="number" class="num" /></td>
                    <td><input v-model="it.enabled" type="checkbox" /></td>
                    <td>{{ it.code }}</td>
                    <td>{{ it.name }}</td>
                    <td>{{ it.roomPrice }}</td>
                    <td>{{ it.marketPrice }}</td>
                    <td>{{ it.memberPrice }}</td>
                    <td>{{ it.kitchenDept }}</td>
                    <td><input v-model="it.isPackage" type="checkbox" /></td>
                    <td><input v-model="it.isRoomPackage" type="checkbox" /></td>
                    <td><input v-model="it.allowDiscount" type="checkbox" /></td>
                    <td>
                      <button type="button" class="mini" @click="openEditItem(it)">编辑</button>
                      <button type="button" class="mini danger" @click="removeItem(it.id)">删</button>
                    </td>
                  </tr>
                </tbody>
              </table>
              <p class="hint">双击或点编辑打开弹窗；调整序号改变前后顺序；包房价输入时超市/会员价默认同步，单独改后不再跟随。</p>
            </div>
          </div>

          <div v-else-if="itemSub==='flavors'">
            <button type="button" class="mini primary" @click="store.flavors.push({ id:'f'+Date.now(), name:'新口味', options:['选项1'] })">+口味组</button>
            <div v-for="f in store.flavors" :key="f.id" class="row gap" style="margin:8px 0">
              <input v-model="f.name" />
              <input class="grow" :value="f.options.join(',')" @change="f.options=($event.target as HTMLInputElement).value.split(/[,，]/).map(s=>s.trim()).filter(Boolean)" />
              <button type="button" class="mini danger" @click="store.flavors=store.flavors.filter(x=>x.id!==f.id)">删</button>
            </div>
          </div>
          <div v-else-if="itemSub==='units'">
            <button type="button" class="mini primary" @click="store.units.push({ id:'u'+Date.now(), name:'新单位' })">+单位</button>
            <div v-for="u in store.units" :key="u.id" class="row gap" style="margin:8px 0">
              <input v-model="u.name" /><button type="button" class="mini danger" @click="store.units=store.units.filter(x=>x.id!==u.id)">删</button>
            </div>
          </div>

          <!-- 套餐：左物品右明细 -->
          <div v-else-if="itemSub==='packages'" class="split">
            <div class="left-list">
              <p class="hint">勾选「套餐」的物品</p>
              <button
                v-for="it in store.packageableItems"
                :key="it.id"
                type="button"
                class="list-item"
                :class="{ on: selectedPkg?.itemId === it.id }"
                @click="ensurePkgForItem(it.id)"
              >
                <strong>{{ it.name }}</strong>
                <span>{{ store.business.currency }}{{ it.roomPrice }}</span>
              </button>
            </div>
            <div class="right-detail" v-if="selectedPkg">
              <h4>{{ selectedPkg.name }} · {{ store.business.currency }}{{ selectedPkg.price }}</h4>
              <button type="button" class="mini" @click="addPkgLine">+ 子物品</button>
              <table class="tbl">
                <thead><tr><th>物品</th><th>数量</th><th>多选一</th><th>组</th><th></th></tr></thead>
                <tbody>
                  <tr v-for="(line, idx) in selectedPkg.items" :key="idx">
                    <td>
                      <select v-model="line.itemId">
                        <option v-for="it in store.items" :key="it.id" :value="it.id">{{ it.name }}</option>
                      </select>
                    </td>
                    <td><input v-model.number="line.qty" type="number" class="num" min="1" /></td>
                    <td><input v-model="line.multiSelect" type="checkbox" /></td>
                    <td><input v-model="line.groupId" class="num" placeholder="组id" /></td>
                    <td><button type="button" class="mini danger" @click="selectedPkg.items.splice(idx,1)">删</button></td>
                  </tr>
                </tbody>
              </table>
              <p class="hint">多选一：同组内点单时弹出选择（如雪碧/冰红茶/冰绿茶四选一）。</p>
            </div>
            <div v-else class="right-detail muted">请从左侧选择套餐物品</div>
          </div>

          <!-- 开房套餐 -->
          <div v-else-if="itemSub==='openPackages'" class="split">
            <div class="left-list">
              <p class="hint">勾选「开房套餐」的物品（仅此行有价）</p>
              <button
                v-for="it in store.roomPackageItems"
                :key="it.id"
                type="button"
                class="list-item"
                :class="{ on: selectedOp?.itemId === it.id }"
                @click="ensureOpForItem(it.id)"
              >
                <strong>{{ it.name }}</strong>
                <span>{{ store.business.currency }}{{ it.roomPrice }}</span>
              </button>
            </div>
            <div class="right-detail" v-if="selectedOp">
              <h4>{{ selectedOp.name }} · 售价 {{ store.business.currency }}{{ selectedOp.price }}</h4>
              <label class="sw"><input v-model="selectedOp.autoKitchen" type="checkbox" /> 开房自动出品</label>
              <button type="button" class="mini" @click="selectedOp.lines.push({ itemId: store.items[0]?.id || '', qty: 1 })">+ 配送物</button>
              <table class="tbl">
                <thead><tr><th>物品</th><th>数量</th><th>单位</th><th>账单价</th><th></th></tr></thead>
                <tbody>
                  <tr v-for="(line, idx) in selectedOp.lines" :key="idx">
                    <td>
                      <select v-model="line.itemId">
                        <option v-for="it in store.items" :key="it.id" :value="it.id">{{ it.name }}</option>
                      </select>
                    </td>
                    <td><input v-model.number="line.qty" type="number" class="num" /></td>
                    <td>{{ unitName(store.items.find(i=>i.id===line.itemId)?.unitId || '') }}</td>
                    <td>{{ idx === 0 && line.itemId === selectedOp.itemId ? selectedOp.price : 0 }}</td>
                    <td><button type="button" class="mini danger" @click="selectedOp.lines.splice(idx,1)">删</button></td>
                  </tr>
                </tbody>
              </table>
              <p class="hint">配送子物品账单价格为 0；包厢添加时可下拉选择本开房套餐。</p>
            </div>
            <div v-else class="right-detail muted">请从左侧选择开房套餐物品</div>
          </div>
        </section>

        <!-- 人事 -->
        <section v-else-if="tab === 'hr'" class="panel">
          <div class="sub">
            <button type="button" class="chip" :class="{ active: hrSub==='dept' }" @click="hrSub='dept'">部门</button>
            <button type="button" class="chip" :class="{ active: hrSub==='pos' }" @click="hrSub='pos'">职位权限</button>
            <button type="button" class="chip" :class="{ active: hrSub==='emp' }" @click="hrSub='emp'">员工</button>
          </div>
          <div v-if="hrSub==='dept'">
            <button type="button" class="mini primary" @click="store.depts.push({ id:'d'+Date.now(), name:'新部门', commissionOn:true })">+部门</button>
            <div v-for="d in store.depts" :key="d.id" class="row gap" style="margin:8px 0">
              <input v-model="d.name" />
              <label class="sw"><input v-model="d.commissionOn" type="checkbox" /> 提成</label>
              <button type="button" class="mini danger" @click="store.depts=store.depts.filter(x=>x.id!==d.id)">删</button>
            </div>
          </div>
          <div v-else-if="hrSub==='pos'">
            <button type="button" class="mini primary" @click="store.positions.push({ id:'pos'+Date.now(), name:'新职位', canFreeOrder:false, creditQuota:0, giftQuota:0, canOrder:true, loginPos:false, loginBar:false, loginKitchen:false, loginFruit:false, canRefund:false, canBook:false, commissionOn:false, voiceOff:false })">+职位</button>
            <div v-for="p in store.positions" :key="p.id" class="pos-card">
              <input v-model="p.name" class="title" />
              <div class="checks">
                <label><input v-model="p.canFreeOrder" type="checkbox" /> 免单授权</label>
                <label>挂账限额 <input v-model.number="p.creditQuota" type="number" class="num" /></label>
                <label>赠送限额 <input v-model.number="p.giftQuota" type="number" class="num" /></label>
                <label><input v-model="p.canOrder" type="checkbox" /> 点单</label>
                <label><input v-model="p.loginPos" type="checkbox" /> 收银登录</label>
                <label><input v-model="p.loginBar" type="checkbox" /> 吧台出品</label>
                <label><input v-model="p.loginKitchen" type="checkbox" /> 厨房出品</label>
                <label><input v-model="p.loginFruit" type="checkbox" /> 水果出品</label>
                <label><input v-model="p.canRefund" type="checkbox" /> 退单授权</label>
                <label><input v-model="p.canBook" type="checkbox" /> 订房</label>
                <label><input v-model="p.commissionOn" type="checkbox" /> 提成</label>
                <label><input v-model="p.voiceOff" type="checkbox" /> 语音关闭</label>
              </div>
            </div>
          </div>
          <div v-else>
            <button type="button" class="mini primary" @click="openAddEmp">+员工</button>
            <table class="tbl">
              <thead><tr><th>编号</th><th>姓名</th><th>部门</th><th>职位</th><th></th></tr></thead>
              <tbody>
                <tr v-for="e in store.employees" :key="e.id">
                  <td>{{ e.code }}</td><td>{{ e.name }}</td>
                  <td>{{ store.depts.find(d=>d.id===e.deptId)?.name }}</td>
                  <td>{{ store.positions.find(p=>p.id===e.positionId)?.name }}</td>
                  <td>
                    <button type="button" class="mini" @click="empForm={...e}; showEmpDlg=true">编辑</button>
                    <button type="button" class="mini danger" @click="store.employees=store.employees.filter(x=>x.id!==e.id)">删</button>
                  </td>
                </tr>
              </tbody>
            </table>
            <p class="hint">前端登录：职务 + 密码，进入职位授权的页面。</p>
          </div>
        </section>

        <!-- 区域 / 出品点 / 房型（均包 Themeable，可主题编辑） -->
        <section v-else-if="tab === 'area'" class="panel">
          <Themeable id="set.area.panel" label="区域设置面板" tag="div" class="theme-block">
            <Themeable id="set.area.title" label="区域标题" tag="h3" default-text="区域" />
            <button type="button" class="mini primary" @click="store.areas.push({ id:'a'+Date.now(), name:'新区域' })">+区域</button>
            <Themeable
              v-for="a in store.areas"
              :key="a.id"
              :id="`set.area.row.${a.id}`"
              :label="`区域-${a.name || a.id}`"
              tag="div"
              class="row gap theme-block"
              style="margin:6px 0;padding:8px;min-height:40px"
            >
              <input v-model="a.name" />
              <button type="button" class="mini danger" @click="store.areas=store.areas.filter(x=>x.id!==a.id)">删</button>
            </Themeable>
            <p v-if="!store.areas.length" class="hint">添加区域后，开启主题编辑可点选每一行</p>
          </Themeable>

          <Themeable id="set.station.panel" label="出品点面板" tag="div" class="theme-block" style="margin-top:16px">
            <Themeable id="set.station.title" label="出品点标题" tag="h3" default-text="出品点" />
            <button type="button" class="mini primary" @click="store.kitchenStations.push({ id:'ks'+Date.now(), name:'新出品点', type:'吧台', areaId:store.areas[0]?.id||'', printer:'', ip:'', printMode:'one', printCount:1 })">+出品点</button>
            <Themeable id="set.station.table" label="出品点表格" tag="div">
            <table class="tbl">
              <thead><tr><th>名称</th><th>类型</th><th>区域</th><th>打印机</th><th>IP</th><th>方式</th><th>次数</th></tr></thead>
              <tbody>
                <tr v-for="k in store.kitchenStations" :key="k.id">
                  <td><input v-model="k.name" /></td>
                  <td>
                    <select v-model="k.type">
                      <option v-for="t in kitchenDeptOptions" :key="t" :value="t">{{ t }}</option>
                    </select>
                  </td>
                  <td>
                    <select v-model="k.areaId">
                      <option v-for="a in store.areas" :key="a.id" :value="a.id">{{ a.name }}</option>
                    </select>
                  </td>
                  <td><input v-model="k.printer" /></td>
                  <td><input v-model="k.ip" /></td>
                  <td>
                    <select v-model="k.printMode">
                      <option value="one">一品一单</option>
                      <option value="merge">合并出单</option>
                    </select>
                  </td>
                  <td><input v-model.number="k.printCount" type="number" class="num" min="1" /></td>
                </tr>
              </tbody>
            </table>
            </Themeable>
          </Themeable>

          <Themeable id="set.roomtype.panel" label="房台类型面板" tag="div" class="theme-block" style="margin-top:16px">
            <Themeable id="set.roomtype.title" label="房台类型标题" tag="h3" default-text="房台类型" />
            <button type="button" class="mini primary" @click="store.roomTypes.push({ id:'rt'+Date.now(), name:'新类型' })">+类型</button>
            <Themeable
              v-for="rt in store.roomTypes"
              :key="rt.id"
              :id="`set.roomtype.row.${rt.id}`"
              :label="`房型-${rt.name || rt.id}`"
              tag="div"
              class="row gap theme-block"
              style="margin:6px 0;padding:8px;min-height:40px"
            >
              <input v-model="rt.name" />
              <button type="button" class="mini danger" @click="store.roomTypes=store.roomTypes.filter(x=>x.id!==rt.id)">删</button>
            </Themeable>
          </Themeable>
        </section>

        <!-- 包厢 -->
        <section v-else-if="tab === 'rooms'" class="panel">
          <button type="button" class="mini primary" @click="store.rooms.push({ id:'r'+Date.now(), name:'新包厢', areaId:store.areas[0]?.id||'', typeId:store.roomTypes[0]?.id||'', billing:'min_consume', minConsume:0, hourPrice:0, openPackageId:'', ip:'' })">+包厢</button>
          <table class="tbl">
            <thead><tr><th>名称</th><th>区域</th><th>类型</th><th>计费</th><th>低消/小时价</th><th>开房套餐</th><th>IP</th></tr></thead>
            <tbody>
              <tr v-for="r in store.rooms" :key="r.id">
                <td><input v-model="r.name" /></td>
                <td>
                  <select v-model="r.areaId"><option v-for="a in store.areas" :key="a.id" :value="a.id">{{ a.name }}</option></select>
                </td>
                <td>
                  <select v-model="r.typeId"><option v-for="t in store.roomTypes" :key="t.id" :value="t.id">{{ t.name }}</option></select>
                </td>
                <td>
                  <select v-model="r.billing">
                    <option value="min_consume">低消</option>
                    <option value="timed">计时</option>
                    <option value="free">免费</option>
                  </select>
                </td>
                <td>
                  <input v-if="r.billing==='min_consume'" v-model.number="r.minConsume" type="number" class="num" placeholder="低消" />
                  <input v-else-if="r.billing==='timed'" v-model.number="r.hourPrice" type="number" class="num" placeholder="小时价" />
                  <span v-else>—</span>
                </td>
                <td>
                  <select v-model="r.openPackageId">
                    <option value="">无</option>
                    <option v-for="p in store.openPackages" :key="p.id" :value="p.id">{{ p.name }}</option>
                  </select>
                </td>
                <td><input v-model="r.ip" /></td>
              </tr>
            </tbody>
          </table>
        </section>

        <!-- 会员 -->
        <section v-else-if="tab === 'member'" class="panel">
          <h3>充值规则（按编号顺序）</h3>
          <button type="button" class="mini" @click="store.memberRules.rechargeRules.push({ id:'rr'+Date.now(), sort: store.memberRules.rechargeRules.length+1, pay:0, gift:0, label:'' })">+规则</button>
          <table class="tbl">
            <thead><tr><th>序号</th><th>充</th><th>送</th><th>说明</th></tr></thead>
            <tbody>
              <tr v-for="r in store.memberRules.rechargeRules.sort((a,b)=>a.sort-b.sort)" :key="r.id">
                <td><input v-model.number="r.sort" type="number" class="num" /></td>
                <td><input v-model.number="r.pay" type="number" class="num" /></td>
                <td><input v-model.number="r.gift" type="number" class="num" /></td>
                <td><input v-model="r.label" /></td>
              </tr>
            </tbody>
          </table>
          <h3>会员卡升级规则</h3>
          <button type="button" class="mini" @click="store.memberRules.upgradeRules.push({ id:'ur'+Date.now(), level:'新等级', minRecharge:0, discount:10 })">+升级</button>
          <table class="tbl">
            <thead><tr><th>等级</th><th>累计充值达到</th><th>折扣（折）</th></tr></thead>
            <tbody>
              <tr v-for="u in store.memberRules.upgradeRules" :key="u.id">
                <td><input v-model="u.level" /></td>
                <td><input v-model.number="u.minRecharge" type="number" class="num" /></td>
                <td><input v-model.number="u.discount" type="number" class="num" step="0.1" /></td>
              </tr>
            </tbody>
          </table>
          <div class="form-2" style="margin-top:12px">
            <label class="f"><span>积分（每消费1元）</span><input v-model.number="store.memberRules.pointsRate" type="number" step="0.1" /></label>
            <label class="f"><span>默认折扣</span><input v-model.number="store.memberRules.discountRate" type="number" step="0.1" /></label>
            <label class="f full"><span>积分兑换</span><input v-model="store.memberRules.pointsExchange" /></label>
          </div>
        </section>

        <!-- 打印 -->
        <section v-else-if="tab === 'print'" class="panel">
          <div v-for="pt in store.printTemplates" :key="pt.id" style="margin-bottom:12px">
            <strong>{{ pt.type }}</strong>
            <textarea v-model="pt.content" rows="4" style="width:100%;margin-top:6px;font-family:monospace" />
          </div>
        </section>

        <!-- 统计可视化 · 当月 13 类 -->
        <section v-else-if="tab === 'stats'" class="panel">
          <Themeable id="set.stats.header" label="统计标题" tag="h3" default-text="当月统计 · 可视化" />
          <div class="stat-grid">
            <button
              v-for="r in statReports"
              :key="r.id"
              type="button"
              class="stat-card"
              :class="{ active: activeStat === r.id }"
              @click="activeStat = r.id"
            >
              {{ r.name }}
            </button>
          </div>
          <div class="row gap" style="margin-top:12px">
            <label>从 <input v-model="dateFrom" type="date" /></label>
            <label>至 <input v-model="dateTo" type="date" /></label>
            <button type="button" class="mini" @click="showToast('已按日期筛选历史')">筛选</button>
            <button type="button" class="mini" @click="printStat">打印</button>
            <button type="button" class="mini primary" @click="exportStat">导出 Excel</button>
          </div>
          <Themeable id="set.stats.chart" label="统计图表" tag="div" class="chart">
            <div v-for="c in chartDays" :key="c.d" class="bar-col">
              <div class="bar" :style="{ height: (c.v / chartMax * 120) + 'px' }" :title="String(c.v)" />
              <span>{{ c.d }}</span>
            </div>
          </Themeable>
          <h4 style="margin:14px 0 8px">
            {{ statReports.find((r) => r.id === activeStat)?.name }} · Excel 明细
          </h4>
          <table class="tbl excel">
            <thead>
              <tr>
                <th>日期</th>
                <th>说明</th>
                <th>数值</th>
                <th>备注</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="h in historyRows" :key="h.date + h.name">
                <td>{{ h.date }}</td>
                <td>{{ h.name }}</td>
                <td>{{ h.value }}</td>
                <td>{{ h.extra }}</td>
              </tr>
            </tbody>
          </table>
          <p class="hint">支持历史查询与导出；正式环境对接后端按日期区间拉取。</p>
        </section>

        <section v-else-if="tab === 'theme-market'" class="panel">
          <p class="hint">主题市场见主题管理页；此处保留入口。</p>
        </section>
        <section v-else-if="tab === 'card-market'" class="panel">
          <p class="hint">卡片市场演示入口。</p>
        </section>
      </div>
    </div>

    <!-- 物品弹窗 -->
    <div v-if="showItemDlg" class="mask" @click.self="showItemDlg=false">
      <div class="dlg">
        <h4>{{ editingItem ? '编辑物品' : '添加物品' }}</h4>
        <div class="form-2">
          <label class="f"><span>名称</span><input v-model="itemForm.name" @input="onItemNameInput" /></label>
          <label class="f"><span>拼音（点餐搜索）</span><input v-model="itemForm.pinyin" placeholder="根据名称自动填写，可改" /></label>
          <label class="f"><span>编号</span><input v-model="itemForm.code" /></label>
          <label class="f"><span>序号</span><input v-model.number="itemForm.sort" type="number" /></label>
          <label class="f"><span>扫码</span><input v-model="itemForm.barcode" /></label>
          <label class="f"><span>小类</span>
            <select v-model="itemForm.categoryId">
              <option v-for="c in store.categories.filter(x=>x.parentId)" :key="c.id" :value="c.id">{{ c.code }} {{ c.name }}</option>
            </select>
          </label>
          <label class="f"><span>单位</span>
            <select v-model="itemForm.unitId">
              <option v-for="u in store.units" :key="u.id" :value="u.id">{{ u.name }}</option>
            </select>
          </label>
          <label class="f"><span>包房价</span><input :value="itemForm.roomPrice" type="number" @input="onRoomPriceInput(Number(($event.target as HTMLInputElement).value))" /></label>
          <label class="f"><span>超市价</span><input v-model.number="itemForm.marketPrice" type="number" @change="onMarketOrMemberChange" /></label>
          <label class="f"><span>会员价</span><input v-model.number="itemForm.memberPrice" type="number" @change="onMarketOrMemberChange" /></label>
          <label class="f"><span>成本价</span><input v-model.number="itemForm.costPrice" type="number" /></label>
          <label class="f"><span>出品部门</span>
            <select v-model="itemForm.kitchenDept">
              <option v-for="d in kitchenDeptOptions" :key="d" :value="d">{{ d }}</option>
            </select>
          </label>
          <label class="f"><span>买几</span><input v-model.number="itemForm.buyQty" type="number" min="0" /></label>
          <label class="f"><span>送几</span><input v-model.number="itemForm.giftQty" type="number" min="0" /></label>
          <label class="sw"><input v-model="itemForm.giftAccumulate" type="checkbox" /><span>数量累计也送（不勾选则须一次买满）</span></label>
          <label class="sw"><input v-model="itemForm.allowDiscount" type="checkbox" /><span>参与买单打折</span></label>
          <label class="sw"><input v-model="itemForm.isPackage" type="checkbox" /><span>套餐</span></label>
          <label class="sw"><input v-model="itemForm.isRoomPackage" type="checkbox" /><span>开房套餐</span></label>
          <label class="sw"><input v-model="itemForm.countMinConsume" type="checkbox" /><span>计入低消</span></label>
          <label class="sw"><input v-model="itemForm.enabled" type="checkbox" /><span>启用</span></label>
          <label class="f full"><span>口味</span>
            <select v-model="itemForm.flavorIds" multiple style="min-height:60px">
              <option v-for="f in store.flavors" :key="f.id" :value="f.id">{{ f.name }}</option>
            </select>
          </label>
        </div>
        <div class="row gap" style="margin-top:12px;justify-content:flex-end">
          <button type="button" class="mini" @click="showItemDlg=false">取消</button>
          <button type="button" class="mini primary" @click="saveItem">保存</button>
        </div>
      </div>
    </div>

    <!-- 员工弹窗 -->
    <div v-if="showEmpDlg" class="mask" @click.self="showEmpDlg=false">
      <div class="dlg">
        <h4>员工</h4>
        <div class="form-2">
          <label class="f"><span>姓名</span><input v-model="empForm.name" /></label>
          <label class="f"><span>编号</span><input v-model="empForm.code" /></label>
          <label class="f"><span>部门</span>
            <select v-model="empForm.deptId"><option v-for="d in store.depts" :key="d.id" :value="d.id">{{ d.name }}</option></select>
          </label>
          <label class="f"><span>职位</span>
            <select v-model="empForm.positionId"><option v-for="p in store.positions" :key="p.id" :value="p.id">{{ p.name }}</option></select>
          </label>
          <label class="f"><span>密码</span><input v-model="empForm.password" type="password" /></label>
        </div>
        <div class="row gap" style="margin-top:12px;justify-content:flex-end">
          <button type="button" class="mini" @click="showEmpDlg=false">取消</button>
          <button type="button" class="mini primary" @click="saveEmp">保存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.settings{display:flex;flex-direction:column;gap:10px}
.page-head{font-size:15px;font-weight:600;color:var(--theme-text-secondary)}
.layout{display:grid;grid-template-columns:170px 1fr;gap:12px;min-height:600px}
.nav{display:flex;flex-direction:column;gap:4px;background:var(--theme-bg-card);border:1px solid var(--theme-border);border-radius:12px;padding:8px;height:fit-content;position:sticky;top:72px}
.nav-btn{display:flex;align-items:center;gap:8px;border:none;background:transparent;padding:9px 10px;border-radius:8px;font-size:12px;cursor:pointer;font-family:inherit;color:var(--theme-text-secondary);text-align:left}
.nav-btn.active{background:var(--theme-primary);color:#fff}
.main{min-width:0}
.panel{background:var(--theme-bg-card);border:1px solid var(--theme-border);border-radius:12px;padding:16px;box-shadow:var(--theme-shadow)}
.panel h3{margin:0 0 10px;font-size:15px}
.hint{font-size:12px;color:var(--theme-text-muted);margin:0 0 12px;line-height:1.5}
.toast{background:var(--theme-success);color:#fff;padding:8px 12px;border-radius:8px;font-size:13px;margin-bottom:8px}
.form-2{display:grid;grid-template-columns:1fr 1fr;gap:12px 16px}
.f{display:flex;flex-direction:column;gap:4px;font-size:12px;color:var(--theme-text-secondary)}
.f.full{grid-column:1/-1}
.f.inline{flex-direction:row;align-items:center;gap:8px}
.f input,.f select,input,select,textarea{border:1px solid var(--theme-border);border-radius:8px;padding:7px 10px;font-family:inherit;background:var(--theme-bg-page);font-size:13px}
.sw{display:flex;align-items:center;gap:8px;font-size:13px;color:var(--theme-text-secondary)}
.row{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.row.gap{gap:10px}
.row-fields{display:flex;align-items:center;gap:16px;flex-wrap:wrap}
.save{margin-top:14px;display:inline-flex;align-items:center;gap:6px;border:none;background:var(--theme-primary);color:#fff;border-radius:10px;padding:9px 14px;font-size:13px;cursor:pointer;font-family:inherit}
.sub{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px}
.chip{border:1px solid var(--theme-border);background:var(--theme-bg-page);border-radius:999px;padding:5px 12px;font-size:12px;cursor:pointer;font-family:inherit}
.chip.active{background:var(--theme-primary);border-color:var(--theme-primary);color:#fff}
.item-layout{display:grid;grid-template-columns:200px 1fr;gap:12px}
.tree{border:1px solid var(--theme-border);border-radius:10px;padding:8px;background:var(--theme-bg-page)}
.tree-h{display:flex;justify-content:space-between;font-size:12px;margin-bottom:6px}
.ti{border:none;background:transparent;padding:4px 6px;border-radius:6px;font-size:12px;cursor:pointer;font-family:inherit;color:var(--theme-text-secondary)}
.ti.on{background:color-mix(in srgb,var(--theme-primary) 15%,transparent);color:var(--theme-primary)}
.ti-row{display:flex;align-items:center;gap:4px}
.ti-row.sub{padding-left:12px}
.cat-name{flex:1;border:1px solid transparent;background:transparent;padding:2px 4px;font-size:12px;border-radius:4px;min-width:0}
.cat-name:focus{border-color:var(--theme-border);background:#fff}
.cat-del{padding:2px 6px;flex-shrink:0;opacity:.7}
.cat-del:hover{opacity:1}
.mini{border:1px solid var(--theme-border);background:var(--theme-bg-card);border-radius:6px;padding:4px 8px;font-size:11px;cursor:pointer;font-family:inherit}
.mini.primary{background:var(--theme-primary);border-color:var(--theme-primary);color:#fff}
.mini.danger{color:var(--theme-danger)}
.tbl{width:100%;border-collapse:collapse;font-size:12px}
.tbl th,.tbl td{padding:6px 4px;border-bottom:1px solid var(--theme-border);text-align:left}
.num{width:64px}
.search{flex:1;border:1px solid var(--theme-border);border-radius:8px;padding:6px 10px}
.split{display:grid;grid-template-columns:220px 1fr;gap:12px;min-height:280px}
.left-list{border:1px solid var(--theme-border);border-radius:10px;padding:8px;background:var(--theme-bg-page)}
.list-item{display:flex;justify-content:space-between;width:100%;border:none;background:transparent;padding:8px;border-radius:8px;cursor:pointer;font-family:inherit;font-size:12px}
.list-item.on{background:color-mix(in srgb,var(--theme-primary) 12%,transparent)}
.right-detail{border:1px solid var(--theme-border);border-radius:10px;padding:12px}
.muted{color:var(--theme-text-muted);font-size:13px}
.pos-card{border:1px solid var(--theme-border);border-radius:10px;padding:10px;margin:8px 0}
.pos-card .title{font-weight:600;margin-bottom:8px}
.checks{display:flex;flex-wrap:wrap;gap:10px;font-size:12px}
.chart{display:flex;align-items:flex-end;gap:10px;height:150px;padding:12px 0;border-bottom:1px solid var(--theme-border);margin-top:12px}
.bar-col{flex:1;display:flex;flex-direction:column;align-items:center;gap:6px;font-size:10px;color:var(--theme-text-muted)}
.bar{width:70%;background:var(--theme-primary);border-radius:6px 6px 0 0;min-height:4px}
.stat-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:8px;margin-top:8px}
.stat-card{border:1px solid var(--theme-border);background:var(--theme-bg-page);border-radius:10px;padding:10px 12px;font-size:12px;cursor:pointer;font-family:inherit;text-align:left}
.stat-card.active{border-color:var(--theme-primary);background:color-mix(in srgb,var(--theme-primary) 12%,transparent);color:var(--theme-primary);font-weight:600}
.tbl.excel{background:#fff;border:1px solid #c6c6c6}
.tbl.excel th{background:#e7e6e6;font-weight:600}
.tbl.excel td,.tbl.excel th{border:1px solid #c6c6c6;padding:8px}
.theme-block{border-radius:8px}
.mask{position:fixed;inset:0;background:rgba(15,23,42,.45);display:flex;align-items:center;justify-content:center;z-index:1000}
.dlg{width:min(560px,94vw);max-height:90vh;overflow:auto;background:var(--theme-bg-card);border-radius:14px;padding:16px;box-shadow:var(--theme-shadow)}
.dlg h4{margin:0 0 12px}
.grow{flex:1}
@media(max-width:900px){.layout,.item-layout,.split,.form-2{grid-template-columns:1fr}}
</style>
