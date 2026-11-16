<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Banknote, Receipt, TrendingUp, Clock3, ArrowUpRight, RotateCcw } from 'lucide-vue-next'
import { api } from '../services/api'
import { demo } from '../services/demo'
import { DEMO } from '../services/http'
import { useRefresh } from '../services/live'
import { useUi } from '../stores/ui'
import { tunisDay } from '../utils/money'
import type { Stats } from '../types'
import MoneyText from '../components/MoneyText.vue'
import AppModal from '../components/AppModal.vue'
const { t } = useI18n()
const ui = useUi()
const to = ref(tunisDay(new Date()))
const from = ref(tunisDay(new Date(Date.now() - 6 * 86400000)))
const stats = ref<Stats>()
const failed = ref(false)
const resetting = ref(false)
const maxSales = computed(() =>
  Math.max(1, ...(stats.value?.salesByDay.map((day) => day.total) || [])),
)
const maxQuantity = computed(() =>
  Math.max(1, ...(stats.value?.topProducts.map((p) => p.quantity) || [])),
)
async function load() {
  if (!from.value || !to.value || from.value > to.value) {
    ui.notify(t('dateError'), true)
    return
  }
  try {
    stats.value = await api.stats(from.value, to.value)
    failed.value = false
  } catch (e) {
    if (!failed.value) ui.error(e)
    failed.value = true
  }
}
const refresh = useRefresh(load)
function reset() {
  demo.reset()
  resetting.value = false
  void refresh()
}
</script>
<template>
  <div class="page-heading">
    <div>
      <p class="eyebrow">Medina · {{ t('admin') }}</p>
      <h1>{{ t('dashboard') }}</h1>
    </div>
    <RouterLink class="button primary" to="/staff/tickets"
      >{{ t('tickets') }}<ArrowUpRight :size="18"
    /></RouterLink>
  </div>
  <form class="toolbar date-toolbar" @submit.prevent="refresh">
    <label>{{ t('from') }}<input v-model="from" type="date" required :max="to" /></label
    ><label>{{ t('to') }}<input v-model="to" type="date" required :min="from" /></label
    ><button>{{ t('refresh') }}</button
    ><button v-if="DEMO" type="button" class="ghost" @click="resetting = true">
      <RotateCcw :size="16" />{{ t('reset') }}
    </button>
  </form>
  <div v-if="failed" class="empty">
    <button @click="refresh">{{ t('retry') }}</button>
  </div>
  <p v-else-if="!stats" class="empty">{{ t('loading') }}</p>
  <template v-else
    ><div class="kpi-grid">
      <section class="card kpi featured">
        <div class="row">
          <span>{{ t('sales') }}</span
          ><Banknote :size="20" />
        </div>
        <MoneyText :value="stats.salesTotal" /><small>{{ from }} → {{ to }}</small>
      </section>
      <section class="card kpi">
        <div class="row">
          <span>{{ t('count') }}</span
          ><Receipt :size="20" />
        </div>
        <strong>{{ stats.ticketsCount }}</strong
        ><small>{{ t('paid') }}</small>
      </section>
      <section class="card kpi">
        <div class="row">
          <span>{{ t('average') }}</span
          ><TrendingUp :size="20" />
        </div>
        <MoneyText :value="stats.avgTicket" /><small>TND</small>
      </section>
      <section class="card kpi">
        <div class="row">
          <span>{{ t('openCount') }}</span
          ><Clock3 :size="20" />
        </div>
        <strong>{{ stats.openTickets }}</strong
        ><small>{{ stats.tablesOccupied }} · {{ t('occupied') }}</small>
      </section>
    </div>
    <div class="dashboard-grid">
      <section class="card">
        <div class="row">
          <h2>{{ t('salesByDay') }}</h2>
          <span class="badge neutral">TND</span>
        </div>
        <div v-if="stats.salesByDay.length" class="sales-chart" :aria-label="t('salesByDay')">
          <div v-for="day in stats.salesByDay" :key="day.date" class="sales-column">
            <MoneyText :value="day.total" />
            <div
              class="sales-bar"
              :style="{ blockSize: Math.max(2, (day.total / maxSales) * 160) + 'px' }"
            ></div>
            <small>{{ day.date }}</small>
          </div>
        </div>
        <p v-else class="empty chart-empty">{{ t('noSales') }}</p>
      </section>
      <section class="card">
        <h2>{{ t('topProducts') }}</h2>
        <div
          v-for="(p, index) in stats.topProducts.slice(0, 5)"
          :key="p.productName"
          class="top-product"
        >
          <div class="row">
            <span
              ><b class="muted">{{ String(index + 1).padStart(2, '0') }}</b>
              {{ p.productName }}</span
            ><strong>{{ p.quantity }}</strong>
          </div>
          <meter :value="p.quantity" :max="maxQuantity" :aria-label="p.productName" />
        </div>
        <p v-if="!stats.topProducts.length" class="empty chart-empty">{{ t('noSales') }}</p>
      </section>
    </div></template
  ><AppModal v-if="resetting" :title="t('reset')" @close="resetting = false"
    ><p>{{ t('resetConfirm') }}</p>
    <div class="modal-actions">
      <button @click="resetting = false">{{ t('cancel') }}</button
      ><button class="danger-button" @click="reset">{{ t('confirm') }}</button>
    </div></AppModal
  >
</template>
