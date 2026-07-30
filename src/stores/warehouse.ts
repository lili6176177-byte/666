import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { useSettingsStore } from '@/stores/settings'

const KEY = 'tas_warehouse'

export interface StockRow {
  itemId: string
  qty: number
  min: number
  location: string
}

export interface Supplier {
  id: string
  name: string
  contact: string
  phone: string
}

export interface StockLog {
  id: string
  type: 'in' | 'out' | 'transfer' | 'check'
  itemId: string
  itemName: string
  qty: number
  note: string
  at: string
  fromLoc?: string
  toLoc?: string
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

export const useWarehouseStore = defineStore('warehouse', () => {
  const settings = useSettingsStore()

  const stock = ref<StockRow[]>(
    load(
      'stock',
      settings.items.map((i, idx) => ({
        itemId: i.id,
        qty: 50 - idx * 5,
        min: 10,
        location: idx % 2 === 0 ? 'A-01' : 'B-02',
      })),
    ),
  )
  const suppliers = ref<Supplier[]>(
    load('suppliers', [
      { id: 's1', name: '华南酒水批发', contact: '刘总', phone: '13800002222' },
      { id: 's2', name: '鲜蔬配送中心', contact: '王姐', phone: '13900003333' },
    ]),
  )
  const logs = ref<StockLog[]>(load('logs', []))

  watch(stock, (v) => save('stock', v), { deep: true })
  watch(suppliers, (v) => save('suppliers', v), { deep: true })
  watch(logs, (v) => save('logs', v), { deep: true })

  // 同步新物品
  function syncItems() {
    for (const it of settings.items) {
      if (!stock.value.find((s) => s.itemId === it.id)) {
        stock.value.push({ itemId: it.id, qty: 0, min: 10, location: 'A-01' })
      }
    }
  }
  syncItems()

  const rows = computed(() =>
    stock.value.map((s) => {
      const it = settings.items.find((i) => i.id === s.itemId)
      return {
        ...s,
        name: it?.name || s.itemId,
        code: it?.code || '',
        cost: it?.costPrice || 0,
        low: s.qty < s.min,
      }
    }),
  )

  const lowCount = computed(() => rows.value.filter((r) => r.low).length)

  function adjust(
    itemId: string,
    delta: number,
    type: StockLog['type'],
    note: string,
    locs?: { from?: string; to?: string },
  ) {
    const row = stock.value.find((s) => s.itemId === itemId)
    const it = settings.items.find((i) => i.id === itemId)
    if (!row) return false
    if (!it?.allowNegativeStock && row.qty + delta < 0) return false
    row.qty += delta
    if (locs?.to) row.location = locs.to
    logs.value.unshift({
      id: `sl${Date.now()}`,
      type,
      itemId,
      itemName: it?.name || itemId,
      qty: delta,
      note,
      at: new Date().toISOString(),
      fromLoc: locs?.from,
      toLoc: locs?.to,
    })
    return true
  }

  function stockIn(itemId: string, qty: number, note = '入库') {
    return adjust(itemId, Math.abs(qty), 'in', note)
  }
  function stockOut(itemId: string, qty: number, note = '出库') {
    return adjust(itemId, -Math.abs(qty), 'out', note)
  }
  function transfer(itemId: string, qty: number, from: string, to: string) {
    return adjust(itemId, 0, 'transfer', `调拨 ${from}→${to}`, { from, to })
  }
  function check(itemId: string, actualQty: number) {
    const row = stock.value.find((s) => s.itemId === itemId)
    if (!row) return false
    const delta = actualQty - row.qty
    row.qty = actualQty
    logs.value.unshift({
      id: `sl${Date.now()}`,
      type: 'check',
      itemId,
      itemName: settings.items.find((i) => i.id === itemId)?.name || itemId,
      qty: delta,
      note: delta >= 0 ? `盘盈 ${delta}` : `盘亏 ${delta}`,
      at: new Date().toISOString(),
    })
    return true
  }

  return {
    stock,
    suppliers,
    logs,
    rows,
    lowCount,
    syncItems,
    stockIn,
    stockOut,
    transfer,
    check,
  }
})
