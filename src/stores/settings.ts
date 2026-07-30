import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'

const KEY = 'tas_store_settings'

/** 抹零规则 */
export type RoundingRule = 'none' | 'round' | 'floor' | 'ceil'

/** 赠送金额模式 */
export type GiftAmountMode = 'monthly_reset' | 'accumulate'

export interface BusinessParams {
  shopName: string
  openTime: string
  closeTime: string
  currency: '¥' | '$' | 'HK$' | '€'
  roundingRule: RoundingRule
  autoDeliver: boolean
  reserveAutoCancelMinutes: number
  reserveAutoCancelEnabled: boolean
  showPackageChildren: boolean
  giftAmountMode: GiftAmountMode
  refundRequireSwipe: boolean
  freeOrderRequireSwipe: boolean
}

export interface ItemCategory {
  id: string
  name: string
  code: string
  sort: number
  parentId: string | null // null = 大类
}

export interface StoreItem {
  id: string
  name: string
  code: string
  categoryId: string // 小类 id
  enabled: boolean
  /** 序号，越小越靠前 */
  sort: number
  barcode: string
  roomPrice: number
  marketPrice: number
  memberPrice: number
  costPrice: number
  allowNegativeStock: boolean
  kitchenDept: string
  countMinConsume: boolean
  isPackage: boolean
  isRoomPackage: boolean
  soldOut: boolean
  commission: number
  commissionPercent: number
  flavorIds: string[]
  unitId: string
  /** 买几 */
  buyQty: number
  /** 送几 */
  giftQty: number
  /** true=分开点到数量也送；false=必须一次买满才送 */
  giftAccumulate: boolean
  /** 是否参与买单打折 */
  allowDiscount: boolean
  /** 拼音（点餐搜索用，添加时按名称自动生成） */
  pinyin: string
}

export interface Flavor {
  id: string
  name: string
  options: string[]
}

export interface Unit {
  id: string
  name: string
}

export interface PackageItem {
  itemId: string
  qty: number
  /** 多选一：同组内点单时选一种 */
  multiSelect: boolean
  groupId?: string
}

export interface PackageDef {
  id: string
  /** 关联的套餐物品 id（左侧勾选 isPackage 的物品） */
  itemId: string
  name: string
  code: string
  price: number
  items: PackageItem[]
  enabled: boolean
}

export interface OpenPackageLine {
  itemId: string
  qty: number
}

export interface OpenPackageDef {
  id: string
  /** 关联 isRoomPackage 物品 */
  itemId: string
  name: string
  code: string
  price: number
  lines: OpenPackageLine[]
  autoKitchen: boolean
  enabled: boolean
}

export interface Dept {
  id: string
  name: string
  commissionOn: boolean
}

export interface Position {
  id: string
  name: string
  canFreeOrder: boolean
  creditQuota: number
  giftQuota: number
  canOrder: boolean
  loginPos: boolean
  loginBar: boolean
  loginKitchen: boolean
  loginFruit: boolean
  canRefund: boolean
  canBook: boolean
  commissionOn: boolean
  voiceOff: boolean
}

export interface Employee {
  id: string
  name: string
  code: string
  deptId: string
  positionId: string
  password: string
}

export interface Area {
  id: string
  name: string
}

export interface KitchenStation {
  id: string
  name: string
  /** 吧台 | 厨房 | 外卖 | 水果 | 收银 */
  type: string
  areaId: string
  printer: string
  ip: string
  /** 一品一单 | 合并出单 */
  printMode: 'one' | 'merge'
  printCount: number
}

export interface RoomType {
  id: string
  name: string
}

export interface RoomBox {
  id: string
  name: string
  areaId: string
  typeId: string
  billing: 'timed' | 'min_consume' | 'free'
  minConsume: number
  hourPrice: number
  openPackageId: string
  ip: string
}

export interface RechargeRule {
  id: string
  sort: number
  pay: number
  gift: number
  label: string
}

export interface MemberUpgradeRule {
  id: string
  level: string
  minRecharge: number
  discount: number
}

export interface MemberRules {
  rechargeRules: RechargeRule[]
  upgradeRules: MemberUpgradeRule[]
  pointsRate: number
  discountRate: number
  pointsExchange: string
}

export interface PrintTemplate {
  id: string
  name: string
  type: string
  content: string
}

const defaultBusiness: BusinessParams = {
  shopName: '演示门店',
  openTime: '10:00',
  closeTime: '02:00',
  currency: '¥',
  roundingRule: 'round',
  autoDeliver: false,
  reserveAutoCancelMinutes: 30,
  reserveAutoCancelEnabled: true,
  showPackageChildren: true,
  giftAmountMode: 'monthly_reset',
  refundRequireSwipe: true,
  freeOrderRequireSwipe: true,
}

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(KEY + '_' + key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function save(key: string, data: unknown) {
  localStorage.setItem(KEY + '_' + key, JSON.stringify(data))
}

/** 按抹零规则计算实收与抹零额 */
export function applyRounding(
  total: number,
  rule: RoundingRule,
): { payable: number; waived: number } {
  if (rule === 'none') return { payable: total, waived: 0 }
  let payable = total
  if (rule === 'round') payable = Math.round(total / 10) * 10
  else if (rule === 'floor') payable = Math.floor(total / 10) * 10
  else if (rule === 'ceil') payable = Math.ceil(total / 10) * 10
  return { payable, waived: Math.round((total - payable) * 100) / 100 }
}

export const useSettingsStore = defineStore('settings', () => {
  const business = ref<BusinessParams>(load('business', defaultBusiness))
  const categories = ref<ItemCategory[]>(
    load('categories', [
      { id: 'c1', name: '酒水类', code: '1', sort: 1, parentId: null },
      { id: 'c1-1', name: '啤酒', code: '11', sort: 1, parentId: 'c1' },
      { id: 'c1-2', name: '洋酒', code: '12', sort: 2, parentId: 'c1' },
      { id: 'c2', name: '食品类', code: '2', sort: 2, parentId: null },
      { id: 'c2-1', name: '小吃', code: '21', sort: 1, parentId: 'c2' },
    ]),
  )
  const flavors = ref<Flavor[]>(
    load('flavors', [
      { id: 'f1', name: '辣度', options: ['不辣', '微辣', '中辣', '特辣'] },
      { id: 'f2', name: '温度', options: ['常温', '加冰', '热'] },
    ]),
  )
  const units = ref<Unit[]>(
    load('units', [
      { id: 'u1', name: '瓶' },
      { id: 'u2', name: '杯' },
      { id: 'u3', name: '份' },
      { id: 'u4', name: '打' },
    ]),
  )
  const items = ref<StoreItem[]>(
    load('items', [
      {
        id: 'i1', name: '百威', pinyin: 'baiwei bw', code: '11001', categoryId: 'c1-1', enabled: true, sort: 1, barcode: '',
        roomPrice: 25, marketPrice: 30, memberPrice: 22, costPrice: 12, allowNegativeStock: false,
        kitchenDept: '吧台', countMinConsume: true, isPackage: false, isRoomPackage: false, soldOut: false,
        commission: 1, commissionPercent: 0, flavorIds: ['f2'], unitId: 'u1',
        buyQty: 0, giftQty: 0, giftAccumulate: false, allowDiscount: true,
      },
      {
        id: 'i2', name: '轩尼诗XO', pinyin: 'xuannishixo xnsxo', code: '12001', categoryId: 'c1-2', enabled: true, sort: 1, barcode: '',
        roomPrice: 3888, marketPrice: 4200, memberPrice: 3600, costPrice: 2200, allowNegativeStock: false,
        kitchenDept: '吧台', countMinConsume: true, isPackage: true, isRoomPackage: false, soldOut: false,
        commission: 50, commissionPercent: 2, flavorIds: [], unitId: 'u1',
        buyQty: 0, giftQty: 0, giftAccumulate: false, allowDiscount: false,
      },
      {
        id: 'i3', name: '花生米', pinyin: 'huashengmi hsm', code: '21001', categoryId: 'c2-1', enabled: true, sort: 2, barcode: '',
        roomPrice: 18, marketPrice: 22, memberPrice: 15, costPrice: 5, allowNegativeStock: true,
        kitchenDept: '厨房', countMinConsume: false, isPackage: false, isRoomPackage: false, soldOut: false,
        commission: 0, commissionPercent: 0, flavorIds: ['f1'], unitId: 'u3',
        buyQty: 2, giftQty: 1, giftAccumulate: true, allowDiscount: true,
      },
      {
        id: 'i4', name: '开房套餐1680', pinyin: 'kaifangtaocan1680 kftc', code: 'OP001', categoryId: 'c2-1', enabled: true, sort: 3, barcode: '',
        roomPrice: 1680, marketPrice: 1680, memberPrice: 1680, costPrice: 0, allowNegativeStock: false,
        kitchenDept: '吧台', countMinConsume: false, isPackage: false, isRoomPackage: true, soldOut: false,
        commission: 0, commissionPercent: 0, flavorIds: [], unitId: 'u3',
        buyQty: 0, giftQty: 0, giftAccumulate: false, allowDiscount: false,
      },
      {
        id: 'i5', name: '雪碧', pinyin: 'xuebi xb', code: '11002', categoryId: 'c1-1', enabled: true, sort: 2, barcode: '',
        roomPrice: 15, marketPrice: 18, memberPrice: 12, costPrice: 5, allowNegativeStock: false,
        kitchenDept: '吧台', countMinConsume: false, isPackage: false, isRoomPackage: false, soldOut: false,
        commission: 0, commissionPercent: 0, flavorIds: [], unitId: 'u1',
        buyQty: 0, giftQty: 0, giftAccumulate: false, allowDiscount: true,
      },
      {
        id: 'i6', name: '冰红茶', pinyin: 'binghongcha bhc', code: '11003', categoryId: 'c1-1', enabled: true, sort: 3, barcode: '',
        roomPrice: 15, marketPrice: 18, memberPrice: 12, costPrice: 5, allowNegativeStock: false,
        kitchenDept: '吧台', countMinConsume: false, isPackage: false, isRoomPackage: false, soldOut: false,
        commission: 0, commissionPercent: 0, flavorIds: [], unitId: 'u1',
        buyQty: 0, giftQty: 0, giftAccumulate: false, allowDiscount: true,
      },
      {
        id: 'i7', name: '冰绿茶', pinyin: 'binglvcha blc', code: '11004', categoryId: 'c1-1', enabled: true, sort: 4, barcode: '',
        roomPrice: 15, marketPrice: 18, memberPrice: 12, costPrice: 5, allowNegativeStock: false,
        kitchenDept: '吧台', countMinConsume: false, isPackage: false, isRoomPackage: false, soldOut: false,
        commission: 0, commissionPercent: 0, flavorIds: [], unitId: 'u1',
        buyQty: 0, giftQty: 0, giftAccumulate: false, allowDiscount: true,
      },
    ]),
  )
  const packages = ref<PackageDef[]>(
    load('packages', [
      {
        id: 'p1', itemId: 'i2', name: '轩尼诗XO', code: 'P001', price: 3888, enabled: true,
        items: [
          { itemId: 'i2', qty: 1, multiSelect: false },
          { itemId: 'i5', qty: 4, multiSelect: true, groupId: 'drink' },
          { itemId: 'i6', qty: 4, multiSelect: true, groupId: 'drink' },
          { itemId: 'i7', qty: 4, multiSelect: true, groupId: 'drink' },
        ],
      },
    ]),
  )
  const openPackages = ref<OpenPackageDef[]>(
    load('openPackages', [
      {
        id: 'op1', itemId: 'i4', name: '开房套餐1680', code: 'OP001', price: 1680,
        lines: [
          { itemId: 'i4', qty: 1 },
          { itemId: 'i1', qty: 24 },
        ],
        autoKitchen: true, enabled: true,
      },
    ]),
  )
  const depts = ref<Dept[]>(load('depts', [
    { id: 'd1', name: '管理', commissionOn: true },
    { id: 'd2', name: '前台', commissionOn: true },
    { id: 'd3', name: '销售部', commissionOn: true },
  ]))
  const positions = ref<Position[]>(load('positions', [
    { id: 'pos1', name: '店长', canFreeOrder: true, creditQuota: 5000, giftQuota: 500, canOrder: true, loginPos: true, loginBar: true, loginKitchen: true, loginFruit: true, canRefund: true, canBook: true, commissionOn: true, voiceOff: false },
    { id: 'pos2', name: '收银员', canFreeOrder: false, creditQuota: 0, giftQuota: 50, canOrder: true, loginPos: true, loginBar: false, loginKitchen: false, loginFruit: false, canRefund: false, canBook: false, commissionOn: true, voiceOff: false },
  ]))
  const areas = ref<Area[]>(load('areas', [
    { id: 'a1', name: '一楼' }, { id: 'a2', name: '二楼' }, { id: 'a3', name: '三楼' },
  ]))
  const kitchenStations = ref<KitchenStation[]>(load('kitchenStations', [
    { id: 'ks1', name: '吧台出品', type: '吧台', areaId: 'a1', printer: '吧台打印机', ip: '192.168.1.201', printMode: 'one', printCount: 1 },
    { id: 'ks2', name: '厨房出品', type: '厨房', areaId: 'a1', printer: '厨房打印机', ip: '192.168.1.202', printMode: 'merge', printCount: 1 },
  ]))
  const roomTypes = ref<RoomType[]>(load('roomTypes', [
    { id: 'rt1', name: '标准' }, { id: 'rt2', name: '豪华' }, { id: 'rt3', name: 'VIP' },
  ]))
  const employees = ref<Employee[]>(
    load('employees', [
      { id: 'e1', name: '张经理', code: '001', deptId: 'd1', positionId: 'pos1', password: '123456' },
      { id: 'e2', name: '李收银', code: '002', deptId: 'd2', positionId: 'pos2', password: '123456' },
    ]),
  )
  const rooms = ref<RoomBox[]>(
    load('rooms', [
      { id: 'r1', name: '豪华1号', areaId: 'a1', typeId: 'rt2', billing: 'min_consume', minConsume: 588, hourPrice: 0, openPackageId: 'op1', ip: '192.168.1.101' },
      { id: 'r2', name: '商务2号', areaId: 'a2', typeId: 'rt1', billing: 'timed', minConsume: 0, hourPrice: 128, openPackageId: '', ip: '192.168.1.102' },
    ]),
  )
  const memberRules = ref<MemberRules>(
    load('memberRules', {
      rechargeRules: [
        { id: 'rr1', sort: 1, pay: 100, gift: 10, label: '充100送10' },
        { id: 'rr2', sort: 2, pay: 500, gift: 80, label: '充500送80' },
        { id: 'rr3', sort: 3, pay: 1000, gift: 200, label: '充1000送200' },
      ],
      upgradeRules: [
        { id: 'ur1', level: '银卡', minRecharge: 1000, discount: 9.5 },
        { id: 'ur2', level: '金卡', minRecharge: 5000, discount: 9.0 },
      ],
      pointsRate: 1,
      discountRate: 9.5,
      pointsExchange: '100积分=10元抵扣',
    }),
  )
  const printTemplates = ref<PrintTemplate[]>(
    load('printTemplates', [
      {
        id: 'pt1',
        name: '出品单',
        type: '出品',
        content: '【出品单】\n房台：{room}\n品名 数量\n{items}\n时间：{time}',
      },
      {
        id: 'pt2',
        name: '结账单',
        type: '账单',
        content:
          '【结账单】\n门店：{shop}\n房台：{room}\n{items}\n合计：{currency}{total}\n抹零：{currency}{waived}\n实收：{currency}{payable}',
      },
      {
        id: 'pt3',
        name: '赠送单',
        type: '赠送单',
        content: '【赠送单】\n操作员：{staff}\n{items}\n赠送合计：{currency}{total}',
      },
      {
        id: 'pt4',
        name: '退单',
        type: '商品退单',
        content: '【退单】\n原单：{order}\n{items}\n退款：{currency}{total}',
      },
      {
        id: 'pt5',
        name: '超市大厅单',
        type: '超市大厅单',
        content: '【大厅单】\n{items}\n合计：{currency}{total}',
      },
      {
        id: 'pt6',
        name: '会员充值单',
        type: '会员充值单',
        content: '【会员充值】\n卡号：{card}\n充值：{currency}{amount}\n余额：{currency}{balance}',
      },
      {
        id: 'pt7',
        name: '日结单',
        type: '日结单',
        content: '【日结】\n日期：{date}\n营业额：{currency}{sales}\n笔数：{count}',
      },
    ]),
  )

  // 自动持久化
  watch(business, (v) => save('business', v), { deep: true })
  watch(categories, (v) => save('categories', v), { deep: true })
  watch(flavors, (v) => save('flavors', v), { deep: true })
  watch(units, (v) => save('units', v), { deep: true })
  watch(items, (v) => save('items', v), { deep: true })
  watch(packages, (v) => save('packages', v), { deep: true })
  watch(openPackages, (v) => save('openPackages', v), { deep: true })
  watch(employees, (v) => save('employees', v), { deep: true })
  watch(rooms, (v) => save('rooms', v), { deep: true })
  watch(memberRules, (v) => save('memberRules', v), { deep: true })
  watch(printTemplates, (v) => save('printTemplates', v), { deep: true })
  watch(depts, (v) => save('depts', v), { deep: true })
  watch(positions, (v) => save('positions', v), { deep: true })
  watch(areas, (v) => save('areas', v), { deep: true })
  watch(kitchenStations, (v) => save('kitchenStations', v), { deep: true })
  watch(roomTypes, (v) => save('roomTypes', v), { deep: true })

  const majorCategories = computed(() =>
    categories.value.filter((c) => !c.parentId).sort((a, b) => a.sort - b.sort || a.code.localeCompare(b.code)),
  )

  function minorCategories(majorId: string) {
    return categories.value
      .filter((c) => c.parentId === majorId)
      .sort((a, b) => a.sort - b.sort || a.code.localeCompare(b.code))
  }

  function itemsOfCategory(catId: string) {
    return items.value
      .filter((i) => i.categoryId === catId)
      .sort((a, b) => a.sort - b.sort || a.code.localeCompare(b.code))
  }

  /** 按编号排序的物品（编号越小越靠前） */
  function sortedItemsByCode(list: StoreItem[]) {
    return [...list].sort((a, b) => a.code.localeCompare(b.code) || a.sort - b.sort)
  }

  const packageableItems = computed(() => items.value.filter((i) => i.isPackage && i.enabled))
  const roomPackageItems = computed(() => items.value.filter((i) => i.isRoomPackage && i.enabled))

  function formatMoney(n: number) {
    return `${business.value.currency}${n.toFixed(2)}`
  }

  return {
    business,
    categories,
    flavors,
    units,
    items,
    packages,
    openPackages,
    employees,
    rooms,
    memberRules,
    printTemplates,
    depts,
    positions,
    areas,
    kitchenStations,
    roomTypes,
    majorCategories,
    minorCategories,
    itemsOfCategory,
    sortedItemsByCode,
    packageableItems,
    roomPackageItems,
    formatMoney,
    applyRounding,
  }
})
