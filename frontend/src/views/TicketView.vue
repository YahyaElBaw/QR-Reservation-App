<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { ArrowLeft, Printer, Trash2 } from 'lucide-vue-next'
import { api } from '../services/api'
import { useRefresh } from '../services/live'
import { useAuth } from '../stores/auth'
import { useUi } from '../stores/ui'
import type { Ticket, Product, RestaurantTable, PaymentMethod } from '../types'
import AppModal from '../components/AppModal.vue'
import MoneyText from '../components/MoneyText.vue'
import StatusBadge from '../components/StatusBadge.vue'
import QuantityStepper from '../components/QuantityStepper.vue'
const { t } = useI18n()
const route = useRoute()
const auth = useAuth()
const ui = useUi()
const ticket = ref<Ticket>()
const table = ref<RestaurantTable>()
const products = ref<Product[]>([])
const busy = ref(false)
const failed = ref(false)
const method = ref<PaymentMethod>('CASH')
const action = ref<'pay' | 'both' | 'close' | 'remove'>()
const removeId = ref('')
const productId = ref('')
const quantity = ref(1)
const note = ref('')
const available = computed(() => products.value.filter((p) => p.available))
const canEdit = computed(() => auth.canEdit && ticket.value?.status === 'OPEN')
async function load() {
  if (busy.value) return
  try {
    const id = String(route.params.id)
    const [result, tables] = await Promise.all([
      api.ticket(id),
      api.list<RestaurantTable>('tables'),
    ])
    if (id !== String(route.params.id)) return
    ticket.value = result
    table.value = tables.find((t) => t._id === result.tableId)
    if (auth.canEdit) products.value = await api.list<Product>('products')
    failed.value = false
  } catch (e) {
    if (!failed.value) ui.error(e)
    failed.value = true
  }
}
const refresh = useRefresh(load)
watch(
  () => route.params.id,
  () => {
    ticket.value = undefined
    void refresh()
  },
)
async function change(itemId: string, value: number) {
  if (!ticket.value || busy.value) return
  busy.value = true
  try {
    await api.item(ticket.value._id, 'update', { itemId, quantity: value })
  } catch (e) {
    ui.error(e)
  } finally {
    busy.value = false
    await load()
  }
}
async function add() {
  if (!ticket.value || !productId.value || busy.value) return
  busy.value = true
  try {
    await api.item(ticket.value._id, 'add', {
      productId: productId.value,
      quantity: quantity.value,
      note: note.value,
    })
    quantity.value = 1
    note.value = ''
    ui.notify(t('saved'))
  } catch (e) {
    ui.error(e)
  } finally {
    busy.value = false
    await load()
  }
}
async function confirm() {
  if (!ticket.value || busy.value) return
  busy.value = true
  const pending = action.value
  try {
    if (pending === 'remove') await api.item(ticket.value._id, 'remove', { itemId: removeId.value })
    if (pending === 'pay' || pending === 'both') {
      await api.pay(ticket.value._id, method.value)
      ui.notify(t('paidNotice'))
    }
    if (pending === 'both' || pending === 'close') {
      await api.close(ticket.value._id)
      ui.notify(t('closedNotice'))
    }
    action.value = undefined
  } catch (e) {
    action.value = undefined
    ui.error(e)
  } finally {
    busy.value = false
    await load()
  }
}
function print() {
  window.print()
}
function openRemove(id: string) {
  removeId.value = id
  action.value = 'remove'
}
</script>
<template>
  <div class="page-heading no-print">
    <RouterLink class="button ghost" to="/staff/tickets"
      ><ArrowLeft :size="18" />{{ t('tickets') }}</RouterLink
    ><button v-if="ticket" @click="print"><Printer :size="18" />{{ t('print') }}</button>
  </div>
  <div v-if="failed" class="empty">
    <button @click="refresh">{{ t('retry') }}</button>
  </div>
  <p v-else-if="!ticket" class="empty" role="status">{{ t('loading') }}</p>
  <div v-else class="detail-grid">
    <section class="card receipt">
      <div class="row">
        <div>
          <p class="eyebrow">Medina</p>
          <h1>{{ t('ticket') }} #{{ ticket.ticketNumber }}</h1>
          <p>{{ t('table') }} {{ table?.number ?? '—' }}</p>
          <small>{{
            new Date(ticket.createdAt).toLocaleString('fr-FR', {
              timeZone: 'Africa/Tunis',
              hour12: false,
            })
          }}</small>
        </div>
        <StatusBadge :status="ticket.status" />
      </div>
      <div class="ticket-lines">
        <article v-for="item in ticket.items" :key="item._id" class="ticket-line">
          <div>
            <strong>{{ item.productName }}</strong><small
              >{{ item.quantity }} × <MoneyText :value="item.unitPrice"
            /></small>
            <p v-if="item.note" class="line-note">{{ item.note }}</p>
            <div v-if="canEdit" class="row start no-print">
              <QuantityStepper
                :model-value="item.quantity"
                :disabled="busy"
                @update:model-value="(value) => change(item._id, value)"
              /><button
                class="icon danger-text"
                :disabled="busy"
                :aria-label="t('remove') + ' ' + item.productName"
                @click="openRemove(item._id)"
              >
                <Trash2 :size="18" />
              </button>
            </div>
          </div>
          <MoneyText :value="item.subtotal" />
        </article>
        <p v-if="!ticket.items.length">{{ t('empty') }}</p>
      </div>
      <div class="total-panel">
        <span>{{ t('total') }}</span><MoneyText :value="ticket.total" />
      </div>
      <p v-if="ticket.paymentMethod">{{ t('method') }} : {{ t(ticket.paymentMethod) }}</p>
    </section>
    <aside class="stack no-print">
      <section v-if="auth.canPay" class="card">
        <h2>{{ t('cashier') }}</h2>
        <template v-if="ticket.status === 'OPEN'"
          ><label
            >{{ t('method')
            }}<select v-model="method" :disabled="busy">
              <option v-for="m in ['CASH', 'CARD', 'OTHER'] as const" :key="m" :value="m">
                {{ t(m) }}
              </option>
            </select></label
          ><button class="highlight wide" :disabled="busy" @click="action = 'both'">
            {{ t('payClose') }}</button
          ><button class="secondary wide" :disabled="busy" @click="action = 'pay'">
            {{ t('pay') }}
          </button></template
        ><template v-else-if="ticket.status === 'PAID'"
          ><p class="notice">{{ t('paidNotice') }}</p>
          <button class="primary wide" :disabled="busy" @click="action = 'close'">
            {{ t('close') }}
          </button></template
        ><StatusBadge v-else status="CLOSED" />
      </section>
      <section v-if="canEdit" class="card">
        <h2>{{ t('addItem') }}</h2>
        <form @submit.prevent="add">
          <label
            >{{ t('selectProduct')
            }}<select v-model="productId" required :disabled="busy">
              <option value="" disabled>{{ t('selectProduct') }}</option>
              <option v-for="p in available" :key="p._id" :value="p._id">{{ p.name }}</option>
            </select></label
          ><label
            >{{ t('quantity')
            }}<input
              v-model.number="quantity"
              type="number"
              min="1"
              step="1"
              required
              :disabled="busy" /></label
          ><label
            >{{ t('note')
            }}<textarea v-model="note" rows="2" maxlength="500" :disabled="busy" /></label
          ><button class="primary wide" :disabled="busy || !available.length">
            {{ t(busy ? 'loading' : 'addItem') }}
          </button>
        </form>
      </section>
    </aside>
  </div>
  <AppModal v-if="action" :title="t('confirm')" :busy="busy" @close="action = undefined"
    ><p>
      {{ t(action === 'remove' ? 'removeLine' : action === 'close' ? 'close' : 'payConfirm') }}
    </p>
    <p v-if="action === 'pay' || action === 'both'">
      {{ t(method) }} · <MoneyText :value="ticket?.total || 0" />
    </p>
    <div class="modal-actions">
      <button :disabled="busy" @click="action = undefined">{{ t('cancel') }}</button><button
        class="primary"
        :disabled="busy"
        @click="confirm"
      >
        {{ t(busy ? 'loading' : 'confirm') }}
      </button>
    </div></AppModal
  >
</template>
