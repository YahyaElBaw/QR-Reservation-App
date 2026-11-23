<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { io, type Socket } from 'socket.io-client'
import {
  ShoppingBag,
  Plus,
  Minus,
  CheckCircle,
  Receipt,
  Search,
  X,
  Lock,
  UtensilsCrossed,
} from 'lucide-vue-next'
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
const searchQuery = ref('')

// Cart: productId -> { quantity: number, note?: string }
const cart = ref<Record<string, { quantity: number; note: string }>>({})
const cartDrawerOpen = ref(false)
const ticketModalOpen = ref(false)

// Product Detail Modal
const selectedProductForDetail = ref<Product | null>(null)
const detailQuantity = ref(1)
const detailNote = ref('')

// Anonymous device ID
function getDeviceId(): string {
  let devId = localStorage.getItem('medina.device.id')
  if (!devId) {
    devId = 'device-' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36)
    localStorage.setItem('medina.device.id', devId)
  }
  return devId
}

const isTableClosed = computed(() => {
  return lockedToOtherDevice.value || tableStatus.value === 'CLOSED'
})

const showTicketButton = computed(() => {
  return Boolean(
    activeTicket.value &&
    !isTableClosed.value &&
    activeTicket.value.status !== 'CLOSED'
  )
})

const filteredProducts = computed(() => {
  let list = Array.isArray(products.value) ? products.value : []
  if (selectedCategoryId.value) {
    list = list.filter((p) => String(p.categoryId) === String(selectedCategoryId.value))
  }
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.trim().toLowerCase()
    list = list.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q))
    )
  }
  return list
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

function addToCart(productId: string, qty = 1, note = '') {
  if (isTableClosed.value) return
  if (!cart.value[productId]) {
    cart.value[productId] = { quantity: qty, note }
  } else {
    cart.value[productId].quantity += qty
    if (note) cart.value[productId].note = note
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

function openProductDetail(product: Product) {
  selectedProductForDetail.value = product
  detailQuantity.value = getItemQty(product._id) || 1
  detailNote.value = cart.value[product._id]?.note || ''
}

function closeProductDetail() {
  selectedProductForDetail.value = null
}

function handleAddFromDetail() {
  if (!selectedProductForDetail.value || isTableClosed.value) return
  const id = selectedProductForDetail.value._id
  if (!cart.value[id]) {
    cart.value[id] = { quantity: detailQuantity.value, note: detailNote.value }
  } else {
    cart.value[id].quantity = detailQuantity.value
    cart.value[id].note = detailNote.value
  }
  closeProductDetail()
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
  if (cartItemsList.value.length === 0 || submitting.value || isTableClosed.value) return
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
    ticketModalOpen.value = true // Open Ticket Modal immediately on order placed!
    void loadData()
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
    <!-- Top Bar Header (Identical to Mobile Native Top Bar) -->
    <header class="mobile-top-bar">
      <div class="top-bar-inner">
        <div class="top-bar-left">
          <span class="restaurant-badge">RESTAURANT MÉDINA</span>
          <div class="table-title-row">
            <h1 class="table-title">Table {{ tableNumber || '' }}</h1>
            <span
              class="table-status-pill"
              :class="tableStatus === 'AVAILABLE' ? 'available' : 'reserved'"
            >
              {{ tableStatus === 'AVAILABLE' ? 'Disponible' : 'Occupée' }}
            </span>
          </div>
        </div>

        <!-- Top Right Ticket Button (Only when active ticket exists and not closed) -->
        <button
          v-if="showTicketButton"
          class="top-bar-ticket-btn"
          @click="ticketModalOpen = true"
          title="Consulter l'addition"
          aria-label="Voir le ticket"
        >
          <Receipt :size="16" class="ticket-icon" />
          <span class="ticket-btn-label">Ticket</span>
        </button>
      </div>
    </header>

    <!-- Loading / Error States -->
    <div v-if="loading" class="customer-container state-center">
      <div class="spinner"></div>
      <p class="state-text">{{ t('loading') }}...</p>
    </div>

    <div v-else-if="error" class="customer-container state-center">
      <p class="error-text">{{ error }}</p>
      <button class="retry-btn" @click="loadData">{{ t('retry') }}</button>
    </div>

    <!-- Main Content -->
    <main v-else class="customer-container">
      <!-- Hero Welcome Banner -->
      <section class="hero-section">
        <span class="hero-greeting">Bonjour & Bienvenue 👋</span>
        <h2 class="hero-headline">Good Food, <span class="highlight">Good Mood !</span></h2>
      </section>

      <!-- Search Input with quick clear -->
      <div class="search-wrapper">
        <div class="search-inner">
          <Search :size="18" class="search-icon" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Rechercher un plat, boisson, dessert..."
            class="search-input"
          />
          <button
            v-if="searchQuery.length > 0"
            class="clear-search-btn"
            @click="searchQuery = ''"
            aria-label="Effacer la recherche"
          >
            <X :size="16" />
          </button>
        </div>
      </div>

      <!-- Category Filter Tabs -->
      <div class="category-tabs-wrapper">
        <div class="category-tabs">
          <button
            class="cat-chip"
            :class="{ active: selectedCategoryId === '' }"
            @click="selectedCategoryId = ''"
          >
            Tous
          </button>
          <button
            v-for="cat in categories"
            :key="cat._id"
            class="cat-chip"
            :class="{ active: selectedCategoryId === cat._id }"
            @click="selectedCategoryId = cat._id"
          >
            {{ cat.name }}
          </button>
        </div>
      </div>

      <!-- Dish Count -->
      <div class="toolbar-row">
        <span class="toolbar-count">
          {{ filteredProducts.length }} {{ filteredProducts.length === 1 ? 'produit' : 'produits' }}
        </span>
      </div>

      <!-- Product List: STRICTLY 2 Cards Per Row -->
      <div class="customer-menu-grid">
        <div
          v-for="product in filteredProducts"
          :key="product._id"
          class="customer-product-card"
          :class="{ unavailable: !product.available, selected: getItemQty(product._id) > 0 }"
        >
          <!-- Card Image & Overlay Badges -->
          <div class="prod-image-wrap" @click="openProductDetail(product)">
            <img
              v-if="product.imageUrl"
              :src="product.imageUrl"
              :alt="product.name"
              class="prod-img"
              loading="lazy"
            />
            <div v-else class="prod-image-wrap placeholder">
              <UtensilsCrossed :size="32" class="placeholder-icon" />
            </div>

            <!-- Overlay Badges -->
            <div class="badge-overlay">
              <span v-if="!product.available" class="badge-pill out-of-stock">Épuisé</span>
              <span v-else-if="getItemQty(product._id) > 0" class="badge-pill in-cart">
                ✓ {{ getItemQty(product._id) }}
              </span>
            </div>
          </div>

          <!-- Product Details -->
          <div class="prod-details" @click="openProductDetail(product)">
            <h3 class="prod-name">{{ product.name }}</h3>
            <p v-if="product.description" class="prod-desc">{{ product.description }}</p>
          </div>

          <!-- Card Footer Actions: Price + Button -->
          <div class="prod-footer">
            <span class="prod-price"><MoneyText :value="product.price" /></span>

            <!-- Action Buttons: Round Orange Plus or Stepper -->
            <div v-if="product.available && !isTableClosed" class="prod-actions-wrap">
              <!-- Stepper if selected -->
              <div v-if="getItemQty(product._id) > 0" class="stepper-capsule">
                <button
                  class="stepper-btn minus"
                  title="Diminuer"
                  @click.stop="removeFromCart(product._id)"
                >
                  <Minus :size="12" />
                </button>
                <span class="stepper-qty">{{ getItemQty(product._id) }}</span>
                <button
                  class="stepper-btn plus"
                  title="Augmenter"
                  @click.stop="addToCart(product._id)"
                >
                  <Plus :size="12" />
                </button>
              </div>

              <!-- Round Orange Plus Button if not selected -->
              <button
                v-else
                class="round-add-btn"
                title="Ajouter au panier"
                @click.stop="addToCart(product._id)"
              >
                <Plus :size="16" />
              </button>
            </div>

            <!-- If table closed or locked to other device -->
            <div v-else-if="isTableClosed" class="locked-capsule" title="Table fermée">
              <Lock :size="12" />
            </div>
            <span v-else class="prod-unavailable-badge">Épuisé</span>
          </div>
        </div>
      </div>
    </main>

    <!-- Floating Cart Bar at bottom -->
    <div
      v-if="cartTotalCount > 0 && !isTableClosed"
      class="customer-floating-cart"
    >
      <div class="floating-cart-inner" @click="cartDrawerOpen = true">
        <div class="cart-info">
          <div class="cart-icon-circle">
            <ShoppingBag :size="18" />
            <span class="cart-badge-dot">{{ cartTotalCount }}</span>
          </div>
          <div class="cart-text-col">
            <span class="cart-count-text">
              {{ cartTotalCount }} {{ cartTotalCount === 1 ? 'article' : 'articles' }}
            </span>
            <span class="cart-sum-text"><MoneyText :value="cartTotalPrice" /></span>
          </div>
        </div>
        <button class="cart-cta-btn">
          Voir le panier
        </button>
      </div>
    </div>

    <!-- Product Detail Modal (Bottom Sheet) -->
    <div
      v-if="selectedProductForDetail"
      class="modal-backdrop"
      @click.self="closeProductDetail"
    >
      <div class="bottom-sheet-modal">
        <div class="sheet-header">
          <h3 class="sheet-title">{{ selectedProductForDetail.name }}</h3>
          <button class="sheet-close-btn" @click="closeProductDetail">
            <X :size="20" />
          </button>
        </div>

        <div class="sheet-body">
          <div v-if="selectedProductForDetail.imageUrl" class="modal-image-box">
            <img
              :src="selectedProductForDetail.imageUrl"
              :alt="selectedProductForDetail.name"
              class="modal-img"
            />
          </div>

          <div class="modal-info-section">
            <div class="modal-price-row">
              <span class="modal-price-label">Prix unitaire</span>
              <span class="modal-price-val"><MoneyText :value="selectedProductForDetail.price" /></span>
            </div>

            <p v-if="selectedProductForDetail.description" class="modal-desc">
              {{ selectedProductForDetail.description }}
            </p>

            <div v-if="!isTableClosed && selectedProductForDetail.available" class="modal-controls">
              <label class="control-label">Quantité</label>
              <div class="modal-stepper">
                <button
                  class="stepper-action-btn"
                  :disabled="detailQuantity <= 1"
                  @click="detailQuantity > 1 ? detailQuantity-- : null"
                >
                  <Minus :size="16" />
                </button>
                <span class="modal-stepper-val">{{ detailQuantity }}</span>
                <button
                  class="stepper-action-btn"
                  @click="detailQuantity++"
                >
                  <Plus :size="16" />
                </button>
              </div>

              <label class="control-label" style="margin-top: 14px;">Notes ou préférences</label>
              <input
                v-model="detailNote"
                type="text"
                placeholder="Ex: sans piment, bien cuit..."
                class="modal-note-input"
                maxlength="120"
              />

              <button
                class="modal-confirm-btn"
                @click="handleAddFromDetail"
              >
                Ajouter au panier • <MoneyText :value="selectedProductForDetail.price * detailQuantity" />
              </button>
            </div>

            <div v-else-if="isTableClosed" class="modal-closed-notice">
              <Lock :size="16" />
              <span>Cette table est occupée ou fermée. Consultation du menu uniquement.</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Cart Modal (Bottom Sheet) -->
    <div
      v-if="cartDrawerOpen"
      class="modal-backdrop"
      @click.self="cartDrawerOpen = false"
    >
      <div class="bottom-sheet-modal">
        <div class="sheet-header">
          <h3 class="sheet-title">Mon Panier • Table {{ tableNumber }}</h3>
          <button class="sheet-close-btn" @click="cartDrawerOpen = false">
            <X :size="20" />
          </button>
        </div>

        <div class="sheet-body">
          <div v-if="cartItemsList.length === 0" class="empty-cart-state">
            <p>Votre panier est vide.</p>
          </div>

          <div v-else class="cart-items-scroll">
            <div
              v-for="item in cartItemsList"
              :key="item.product._id"
              class="cart-item-card"
            >
              <div class="cart-item-top">
                <div class="cart-item-info">
                  <h4 class="cart-prod-name">{{ item.product.name }}</h4>
                  <span class="cart-prod-unit-price"><MoneyText :value="item.product.price" /> / unité</span>
                </div>

                <div class="stepper-capsule">
                  <button class="stepper-btn minus" @click="removeFromCart(item.product._id)">
                    <Minus :size="12" />
                  </button>
                  <span class="stepper-qty">{{ item.quantity }}</span>
                  <button class="stepper-btn plus" @click="addToCart(item.product._id)">
                    <Plus :size="12" />
                  </button>
                </div>
              </div>

              <input
                v-model="cart[item.product._id].note"
                type="text"
                placeholder="Note spéciale (ex: sans oignons, tiède...)"
                class="cart-note-field"
                maxlength="120"
              />

              <div class="cart-item-bottom">
                <span class="cart-item-subtotal-label">Sous-total :</span>
                <span class="cart-item-subtotal"><MoneyText :value="item.subtotal" /></span>
              </div>
            </div>
          </div>

          <div v-if="cartItemsList.length > 0" class="cart-footer">
            <div class="cart-total-row">
              <span class="total-label">Total :</span>
              <strong class="total-amount"><MoneyText :value="cartTotalPrice" /></strong>
            </div>

            <button
              class="cart-submit-btn"
              :disabled="submitting || isTableClosed"
              @click="submitOrder"
            >
              {{ submitting ? 'Envoi en cours...' : 'Envoyer la commande' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Ticket Modal (Slide-Up Bottom Sheet: Identical to Mobile TicketModal) -->
    <div
      v-if="ticketModalOpen && activeTicket"
      class="modal-backdrop"
      @click.self="ticketModalOpen = false"
    >
      <div class="bottom-sheet-modal">
        <div class="sheet-header">
          <h3 class="sheet-title">Addition • Table {{ tableNumber }}</h3>
          <button class="sheet-close-btn" @click="ticketModalOpen = false">
            <X :size="20" />
          </button>
        </div>

        <div class="sheet-body">
          <!-- Ticket Meta Box -->
          <div class="ticket-meta-box">
            <div class="meta-left">
              <div class="ticket-number-row">
                <Receipt :size="16" class="ticket-icon" />
                <span class="ticket-num-text">Ticket #{{ activeTicket.ticketNumber }}</span>
              </div>
              <span class="ticket-articles-count">
                {{ activeTicket.items?.reduce((s, i) => s + i.quantity, 0) || 0 }} articles commandés
              </span>
            </div>
            <span class="ticket-status-badge" :class="activeTicket.status.toLowerCase()">
              {{ activeTicket.status }}
            </span>
          </div>

          <!-- Paid Banner -->
          <div v-if="activeTicket.status === 'PAID'" class="paid-notice-banner">
            <CheckCircle :size="16" />
            <span>Cette commande a été réglée en caisse. Merci de votre visite !</span>
          </div>

          <!-- Items List -->
          <div class="ticket-items-scroll">
            <div
              v-for="item in activeTicket.items"
              :key="item._id"
              class="ticket-item-row"
            >
              <div class="ticket-item-left">
                <h4 class="ticket-item-name">{{ item.productName }}</h4>
                <span class="ticket-item-qtyprice">
                  {{ item.quantity }} x {{ Number(item.unitPrice).toFixed(3) }} TND
                </span>
                <p v-if="item.note" class="ticket-item-note">Note : {{ item.note }}</p>
              </div>

              <div class="ticket-item-right">
                <MoneyText :value="item.subtotal" />
              </div>
            </div>
          </div>

          <!-- Total Footer -->
          <div class="ticket-footer">
            <div class="ticket-total-line">
              <span class="ticket-total-label">Total à payer :</span>
              <strong class="ticket-total-val"><MoneyText :value="activeTicket.total" /></strong>
            </div>

            <button class="ticket-close-btn" @click="ticketModalOpen = false">
              Fermer
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Page Container & Background (Matching Mobile #F6F9FC) */
.customer-page {
  min-height: 100vh;
  background-color: #f6f9fc;
  color: #0f2133;
  font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  padding-bottom: 90px;
}

/* Mobile Top Bar Header */
.mobile-top-bar {
  background: #ffffff;
  border-bottom: 1px solid #d5dee8;
  position: sticky;
  top: 0;
  z-index: 30;
  box-shadow: 0 1px 3px rgba(11, 47, 87, 0.05);
}
.top-bar-inner {
  max-width: 540px;
  margin: 0 auto;
  padding: 12px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.top-bar-left {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.restaurant-badge {
  font-size: 10.5px;
  letter-spacing: 1.2px;
  text-transform: uppercase;
  color: #124a85;
  font-weight: 700;
  font-family: 'Bricolage Grotesque', sans-serif;
}
.table-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.table-title {
  margin: 0;
  font-size: 22px;
  font-weight: 800;
  color: #0f2133;
  letter-spacing: -0.3px;
  font-family: 'Bricolage Grotesque', sans-serif;
}
.table-status-pill {
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 9999px;
  text-transform: capitalize;
}
.table-status-pill.available {
  background: #d9f2e6;
  color: #1e9e6a;
}
.table-status-pill.reserved {
  background: #fcebcb;
  color: #e08a00;
}

/* Top Right Ticket Button */
.top-bar-ticket-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: #eef5fc;
  border: 1px solid #dceaf8;
  padding: 6px 12px;
  border-radius: 18px;
  color: #0b2f57;
  font-weight: 700;
  font-size: 13px;
  cursor: pointer;
  box-shadow: 0 1px 2px rgba(11, 47, 87, 0.06);
  transition: all 0.15s ease;
}
.top-bar-ticket-btn:hover {
  background: #dceaf8;
  transform: translateY(-1px);
}
.ticket-icon {
  color: #124a85;
}
.ticket-btn-label {
  font-family: 'DM Sans', sans-serif;
}

/* Container */
.customer-container {
  max-width: 540px;
  margin: 0 auto;
  padding: 0 16px 20px;
}

/* State Center */
.state-center {
  padding-top: 80px;
  text-align: center;
}
.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #dceaf8;
  border-top-color: #1b67b5;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto 12px;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
.state-text {
  color: #566779;
  font-size: 15px;
}
.error-text {
  color: #c8372d;
  font-weight: 600;
  margin-bottom: 12px;
}
.retry-btn {
  background: #124a85;
  color: #fff;
  border: none;
  padding: 8px 18px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
}

/* Hero Section */
.hero-section {
  padding: 14px 0 4px;
}
.hero-greeting {
  font-size: 13px;
  color: #566779;
  font-weight: 500;
  display: block;
  margin-bottom: 2px;
}
.hero-headline {
  margin: 0;
  font-size: 24px;
  font-weight: 800;
  letter-spacing: -0.4px;
  color: #0f2133;
  font-family: 'Bricolage Grotesque', sans-serif;
}
.hero-headline .highlight {
  color: #124a85;
}

/* Search Wrapper */
.search-wrapper {
  padding-top: 10px;
}
.search-inner {
  position: relative;
  display: flex;
  align-items: center;
}
.search-icon {
  position: absolute;
  left: 14px;
  color: #8797a8;
  pointer-events: none;
}
.search-input {
  width: 100%;
  height: 44px;
  padding: 0 38px 0 42px;
  background: #ffffff;
  border: 1px solid #d5dee8;
  border-radius: 12px;
  font-size: 14px;
  color: #0f2133;
  outline: none;
  transition: border-color 0.15s ease;
  font-family: inherit;
}
.search-input:focus {
  border-color: #1b67b5;
  box-shadow: 0 0 0 3px rgba(27, 103, 181, 0.12);
}
.clear-search-btn {
  position: absolute;
  right: 12px;
  background: transparent;
  border: none;
  color: #566779;
  cursor: pointer;
  padding: 4px;
}

/* Category Tabs */
.category-tabs-wrapper {
  margin-top: 12px;
}
.category-tabs {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 4px;
  scrollbar-width: none;
}
.category-tabs::-webkit-scrollbar {
  display: none;
}
.cat-chip {
  white-space: nowrap;
  padding: 6px 16px;
  background: #ffffff;
  border: 1px solid #d5dee8;
  border-radius: 9999px;
  font-size: 13px;
  font-weight: 600;
  color: #566779;
  cursor: pointer;
  transition: all 0.15s ease;
}
.cat-chip.active {
  background: #124a85;
  color: #ffffff;
  border-color: #124a85;
  box-shadow: 0 2px 6px rgba(18, 74, 133, 0.2);
}

/* Toolbar Dish Count */
.toolbar-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0 8px;
}
.toolbar-count {
  font-size: 13px;
  color: #566779;
  font-weight: 500;
}

/* 2 Cards Per Row Grid */
.customer-menu-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

/* Product Card */
.customer-product-card {
  display: flex;
  flex-direction: column;
  background: #ffffff;
  border: 1px solid #d5dee8;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(11, 47, 87, 0.05);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
}
.customer-product-card.selected {
  border-color: #124a85;
  box-shadow: 0 3px 10px rgba(18, 74, 133, 0.15);
}
.customer-product-card.unavailable {
  opacity: 0.65;
}

/* Card Image */
.prod-image-wrap {
  width: 100%;
  aspect-ratio: 4 / 3;
  position: relative;
  background: #ecf1f6;
  overflow: hidden;
  cursor: pointer;
}
.prod-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}
.customer-product-card:hover .prod-img {
  transform: scale(1.03);
}
.prod-image-wrap.placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #ecf1f6;
}
.placeholder-icon {
  color: #8797a8;
}

/* Badge Overlay */
.badge-overlay {
  position: absolute;
  top: 8px;
  left: 8px;
  right: 8px;
  display: flex;
  justify-content: space-between;
  pointer-events: none;
}
.badge-pill {
  font-size: 10.5px;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 9999px;
  color: #ffffff;
}
.badge-pill.out-of-stock {
  background: #c8372d;
}
.badge-pill.in-cart {
  background: #124a85;
}

/* Product Details */
.prod-details {
  padding: 8px 10px 4px;
  flex: 1;
  cursor: pointer;
}
.prod-name {
  margin: 0 0 2px;
  font-size: 13.5px;
  font-weight: 700;
  color: #0f2133;
  line-height: 1.25;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-family: 'DM Sans', sans-serif;
}
.prod-desc {
  margin: 0;
  font-size: 11.5px;
  color: #566779;
  line-height: 1.35;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Product Footer */
.prod-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 10px 10px;
}
.prod-price {
  font-size: 13.5px;
  font-weight: 800;
  color: #0b2f57;
  font-family: 'Bricolage Grotesque', sans-serif;
}
.prod-actions-wrap {
  display: flex;
  align-items: center;
}

/* Round Vibrant Orange Plus Button (Matching Mobile #F97316) */
.round-add-btn {
  width: 30px;
  height: 30px;
  border-radius: 15px;
  background: #f97316;
  border: none;
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(249, 115, 22, 0.35);
  transition: transform 0.1s ease, background 0.15s ease;
}
.round-add-btn:active {
  transform: scale(0.88);
}
.round-add-btn:hover {
  background: #ea580c;
}

/* Stepper Capsule (- N +) */
.stepper-capsule {
  display: inline-flex;
  align-items: center;
  background: #eef5fc;
  border: 1px solid #dceaf8;
  border-radius: 9999px;
  padding: 2px 4px;
  gap: 4px;
}
.stepper-btn {
  width: 22px;
  height: 22px;
  border-radius: 11px;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.1s ease;
}
.stepper-btn.minus {
  background: transparent;
  color: #124a85;
}
.stepper-btn.plus {
  background: #f97316;
  color: #ffffff;
}
.stepper-btn:active {
  transform: scale(0.85);
}
.stepper-qty {
  font-size: 12px;
  font-weight: 700;
  color: #0b2f57;
  min-width: 14px;
  text-align: center;
}

.locked-capsule {
  width: 28px;
  height: 28px;
  border-radius: 14px;
  background: #ecf1f6;
  color: #8797a8;
  display: flex;
  align-items: center;
  justify-content: center;
}
.prod-unavailable-badge {
  font-size: 11px;
  color: #c8372d;
  font-weight: 600;
}

/* Floating Cart Bar at Bottom */
.customer-floating-cart {
  position: fixed;
  bottom: 16px;
  left: 0;
  right: 0;
  z-index: 40;
  padding: 0 16px;
  pointer-events: none;
}
.floating-cart-inner {
  max-width: 508px;
  margin: 0 auto;
  background: #0b2f57;
  color: #ffffff;
  border-radius: 16px;
  padding: 10px 14px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 8px 24px rgba(11, 47, 87, 0.35);
  pointer-events: auto;
  cursor: pointer;
  transition: transform 0.15s ease;
}
.floating-cart-inner:active {
  transform: scale(0.98);
}
.cart-info {
  display: flex;
  align-items: center;
  gap: 10px;
}
.cart-icon-circle {
  width: 36px;
  height: 36px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}
.cart-badge-dot {
  position: absolute;
  top: -3px;
  right: -3px;
  background: #f97316;
  color: #fff;
  font-size: 10px;
  font-weight: 800;
  width: 16px;
  height: 16px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1.5px solid #0b2f57;
}
.cart-text-col {
  display: flex;
  flex-direction: column;
}
.cart-count-text {
  font-size: 11.5px;
  color: #dceaf8;
  font-weight: 500;
}
.cart-sum-text {
  font-size: 15px;
  font-weight: 800;
  color: #ffffff;
}
.cart-cta-btn {
  background: #f97316;
  color: #ffffff;
  border: none;
  padding: 8px 16px;
  border-radius: 10px;
  font-size: 13.5px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(249, 115, 22, 0.3);
}

/* Modal Backdrop & Bottom Sheets */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(11, 47, 87, 0.55);
  z-index: 50;
  display: flex;
  justify-content: center;
  align-items: flex-end;
  animation: fadeIn 0.2s ease;
}
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
.bottom-sheet-modal {
  width: 100%;
  max-width: 540px;
  background: #ffffff;
  border-radius: 20px 20px 0 0;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  animation: slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  overflow: hidden;
}
@keyframes slideUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}
.sheet-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 18px;
  border-bottom: 1px solid #d5dee8;
}
.sheet-title {
  margin: 0;
  font-size: 16px;
  font-weight: 800;
  color: #0f2133;
  font-family: 'Bricolage Grotesque', sans-serif;
}
.sheet-close-btn {
  background: transparent;
  border: none;
  color: #566779;
  cursor: pointer;
  padding: 4px;
}
.sheet-body {
  padding: 16px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* Product Detail Modal Content */
.modal-image-box {
  width: 100%;
  height: 180px;
  border-radius: 12px;
  overflow: hidden;
  background: #ecf1f6;
}
.modal-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.modal-price-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
}
.modal-price-label {
  font-size: 13px;
  color: #566779;
}
.modal-price-val {
  font-size: 18px;
  font-weight: 800;
  color: #0b2f57;
}
.modal-desc {
  font-size: 13px;
  color: #566779;
  line-height: 1.45;
  margin: 8px 0 12px;
}
.modal-controls {
  display: flex;
  flex-direction: column;
}
.control-label {
  font-size: 12px;
  font-weight: 700;
  color: #0f2133;
  margin-bottom: 6px;
}
.modal-stepper {
  display: flex;
  align-items: center;
  gap: 16px;
}
.stepper-action-btn {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  border: 1px solid #d5dee8;
  background: #eef5fc;
  color: #124a85;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.modal-stepper-val {
  font-size: 16px;
  font-weight: 800;
  color: #0f2133;
  min-width: 24px;
  text-align: center;
}
.modal-note-input {
  width: 100%;
  height: 40px;
  padding: 0 12px;
  background: #ecf1f6;
  border: 1px solid #d5dee8;
  border-radius: 10px;
  font-size: 13px;
  outline: none;
  font-family: inherit;
  margin-bottom: 14px;
}
.modal-confirm-btn {
  width: 100%;
  height: 46px;
  background: #f97316;
  color: #ffffff;
  border: none;
  border-radius: 12px;
  font-size: 14.5px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(249, 115, 22, 0.3);
}
.modal-closed-notice {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #fcebcb;
  color: #e08a00;
  padding: 10px 14px;
  border-radius: 10px;
  font-size: 12.5px;
  font-weight: 600;
}

/* Cart Modal Specific */
.empty-cart-state {
  padding: 30px;
  text-align: center;
  color: #566779;
}
.cart-items-scroll {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 45vh;
  overflow-y: auto;
}
.cart-item-card {
  background: #f8fafc;
  border: 1px solid #d5dee8;
  border-radius: 12px;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.cart-item-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}
.cart-prod-name {
  margin: 0;
  font-size: 13.5px;
  font-weight: 700;
  color: #0f2133;
}
.cart-prod-unit-price {
  font-size: 11.5px;
  color: #566779;
}
.cart-note-field {
  width: 100%;
  height: 32px;
  padding: 0 8px;
  background: #ffffff;
  border: 1px solid #d5dee8;
  border-radius: 6px;
  font-size: 12px;
  outline: none;
  font-family: inherit;
}
.cart-item-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12.5px;
}
.cart-item-subtotal {
  font-weight: 700;
  color: #0b2f57;
}
.cart-footer {
  border-top: 1px solid #d5dee8;
  padding-top: 12px;
}
.cart-total-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.total-label {
  font-size: 14px;
  color: #566779;
}
.total-amount {
  font-size: 18px;
  font-weight: 800;
  color: #0b2f57;
  font-family: 'Bricolage Grotesque', sans-serif;
}
.cart-submit-btn {
  width: 100%;
  height: 46px;
  background: #f97316;
  color: #ffffff;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(249, 115, 22, 0.35);
}

/* Ticket Modal Specific */
.ticket-meta-box {
  background: #ecf1f6;
  border: 1px solid #d5dee8;
  border-radius: 12px;
  padding: 10px 14px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.ticket-number-row {
  display: flex;
  align-items: center;
  gap: 6px;
}
.ticket-num-text {
  font-size: 14px;
  font-weight: 700;
  color: #0b2f57;
  font-family: 'Bricolage Grotesque', sans-serif;
}
.ticket-articles-count {
  font-size: 11.5px;
  color: #566779;
}
.ticket-status-badge {
  font-size: 11px;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 9999px;
  text-transform: uppercase;
}
.ticket-status-badge.open {
  background: #fcebcb;
  color: #e08a00;
}
.ticket-status-badge.paid {
  background: #d9f2e6;
  color: #1e9e6a;
}
.paid-notice-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #d9f2e6;
  color: #1e9e6a;
  border: 1px solid #b7e8d3;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
}
.ticket-items-scroll {
  display: flex;
  flex-direction: column;
  max-height: 45vh;
  overflow-y: auto;
}
.ticket-item-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid #d5dee8;
}
.ticket-item-left {
  flex: 1;
  padding-right: 10px;
}
.ticket-item-name {
  margin: 0 0 2px;
  font-size: 13.5px;
  font-weight: 700;
  color: #0f2133;
}
.ticket-item-qtyprice {
  font-size: 11.5px;
  color: #566779;
}
.ticket-item-note {
  margin: 2px 0 0;
  font-size: 11px;
  color: #f2a81d;
  font-style: italic;
}
.ticket-item-right {
  font-size: 13px;
  font-weight: 700;
  color: #0f2133;
}
.ticket-footer {
  border-top: 1px solid #d5dee8;
  padding-top: 10px;
}
.ticket-total-line {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.ticket-total-label {
  font-size: 13.5px;
  color: #566779;
}
.ticket-total-val {
  font-size: 17px;
  font-weight: 800;
  color: #0b2f57;
  font-family: 'Bricolage Grotesque', sans-serif;
}
.ticket-close-btn {
  width: 100%;
  height: 40px;
  background: #eef5fc;
  border: 1px solid #dceaf8;
  border-radius: 10px;
  color: #0b2f57;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
}
</style>
