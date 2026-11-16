<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import QRCode from 'qrcode'
import { Plus, QrCode } from 'lucide-vue-next'
import { api } from '../services/api'
import { DEMO } from '../services/http'
import { useRefresh } from '../services/live'
import { useAuth } from '../stores/auth'
import { useUi } from '../stores/ui'
import type { RestaurantTable, Ticket } from '../types'
import AppModal from '../components/AppModal.vue'
import StatusBadge from '../components/StatusBadge.vue'
import MoneyText from '../components/MoneyText.vue'
const { t } = useI18n()
const auth = useAuth()
const ui = useUi()
const tables = ref<RestaurantTable[]>([])
const tickets = ref<Ticket[]>([])
const loading = ref(true)
const failed = ref(false)
const busy = ref(false)
const editOpen = ref(false)
const editing = ref<RestaurantTable>()
const number = ref(1)
const deletion = ref<RestaurantTable>()
const selected = ref<RestaurantTable>()
const baseUrl = ref(window.location.origin)
const qrImage = ref('')
const qrError = ref('')
const regenerating = ref(false)
let generation = 0
const localhost = computed(() => {
  try {
    return ['localhost', '127.0.0.1', '[::1]'].includes(new URL(baseUrl.value).hostname)
  } catch {
    return false
  }
})
async function load() {
  try {
    const [tb, ts] = await Promise.all([api.list<RestaurantTable>('tables'), api.tickets()])
    tables.value = tb.sort((a, b) => a.number - b.number)
    tickets.value = ts
    failed.value = false
  } catch (e) {
    if (!failed.value) ui.error(e)
    failed.value = true
  } finally {
    loading.value = false
  }
}
const refresh = useRefresh(load)
function active(id: string) {
  return tickets.value.find((t) => t.tableId === id && t.status !== 'CLOSED')
}
function edit(table?: RestaurantTable) {
  editing.value = table
  number.value = table?.number ?? Math.max(0, ...tables.value.map((t) => t.number)) + 1
  editOpen.value = true
}
async function save() {
  busy.value = true
  try {
    await api.save('tables', editing.value?._id, { number: number.value })
    editOpen.value = false
    ui.notify(t('saved'))
    await load()
  } catch (e) {
    ui.error(e)
  } finally {
    busy.value = false
  }
}
async function remove() {
  if (!deletion.value) return
  busy.value = true
  try {
    await api.remove('tables', deletion.value._id)
    deletion.value = undefined
    await load()
  } catch (e) {
    ui.error(e)
  } finally {
    busy.value = false
  }
}
async function generate() {
  const current = ++generation
  qrImage.value = ''
  qrError.value = ''
  if (!selected.value) return
  try {
    const url = new URL(baseUrl.value)
    if (!['http:', 'https:'].includes(url.protocol))
      throw new Error('Utilisez une adresse http:// ou https://.')
    const origin = baseUrl.value.replace(/\/$/, '')
    const result = DEMO
      ? await QRCode.toDataURL(`${origin}/table/${selected.value.qrToken}`, {
          width: 600,
          margin: 3,
        })
      : URL.createObjectURL(await api.qr(selected.value._id, origin))
    if (current !== generation) {
      if (result.startsWith('blob:')) URL.revokeObjectURL(result)
      return
    }
    qrImage.value = result
  } catch (e) {
    qrError.value =
      e && typeof e === 'object' && 'message' in e ? String(e.message) : 'Génération QR impossible.'
  }
}
watch([baseUrl, selected], () => {
  void generate()
})
watch(qrImage, (_, old) => {
  if (old.startsWith('blob:')) URL.revokeObjectURL(old)
})
onUnmounted(() => {
  generation++
  if (qrImage.value.startsWith('blob:')) URL.revokeObjectURL(qrImage.value)
})
async function regenerate() {
  if (!selected.value) return
  busy.value = true
  try {
    const id = selected.value._id
    await api.regenerate(id)
    await load()
    selected.value = tables.value.find((t) => t._id === id)
    regenerating.value = false
    ui.notify(t('saved'))
  } catch (e) {
    ui.error(e)
  } finally {
    busy.value = false
  }
}
function download() {
  const a = document.createElement('a')
  a.href = qrImage.value
  a.download = `table-${selected.value?.number}.png`
  a.click()
}
function print() {
  window.print()
}
function closeQr() {
  selected.value = undefined
  regenerating.value = false
}
</script>
<template>
  <div class="page-heading no-print">
    <div>
      <p class="eyebrow">Medina · Service</p>
      <h1>{{ t('tables') }}</h1>
    </div>
    <button v-if="auth.isAdmin" class="primary" @click="edit()">
      <Plus :size="18" />{{ t('add') }}
    </button>
  </div>
  <p v-if="loading" class="empty">{{ t('loading') }}</p>
  <div v-else-if="failed" class="empty">
    <button @click="refresh">{{ t('retry') }}</button>
  </div>
  <div v-else class="tables-grid no-print">
    <article v-for="table in tables" :key="table._id" class="card table-tile">
      <div class="row">
        <span class="muted">{{ t('table') }}</span><StatusBadge :status="table.status" />
      </div>
      <h2>{{ String(table.number).padStart(2, '0') }}</h2>
      <RouterLink
        v-if="active(table._id)"
        class="table-total"
        :to="'/staff/tickets/' + active(table._id)!._id"
        ><MoneyText :value="active(table._id)!.total" /> →</RouterLink
      ><small v-else>{{ t('available') }}</small>
      <div v-if="auth.isAdmin" class="table-actions">
        <button class="secondary" @click="selected = table"><QrCode :size="16" />QR</button
        ><button class="ghost" @click="edit(table)">{{ t('edit') }}</button
        ><button
          class="ghost danger-text"
          :disabled="!!active(table._id)"
          @click="deletion = table"
        >
          {{ t('remove') }}
        </button>
      </div>
    </article>
  </div>
  <p v-if="!loading && !tables.length" class="empty">{{ t('empty') }}</p>
  <AppModal
    v-if="editOpen"
    :title="t(editing ? 'edit' : 'add') + ' · ' + t('table')"
    :busy="busy"
    @close="editOpen = false"
    ><form @submit.prevent="save">
      <label
        >{{ t('number') }}<input v-model.number="number" type="number" min="1" step="1" required
      /></label>
      <div class="modal-actions">
        <button type="button" :disabled="busy" @click="editOpen = false">
          {{ t('cancel') }}</button><button class="primary" :disabled="busy">
          {{ t('save') }}
        </button>
      </div>
    </form></AppModal
  ><AppModal v-if="deletion" :title="t('remove')" :busy="busy" @close="deletion = undefined"
    ><p>{{ t('deleteConfirm') }} {{ t('table') }} {{ deletion.number }}</p>
    <div class="modal-actions">
      <button :disabled="busy" @click="deletion = undefined">{{ t('cancel') }}</button><button
        class="danger-button"
        :disabled="busy"
        @click="remove"
      >
        {{ t('remove') }}
      </button>
    </div></AppModal
  ><AppModal
    v-if="selected"
    :title="t('table') + ' ' + selected.number + ' · QR'"
    :busy="busy"
    @close="closeQr"
    ><div class="no-print">
      <label>{{ t('baseUrl') }}<input v-model.trim="baseUrl" type="url" /></label>
      <p v-if="localhost" class="notice warning">{{ t('localhostWarning') }}</p>
      <p class="notice">{{ t('qrHint') }}</p>
    </div>
    <div class="qr-print">
      <h2>{{ t('table') }} {{ selected.number }}</h2>
      <img v-if="qrImage" class="qr-image" :src="qrImage" :alt="t('qr')" />
      <p v-else-if="qrError" class="error-text">{{ qrError }}</p>
      <p v-else>{{ t('loading') }}</p>
      <code>{{ selected.qrToken }}</code>
    </div>
    <div class="modal-actions wrap no-print">
      <button :disabled="!qrImage" @click="download">{{ t('downloadPng') }}</button><button
        :disabled="!qrImage"
        @click="print"
      >
        {{ t('printQr') }}</button
      ><button class="ghost danger-text" :disabled="busy" @click="regenerating = true">
        {{ t('regenerate') }}
      </button>
    </div>
    <div v-if="regenerating" class="notice no-print">
      <p>{{ t('regenerateConfirm') }}</p>
      <div class="row">
        <button :disabled="busy" @click="regenerating = false">{{ t('cancel') }}</button><button
          class="danger-button"
          :disabled="busy"
          @click="regenerate"
        >
          {{ t('confirm') }}
        </button>
      </div>
    </div></AppModal
  >
</template>
