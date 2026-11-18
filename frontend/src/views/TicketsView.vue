<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { Receipt, ArrowUpRight, RefreshCw } from 'lucide-vue-next'
import { api } from '../services/api'
import { useRefresh } from '../services/live'
import { useUi } from '../stores/ui'
import type { Ticket, RestaurantTable } from '../types'
import StatusBadge from '../components/StatusBadge.vue'
import MoneyText from '../components/MoneyText.vue'
const { t } = useI18n()
const route = useRoute()
const ui = useUi()
const tickets = ref<Ticket[]>([])
const tables = ref<RestaurantTable[]>([])
const loading = ref(true)
const failed = ref(false)
const status = ref('OPEN')
const tableId = ref('')
const newest = ref(false)
const kitchen = computed(() => route.path.endsWith('/kitchen'))
const filtered = computed(() =>
  tickets.value
    .filter(
      (ticket) =>
        (!status.value || ticket.status === status.value) &&
        (!tableId.value || ticket.tableId === tableId.value),
    )
    .sort((a, b) => (Date.parse(a.createdAt) - Date.parse(b.createdAt)) * (newest.value ? -1 : 1)),
)
async function load() {
  try {
    const [ts, tb] = await Promise.all([api.tickets(), api.list<RestaurantTable>('tables')])
    tickets.value = kitchen.value
      ? await Promise.all(ts.filter((t) => t.status === 'OPEN').map((t) => api.ticket(t._id)))
      : ts
    tables.value = tb
    failed.value = false
  } catch (e) {
    if (!failed.value) ui.error(e)
    failed.value = true
  } finally {
    loading.value = false
  }
}
const refresh = useRefresh(load)
watch(kitchen, () => {
  status.value = 'OPEN'
  void refresh()
})
function tableNumber(id: string) {
  return tables.value.find((t) => t._id === id)?.number ?? '—'
}
function date(value: string) {
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'Africa/Tunis',
  }).format(new Date(value))
}
</script>
<template>
  <div class="page-heading">
    <div>
      <p class="eyebrow">Medina · Service</p>
      <h1>{{ t(kitchen ? 'kitchen' : 'tickets') }}</h1>
    </div>
    <button @click="refresh"><RefreshCw :size="18" />{{ t('refresh') }}</button>
  </div>
  <p v-if="kitchen" class="notice">{{ t('kitchenHint') }}</p>
  <section class="toolbar card">
    <label
      >{{ t('status')
      }}<select v-model="status">
        <option v-if="!kitchen" value="">{{ t('all') }}</option>
        <option value="OPEN">{{ t('open') }}</option>
        <option v-if="!kitchen" value="PAID">{{ t('paid') }}</option>
        <option v-if="!kitchen" value="CLOSED">{{ t('closed') }}</option>
      </select></label
    ><label
      >{{ t('table')
      }}<select v-model="tableId">
        <option value="">{{ t('all') }}</option>
        <option v-for="table in tables" :key="table._id" :value="table._id">
          {{ t('table') }} {{ table.number }}
        </option>
      </select></label
    ><label
      >{{ t('sort')
      }}<select v-model="newest">
        <option :value="false">{{ t('oldest') }}</option>
        <option :value="true">{{ t('newest') }}</option>
      </select></label
    ><span class="muted">{{ filtered.length }} {{ t('tickets') }}</span>
  </section>
  <p v-if="loading" role="status" class="empty">{{ t('loading') }}</p>
  <div v-else-if="failed" class="empty">
    <button @click="refresh">{{ t('retry') }}</button>
  </div>
  <div v-else class="ticket-grid">
    <RouterLink
      v-for="ticket in filtered"
      :key="ticket._id"
      class="card ticket-card"
      :to="'/staff/tickets/' + ticket._id"
      ><div class="row">
        <span class="ticket-number"><Receipt :size="18" />#{{ ticket.ticketNumber }}</span
        ><StatusBadge :status="ticket.status" />
      </div>
      <h2>{{ t('table') }} {{ tableNumber(ticket.tableId) }}</h2>
      <small>{{ date(ticket.createdAt) }}</small>
      <ul v-if="kitchen" class="kitchen-lines">
        <li v-for="item in ticket.items" :key="item._id">
          <strong>{{ item.quantity }} × {{ item.productName }}</strong
          ><small v-if="item.note">{{ item.note }}</small>
        </li>
      </ul>
      <div class="ticket-footer"><MoneyText :value="ticket.total" /><ArrowUpRight :size="20" /></div
    ></RouterLink>
    <div v-if="!filtered.length" class="card empty">
      <Receipt :size="32" />
      <p>{{ t('empty') }}</p>
    </div>
  </div>
</template>
