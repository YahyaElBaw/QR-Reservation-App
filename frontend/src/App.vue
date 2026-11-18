<script setup lang="ts">
import { watch, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useUi } from './stores/ui'
import { useAuth } from './stores/auth'
const { locale } = useI18n()
const ui = useUi()
const auth = useAuth()
const router = useRouter()
watch(
  locale,
  (value) => {
    document.documentElement.lang = value
    document.documentElement.dir = value === 'ar' ? 'rtl' : 'ltr'
    localStorage.setItem('medina.locale', value)
  },
  { immediate: true },
)
function expired() {
  auth.logout()
  void router.replace('/staff/login')
}
onMounted(() => window.addEventListener('session-expired', expired))
onUnmounted(() => window.removeEventListener('session-expired', expired))
</script>
<template>
  <RouterView />
  <div class="toasts" aria-live="polite">
    <div
      v-for="n in ui.notices"
      :key="n.id"
      class="toast"
      :class="{ error: n.error }"
      :role="n.error ? 'alert' : 'status'"
    >
      {{ n.error ? '!' : '✓' }} {{ n.message }}
    </div>
  </div>
</template>
