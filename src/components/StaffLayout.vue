<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useDark, useToggle } from '@vueuse/core'
import {
  Utensils,
  LayoutDashboard,
  ChefHat,
  Receipt,
  Grid2X2,
  ToggleRight,
  Tags,
  Users,
  LogOut,
  Moon,
  Sun,
  Volume2,
  Download,
} from 'lucide-vue-next'
import { useAuth } from '../stores/auth'
import { useLive } from '../services/live'
import { DEMO, SOURCE_DOWNLOAD } from '../services/http'
const { t, locale } = useI18n()
const auth = useAuth()
const router = useRouter()
const dark = useDark({ attribute: 'data-theme', valueDark: 'dark', valueLight: 'light' })
const toggleDark = useToggle(dark)
const { connected, sound, enableSound } = useLive()
const links = computed(() => [
  ...(auth.isAdmin ? [{ path: 'dashboard', label: 'dashboard', icon: LayoutDashboard }] : []),
  ...(auth.canEdit ? [{ path: 'kitchen', label: 'kitchen', icon: ChefHat }] : []),
  { path: 'tickets', label: 'tickets', icon: Receipt },
  { path: 'tables', label: 'tables', icon: Grid2X2 },
  ...(auth.canEdit ? [{ path: 'availability', label: 'availability', icon: ToggleRight }] : []),
  ...(auth.isAdmin
    ? [
        { path: 'products', label: 'products', icon: Utensils },
        { path: 'categories', label: 'categories', icon: Tags },
        { path: 'users', label: 'users', icon: Users },
      ]
    : []),
])
function logout() {
  auth.logout()
  void router.push('/staff/login')
}
</script>
<template>
  <div class="workspace">
    <aside class="sidebar no-print">
      <RouterLink class="brand" to="/staff"
        ><span class="brand-mark"><Utensils :size="24" /></span
        ><span
          >Medina<small>{{ t('brand') }}</small></span
        ></RouterLink
      >
      <p class="eyebrow">{{ t(auth.isAdmin ? 'admin' : auth.canPay ? 'cashier' : 'kitchen') }}</p>
      <nav :aria-label="t('brand')">
        <RouterLink v-for="link in links" :key="link.path" :to="'/staff/' + link.path"
          ><component :is="link.icon" :size="20" />{{ t(link.label) }}</RouterLink
        >
      </nav>
      <div class="sidebar-footer">
        <a
          v-if="SOURCE_DOWNLOAD"
          class="button secondary wide download-source"
          href="/qr-restaurant-frontend.zip"
          download
          ><Download :size="18" />ZIP · Vue 3</a
        ><strong>{{ auth.user?.name }}</strong
        ><small>{{ auth.user?.username }}</small
        ><button class="ghost" @click="logout"><LogOut :size="18" />{{ t('logout') }}</button>
      </div>
    </aside>
    <div class="main-column">
      <header class="topbar no-print">
        <span class="live"
          ><span :class="connected ? 'live-dot' : 'poll-dot'"></span
          >{{ DEMO ? t('demo') : t(connected ? 'connected' : 'polling') }}</span
        >
        <div class="row controls">
          <button
            class="icon"
            :class="{ selected: sound }"
            :aria-label="t('sound')"
            :aria-pressed="sound"
            @click="enableSound"
          >
            <Volume2 :size="20" /></button
          ><select v-model="locale" aria-label="Language">
            <option value="fr">Français</option>
            <option value="en">English</option>
            <option value="ar">العربية</option></select
          ><button class="icon" aria-label="Toggle dark mode" @click="toggleDark()">
            <Sun v-if="dark" :size="20" /><Moon v-else :size="20" />
          </button>
        </div>
      </header>
      <main id="main-content"><RouterView /></main>
      <footer class="page-footer no-print">
        Medina · {{ t('brand') }}<span>TND · Africa/Tunis</span>
      </footer>
    </div>
  </div>
</template>
