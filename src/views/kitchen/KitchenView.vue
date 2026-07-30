<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import Themeable from '@/components/theme/Themeable.vue'
import { usePosStore, type KitchenLineStatus } from '@/stores/pos'
import { useSettingsStore } from '@/stores/settings'
import { Flame, Volume2, VolumeX, Printer, RefreshCw, Search, AlertTriangle } from '@lucide/vue'

const pos = usePosStore()
const settings = useSettingsStore()

const station = ref<'全部' | '吧台' | '厨房'>('全部')
const voiceOn = ref(true)
const tab = ref<'board' | 'soldout' | 'history'>('board')
const toast = ref('')
function showToast(m: string) {
  toast.value = m
  setTimeout(() => { toast.value = '' }, 2000)
}

const queue = computed(() =>
  station.value === '全部' ? pos.kitchenQueue() : pos.kitchenQueue(station.value),
)

const pendingCount = computed(() => queue.value.filter((q) => q.line.kitchenStatus === 'pending').length)

watch(pendingCount, (n, o) => {
  if (voiceOn.value && n > (o || 0)) {
    try {
      const u = new SpeechSynthesisUtterance(`新出品单，待制作 ${n} 单`)
      u.lang = 'zh-CN'
      speechSynthesis.speak(u)
    } catch { /* ignore */ }
  }
})

function nextStatus(s?: KitchenLineStatus): KitchenLineStatus {
  if (s === 'pending') return 'making'
  if (s === 'making') return 'done'
  if (s === 'done') return 'served'
  return 'making'
}
function advance(roomId: string, lineId: string, cur?: KitchenLineStatus) {
  const n = nextStatus(cur)
  if (pos.setKitchenStatus(roomId, lineId, n)) {
    showToast(n === 'making' ? '开始制作' : n === 'done' ? '制作完成' : '已送达')
    if (voiceOn.value && n === 'done') {
      try {
        const u = new SpeechSynthesisUtterance('出餐完成')
        u.lang = 'zh-CN'
        speechSynthesis.speak(u)
      } catch { /* */ }
    }
  }
}
function printLine(roomId: string, lineId: string, name: string) {
  pos.markPrinted(roomId, lineId)
  showToast(`已打印出品单：${name}`)
}
function reprint(roomId: string, lineId: string, name: string) {
  showToast(`补单打印：${name}`)
  pos.markPrinted(roomId, lineId)
}

/** 沽清 */
function toggleSoldOut(itemId: string) {
  const it = settings.items.find((i) => i.id === itemId)
  if (!it) return
  it.soldOut = !it.soldOut
  showToast(it.soldOut ? `${it.name} 已沽清` : `${it.name} 已恢复供应`)
}

const openRooms = computed(() =>
  pos.rooms.filter((r) => r.status === 'open' || r.status === 'billing'),
)
</script>

<template>
  <div class="kitchen">
    <Themeable id="kit.header" label="出品页头" tag="div" class="page-head" default-text="出品系统 · 按出品点分流" />
    <div v-if="toast" class="toast">{{ toast }}</div>

    <div class="toolbar">
      <div class="stations">
        <button type="button" class="chip" :class="{ active: station === '全部' }" @click="station = '全部'">全部</button>
        <button type="button" class="chip" :class="{ active: station === '吧台' }" @click="station = '吧台'">吧台出品</button>
        <button type="button" class="chip" :class="{ active: station === '厨房' }" @click="station = '厨房'">厨房出品</button>
      </div>
      <div class="tabs">
        <button type="button" class="chip" :class="{ active: tab === 'board' }" @click="tab = 'board'"><Flame :size="14" /> 出餐看板</button>
        <button type="button" class="chip" :class="{ active: tab === 'soldout' }" @click="tab = 'soldout'"><AlertTriangle :size="14" /> 缺货沽清</button>
        <button type="button" class="chip" :class="{ active: tab === 'history' }" @click="tab = 'history'"><Search :size="14" /> 历史出品</button>
      </div>
      <button type="button" class="chip" @click="voiceOn = !voiceOn">
        <Volume2 v-if="voiceOn" :size="14" /><VolumeX v-else :size="14" />
        {{ voiceOn ? '语音开' : '语音关' }}
      </button>
    </div>

    <!-- 房态摘要 -->
    <div class="room-strip">
      <span v-for="r in openRooms" :key="r.id" class="rs" :style="{ borderColor: pos.statusMeta[r.status].color, background: pos.statusMeta[r.status].bg }">
        {{ r.name }} · {{ pos.statusMeta[r.status].label }}
      </span>
      <span v-if="!openRooms.length" class="muted">暂无开台房台</span>
    </div>

    <template v-if="tab === 'board'">
      <div class="board">
        <Themeable
          v-for="q in queue"
          :key="q.line.id"
          :id="`kit.ticket.${q.line.id}`"
          :label="`出品单-${q.roomName}`"
          tag="article"
          class="ticket"
          :class="q.line.kitchenStatus"
        >
          <div class="t-head">
            <strong>{{ q.roomName }}</strong>
            <span class="dept">{{ q.line.kitchenDept || '厨房' }}</span>
            <span class="st">{{
              { pending: '待接单', making: '制作中', done: '待送达', served: '已送达' }[q.line.kitchenStatus || 'pending']
            }}</span>
          </div>
          <div class="t-body">
            <div class="name">{{ q.line.name }} × {{ q.line.qty }}</div>
            <div v-if="q.line.flavor" class="flavor">口味：{{ q.line.flavor }}</div>
            <div v-if="q.line.isGift" class="gift">赠送</div>
          </div>
          <div class="t-actions">
            <button type="button" class="btn" @click="printLine(q.roomId, q.line.id, q.line.name)">
              <Printer :size="12" /> {{ q.line.printed ? '已打印' : '打印' }}
            </button>
            <button type="button" class="btn" @click="reprint(q.roomId, q.line.id, q.line.name)">
              <RefreshCw :size="12" /> 补单
            </button>
            <button
              v-if="q.line.kitchenStatus !== 'served'"
              type="button"
              class="btn primary"
              @click="advance(q.roomId, q.line.id, q.line.kitchenStatus)"
            >
              {{
                q.line.kitchenStatus === 'pending'
                  ? '接单制作'
                  : q.line.kitchenStatus === 'making'
                    ? '制作完成'
                    : '确认送达'
              }}
            </button>
          </div>
        </Themeable>
        <div v-if="!queue.length" class="empty">当前出品点暂无待做单据</div>
      </div>
    </template>

    <template v-else-if="tab === 'soldout'">
      <p class="hint">沽清后收银点单不可再选该物品（与系统设置物品联动）</p>
      <div class="sold-grid">
        <label v-for="it in settings.items" :key="it.id" class="sold-item" :class="{ off: it.soldOut }">
          <input type="checkbox" :checked="it.soldOut" @change="toggleSoldOut(it.id)" />
          <span>{{ it.name }}</span>
          <small>{{ it.kitchenDept }} · {{ it.code }}</small>
          <em v-if="it.soldOut">已沽清</em>
        </label>
      </div>
    </template>

    <template v-else>
      <table class="tbl">
        <thead>
          <tr><th>时间</th><th>房台</th><th>品名</th><th>数量</th><th>出品点</th><th>动作</th></tr>
        </thead>
        <tbody>
          <tr v-for="h in pos.kitchenHistory" :key="h.id">
            <td>{{ h.at.slice(11, 19) }}</td>
            <td>{{ h.roomName }}</td>
            <td>{{ h.line.name }}</td>
            <td>{{ h.line.qty }}</td>
            <td>{{ h.line.kitchenDept }}</td>
            <td>{{ h.action }}</td>
          </tr>
        </tbody>
      </table>
      <div v-if="!pos.kitchenHistory.length" class="empty">暂无历史</div>
    </template>
  </div>
</template>

<style scoped>
.kitchen{display:flex;flex-direction:column;gap:12px}
.page-head{font-size:15px;font-weight:600;color:var(--theme-text-secondary)}
.toast{background:var(--theme-success);color:#fff;padding:8px 12px;border-radius:8px;font-size:13px}
.toolbar{display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between}
.stations,.tabs{display:flex;gap:6px;flex-wrap:wrap}
.chip{display:inline-flex;align-items:center;gap:4px;border:1px solid var(--theme-border);background:var(--theme-bg-card);border-radius:999px;padding:6px 12px;font-size:12px;cursor:pointer;font-family:inherit;color:var(--theme-text-secondary)}
.chip.active{background:var(--theme-primary);border-color:var(--theme-primary);color:#fff}
.room-strip{display:flex;flex-wrap:wrap;gap:6px}
.rs{font-size:11px;padding:4px 10px;border-radius:999px;border:1px solid}
.muted{font-size:12px;color:var(--theme-text-muted)}
.board{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px}
.ticket{background:var(--theme-bg-card);border:1px solid var(--theme-border);border-radius:12px;padding:12px;box-shadow:var(--theme-shadow);border-left:4px solid var(--theme-warning)}
.ticket.making{border-left-color:var(--theme-primary)}
.ticket.done{border-left-color:var(--theme-success)}
.t-head{display:flex;gap:8px;align-items:center;font-size:13px;margin-bottom:8px}
.dept{background:var(--theme-bg-page);padding:2px 6px;border-radius:4px;font-size:11px}
.st{margin-left:auto;font-size:11px;color:var(--theme-text-muted)}
.name{font-size:16px;font-weight:700}
.flavor,.gift{font-size:12px;color:var(--theme-text-secondary);margin-top:4px}
.t-actions{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}
.btn{display:inline-flex;align-items:center;gap:4px;border:1px solid var(--theme-border);background:var(--theme-bg-page);border-radius:8px;padding:5px 10px;font-size:11px;cursor:pointer;font-family:inherit}
.btn.primary{background:var(--theme-primary);border-color:var(--theme-primary);color:#fff}
.empty{padding:24px;text-align:center;color:var(--theme-text-muted);font-size:13px}
.hint{font-size:12px;color:var(--theme-text-muted)}
.sold-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:8px}
.sold-item{display:flex;flex-direction:column;gap:2px;border:1px solid var(--theme-border);border-radius:10px;padding:10px;background:var(--theme-bg-card);font-size:13px;cursor:pointer}
.sold-item.off{opacity:.7;border-color:var(--theme-danger)}
.sold-item small{font-size:11px;color:var(--theme-text-muted)}
.sold-item em{color:var(--theme-danger);font-style:normal;font-size:11px}
.tbl{width:100%;border-collapse:collapse;font-size:12px;background:var(--theme-bg-card);border-radius:10px;overflow:hidden}
.tbl th,.tbl td{padding:8px;border-bottom:1px solid var(--theme-border);text-align:left}
</style>
