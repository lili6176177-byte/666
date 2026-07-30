import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { useSettingsStore, applyRounding } from '@/stores/settings'

const KEY = 'tas_pos'

export type RoomStatus = 'idle' | 'reserved' | 'open' | 'billing' | 'cleaning'

export interface RoomState {
  id: string
  name: string
  area: string
  type: string
  minConsume: number
  status: RoomStatus
  /** 订房人 */
  booker: string
  /** 订房人部门 */
  bookerDept: string
  /** 客人姓名 */
  guestName: string
  /** 开房/订房时间 */
  timeLabel: string
  /** 开房次数 */
  openCount: number
  /** 促销带位人 */
  promoter: string
  /** 是否申请结账 */
  settleRequested: boolean
  /** 结账重开（不再收低消） */
  reopen: boolean
  prepay: number
  discount: number // 0-1, 1=无折扣
  /** 绑定的开房套餐 id（系统设置） */
  openPackageId?: string
}

/** 出品状态 */
export type KitchenLineStatus = 'pending' | 'making' | 'done' | 'served'

export interface OrderLine {
  id: string
  itemId: string
  name: string
  price: number
  qty: number
  isGift: boolean
  flavor?: string
  /** 出品部门：吧台 / 厨房 等 */
  kitchenDept?: string
  /** 出品状态 */
  kitchenStatus?: KitchenLineStatus
  /** 是否已打印出品单 */
  printed?: boolean
  createdAt?: string
}

export interface MemberCard {
  id: string
  cardNo: string
  name: string
  phone: string
  balance: number
  points: number
  totalRecharge: number
  totalConsume: number
}

export interface CreditBill {
  id: string
  date: string
  roomName: string
  amount: number
  person: string
  paid: boolean
  payInfo: string
}

function load<T>(k: string, fb: T): T {
  try {
    const raw = localStorage.getItem(KEY + '_' + k)
    return raw ? (JSON.parse(raw) as T) : fb
  } catch {
    return fb
  }
}
function save(k: string, d: unknown) {
  localStorage.setItem(KEY + '_' + k, JSON.stringify(d))
}

export type StatusMetaItem = { label: string; color: string; bg: string }

const DEFAULT_STATUS_META: Record<RoomStatus, StatusMetaItem> = {
  idle: { label: '空房', color: '#64748b', bg: '#f1f5f9' },
  reserved: { label: '预定中', color: '#2563eb', bg: '#dbeafe' },
  open: { label: '使用中', color: '#059669', bg: '#d1fae5' },
  billing: { label: '打单中', color: '#d97706', bg: '#fef3c7' },
  cleaning: { label: '清洁中', color: '#7c3aed', bg: '#ede9fe' },
}

/** @deprecated 请使用 pos.statusMeta；保留兼容导出默认值 */
export const STATUS_META = DEFAULT_STATUS_META

export const usePosStore = defineStore('pos', () => {
  const settings = useSettingsStore()

  /** 房台各状态显示颜色（界面风格可配置，持久化） */
  const statusMeta = ref<Record<RoomStatus, StatusMetaItem>>(
    load('statusMeta', { ...DEFAULT_STATUS_META }),
  )
  // 合并默认，避免旧缓存缺字段
  for (const k of Object.keys(DEFAULT_STATUS_META) as RoomStatus[]) {
    if (!statusMeta.value[k]) statusMeta.value[k] = { ...DEFAULT_STATUS_META[k] }
    else {
      statusMeta.value[k] = {
        label: statusMeta.value[k].label || DEFAULT_STATUS_META[k].label,
        color: statusMeta.value[k].color || DEFAULT_STATUS_META[k].color,
        bg: statusMeta.value[k].bg || DEFAULT_STATUS_META[k].bg,
      }
    }
  }

  function setStatusColor(status: RoomStatus, color: string, bg: string) {
    statusMeta.value[status] = {
      ...statusMeta.value[status],
      color,
      bg,
    }
  }
  function resetStatusColors() {
    statusMeta.value = JSON.parse(JSON.stringify(DEFAULT_STATUS_META))
  }

  const rooms = ref<RoomState[]>(
    load(
      'rooms',
      (settings.rooms.length
        ? settings.rooms.map((r) => {
            const area = settings.areas.find((a) => a.id === r.areaId)?.name || ''
            const type = settings.roomTypes.find((t) => t.id === r.typeId)?.name || ''
            return {
              id: r.id,
              name: r.name,
              area,
              type,
              minConsume: r.billing === 'min_consume' ? r.minConsume : 0,
              billing: r.billing,
              openPackageId: r.openPackageId,
              ip: r.ip,
            }
          })
        : [
            { id: 'r1', name: '豪华1号', area: '一楼', type: '豪华', minConsume: 588, billing: 'min_consume' as const, openPackageId: '', ip: '' },
            { id: 'r2', name: '商务2号', area: '二楼', type: '标准', minConsume: 0, billing: 'timed' as const, openPackageId: '', ip: '' },
            { id: 'r3', name: 'VIP3号', area: '三楼', type: 'VIP', minConsume: 888, billing: 'min_consume' as const, openPackageId: '', ip: '' },
            { id: 'r4', name: '标准4号', area: '一楼', type: '标准', minConsume: 0, billing: 'timed' as const, openPackageId: '', ip: '' },
            { id: 'r5', name: '标准5号', area: '一楼', type: '标准', minConsume: 0, billing: 'free' as const, openPackageId: '', ip: '' },
            { id: 'r6', name: '豪华6号', area: '二楼', type: '豪华', minConsume: 588, billing: 'min_consume' as const, openPackageId: '', ip: '' },
          ]
      ).map((r, i) => ({
        id: r.id,
        name: r.name,
        area: r.area,
        type: r.type,
        minConsume: r.minConsume || 0,
        status: (i === 0 ? 'open' : i === 1 ? 'reserved' : i === 2 ? 'billing' : i === 3 ? 'cleaning' : 'idle') as RoomStatus,
        booker: i < 3 ? '张经理' : '',
        bookerDept: i < 3 ? '销售部' : '',
        guestName: i === 0 ? '王先生' : i === 1 ? '李女士' : i === 2 ? '赵总' : '',
        timeLabel: i < 3 ? '14:20' : '',
        openCount: i === 0 ? 2 : i === 2 ? 1 : 0,
        promoter: i === 0 ? '小陈' : '',
        settleRequested: i === 2,
        reopen: false,
        prepay: 0,
        discount: 1,
        openPackageId: (r as { openPackageId?: string }).openPackageId || '',
      })),
    ),
  )

  /** roomId -> order lines */
  const orders = ref<Record<string, OrderLine[]>>(
    load('orders', {
      r1: [
        {
          id: 'ol1',
          itemId: 'i1',
          name: '百威',
          price: 25,
          qty: 4,
          isGift: false,
          kitchenDept: '吧台',
          kitchenStatus: 'pending',
          printed: false,
          createdAt: new Date().toISOString(),
        },
        {
          id: 'ol2',
          itemId: 'i3',
          name: '花生米',
          price: 18,
          qty: 1,
          isGift: false,
          kitchenDept: '厨房',
          kitchenStatus: 'making',
          printed: true,
          createdAt: new Date().toISOString(),
        },
      ],
      r3: [
        {
          id: 'ol3',
          itemId: 'i2',
          name: '路易十三',
          price: 2888,
          qty: 1,
          isGift: false,
          kitchenDept: '吧台',
          kitchenStatus: 'pending',
          printed: false,
          createdAt: new Date().toISOString(),
        },
      ],
    }),
  )

  /** 历史出品记录 */
  const kitchenHistory = ref<
    Array<{
      id: string
      roomId: string
      roomName: string
      line: OrderLine
      action: string
      at: string
    }>
  >(load('kitchenHistory', []))

  const members = ref<MemberCard[]>(
    load('members', [
      {
        id: 'm1',
        cardNo: '88010001',
        name: '陈会员',
        phone: '13800001111',
        balance: 1200,
        points: 320,
        totalRecharge: 2000,
        totalConsume: 800,
      },
    ]),
  )

  const credits = ref<CreditBill[]>(
    load('credits', [
      {
        id: 'cr1',
        date: '2026-07-28',
        roomName: '豪华1号',
        amount: 680,
        person: '王先生',
        paid: false,
        payInfo: '',
      },
    ]),
  )

  const todaySales = ref(load('todaySales', 12860))
  const todayOpens = ref(load('todayOpens', 12))
  const selectedRoomId = ref<string | null>('r1')
  const networkOnline = ref(true)
  const version = 'v2.6.1'
  const licenseOrg = computed(() => settings.business.shopName || '演示授权单位')

  watch(statusMeta, (v) => save('statusMeta', v), { deep: true })
  watch(rooms, (v) => save('rooms', v), { deep: true })
  watch(orders, (v) => save('orders', v), { deep: true })
  watch(members, (v) => save('members', v), { deep: true })
  watch(credits, (v) => save('credits', v), { deep: true })
  watch(kitchenHistory, (v) => save('kitchenHistory', v), { deep: true })
  watch(todaySales, (v) => save('todaySales', v))
  watch(todayOpens, (v) => save('todayOpens', v))

  const selectedRoom = computed(() => rooms.value.find((r) => r.id === selectedRoomId.value) || null)
  const selectedOrder = computed(() =>
    selectedRoomId.value ? orders.value[selectedRoomId.value] || [] : [],
  )

  const statusCounts = computed(() => {
    const c: Record<RoomStatus, number> = {
      idle: 0,
      reserved: 0,
      open: 0,
      billing: 0,
      cleaning: 0,
    }
    for (const r of rooms.value) c[r.status]++
    return c
  })

  const kpi = computed(() => ({
    total: rooms.value.length,
    inUse: rooms.value.filter((r) => r.status === 'open' || r.status === 'billing').length,
    idle: statusCounts.value.idle,
    sales: todaySales.value,
    opens: todayOpens.value,
  }))

  function orderTotal(roomId: string) {
    const lines = orders.value[roomId] || []
    return lines.reduce((s, l) => s + (l.isGift ? 0 : l.price * l.qty), 0)
  }

  function payableOf(roomId: string) {
    const room = rooms.value.find((r) => r.id === roomId)
    if (!room) return { total: 0, afterDiscount: 0, payable: 0, waived: 0 }
    let total = orderTotal(roomId)
    if (!room.reopen && room.minConsume > total) total = room.minConsume
    total = Math.max(0, total - room.prepay)
    const afterDiscount = Math.round(total * room.discount * 100) / 100
    const { payable, waived } = applyRounding(afterDiscount, settings.business.roundingRule)
    return { total, afterDiscount, payable, waived }
  }

  function selectRoom(id: string) {
    selectedRoomId.value = id
  }

  function ensureOrder(roomId: string) {
    if (!orders.value[roomId]) orders.value[roomId] = []
  }

  function nowLabel() {
    const d = new Date()
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }

  /** 预订 */
  function reserve(roomId: string, booker: string, dept: string, guest: string) {
    const r = rooms.value.find((x) => x.id === roomId)
    if (!r || (r.status !== 'idle' && r.status !== 'reserved')) return false
    r.status = 'reserved'
    r.booker = booker
    r.bookerDept = dept
    r.guestName = guest
    r.timeLabel = nowLabel()
    return true
  }

  function cancelReserve(roomId: string) {
    const r = rooms.value.find((x) => x.id === roomId)
    if (!r || r.status !== 'reserved') return false
    resetRoom(r)
    return true
  }

  /** 开房：写入开房套餐明细；若套餐开启自动出品则生成出品单 */
  function applyOpenPackage(roomId: string, packageId?: string) {
    const r = rooms.value.find((x) => x.id === roomId)
    if (!r) return
    const pkgId = packageId || r.openPackageId
    if (!pkgId) return
    const pkg = settings.openPackages.find((p) => p.id === pkgId && p.enabled)
    if (!pkg) return
    r.openPackageId = pkgId
    ensureOrder(roomId)
    for (const line of pkg.lines) {
      const it = settings.items.find((i) => i.id === line.itemId)
      if (!it) continue
      // 仅套餐主项有价，配送子项价格为 0
      const isMain = line.itemId === pkg.itemId
      const price = isMain ? pkg.price : 0
      addOrderLine(
        roomId,
        { id: it.id, name: it.name, price, kitchenDept: it.kitchenDept },
        line.qty,
        false,
      )
      // 自动出品：新行保持 pending，出品端可见
      if (!pkg.autoKitchen) {
        const lines = orders.value[roomId] || []
        const last = lines[lines.length - 1]
        if (last && last.itemId === it.id) {
          last.kitchenStatus = 'served'
          last.printed = true
        }
      }
    }
  }

  function openRoom(roomId: string, guest?: string, promoter?: string, packageId?: string) {
    const r = rooms.value.find((x) => x.id === roomId)
    if (!r || (r.status !== 'idle' && r.status !== 'reserved')) return false
    r.status = 'open'
    if (guest) r.guestName = guest
    if (promoter) r.promoter = promoter
    r.timeLabel = nowLabel()
    r.openCount += 1
    r.settleRequested = false
    r.reopen = false
    ensureOrder(roomId)
    todayOpens.value += 1
    // 优先用传入套餐，否则用房台绑定的开房套餐
    const pid = packageId || r.openPackageId
    if (pid) applyOpenPackage(roomId, pid)
    return true
  }

  /** 从系统设置完整同步包厢：新增、更新资料；设置里已删除且空闲的房台会移除 */
  function syncRoomsFromSettings() {
    const settingIds = new Set(settings.rooms.map((r) => r.id))
    // 更新已有 + 追加新建
    for (const sr of settings.rooms) {
      const area = settings.areas.find((a) => a.id === sr.areaId)?.name || ''
      const type = settings.roomTypes.find((t) => t.id === sr.typeId)?.name || ''
      const minConsume = sr.billing === 'min_consume' ? sr.minConsume || 0 : 0
      const existing = rooms.value.find((x) => x.id === sr.id)
      if (existing) {
        existing.name = sr.name
        existing.area = area
        existing.type = type
        existing.minConsume = minConsume
        existing.openPackageId = sr.openPackageId || ''
      } else {
        rooms.value.push({
          id: sr.id,
          name: sr.name,
          area,
          type,
          minConsume,
          status: 'idle',
          booker: '',
          bookerDept: '',
          guestName: '',
          timeLabel: '',
          openCount: 0,
          promoter: '',
          settleRequested: false,
          reopen: false,
          prepay: 0,
          discount: 1,
          openPackageId: sr.openPackageId || '',
        })
      }
    }
    // 设置中已删除：仅移除空闲房，占用中的保留避免丢单
    rooms.value = rooms.value.filter((r) => {
      if (settingIds.has(r.id)) return true
      return r.status !== 'idle'
    })
  }

  /** @deprecated 使用 syncRoomsFromSettings */
  function syncRoomPackagesFromSettings() {
    syncRoomsFromSettings()
  }

  // 系统设置里增删改包厢时，收银台自动同步
  watch(
    () =>
      settings.rooms.map((r) =>
        [r.id, r.name, r.areaId, r.typeId, r.billing, r.minConsume, r.openPackageId].join('|'),
      ).join(';'),
    () => {
      syncRoomsFromSettings()
    },
  )

  function cancelOpen(roomId: string) {
    const r = rooms.value.find((x) => x.id === roomId)
    if (!r || r.status !== 'open') return false
    orders.value[roomId] = []
    resetRoom(r)
    return true
  }

  function resetRoom(r: RoomState) {
    r.status = 'idle'
    r.booker = ''
    r.bookerDept = ''
    r.guestName = ''
    r.timeLabel = ''
    r.promoter = ''
    r.settleRequested = false
    r.reopen = false
    r.prepay = 0
    r.discount = 1
  }

  function transferRoom(
    fromId: string,
    toId: string,
    mode: 'old' | 'new' | 'merge',
  ) {
    const from = rooms.value.find((x) => x.id === fromId)
    const to = rooms.value.find((x) => x.id === toId)
    if (!from || !to || to.status !== 'idle') return false
    ensureOrder(fromId)
    ensureOrder(toId)
    if (mode === 'merge') {
      orders.value[toId] = [...(orders.value[toId] || []), ...(orders.value[fromId] || [])]
    } else {
      orders.value[toId] = [...(orders.value[fromId] || [])]
    }
    orders.value[fromId] = []
    to.status = from.status
    to.booker = from.booker
    to.bookerDept = from.bookerDept
    to.guestName = from.guestName
    to.timeLabel = from.timeLabel
    to.openCount = from.openCount
    to.promoter = from.promoter
    to.settleRequested = from.settleRequested
    to.reopen = from.reopen
    to.prepay = from.prepay
    to.discount = mode === 'new' ? 1 : from.discount
    if (mode === 'new') {
      // 按新房价：低消用新房
    }
    resetRoom(from)
    from.status = 'idle'
    selectedRoomId.value = toId
    return true
  }

  function addOrderLine(
    roomId: string,
    item: { id: string; name: string; price: number; kitchenDept?: string },
    qty = 1,
    isGift = false,
    flavor?: string,
  ) {
    const r = rooms.value.find((x) => x.id === roomId)
    if (!r || (r.status !== 'open' && r.status !== 'billing')) return false
    if (r.settleRequested) return false
    ensureOrder(roomId)
    const lines = orders.value[roomId]
    // 从物品资料取出品部门
    const catalog = settings.items.find((i) => i.id === item.id)
    const dept = item.kitchenDept || catalog?.kitchenDept || '厨房'
    const exist = lines.find(
      (l) =>
        l.itemId === item.id &&
        l.isGift === isGift &&
        l.flavor === flavor &&
        (l.kitchenStatus === 'pending' || l.kitchenStatus === 'making'),
    )
    if (exist) exist.qty += qty
    else
      lines.push({
        id: `ol${Date.now()}`,
        itemId: item.id,
        name: item.name,
        price: item.price,
        qty,
        isGift,
        flavor,
        kitchenDept: dept,
        kitchenStatus: 'pending',
        printed: false,
        createdAt: new Date().toISOString(),
      })
    return true
  }

  function setKitchenStatus(
    roomId: string,
    lineId: string,
    status: KitchenLineStatus,
  ) {
    const line = (orders.value[roomId] || []).find((l) => l.id === lineId)
    if (!line) return false
    line.kitchenStatus = status
    const room = rooms.value.find((r) => r.id === roomId)
    kitchenHistory.value.unshift({
      id: `kh${Date.now()}`,
      roomId,
      roomName: room?.name || roomId,
      line: { ...line },
      action: status,
      at: new Date().toISOString(),
    })
    if (kitchenHistory.value.length > 200) kitchenHistory.value.length = 200
    // 自动送达
    if (status === 'done' && settings.business.autoDeliver) {
      line.kitchenStatus = 'served'
    }
    return true
  }

  function markPrinted(roomId: string, lineId: string) {
    const line = (orders.value[roomId] || []).find((l) => l.id === lineId)
    if (!line) return false
    line.printed = true
    return true
  }

  /** 出品看板：按部门过滤的待出品行 */
  function kitchenQueue(dept?: string) {
    const rows: Array<{
      roomId: string
      roomName: string
      roomStatus: RoomStatus
      line: OrderLine
    }> = []
    for (const room of rooms.value) {
      if (room.status !== 'open' && room.status !== 'billing') continue
      for (const line of orders.value[room.id] || []) {
        if (line.kitchenStatus === 'served') continue
        if (dept && line.kitchenDept !== dept) continue
        rows.push({
          roomId: room.id,
          roomName: room.name,
          roomStatus: room.status,
          line,
        })
      }
    }
    return rows.sort(
      (a, b) =>
        (a.line.createdAt || '').localeCompare(b.line.createdAt || '') ||
        a.roomName.localeCompare(b.roomName),
    )
  }

  function requestSettle(roomId: string) {
    const r = rooms.value.find((x) => x.id === roomId)
    if (!r || r.status !== 'open') return false
    r.settleRequested = true
    r.status = 'billing'
    return true
  }

  function cancelSettleRequest(roomId: string) {
    const r = rooms.value.find((x) => x.id === roomId)
    if (!r || r.status !== 'billing') return false
    r.settleRequested = false
    r.status = 'open'
    return true
  }

  /** 收款成功 → 清洁 */
  function collectPayment(roomId: string, amount: number) {
    const r = rooms.value.find((x) => x.id === roomId)
    if (!r || r.status !== 'billing') return false
    const pay = payableOf(roomId)
    todaySales.value = Math.round((todaySales.value + pay.payable) * 100) / 100
    orders.value[roomId] = []
    r.status = 'cleaning'
    r.settleRequested = false
    r.prepay = 0
    r.discount = 1
    return true
  }

  /** 结账重开：清洁/离台后再次打开，不收低消，保留订房人业绩 */
  function reopenRoom(roomId: string) {
    const r = rooms.value.find((x) => x.id === roomId)
    if (!r || (r.status !== 'cleaning' && r.status !== 'idle')) return false
    if (!r.booker && r.status === 'idle') return false
    r.status = 'open'
    r.reopen = true
    r.settleRequested = false
    r.timeLabel = nowLabel()
    ensureOrder(roomId)
    return true
  }

  function setAvailable(roomId: string) {
    const r = rooms.value.find((x) => x.id === roomId)
    if (!r || r.status !== 'cleaning') return false
    resetRoom(r)
    return true
  }

  function formatMoney(n: number) {
    return settings.formatMoney(n)
  }

  return {
    rooms,
    orders,
    members,
    credits,
    kitchenHistory,
    todaySales,
    todayOpens,
    selectedRoomId,
    selectedRoom,
    selectedOrder,
    statusCounts,
    statusMeta,
    setStatusColor,
    resetStatusColors,
    kpi,
    networkOnline,
    version,
    licenseOrg,
    selectRoom,
    orderTotal,
    payableOf,
    reserve,
    cancelReserve,
    openRoom,
    applyOpenPackage,
    syncRoomsFromSettings,
    syncRoomPackagesFromSettings,
    cancelOpen,
    transferRoom,
    addOrderLine,
    setKitchenStatus,
    markPrinted,
    kitchenQueue,
    requestSettle,
    cancelSettleRequest,
    collectPayment,
    reopenRoom,
    setAvailable,
    formatMoney,
    ensureOrder,
  }
})
