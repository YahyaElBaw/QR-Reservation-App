<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { io, type Socket } from 'socket.io-client'
import { ShoppingBag, Plus, Minus, CheckCircle, Clock, UtensilsCrossed, Lock } from 'lucide-vue-next'
import { api } from '../services/api'
import type { Category, Product, Ticket } from '../types'
import MoneyText from '../components/MoneyText.vue'

const route = useRoute()
const { t } = useI18n()
const qrToken = computed(() => String(route.params.qrToken || ''))

const loading = ref(true)
const submitting = ref(false)
const orderSuccess = ref(false)
const error = ref('')

const tableNumber = ref<number>()
const tableStatus = ref<string>('AVAILABLE')
const activeTicket = ref<Ticket | null>(null)
const lockedToOtherDevice = ref(false)

const categories = ref<Category[]>([])
const products = ref<Product[]>([])
const selectedCategoryId = ref<string>('')

// Cart: productId -> { quantity: number, note?: string }
const cart = ref<Record<string, { quantity: number; note: string }>>({})
const cartDrawerOpen = ref(false)

// Anonymous device ID
function getDeviceId(): string {
  let devId = localStorage.getItem('medina.device.id')
  if (!devId) {
    devId = 'device-' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36)
    localStorage.setItem('medina.device.id', devId)
  }
  return devId
}

const filteredProducts = computed(() => {
  if (!selectedCategoryId.value) return products.value
  return products.value.filter((p) => p.categoryId === selectedCategoryId.value)
})

const cartItemsList = computed(() => {
  return Object.entries(cart.value)
    .filter(([_, item]) => item.quantity > 0)
    .map(([productId, item]) => {
      const product = products.value.find((p) => p._id === productId)
      return {
        product,
        quantity: item.quantity,
        note: item.note,
        subtotal: (product?.price || 0) * item.quantity,
      }
    })
    .filter((entry): entry is { product: Product; quantity: number; note: string; subtotal: number } => !!entry.product)
})

const cartTotalCount = computed(() => {
  return cartItemsList.value.reduce((sum, item) => sum + item.quantity, 0)
})

const cartTotalPrice = computed(() => {
  return cartItemsList.value.reduce((sum, item) => sum + item.subtotal, 0)
})

function addToCart(productId: string) {
  if (!cart.value[productId]) {
    cart.value[productId] = { quantity: 1, note: '' }
  } else {
    cart.value[productId].quantity++
  }
}

function removeFromCart(productId: string) {
  if (cart.value[productId] && cart.value[productId].quantity > 0) {
    cart.value[productId].quantity--
    if (cart.value[productId].quantity === 0) {
      delete cart.value[productId]
    }
  }
}

function getItemQty(productId: string): number {
  return cart.value[productId]?.quantity || 0
}

async function loadData() {
  loading.value = true
  error.value = ''
  try {
    const tableData = await api.publicTable(qrToken.value, getDeviceId())
    tableNumber.value = tableData.table.number
    tableStatus.value = tableData.table.status
    activeTicket.value = tableData.activeTicket
    lockedToOtherDevice.value = Boolean(tableData.lockedToOtherDevice)

    const [cats, prods] = await Promise.all([
      api.publicCategories(),
      api.publicProducts(),
    ])
    categories.value = (Array.isArray(cats) ? cats : []).sort((a, b) => a.sortOrder - b.sortOrder)
    products.value = Array.isArray(prods) ? prods : []
  } catch (err: any) {
    error.value = err?.message || 'Table introuvable ou QR code invalide.'
  } finally {
    loading.value = false
  }
}

async function submitOrder() {
  if (cartItemsList.value.length === 0 || submitting.value) return
  submitting.value = true
  try {
    const payload = {
      deviceId: getDeviceId(),
      items: cartItemsList.value.map((i) => ({
        productId: i.product._id,
        quantity: i.quantity,
        note: i.note || undefined,
      })),
    }
    const ticket = await api.publicOrder(qrToken.value, payload)
    activeTicket.value = ticket
    cart.value = {}
    cartDrawerOpen.value = false
    orderSuccess.value = true
    setTimeout(() => {
      orderSuccess.value = false
    }, 6000)
  } catch (err: any) {
    alert(err?.message || 'Erreur lors de la commande. Veuillez réessayer.')
  } finally {
    submitting.value = false
  }
}

let liveSocket: Socket | undefined
let pollInterval: ReturnType<typeof setInterval> | undefined

onMounted(() => {
  void loadData()

  // Realtime Socket.IO room subscription for table:<qrToken>
  const host =
    typeof window !== 'undefined' &&
    window.location.hostname &&
    window.location.hostname !== 'localhost' &&
    window.location.hostname !== '127.0.0.1'
      ? `http://${window.location.hostname}:3000`
      : import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000'

  try {
    liveSocket = io(`${host}/live`, {
      auth: { qrToken: qrToken.value },
      transports: ['websocket', 'polling'],
      reconnection: true,
    })
    liveSocket.on('ticket.created', () => { void loadData() })
    liveSocket.on('ticket.updated', () => { void loadData() })
    liveSocket.on('table.updated', () => { void loadData() })
  } catch {
    // ignore
  }

  // 5s fallback polling per shared context
  pollInterval = setInterval(async () => {
    try {
      const tableData = await api.publicTable(qrToken.value, getDeviceId())
      tableStatus.value = tableData.table.status
      activeTicket.value = tableData.activeTicket
      lockedToOtherDevice.value = Boolean(tableData.lockedToOtherDevice)
    } catch {
      // ignore background poll errors
    }
  }, 5000)
})

onUnmounted(() => {
  if (pollInterval) clearInterval(pollInterval)
  if (liveSocket) liveSocket.disconnect()
})
</script>

<template>
  <div class="customer-page">
    <!-- Header -->
    <header class="customer-header">
      <div class="customer-header-inner">
        <div>
          <span class="customer-badge">Restaurant Medina</span>
          <h1 v-if="tableNumber" class="customer-table-title">
            {{ t('table') }} {{ String(tableNumber).padStart(2, '0') }}
          </h1>
          <h1 v-else class="customer-table-title">{{ t('table') }}</h1>
        </div>
        <div v-if="activeTicket" class="customer-order-status">
          <Clock :size="14" />
          <span>Commande #{{ activeTicket.ticketNumber }}</span>
        </div>
      </div>
    </header>

    <!-- Loading / Error States -->
    <div v-if="loading" class="customer-container empty">
      <p>{{ t('loading') }}</p>
    </div>
    <div v-else-if="error" class="customer-container empty">
      <p class="error-text">{{ error }}</p>
      <button class="primary" @click="loadData">{{ t('retry') }}</button>
    </div>

    <!-- Main Content -->
    <main v-else class="customer-container">
      <!-- Locked to another device banner -->
      <div v-if="lockedToOtherDevice" class="customer-locked-banner">
        <Lock :size="18" />
        <span>Cette table est en cours d'utilisation par un autre appareil. Seul cet appareil peut commander ou ajouter des articles jusqu'à la libération de la table.</span>
      </div>

      <!-- Success Banner -->
      <div v-if="orderSuccess" class="customer-success-banner">
        <CheckCircle :size="20" />
        <span>Votre commande a été transmise à la cuisine !</span>
      </div>

      <!-- Active Ticket Summary if exists -->
      <section v-if="activeTicket && activeTicket.items?.length" class="customer-active-ticket-card">
        <div class="ticket-header-row">
          <h3>Votre commande en cours</h3>
          <span class="status-pill">{{ activeTicket.status }}</span>
        </div>
        <ul class="ticket-items-list">
          <li v-for="item in activeTicket.items" :key="item._id" class="ticket-item-row">
            <span class="item-qty">{{ item.quantity }}x</span>
            <span class="item-name">{{ item.productName }}</span>
            <span class="item-price"><MoneyText :value="item.subtotal" /></span>
          </li>
        </ul>
        <div class="ticket-total-row">
          <span>Total table :</span>
          <strong><MoneyText :value="activeTicket.total" /></strong>
        </div>
      </section>

      <!-- Category Filter Tabs -->
      <div class="category-tabs">
        <button
          class="cat-tab"
          :class="{ active: selectedCategoryId === '' }"
          @click="selectedCategoryId = ''"
        >
          Tout
        </button>
        <button
          v-for="cat in categories"
          :key="cat._id"
          class="cat-tab"
          :class="{ active: selectedCategoryId === cat._id }"
          @click="selectedCategoryId = cat._id"
        >
          {{ cat.name }}
        </button>
      </div>

      <!-- Products Grid -->
      <div class="customer-menu-grid">
        <div
          v-for="product in filteredProducts"
          :key="product._id"
          class="customer-product-card"
          :class="{ unavailable: !product.available, selected: getItemQty(product._id) > 0 }"
        >
          <!-- 1. Box Photo on Top -->
          <div v-if="product.imageUrl" class="prod-image-wrap">
            <img :src="product.imageUrl" :alt="product.name" class="prod-img" />
            <span v-if="!product.available" class="prod-overlay-badge out-of-stock">Épuisé</span>
            <span v-else-if="getItemQty(product._id) > 0" class="prod-overlay-badge in-cart">
              ✓ {{ getItemQty(product._id) }} au panier
            </span>
          </div>
          <div v-else class="prod-image-wrap placeholder">
            <UtensilsCrossed :size="36" class="muted" />
            <span v-if="!product.available" class="prod-overlay-badge out-of-stock">Épuisé</span>
            <span v-else-if="getItemQty(product._id) > 0" class="prod-overlay-badge in-cart">
              ✓ {{ getItemQty(product._id) }} au panier
            </span>
          </div>

          <!-- 2. Box Content: Name, Description, and Actions -->
          <div class="prod-details">
            <div class="prod-info">
              <h3 class="prod-name">{{ product.name }}</h3>
              <p v-if="product.description" class="prod-desc">{{ product.description }}</p>
            </div>
            
            <div class="prod-footer">
              <span class="prod-price"><MoneyText :value="product.price" /></span>
              
              <div v-if="product.available && !lockedToOtherDevice" class="prod-qty-controls">
                <button
                  v-if="getItemQty(product._id) > 0"
                  class="qty-btn minus"
                  title="Diminuer la quantité"
                  @click="removeFromCart(product._id)"
                >
                  <Minus :size="15" />
                </button>
                <span v-if="getItemQty(product._id) > 0" class="qty-num">
                  {{ getItemQty(product._id) }}
                </span>
                <button
                  class="qty-btn plus"
                  :class="{ 'add-pill': getItemQty(product._id) === 0 }"
                  title="Ajouter au panier"
                  @click="addToCart(product._id)"
                >
                  <Plus :size="15" />
                  <span v-if="getItemQty(product._id) === 0">Ajouter</span>
                </button>
              </div>
              <span v-else-if="!product.available" class="prod-unavailable-badge">Épuisé</span>
              <span v-else class="prod-unavailable-badge">Verrouillé</span>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- Floating Cart Bar at bottom -->
    <div v-if="cartTotalCount > 0" class="customer-floating-cart">
      <div class="floating-cart-inner">
        <div class="cart-info">
          <span class="cart-count"><ShoppingBag :size="16" /> {{ cartTotalCount }} articles</span>
          <span class="cart-sum"><MoneyText :value="cartTotalPrice" /></span>
        </div>
        <button class="primary cart-btn" @click="cartDrawerOpen = true">
          Voir le panier
        </button>
      </div>
    </div>

    <!-- Cart Modal / Drawer -->
    <div v-if="cartDrawerOpen" class="cart-modal-backdrop" @click.self="cartDrawerOpen = false">
      <div class="cart-modal">
        <div class="cart-modal-header">
          <h2>Votre Panier · Table {{ tableNumber }}</h2>
          <button class="icon" @click="cartDrawerOpen = false">&times;</button>
        </div>

        <div class="cart-modal-body">
          <div v-for="item in cartItemsList" :key="item.product._id" class="cart-item-card">
            <div class="cart-item-row">
              <div class="cart-item-title">
                <strong>{{ item.product.name }}</strong>
                <span class="cart-item-price"><MoneyText :value="item.subtotal" /></span>
              </div>
              <div class="prod-qty-controls">
                <button class="qty-btn" @click="removeFromCart(item.product._id)">
                  <Minus :size="14" />
                </button>
                <span class="qty-num">{{ item.quantity }}</span>
                <button class="qty-btn plus" @click="addToCart(item.product._id)">
                  <Plus :size="14" />
                </button>
              </div>
            </div>
            <input
              v-model="cart[item.product._id].note"
              type="text"
              placeholder="Note spéciale (ex: sans oignons, tiède...)"
              class="cart-note-input"
              maxlength="120"
            />
          </div>
        </div>

        <div class="cart-modal-footer">
          <div class="cart-total-line">
            <span>Total :</span>
            <strong><MoneyText :value="cartTotalPrice" /></strong>
          </div>
          <button
            class="primary order-submit-btn"
            :disabled="submitting || cartTotalCount === 0"
            @click="submitOrder"
          >
            {{ submitting ? 'Envoi en cours...' : 'Envoyer la commande' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.customer-page {
  min-height: 100vh;
  background: var(--c-surface, #f8fafc);
  padding-bottom: 90px;
}
.customer-header {
  background: #0f172a;
  color: #ffffff;
  padding: 16px 20px;
  position: sticky;
  top: 0;
  z-index: 20;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}
.customer-header-inner {
  max-width: 600px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.customer-badge {
  font-size: 11px;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: #38bdf8;
  font-weight: 700;
}
.customer-table-title {
  margin: 2px 0 0;
  font-size: 24px;
  font-weight: 800;
}
.customer-order-status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(255, 255, 255, 0.15);
  padding: 6px 12px;
  border-radius: 9999px;
  font-size: 12px;
}
.customer-container {
  max-width: 600px;
  margin: 0 auto;
  padding: 16px;
}
.customer-locked-banner {
  display: flex;
  align-items: center;
  gap: 10px;
  background: #fef3c7;
  color: #92400e;
  border: 1px solid #fde68a;
  padding: 12px 16px;
  border-radius: 8px;
  margin-bottom: 16px;
  font-size: 13px;
  font-weight: 500;
  line-height: 1.4;
}
.customer-success-banner {
  display: flex;
  align-items: center;
  gap: 10px;
  background: #dcfce7;
  color: #166534;
  padding: 14px 16px;
  border-radius: 12px;
  font-weight: 600;
  margin-bottom: 16px;
}
.customer-active-ticket-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 18px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04);
}
.ticket-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.ticket-header-row h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
}
.status-pill {
  font-size: 11px;
  font-weight: 700;
  background: #fef3c7;
  color: #92400e;
  padding: 3px 8px;
  border-radius: 9999px;
}
.ticket-items-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.ticket-item-row {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
}
.item-qty {
  font-weight: 700;
  color: #0284c7;
}
.item-name {
  flex: 1;
}
.ticket-total-row {
  display: flex;
  justify-content: space-between;
  margin-top: 14px;
  padding-top: 10px;
  border-top: 1px dashed #e2e8f0;
  font-size: 15px;
}
.category-tabs {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 8px;
  margin-bottom: 16px;
  scrollbar-width: none;
}
.cat-tab {
  white-space: nowrap;
  padding: 8px 16px;
  background: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 9999px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}
.cat-tab.active {
  background: #0284c7;
  color: #ffffff;
  border-color: #0284c7;
}
.customer-menu-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}
.customer-product-card {
  display: flex;
  flex-direction: column;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 2px 10px rgba(11, 47, 87, 0.05);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}
.customer-product-card.selected {
  border-color: #0284c7;
  border-width: 2px;
  box-shadow: 0 6px 20px rgba(2, 132, 199, 0.16);
}
.customer-product-card.unavailable {
  opacity: 0.6;
}
.prod-image-wrap {
  width: 100%;
  height: 105px;
  position: relative;
  background: #f1f5f9;
  overflow: hidden;
}
.prod-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}
.customer-product-card:hover .prod-img {
  transform: scale(1.02);
}
.prod-image-wrap.placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f8fafc;
}
.prod-overlay-badge {
  position: absolute;
  top: 10px;
  padding: 4px 10px;
  border-radius: 9999px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.3px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}
.prod-overlay-badge.out-of-stock {
  left: 10px;
  background: #ef4444;
  color: #ffffff;
  text-transform: uppercase;
}
.prod-overlay-badge.in-cart {
  right: 10px;
  background: #0284c7;
  color: #ffffff;
}
.prod-details {
  flex: 1;
  padding: 10px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
.prod-name {
  font-size: 13.5px;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 2px;
  letter-spacing: -0.2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.prod-desc {
  font-size: 11px;
  color: #64748b;
  margin: 0 0 6px;
  line-height: 1.35;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.prod-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 6px;
  border-top: 1px solid #f1f5f9;
}
.prod-price {
  font-weight: 800;
  font-size: 13.5px;
  color: #0369a1;
}
.prod-qty-controls {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 9999px;
  padding: 3px;
}
.qty-btn {
  width: 28px;
  height: 28px;
  border: none;
  background: #e2e8f0;
  color: #0f172a;
  border-radius: 9999px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s ease;
}
.qty-btn.minus {
  background: #ffffff;
  color: #166534;
}
.qty-btn.plus {
  background: #16a34a;
  color: #ffffff;
}
.qty-btn.add-pill {
  width: 28px;
  height: 28px;
  border-radius: 9999px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #ea580c;
  color: #ffffff;
}
.qty-btn.add-pill:hover {
  background: #c2410c;
}
.qty-btn.add-pill span {
  display: none;
}
.qty-num {
  font-weight: 800;
  font-size: 14px;
  color: #166534;
  min-width: 20px;
  text-align: center;
}
.prod-unavailable-badge {
  font-size: 12px;
  color: #ef4444;
  font-weight: 600;
}
.customer-floating-cart {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(8px);
  border-top: 1px solid #e2e8f0;
  box-shadow: 0 -4px 16px rgba(0, 0, 0, 0.08);
  z-index: 30;
}
.floating-cart-inner {
  max-width: 600px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.cart-info {
  display: flex;
  flex-direction: column;
}
.cart-count {
  font-size: 12px;
  color: #64748b;
  display: flex;
  align-items: center;
  gap: 4px;
}
.cart-sum {
  font-size: 18px;
  font-weight: 800;
  color: #0f172a;
}
.cart-btn {
  padding: 10px 20px;
  font-weight: 700;
  border-radius: 10px;
}
.cart-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(2px);
  z-index: 40;
  display: flex;
  align-items: flex-end;
}
.cart-modal {
  width: 100%;
  max-width: 600px;
  margin: 0 auto;
  background: #ffffff;
  border-radius: 20px 20px 0 0;
  padding: 20px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
}
.cart-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.cart-modal-header h2 {
  font-size: 18px;
  margin: 0;
}
.cart-modal-body {
  overflow-y: auto;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.cart-item-card {
  border: 1px solid #f1f5f9;
  background: #f8fafc;
  padding: 10px 12px;
  border-radius: 10px;
}
.cart-item-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.cart-item-title {
  display: flex;
  flex-direction: column;
}
.cart-item-price {
  font-size: 13px;
  color: #64748b;
}
.cart-note-input {
  width: 100%;
  margin-top: 8px;
  padding: 6px 10px;
  font-size: 12px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  background: #ffffff;
}
.cart-modal-footer {
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px solid #e2e8f0;
}
.cart-total-line {
  display: flex;
  justify-content: space-between;
  font-size: 18px;
  margin-bottom: 12px;
}
.order-submit-btn {
  width: 100%;
  padding: 12px;
  font-size: 16px;
  font-weight: 700;
  border-radius: 10px;
}
</style>
