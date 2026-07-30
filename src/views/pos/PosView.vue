<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import Themeable from '@/components/theme/Themeable.vue'
import { usePosStore, type RoomStatus } from '@/stores/pos'
import { useSettingsStore, applyRounding } from '@/stores/settings'
import { toPinyin, toPinyinInitials, pinyinIndex } from '@/utils/pinyin'
import {
  Wifi, WifiOff, Calendar, Shield, Users, Receipt, Palette, RefreshCw,
  FileBarChart, Moon, Search, X, Lock, Play, Bookmark, BookmarkX,
  UtensilsCrossed, FileText, ArrowRightLeft, CreditCard, Undo2, Sparkles,
} from '@lucide/vue'

const pos = usePosStore()
const settings = useSettingsStore()
const clock = ref('')
let timer: number | undefined
function tick() {
  clock.value = new Date().toLocaleString('zh-CN', { hour12: false })
}
onMounted(() => {
  tick()
  timer = window.setInterval(tick, 1000)
  pos.syncRoomsFromSettings()
  document.addEventListener('click', closeCtx)
  document.addEventListener('contextmenu', onDocContext)
})
onUnmounted(() => {
  if (timer) clearInterval(timer)
  document.removeEventListener('click', closeCtx)
  document.removeEventListener('contextmenu', onDocContext)
})

const menu = ref<'rooms' | 'hall' | 'member' | 'credit' | 'report' | 'shift'>('rooms')
const toast = ref('')
function showToast(m: string) {
  toast.value = m
  setTimeout(() => { toast.value = '' }, 2200)
}

/* ---------- 右键 / 长按菜单 ---------- */
const ctx = ref({
  show: false,
  x: 0,
  y: 0,
  roomId: '' as string,
})
const longPressTimer = ref<number | null>(null)
const longPressRoomId = ref('')

function closeCtx() {
  ctx.value.show = false
}
function onDocContext(e: MouseEvent) {
  // 非房台区域右键不拦截
}
function positionMenu(clientX: number, clientY: number) {
  const w = 180
  const h = 220 // 估算
  let x = clientX
  let y = clientY
  if (x + w > window.innerWidth - 8) x = window.innerWidth - w - 8
  if (y + h > window.innerHeight - 8) y = window.innerHeight - h - 8
  if (x < 8) x = 8
  if (y < 8) y = 8
  return { x, y }
}
function openCtx(roomId: string, clientX: number, clientY: number) {
  pos.selectRoom(roomId)
  const { x, y } = positionMenu(clientX, clientY)
  ctx.value = { show: true, x, y, roomId }
}
function onRoomContext(e: MouseEvent, roomId: string) {
  e.preventDefault()
  e.stopPropagation()
  openCtx(roomId, e.clientX, e.clientY)
}
function onRoomTouchStart(e: TouchEvent, roomId: string) {
  const t = e.touches[0]
  longPressRoomId.value = roomId
  longPressTimer.value = window.setTimeout(() => {
    openCtx(roomId, t.clientX, t.clientY)
    longPressTimer.value = null
  }, 500)
}
function onRoomTouchEnd() {
  if (longPressTimer.value) {
    clearTimeout(longPressTimer.value)
    longPressTimer.value = null
  }
}
function onRoomTouchMove() {
  onRoomTouchEnd()
}

const ctxRoom = computed(() => pos.rooms.find((r) => r.id === ctx.value.roomId) || null)
const ctxStatus = computed(() => ctxRoom.value?.status || 'idle')

/* ---------- 弹窗 ---------- */
type Dialog =
  | ''
  | 'open'
  | 'reserve'
  | 'order'
  | 'bill'
  | 'transfer'
  | 'pay'
  | 'manager'
  | 'flavor'
  | 'style'
const dialog = ref<Dialog>('')
/** 界面风格：编辑中的状态色（确认后写入 store） */
const styleDraft = ref<Record<RoomStatus, { label: string; color: string; bg: string }>>({
  idle: { label: '空房', color: '#64748b', bg: '#f1f5f9' },
  reserved: { label: '预定中', color: '#2563eb', bg: '#dbeafe' },
  open: { label: '使用中', color: '#059669', bg: '#d1fae5' },
  billing: { label: '打单中', color: '#d97706', bg: '#fef3c7' },
  cleaning: { label: '清洁中', color: '#7c3aed', bg: '#ede9fe' },
})
function openStyleDialog() {
  styleDraft.value = JSON.parse(JSON.stringify(pos.statusMeta))
  dialog.value = 'style'
}
/** 根据填充色生成略深的状态文字色 */
function deriveAccent(hex: string): string {
  const h = (hex || '#888888').replace('#', '')
  if (h.length !== 6) return hex
  const r = Math.max(0, parseInt(h.slice(0, 2), 16) - 40)
  const g = Math.max(0, parseInt(h.slice(2, 4), 16) - 40)
  const b = Math.max(0, parseInt(h.slice(4, 6), 16) - 40)
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}
function onFillChange(s: RoomStatus) {
  const bg = styleDraft.value[s].bg
  styleDraft.value[s].color = deriveAccent(bg)
}
function saveStyleColors() {
  for (const k of Object.keys(styleDraft.value) as RoomStatus[]) {
    const bg = styleDraft.value[k].bg
    const color = styleDraft.value[k].color || deriveAccent(bg)
    pos.setStatusColor(k, color, bg)
  }
  dialog.value = ''
  showToast('房台填充颜色已保存')
}
function resetStyleColors() {
  pos.resetStatusColors()
  styleDraft.value = JSON.parse(JSON.stringify(pos.statusMeta))
  showToast('已恢复默认颜色')
}
const managerAction = ref<(() => void) | null>(null)
const managerCode = ref('')

const form = ref({
  guest: '',
  promoter: '',
  people: 2,
  prepay: 0,
  openPackageId: '',
  reserveTime: '',
  reserveNote: '',
  transferTo: '',
  transferMode: 'old' as 'old' | 'new' | 'merge',
  discount: 100,
  payCash: 0,
  payWechat: 0,
  payAlipay: 0,
  payMember: 0,
  payCredit: 0,
  payVoucher: 0,
  payFree: 0,
  creditPerson: '',
})

function openDialog(d: Dialog) {
  closeCtx()
  if (d === 'open' || d === 'reserve') {
    form.value.openPackageId = pos.selectedRoom?.openPackageId || ''
  }
  dialog.value = d
}
function needManager(action: () => void) {
  managerAction.value = action
  managerCode.value = ''
  dialog.value = 'manager'
}
function confirmManager() {
  if (managerCode.value !== '8888' && managerCode.value !== 'admin') {
    showToast('授权失败：演示卡号 8888')
    return
  }
  managerAction.value?.()
  dialog.value = ''
  managerAction.value = null
  showToast('经理授权成功')
}

/* 快速开台 */
function doQuickOpen() {
  if (!pos.selectedRoomId) return
  const pkg = form.value.openPackageId || pos.selectedRoom?.openPackageId || ''
  const ok = pos.openRoom(
    pos.selectedRoomId,
    form.value.guest,
    form.value.promoter,
    pkg || undefined,
  )
  if (ok) {
    if (form.value.prepay > 0 && pos.selectedRoom) {
      pos.selectedRoom.prepay += form.value.prepay
    }
    showToast('已开台 · 使用中')
    dialog.value = ''
  } else showToast('当前状态不可开台')
}

/* 预订 */
function doReserve() {
  if (!pos.selectedRoomId) return
  if (
    pos.reserve(
      pos.selectedRoomId,
      form.value.guest || '预订客人',
      '前台',
      form.value.guest,
    )
  ) {
    if (pos.selectedRoom && form.value.reserveTime) {
      pos.selectedRoom.timeLabel = form.value.reserveTime
    }
    showToast('已预订')
    dialog.value = ''
  } else showToast('不可预订')
}

function doCancelReserve() {
  closeCtx()
  if (pos.selectedRoomId && pos.cancelReserve(pos.selectedRoomId)) showToast('已取消预定')
}

/* ---------- 点餐 ---------- */
const orderLetter = ref('')
const orderCatId = ref<string | null>(null)
const orderSearch = ref('')
const cart = ref<{ id: string; name: string; price: number; qty: number; isGift: boolean; flavor?: string }[]>([])
const pendingFlavorItem = ref<{ id: string; name: string; price: number; flavorIds: string[] } | null>(null)
const selectedFlavor = ref('')

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

const orderItems = computed(() => {
  let list = settings.items.filter((i) => i.enabled && !i.soldOut && !i.isRoomPackage)
  if (orderCatId.value) {
    const minors = settings.minorCategories(orderCatId.value).map((c) => c.id)
    if (minors.length) list = list.filter((i) => minors.includes(i.categoryId) || i.categoryId === orderCatId.value)
    else list = list.filter((i) => i.categoryId === orderCatId.value)
  }
  const q = orderSearch.value.trim().toLowerCase()
  if (q) {
    list = list.filter((i) => {
      const idx = (i.pinyin || pinyinIndex(i.name)).toLowerCase()
      return idx.includes(q) || i.name.includes(q) || i.code.includes(q)
    })
  }
  if (orderLetter.value) {
    const L = orderLetter.value.toLowerCase()
    list = list.filter((i) => {
      const ini = toPinyinInitials(i.name) || (i.pinyin || '')
      return ini.toLowerCase().startsWith(L) || (i.pinyin || '').toLowerCase().startsWith(L)
    })
  }
  return list.sort((a, b) => a.sort - b.sort)
})

function openOrder() {
  cart.value = []
  orderLetter.value = ''
  orderSearch.value = ''
  orderCatId.value = null
  openDialog('order')
}
function addToCart(it: { id: string; name: string; roomPrice: number; flavorIds?: string[] }, gift = false) {
  if (it.flavorIds && it.flavorIds.length && !gift) {
    pendingFlavorItem.value = {
      id: it.id,
      name: it.name,
      price: it.roomPrice,
      flavorIds: it.flavorIds,
    }
    selectedFlavor.value = ''
    dialog.value = 'flavor'
    return
  }
  pushCart(it.id, it.name, it.roomPrice, gift)
}
function pushCart(id: string, name: string, price: number, gift = false, flavor?: string) {
  const row = cart.value.find((c) => c.id === id && c.isGift === gift && c.flavor === flavor)
  if (row) row.qty++
  else cart.value.push({ id, name, price, qty: 1, isGift: gift, flavor })
}
function confirmFlavor() {
  const p = pendingFlavorItem.value
  if (!p) return
  if (!selectedFlavor.value) {
    showToast('请选择口味')
    return
  }
  pushCart(p.id, p.name, p.price, false, selectedFlavor.value)
  pendingFlavorItem.value = null
  dialog.value = 'order'
}
function cartTotal() {
  return cart.value.reduce((s, c) => s + (c.isGift ? 0 : c.price * c.qty), 0)
}
function submitOrder(asGift = false) {
  if (!pos.selectedRoomId) return
  if (!cart.value.length) {
    showToast('购物车为空')
    return
  }
  for (const c of cart.value) {
    pos.addOrderLine(
      pos.selectedRoomId,
      { id: c.id, name: c.name, price: c.price },
      c.qty,
      asGift || c.isGift,
      c.flavor,
    )
  }
  showToast(asGift ? '赠送已落单' : '已落单')
  cart.value = []
  dialog.value = ''
}

/* 账单 */
const payable = computed(() =>
  pos.selectedRoomId
    ? pos.payableOf(pos.selectedRoomId)
    : { total: 0, afterDiscount: 0, payable: 0, waived: 0 },
)

function doDiscount() {
  if (!pos.selectedRoom) return
  pos.selectedRoom.discount = Math.max(1, Math.min(100, form.value.discount)) / 100
  showToast('折扣已设置')
}
function doRequestSettle() {
  if (pos.selectedRoomId && pos.requestSettle(pos.selectedRoomId)) {
    showToast('已申请结账 · 打单中')
    dialog.value = ''
  }
}
function doCancelSettle() {
  closeCtx()
  if (pos.selectedRoomId && pos.cancelSettleRequest(pos.selectedRoomId)) showToast('已取消申请结账')
}
function doTransfer() {
  if (!pos.selectedRoomId || !form.value.transferTo) return
  if (pos.transferRoom(pos.selectedRoomId, form.value.transferTo, form.value.transferMode)) {
    showToast('转房成功')
    dialog.value = ''
  } else showToast('转房失败')
}
function paySum() {
  const f = form.value
  return f.payCash + f.payWechat + f.payAlipay + f.payMember + f.payCredit + f.payVoucher + f.payFree
}
function doPay() {
  if (!pos.selectedRoomId) return
  const need = pos.payableOf(pos.selectedRoomId).payable
  const got = paySum()
  if (Math.abs(got - need) > 0.05 && form.value.payFree <= 0) {
    showToast('收款金额与应付不一致')
    return
  }
  const finish = () => {
    if (form.value.payCredit > 0) {
      if (!form.value.creditPerson) {
        showToast('请填挂账人')
        return
      }
      pos.credits.push({
        id: 'cr' + Date.now(),
        date: new Date().toISOString().slice(0, 10),
        roomName: pos.selectedRoom?.name || '',
        amount: form.value.payCredit,
        person: form.value.creditPerson,
        paid: false,
        payInfo: '',
      })
    }
    if (pos.collectPayment(pos.selectedRoomId!, got)) {
      showToast('收款成功 · 清洁中')
      dialog.value = ''
    }
  }
  if (form.value.payFree > 0) {
    needManager(finish)
    return
  }
  finish()
}
function setAvailable() {
  closeCtx()
  if (pos.selectedRoomId && pos.setAvailable(pos.selectedRoomId)) showToast('已置可用房')
}

/* 左键 / 双击 */
let clickTimer: number | null = null
function onRoomClick(roomId: string) {
  if (clickTimer) {
    clearTimeout(clickTimer)
    clickTimer = null
    // 双击
    pos.selectRoom(roomId)
    const r = pos.rooms.find((x) => x.id === roomId)
    if (r && (r.status === 'open' || r.status === 'billing')) openOrder()
    else if (r && (r.status === 'idle' || r.status === 'reserved')) openDialog('open')
    return
  }
  clickTimer = window.setTimeout(() => {
    pos.selectRoom(roomId)
    clickTimer = null
  }, 250)
}

const selectedInfo = computed(() => {
  const r = pos.selectedRoom
  if (!r) return '未选中房台'
  const pay = pos.payableOf(r.id)
  return `当前选中：${r.name} · ${pos.statusMeta[r.status].label} · 消费 ${pos.formatMoney(pay.afterDiscount)}`
})

/* 大厅等保留简化 */
const hallCart = ref<{ id: string; name: string; price: number; qty: number }[]>([])
const hallScan = ref('')
const hallTotal = computed(() => hallCart.value.reduce((s, c) => s + c.price * c.qty, 0))
function hallAddByCode() {
  const code = hallScan.value.trim()
  if (!code) return
  const it = settings.items.find(
    (i) => i.enabled && !i.soldOut && (i.code === code || i.barcode === code || i.name === code),
  )
  if (!it) { showToast('未找到商品'); return }
  const row = hallCart.value.find((c) => c.id === it.id)
  if (row) row.qty++
  else hallCart.value.push({ id: it.id, name: it.name, price: it.marketPrice, qty: 1 })
  hallScan.value = ''
}
function hallPay() {
  if (!hallCart.value.length) return
  const { payable } = applyRounding(hallTotal.value, settings.business.roundingRule)
  pos.todaySales = Math.round((pos.todaySales + payable) * 100) / 100
  showToast(`大厅收款 ${pos.formatMoney(payable)}`)
  hallCart.value = []
}

const statusList: RoomStatus[] = ['reserved', 'open', 'billing', 'cleaning', 'idle']
const dlgTitle: Record<string, string> = {
  open: '快速开台',
  reserve: '填写预定信息',
  order: '点餐',
  bill: '账单详情',
  transfer: '转房',
  pay: '结账收款',
  manager: '经理授权',
  flavor: '选择口味',
  style: '界面风格 · 房台状态颜色',
}

const flavorOptions = computed(() => {
  const p = pendingFlavorItem.value
  if (!p) return [] as string[]
  const opts: string[] = []
  for (const fid of p.flavorIds) {
    const f = settings.flavors.find((x) => x.id === fid)
    if (f) opts.push(...f.options.map((o) => `${f.name}:${o}`))
  }
  return opts
})
</script>

<template>
  <div class="pos">
    <div v-if="toast" class="toast">{{ toast }}</div>
    <div class="pos-top-bar">
      <Themeable id="pos.menu" label="收银菜单" tag="div" class="menu-bar">
      <button type="button" class="mbtn" :class="{ active: menu === 'rooms' }" @click="menu = 'rooms'; pos.syncRoomsFromSettings()">房台</button>
      <button type="button" class="mbtn" :class="{ active: menu === 'hall' }" @click="menu = 'hall'">大厅超市</button>
      <button type="button" class="mbtn" :class="{ active: menu === 'member' }" @click="menu = 'member'"><Users :size="14" /> 会员</button>
      <button type="button" class="mbtn" :class="{ active: menu === 'credit' }" @click="menu = 'credit'">挂账回收</button>
      <button type="button" class="mbtn" :class="{ active: dialog === 'style' }" @click="openStyleDialog"><Palette :size="14" /> 界面风格</button>
      <Themeable id="pos.statusbar" label="收银状态栏" tag="div" class="status-bar">
        <span class="sb-item">
          <Wifi v-if="pos.networkOnline" :size="14" class="ok" />
          <WifiOff v-else :size="14" class="bad" />
          {{ pos.networkOnline ? '网络已连接' : '网络断开' }}
        </span>
        <span class="sb-item"><Calendar :size="14" /> {{ clock }}</span>
        <span class="sb-item">版本 {{ pos.version }}</span>
        <span class="sb-item"><Shield :size="14" /> 授权：{{ pos.licenseOrg }}</span>
      </Themeable>
    </Themeable>
    </div>

    <template v-if="menu === 'rooms'">
      <div class="kpi-row">
        <Themeable id="pos.kpi.total" label="总包房数" tag="div" class="kpi"><div class="k-l">总包房数</div><div class="k-v">{{ pos.kpi.total }}</div></Themeable>
        <Themeable id="pos.kpi.use" label="使用中" tag="div" class="kpi use"><div class="k-l">使用中</div><div class="k-v">{{ pos.kpi.inUse }}</div></Themeable>
        <Themeable id="pos.kpi.idle" label="空闲" tag="div" class="kpi idle"><div class="k-l">空闲</div><div class="k-v">{{ pos.kpi.idle }}</div></Themeable>
        <Themeable id="pos.kpi.sales" label="今日营业额" tag="div" class="kpi sales"><div class="k-l">今日营业额</div><div class="k-v">{{ pos.formatMoney(pos.kpi.sales) }}</div></Themeable>
        <Themeable id="pos.kpi.opens" label="今日开台" tag="div" class="kpi"><div class="k-l">今日开台</div><div class="k-v">{{ pos.kpi.opens }}</div></Themeable>
      </div>

      <div class="legend">
        <span
          v-for="s in statusList"
          :key="s"
          class="leg"
          :style="{ background: pos.statusMeta[s].bg, color: pos.statusMeta[s].color, borderColor: pos.statusMeta[s].bg }"
        >
          <i :style="{ background: pos.statusMeta[s].color }" />
          {{ pos.statusMeta[s].label }} {{ pos.statusCounts[s] }}
        </span>
      </div>

      <!-- 选中信息条 -->
      <Themeable id="pos.selected.bar" label="选中房台信息条" tag="div" class="sel-bar">
        {{ selectedInfo }}
        <span class="hint-inline">左键选中 · 双击点餐/开台 · 右键或长按菜单</span>
      </Themeable>

      <!-- 仅房台网格，无右侧固定操作栏 -->
      <div class="room-panel">
        <Themeable
          v-for="r in pos.rooms"
          :key="r.id"
          :id="`pos.room.${r.id}`"
          :label="`房台-${r.name}`"
          tag="button"
          class="room-card"
          :class="{ selected: pos.selectedRoomId === r.id }"
          :style="{ '--room-fill': pos.statusMeta[r.status].bg }"
          @click="onRoomClick(r.id)"
          @contextmenu="onRoomContext($event, r.id)"
          @touchstart.passive="onRoomTouchStart($event, r.id)"
          @touchend="onRoomTouchEnd"
          @touchmove="onRoomTouchMove"
        >
          <div class="rc-top">
            <span class="rc-open-count">开房 {{ r.openCount }} 次</span>
            <span class="rc-booker">{{ r.booker || '—' }} / {{ r.bookerDept || '—' }}</span>
          </div>
          <div class="rc-mid">
            <div class="rc-no">{{ r.name }}</div>
            <div class="rc-type">{{ r.type }} · 低消 {{ pos.formatMoney(r.minConsume) }}</div>
            <div class="rc-promo">{{ r.promoter ? '带位：' + r.promoter : '\u00a0' }}</div>
          </div>
          <div class="rc-bot">
            <span>{{ r.guestName || '—' }}</span>
            <span>{{ r.timeLabel || '—' }}</span>
          </div>
          <div class="rc-status">
            {{ pos.statusMeta[r.status].label }}
          </div>
        </Themeable>
      </div>
    </template>

    <!-- 大厅超市 -->
    <section v-else-if="menu === 'hall'" class="panel">
      <h3>大厅超市收银</h3>
      <div class="row gap">
        <div class="search"><Search :size="14" /><input v-model="hallScan" placeholder="扫码/编号" @keyup.enter="hallAddByCode" /></div>
        <button type="button" class="op primary" @click="hallAddByCode">加入</button>
        <button type="button" class="op primary" @click="hallPay">收款 {{ pos.formatMoney(hallTotal) }}</button>
      </div>
      <div class="hall-products">
        <button
          v-for="it in settings.items.filter((i) => i.enabled && !i.soldOut)"
          :key="it.id"
          type="button"
          class="hall-item"
          @click="hallScan = it.code; hallAddByCode()"
        >
          <strong>{{ it.name }}</strong>
          <span>{{ pos.formatMoney(it.marketPrice) }}</span>
        </button>
      </div>
    </section>

    <section v-else-if="menu === 'member'" class="panel">
      <h3>会员</h3>
      <p class="hint">会员办理/充值请在完整版继续使用（功能保留于 store）</p>
      <table class="tbl">
        <thead><tr><th>卡号</th><th>姓名</th><th>余额</th></tr></thead>
        <tbody>
          <tr v-for="m in pos.members" :key="m.id">
            <td>{{ m.cardNo }}</td><td>{{ m.name }}</td><td>{{ pos.formatMoney(m.balance) }}</td>
          </tr>
        </tbody>
      </table>
    </section>

    <section v-else-if="menu === 'credit'" class="panel">
      <h3>挂账回收</h3>
      <table class="tbl">
        <thead><tr><th>日期</th><th>房台</th><th>金额</th><th>挂账人</th><th>状态</th></tr></thead>
        <tbody>
          <tr v-for="c in pos.credits" :key="c.id">
            <td>{{ c.date }}</td><td>{{ c.roomName }}</td><td>{{ pos.formatMoney(c.amount) }}</td>
            <td>{{ c.person }}</td><td>{{ c.paid ? '已回收' : '未付' }}</td>
          </tr>
        </tbody>
      </table>
    </section>

    <section v-else-if="menu === 'report'" class="panel">
      <h3>报表查询</h3>
      <p class="hint">详细报表见系统设置 · 统计表格</p>
    </section>

    <!-- 右键菜单 -->
    <div
      v-if="ctx.show && ctxRoom"
      class="ctx-menu"
      :style="{ left: ctx.x + 'px', top: ctx.y + 'px' }"
      @click.stop
    >
      <div class="ctx-title">{{ ctxRoom.name }} · {{ pos.statusMeta[ctxRoom.status].label }}</div>

      <!-- A 空闲 / 预定 -->
      <template v-if="ctxStatus === 'idle' || ctxStatus === 'reserved'">
        <button type="button" class="ctx-item" @click="openDialog('open')">
          <Play :size="14" /> 快速开台
        </button>
        <button type="button" class="ctx-item" @click="openDialog('reserve')">
          <Bookmark :size="14" /> 预订
        </button>
        <button
          v-if="ctxStatus === 'reserved'"
          type="button"
          class="ctx-item danger"
          @click="doCancelReserve"
        >
          <BookmarkX :size="14" /> 取消预定
        </button>
      </template>

      <!-- B 使用中 -->
      <template v-else-if="ctxStatus === 'open'">
        <button type="button" class="ctx-item primary" @click="openOrder">
          <UtensilsCrossed :size="14" /> 点餐
        </button>
        <button type="button" class="ctx-item" @click="openDialog('bill')">
          <FileText :size="14" /> 账单
        </button>
        <button type="button" class="ctx-item" @click="openDialog('transfer')">
          <ArrowRightLeft :size="14" /> 转房
        </button>
      </template>

      <!-- C 打单中 -->
      <template v-else-if="ctxStatus === 'billing'">
        <button type="button" class="ctx-item primary" @click="openDialog('pay')">
          <CreditCard :size="14" /> 结账
        </button>
        <button type="button" class="ctx-item" @click="doCancelSettle">
          <Undo2 :size="14" /> 取消申请结账
        </button>
        <button type="button" class="ctx-item" @click="openDialog('bill')">
          <FileText :size="14" /> 账单
        </button>
      </template>

      <!-- D 清洁中 -->
      <template v-else-if="ctxStatus === 'cleaning'">
        <button type="button" class="ctx-item primary" @click="setAvailable">
          <Sparkles :size="14" /> 置可用房
        </button>
      </template>
    </div>

    <!-- 通用弹窗（禁止点遮罩关闭） -->
    <div v-if="dialog && dialog !== 'order'" class="mask">
      <div class="dlg" :class="{ wide: dialog === 'bill' || dialog === 'transfer' }">
        <div class="dlg-h">
          <strong>{{ dlgTitle[dialog] || '' }}</strong>
          <button type="button" class="icon" @click="dialog = ''"><X :size="16" /></button>
        </div>

        <template v-if="dialog === 'open'">
          <label class="fl"><span>客人</span><input v-model="form.guest" /></label>
          <label class="fl"><span>带位人</span><input v-model="form.promoter" /></label>
          <label class="fl"><span>人数</span><input v-model.number="form.people" type="number" min="1" /></label>
          <label class="fl"><span>预付款金额</span><input v-model.number="form.prepay" type="number" min="0" /></label>
          <label class="fl"><span>开房套餐</span>
            <select v-model="form.openPackageId">
              <option value="">无 / 房台默认</option>
              <option v-for="p in settings.openPackages.filter((x) => x.enabled)" :key="p.id" :value="p.id">
                {{ p.name }} · {{ pos.formatMoney(p.price) }}
              </option>
            </select>
          </label>
          <div class="dlg-foot">
            <button type="button" class="op" @click="dialog = ''">取消</button>
            <button type="button" class="op primary" @click="doQuickOpen">确定</button>
          </div>
        </template>

        <template v-else-if="dialog === 'reserve'">
          <label class="fl"><span>预定时间</span><input v-model="form.reserveTime" type="time" /></label>
          <label class="fl"><span>人数</span><input v-model.number="form.people" type="number" min="1" /></label>
          <label class="fl"><span>客人/备注</span><input v-model="form.reserveNote" placeholder="备注" @change="form.guest = form.reserveNote" /></label>
          <div class="dlg-foot">
            <button type="button" class="op" @click="dialog = ''">取消</button>
            <button type="button" class="op primary" @click="doReserve">确定</button>
          </div>
        </template>

        <template v-else-if="dialog === 'bill'">
          <div class="bill-lines">
            <div v-for="l in pos.selectedOrder" :key="l.id" class="bill-line">
              <span>{{ l.name }}{{ l.flavor ? '(' + l.flavor + ')' : '' }}{{ l.isGift ? '（赠）' : '' }} ×{{ l.qty }}</span>
              <span>{{ l.isGift ? '赠送' : pos.formatMoney(l.price * l.qty) }}</span>
            </div>
            <div v-if="!pos.selectedOrder.length" class="empty">暂无消费</div>
          </div>
          <label class="fl"><span>折扣 %</span><input v-model.number="form.discount" type="number" min="1" max="100" /></label>
          <div class="row gap">
            <button type="button" class="op" @click="doDiscount">设置折扣</button>
            <button type="button" class="op" @click="needManager(() => showToast('退单已执行（演示）'))">退单</button>
          </div>
          <div class="pay-sum">
            应付 <strong>{{ pos.formatMoney(payable.payable) }}</strong>
            <span v-if="payable.waived">（抹零 {{ pos.formatMoney(Math.abs(payable.waived)) }}）</span>
          </div>
          <div class="dlg-foot">
            <button type="button" class="op" @click="dialog = ''">关闭</button>
            <button
              v-if="pos.selectedRoom?.status === 'open'"
              type="button"
              class="op primary"
              @click="doRequestSettle"
            >申请结账</button>
          </div>
        </template>

        <template v-else-if="dialog === 'transfer'">
          <label class="fl"><span>目标空房</span>
            <select v-model="form.transferTo">
              <option value="">选择</option>
              <option v-for="r in pos.rooms.filter((x) => x.status === 'idle')" :key="r.id" :value="r.id">{{ r.name }}</option>
            </select>
          </label>
          <label class="fl"><span>房价计算</span>
            <select v-model="form.transferMode">
              <option value="old">按原房价</option>
              <option value="new">按新房价</option>
              <option value="merge">合并计算</option>
            </select>
          </label>
          <div class="dlg-foot">
            <button type="button" class="op" @click="dialog = ''">取消</button>
            <button type="button" class="op primary" @click="doTransfer">确定转房</button>
          </div>
        </template>

        <template v-else-if="dialog === 'pay'">
          <p class="pay-sum">应收 <strong>{{ pos.formatMoney(payable.payable) }}</strong></p>
          <div class="pay-grid">
            <label class="fl"><span>现金</span><input v-model.number="form.payCash" type="number" min="0" /></label>
            <label class="fl"><span>微信</span><input v-model.number="form.payWechat" type="number" min="0" /></label>
            <label class="fl"><span>支付宝</span><input v-model.number="form.payAlipay" type="number" min="0" /></label>
            <label class="fl"><span>会员卡</span><input v-model.number="form.payMember" type="number" min="0" /></label>
            <label class="fl"><span>挂账</span><input v-model.number="form.payCredit" type="number" min="0" /></label>
            <label class="fl"><span>免单</span><input v-model.number="form.payFree" type="number" min="0" /></label>
          </div>
          <label v-if="form.payCredit > 0" class="fl"><span>挂账人</span><input v-model="form.creditPerson" /></label>
          <p>已输入 {{ pos.formatMoney(paySum()) }}</p>
          <div class="dlg-foot">
            <button type="button" class="op" @click="dialog = ''">取消</button>
            <button type="button" class="op primary" @click="doPay">确定收款</button>
          </div>
        </template>

        <template v-else-if="dialog === 'manager'">
          <p><Lock :size="16" /> 需经理特权授权</p>
          <label class="fl"><span>授权卡号</span><input v-model="managerCode" type="password" placeholder="演示：8888" /></label>
          <div class="dlg-foot">
            <button type="button" class="op" @click="dialog = ''">取消</button>
            <button type="button" class="op primary" @click="confirmManager">确认授权</button>
          </div>
        </template>

        <template v-else-if="dialog === 'flavor'">
          <p>请选择口味后落单：{{ pendingFlavorItem?.name }}</p>
          <div class="flavor-opts">
            <button
              v-for="o in flavorOptions"
              :key="o"
              type="button"
              class="chip"
              :class="{ active: selectedFlavor === o }"
              @click="selectedFlavor = o"
            >{{ o }}</button>
          </div>
          <div class="dlg-foot">
            <button type="button" class="op" @click="dialog = 'order'; pendingFlavorItem = null">取消</button>
            <button type="button" class="op primary" @click="confirmFlavor">确定</button>
          </div>
        </template>

        <template v-else-if="dialog === 'style'">
          <p class="hint">设置各状态下房台卡片的<strong>填充颜色</strong>（整块底色），保存后立即生效。</p>
          <div class="style-list">
            <div v-for="s in statusList" :key="s" class="style-row">
              <div
                class="style-preview"
                :style="{
                  background: styleDraft[s].bg,
                  borderColor: styleDraft[s].bg,
                  color: styleDraft[s].color,
                }"
              >
                {{ styleDraft[s].label }}
              </div>
              <label class="fl style-fill">
                <span>填充颜色</span>
                <div class="color-wrap">
                  <input
                    v-model="styleDraft[s].bg"
                    type="color"
                    class="color-input"
                    @input="onFillChange(s)"
                  />
                  <input
                    v-model="styleDraft[s].bg"
                    type="text"
                    class="color-hex"
                    maxlength="7"
                    @change="onFillChange(s)"
                  />
                </div>
              </label>
            </div>
          </div>
          <div class="dlg-foot">
            <button type="button" class="op" @click="resetStyleColors">恢复默认</button>
            <button type="button" class="op" @click="dialog = ''">取消</button>
            <button type="button" class="op primary" @click="saveStyleColors">保存</button>
          </div>
        </template>
      </div>
    </div>

    <!-- 全屏点餐 -->
    <div v-if="dialog === 'order'" class="order-full">
      <div class="order-head">
        <strong>点餐 · {{ pos.selectedRoom?.name }}</strong>
        <button type="button" class="icon" @click="dialog = ''"><X :size="18" /></button>
      </div>
      <div class="order-body">
        <div class="order-main">
          <div class="order-toolbar">
            <div class="letters">
              <button
                v-for="L in LETTERS"
                :key="L"
                type="button"
                class="letter"
                :class="{ on: orderLetter === L }"
                @click="orderLetter = orderLetter === L ? '' : L"
              >{{ L }}</button>
            </div>
            <div class="cats">
              <button type="button" class="chip" :class="{ active: !orderCatId }" @click="orderCatId = null">全部</button>
              <button
                v-for="c in settings.majorCategories"
                :key="c.id"
                type="button"
                class="chip"
                :class="{ active: orderCatId === c.id }"
                @click="orderCatId = c.id"
              >{{ c.name }}</button>
            </div>
            <div class="search">
              <Search :size="14" />
              <input v-model="orderSearch" placeholder="拼音 / 首字母 / 名称搜索" />
            </div>
          </div>
          <div class="product-grid">
            <button
              v-for="it in orderItems"
              :key="it.id"
              type="button"
              class="prod"
              @dblclick="addToCart(it)"
              @click="addToCart(it)"
            >
              <div class="prod-name">{{ it.name }}</div>
              <div class="prod-price">{{ pos.formatMoney(it.roomPrice) }}</div>
            </button>
          </div>
        </div>
        <aside class="order-cart">
          <div class="cart-h">购物车</div>
          <div class="cart-list">
            <div v-for="(c, idx) in cart" :key="idx" class="cart-row">
              <span>{{ c.name }}{{ c.flavor ? '(' + c.flavor + ')' : '' }} ×{{ c.qty }}</span>
              <span>{{ c.isGift ? '赠' : pos.formatMoney(c.price * c.qty) }}</span>
              <button type="button" class="mini" @click="cart.splice(idx, 1)">×</button>
            </div>
            <div v-if="!cart.length" class="empty">双击或单击商品加入</div>
          </div>
          <div class="cart-total">合计 {{ pos.formatMoney(cartTotal()) }}</div>
          <div class="cart-actions">
            <button type="button" class="op" @click="dialog = ''">取消</button>
            <button type="button" class="op" @click="submitOrder(true)">赠送</button>
            <button type="button" class="op primary" @click="submitOrder(false)">落单</button>
          </div>
        </aside>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pos{display:flex;flex-direction:column;gap:10px}
.status-bar{display:flex;flex-wrap:wrap;gap:14px;padding:8px 12px;background:var(--theme-bg-card);border:1px solid var(--theme-border);border-radius:10px;font-size:12px;color:var(--theme-text-secondary);box-shadow:var(--theme-shadow)}
.sb-item{display:inline-flex;align-items:center;gap:5px}
.ok{color:var(--theme-success)}.bad{color:var(--theme-danger)}
.pos-top-bar{display:flex;align-items:center;justify-content:space-between;gap:8px}
.menu-bar{display:flex;flex-wrap:wrap;gap:6px;align-items:center}
.status-bar{margin-left:auto}
.mbtn{display:inline-flex;align-items:center;gap:4px;border:1px solid var(--theme-border);background:var(--theme-bg-card);border-radius:8px;padding:7px 12px;font-size:12px;cursor:pointer;font-family:inherit;color:var(--theme-text-secondary)}
.mbtn.active,.mbtn:hover{border-color:var(--theme-primary);color:var(--theme-primary)}
.toast{background:var(--theme-success);color:#fff;padding:8px 12px;border-radius:8px;font-size:13px}
.kpi-row{display:grid;grid-template-columns:repeat(5,1fr);gap:10px}
.kpi{background:var(--theme-bg-card);border:1px solid var(--theme-border);border-radius:12px;padding:16px;box-shadow:var(--theme-shadow);min-height:78px}
.kpi.use{border-color:#059669}.kpi.idle{border-color:#64748b}.kpi.sales{border-color:var(--theme-primary)}
.k-l{font-size:12px;color:var(--theme-text-muted)}.k-v{font-size:22px;font-weight:700;margin-top:6px}
.legend{display:flex;flex-wrap:wrap;gap:8px}
.leg{display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border-radius:999px;border:1px solid;font-size:11px}
.leg i{width:8px;height:8px;border-radius:50%;display:inline-block}
.sel-bar{background:var(--theme-bg-card);border:1px solid var(--theme-border);border-radius:10px;padding:10px 14px;font-size:13px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;box-shadow:var(--theme-shadow)}
.hint-inline{font-size:11px;color:var(--theme-text-muted)}
.room-panel{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:16px;align-content:start}
.room-card{position:relative;border:2px solid var(--room-fill, var(--theme-border));background:var(--room-fill, var(--theme-bg-card));border-radius:16px;padding:18px 16px;text-align:left;cursor:pointer;font-family:inherit;min-height:200px;display:flex;flex-direction:column;justify-content:space-between;user-select:none;-webkit-user-select:none;box-shadow:0 2px 8px rgba(0,0,0,.06);color:inherit}
.room-card.selected{box-shadow:0 0 0 3px color-mix(in srgb,var(--theme-primary) 50%,transparent);outline:2px solid var(--theme-primary)}
.rc-top{align-items:center;font-size:12px;opacity:.85}.rc-bot{display:flex;justify-content:space-between;align-items:center;font-size:12px;opacity:.85}
.rc-open-count{position:absolute;left:16px;top:0;font-weight:600}
.rc-booker{text-align:left;margin-left:48px}
.rc-mid{text-align:center;padding:8px 0}
.rc-no{font-size:26px;font-weight:800;line-height:1.25}
.rc-type{font-size:13px;margin-top:6px;opacity:.9}
.rc-promo{font-size:12px;min-height:18px;font-weight:600}
.rc-status{position:absolute;top:10px;right:12px;font-size:12px;font-weight:700}

/* 右键菜单 */
.ctx-menu{position:fixed;z-index:2000;width:180px;background:var(--theme-bg-card);border:1px solid var(--theme-border);border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,.18);padding:6px;overflow:hidden}
.ctx-title{font-size:11px;color:var(--theme-text-muted);padding:6px 10px 8px;border-bottom:1px solid var(--theme-border);margin-bottom:4px}
.ctx-item{display:flex;align-items:center;gap:8px;width:100%;border:none;background:transparent;padding:9px 12px;font-size:13px;cursor:pointer;font-family:inherit;border-radius:6px;color:var(--theme-text-primary);text-align:left}
.ctx-item:hover{background:var(--theme-bg-page)}
.ctx-item.primary{color:var(--theme-primary);font-weight:600;background:color-mix(in srgb,var(--theme-primary) 10%,transparent)}
.ctx-item.danger{color:var(--theme-danger)}

.mask{position:fixed;inset:0;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;z-index:1500}
.dlg{width:min(420px,92vw);background:var(--theme-bg-card);border-radius:12px;padding:16px 18px;box-shadow:var(--theme-shadow);display:flex;flex-direction:column;gap:16px;max-height:90vh;overflow:auto}
.dlg.wide{width:min(520px,94vw)}
.dlg-h{display:flex;justify-content:space-between;align-items:center}
.fl{display:flex;flex-direction:column;gap:6px;font-size:12px;color:var(--theme-text-secondary)}
.fl input,.fl select{height:40px;border:1px solid var(--theme-border);border-radius:8px;padding:0 12px;font-family:inherit;background:var(--theme-bg-page);font-size:14px}
.dlg-foot{display:flex;justify-content:flex-end;gap:10px;margin-top:4px}
.op{border:1px solid var(--theme-border);background:var(--theme-bg-page);border-radius:8px;padding:8px 16px;font-size:13px;cursor:pointer;font-family:inherit}
.op.primary{background:var(--theme-primary);border-color:var(--theme-primary);color:#fff}
.icon{border:none;background:transparent;cursor:pointer;color:var(--theme-text-muted)}
.pay-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.pay-sum{font-size:15px}
.bill-lines{max-height:200px;overflow:auto}
.bill-line{display:flex;justify-content:space-between;padding:6px 0;font-size:13px;border-bottom:1px dashed var(--theme-border)}
.flavor-opts{display:flex;flex-wrap:wrap;gap:8px}
.chip{border:1px solid var(--theme-border);background:var(--theme-bg-page);border-radius:999px;padding:6px 12px;font-size:12px;cursor:pointer;font-family:inherit}
.chip.active{background:var(--theme-primary);border-color:var(--theme-primary);color:#fff}
.style-list{display:flex;flex-direction:column;gap:12px}
.style-row{display:grid;grid-template-columns:110px 1fr;gap:14px;align-items:center}
.style-preview{border:2px solid;border-radius:12px;padding:14px 8px;text-align:center;font-size:13px;font-weight:700;min-height:56px;display:flex;align-items:center;justify-content:center}
.style-fill{margin:0}
.color-wrap{display:flex;align-items:center;gap:8px}
.color-input{width:56px;height:40px;padding:2px;cursor:pointer;border:1px solid var(--theme-border);border-radius:8px;background:var(--theme-bg-page)}
.color-hex{flex:1;height:40px;border:1px solid var(--theme-border);border-radius:8px;padding:0 10px;font-family:inherit;background:var(--theme-bg-page)}
.hint{font-size:12px;color:var(--theme-text-muted);margin:0}

/* 全屏点餐 */
.order-full{position:fixed;inset:0;z-index:1600;background:var(--theme-bg-page);display:flex;flex-direction:column}
.order-head{display:flex;justify-content:space-between;align-items:center;padding:12px 16px;background:var(--theme-bg-card);border-bottom:1px solid var(--theme-border)}
.order-body{flex:1;display:grid;grid-template-columns:1fr 280px;min-height:0}
.order-main{display:flex;flex-direction:column;min-height:0;padding:12px}
.order-toolbar{display:flex;flex-direction:column;gap:8px;margin-bottom:10px}
.letters{display:flex;flex-wrap:wrap;gap:4px}
.letter{width:28px;height:28px;border:1px solid var(--theme-border);background:var(--theme-bg-card);border-radius:6px;font-size:11px;cursor:pointer;font-family:inherit}
.letter.on{background:var(--theme-primary);color:#fff;border-color:var(--theme-primary)}
.cats{display:flex;flex-wrap:wrap;gap:6px}
.search{display:flex;align-items:center;gap:6px;border:1px solid var(--theme-border);border-radius:8px;padding:6px 10px;background:var(--theme-bg-card)}
.search input{border:none;outline:none;background:transparent;flex:1;font-family:inherit}
.product-grid{flex:1;overflow:auto;display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:10px;align-content:start}
.prod{border:1px solid var(--theme-border);background:var(--theme-bg-card);border-radius:10px;padding:12px 8px;cursor:pointer;font-family:inherit;text-align:center;min-height:72px}
.prod:hover{border-color:var(--theme-primary)}
.prod-name{font-size:13px;font-weight:600}
.prod-price{font-size:12px;color:var(--theme-primary);margin-top:6px}
.order-cart{border-left:1px solid var(--theme-border);background:var(--theme-bg-card);display:flex;flex-direction:column;padding:12px}
.cart-h{font-weight:700;margin-bottom:8px}
.cart-list{flex:1;overflow:auto}
.cart-row{display:flex;align-items:center;gap:6px;font-size:12px;padding:6px 0;border-bottom:1px solid var(--theme-border)}
.cart-row span:first-child{flex:1}
.cart-total{padding:10px 0;font-weight:700;font-size:15px}
.cart-actions{display:flex;gap:8px}
.cart-actions .op{flex:1}
.mini{border:none;background:transparent;cursor:pointer;color:var(--theme-danger);font-size:14px}
.empty{color:var(--theme-text-muted);font-size:12px;padding:12px 0}
.panel{background:var(--theme-bg-card);border:1px solid var(--theme-border);border-radius:12px;padding:16px;box-shadow:var(--theme-shadow)}
.panel h3{margin:0 0 12px}
.row{display:flex;align-items:center}.row.gap{gap:10px}
.tbl{width:100%;border-collapse:collapse;font-size:12px}
.tbl th,.tbl td{padding:8px 6px;border-bottom:1px solid var(--theme-border);text-align:left}
.hall-products{display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:8px;margin-top:12px}
.hall-item{border:1px solid var(--theme-border);background:var(--theme-bg-page);border-radius:10px;padding:10px;cursor:pointer;font-family:inherit;display:flex;flex-direction:column;gap:4px;text-align:left}
.hint{font-size:12px;color:var(--theme-text-muted)}
@media(max-width:900px){
  .kpi-row{grid-template-columns:repeat(2,1fr)}
  .order-body{grid-template-columns:1fr}
  .order-cart{border-left:none;border-top:1px solid var(--theme-border);max-height:40vh}
}
</style>
