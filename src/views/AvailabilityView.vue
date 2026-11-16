<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Utensils } from 'lucide-vue-next'
import { api } from '../services/api'
import { useRefresh } from '../services/live'
import { useUi } from '../stores/ui'
import { productImage } from '../utils/images'
import type { Product } from '../types'
import MoneyText from '../components/MoneyText.vue'
const { t } = useI18n()
const ui = useUi()
const products = ref<Product[]>([])
const search = ref('')
const loading = ref(true)
const failed = ref(false)
const busy = ref(new Set<string>())
const filtered = computed(() =>
  products.value.filter((p) =>
    p.name.toLocaleLowerCase().includes(search.value.toLocaleLowerCase()),
  ),
)
async function load() {
  try {
    if (!busy.value.size) products.value = await api.list<Product>('products')
    failed.value = false
  } catch (e) {
    if (!failed.value) ui.error(e)
    failed.value = true
  } finally {
    loading.value = false
  }
}
const refresh = useRefresh(load)
async function toggle(product: Product) {
  const old = product.available
  product.available = !old
  busy.value.add(product._id)
  try {
    await api.availability(product._id, product.available)
    ui.notify(t('saved'))
  } catch (e) {
    product.available = old
    ui.error(e)
  } finally {
    busy.value.delete(product._id)
  }
}
</script>
<template>
  <div class="page-heading">
    <div>
      <p class="eyebrow">{{ t('kitchen') }}</p>
      <h1>{{ t('availability') }}</h1>
    </div>
  </div>
  <label class="search card">{{ t('search') }}<input v-model="search" type="search" /></label>
  <p v-if="loading" class="empty">{{ t('loading') }}</p>
  <div v-else-if="failed" class="empty">
    <button @click="refresh">{{ t('retry') }}</button>
  </div>
  <div v-else class="product-grid">
    <article
      v-for="p in filtered"
      :key="p._id"
      class="card product-card"
      :class="{ unavailable: !p.available }"
    >
      <img v-if="p.imageUrl" class="product-image" :src="productImage(p.imageUrl)" :alt="p.name" />
      <div v-else class="product-placeholder"><Utensils :size="32" /></div>
      <div class="row">
        <h2>{{ p.name }}</h2>
        <MoneyText :value="p.price" />
      </div>
      <p class="muted">{{ p.description }}</p>
      <button
        class="wide"
        :class="p.available ? 'secondary' : 'danger-button'"
        role="switch"
        :aria-checked="p.available"
        :disabled="busy.has(p._id)"
        @click="toggle(p)"
      >
        {{ p.available ? '✓' : '−' }} {{ t(p.available ? 'available' : 'unavailable') }}
      </button>
    </article>
  </div>
  <p v-if="!loading && !filtered.length" class="empty">{{ t('empty') }}</p>
</template>
