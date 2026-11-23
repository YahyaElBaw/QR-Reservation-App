<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import QRCode from 'qrcode'
import { Plus, QrCode, Printer, Download, ExternalLink } from 'lucide-vue-next'
import { api } from '../services/api'
import { http } from '../services/http'
import { useRefresh } from '../services/live'
import { useAuth } from '../stores/auth'
import { useUi } from '../stores/ui'
import { generateTableQrCard } from '../utils/qr'
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
const defaultOrigin = window.location.origin
const baseUrl = ref(window.location.origin)
const qrImage = ref('')
const qrError = ref('')
const tableQrs = ref<Record<string, string>>({})
const regenerating = ref(false)
const networkIp = ref('')
let generation = 0

const localhost = computed(() => {
  try {
    return ['localhost', '127.0.0.1', '[::1]'].includes(new URL(baseUrl.value).hostname)
  } catch {
    return false
  }
})

const qrTargetUrl = computed(() => {
  if (!selected.value) return ''
  try {
    const origin = baseUrl.value.replace(/\/$/, '')
    return `${origin}/table/${selected.value.qrToken}`
  } catch {
    return ''
  }
})

async function generateTableQrs() {
  const origin = baseUrl.value.replace(/\/$/, '')
  const map: Record<string, string> = {}
  for (const tb of tables.value) {
    try {
      map[tb._id] = await QRCode.toDataURL(`${origin}/table/${tb.qrToken}`, {
        width: 260,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' },
      })
    } catch {
      // ignore
    }
  }
  tableQrs.value = map
}

async function load() {
  try {
    const [tb, ts] = await Promise.all([api.list<RestaurantTable>('tables'), api.tickets()])
    tables.value = tb.sort((a, b) => a.number - b.number)
    tickets.value = ts
    failed.value = false

    // Auto-detect server network IP so phone QR scans work over Wi-Fi
    try {
      const { data } = await http.get<{ ip?: string }>('/health')
      if (data?.ip && data.ip !== 'localhost' && data.ip !== '127.0.0.1') {
        networkIp.value = data.ip
        if (localhost.value) {
          baseUrl.value = `http://${data.ip}:5173`
        }
      }
    } catch {
      try {
        const rootHealth = (http.defaults.baseURL || '').replace(/\/api\/v1\/?$/, '') + '/health'
        const res = await fetch(rootHealth).then((r) => r.json())
        if (res?.ip && res.ip !== 'localhost' && res.ip !== '127.0.0.1') {
          networkIp.value = res.ip
          if (localhost.value) {
            baseUrl.value = `http://${res.ip}:5173`
          }
        }
      } catch {
        if (localhost.value) {
          networkIp.value = '192.168.1.22'
          baseUrl.value = 'http://192.168.1.22:5173'
        }
      }
    }

    void generateTableQrs()
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
    const targetUrl = `${origin}/table/${selected.value.qrToken}`
    const result = await generateTableQrCard({
      url: targetUrl,
      tableNumber: selected.value.number,
      qrToken: selected.value.qrToken,
    })
    if (current !== generation) return
    qrImage.value = result
  } catch (e) {
    qrError.value =
      e && typeof e === 'object' && 'message' in e ? String(e.message) : 'Génération QR impossible.'
  }
}
watch([baseUrl, selected], () => {
  void generate()
  void generateTableQrs()
})
onUnmounted(() => {
  generation++
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
  if (!qrImage.value || !selected.value) return
  const a = document.createElement('a')
  a.href = qrImage.value
  a.download = `table-${String(selected.value.number).padStart(2, '0')}-qr.png`
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

      <!-- Visual QR code card right on the tile: can scan immediately or click to enlarge -->
      <div
        class="table-qr-card"
        :title="'Table ' + table.number + ' - ' + t('printQr')"
        @click="selected = table"
      >
        <img
          v-if="tableQrs[table._id]"
          class="table-qr-preview-img"
          :src="tableQrs[table._id]"
          :alt="'QR Code Table ' + table.number"
        />
        <span class="table-qr-hint">
          <QrCode :size="13" style="display: inline; vertical-align: -2px; margin-right: 4px;" />
          Scanner / Imprimer
        </span>
      </div>

      <RouterLink
        v-if="active(table._id)"
        class="table-total"
        :to="'/staff/tickets/' + active(table._id)!._id"
        ><MoneyText :value="active(table._id)!.total" /> →</RouterLink
      ><small v-else>{{ t('available') }}</small>
      <div class="table-actions">
        <button class="secondary" @click="selected = table"><QrCode :size="16" />QR</button
        ><button v-if="auth.isAdmin" class="ghost" @click="edit(table)">{{ t('edit') }}</button
        ><button
          v-if="auth.isAdmin"
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
      <div v-if="networkIp" class="row" style="margin-top: 6px; margin-bottom: 8px; gap: 8px;">
        <button
          type="button"
          class="secondary"
          style="padding: 4px 10px; font-size: 12px;"
          @click="baseUrl = `http://${networkIp}:5173`"
        >
          IP Réseau (Wi-Fi): {{ networkIp }}
        </button>
        <button
          type="button"
          class="ghost"
          style="padding: 4px 10px; font-size: 12px;"
          @click="baseUrl = defaultOrigin"
        >
          Localhost
        </button>
      </div>
      <p v-if="localhost" class="notice warning">{{ t('localhostWarning') }}</p>
      <p class="notice">{{ t('qrHint') }}</p>
    </div>
    <div class="qr-print">
      <div class="qr-modal-wrapper">
        <img
          v-if="qrImage"
          class="qr-image"
          :src="qrImage"
          :alt="t('qr') + ' Table ' + selected.number"
        />
        <p v-else-if="qrError" class="error-text">{{ qrError }}</p>
        <p v-else>{{ t('loading') }}</p>
        <a
          v-if="qrTargetUrl"
          :href="qrTargetUrl"
          target="_blank"
          class="qr-target-url no-print"
          title="Ouvrir la page client"
        >
          <ExternalLink :size="13" />
          <span>{{ qrTargetUrl }}</span>
        </a>
      </div>
    </div>
    <div class="modal-actions wrap no-print">
      <button :disabled="!qrImage" @click="download">
        <Download :size="16" />{{ t('downloadPng') }}
      </button>
      <button class="primary" :disabled="!qrImage" @click="print">
        <Printer :size="16" />{{ t('printQr') }}
      </button>
      <button v-if="auth.isAdmin" class="ghost danger-text" :disabled="busy" @click="regenerating = true">
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
