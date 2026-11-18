<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { Utensils, ArrowRight, Download } from 'lucide-vue-next'
import { useAuth } from '../stores/auth'
import { homeFor } from '../router'
import { DEMO, SOURCE_DOWNLOAD } from '../services/http'
const { t, locale } = useI18n()
const auth = useAuth()
const router = useRouter()
const username = ref(DEMO ? 'admin' : '')
const password = ref(DEMO ? 'demo1234' : '')
const busy = ref(false)
const error = ref('')
async function submit() {
  busy.value = true
  error.value = ''
  try {
    await auth.login(username.value, password.value)
    await router.push(homeFor(auth.user?.role))
  } catch (e) {
    error.value =
      e && typeof e === 'object' && 'message' in e
        ? String(e.message)
        : 'Connexion impossible. Réessayez.'
  } finally {
    busy.value = false
  }
}
function chooseAccount(account: string) {
  username.value = account
  password.value = 'demo1234'
}
</script>
<template>
  <main class="login-page">
    <section class="login-story">
      <div class="brand">
        <span class="brand-mark"><Utensils /></span>Medina
      </div>
      <div>
        <p class="eyebrow">QR Restaurant</p>
        <h1>{{ t('welcome') }}</h1>
        <p>{{ t('intro') }}</p>
        <div class="login-tiles">
          <span>01<br />{{ t('admin') }}</span
          ><span>02<br />{{ t('kitchen') }}</span
          ><span>03<br />{{ t('cashier') }}</span>
        </div>
      </div>
      <small>Medina Blue · Sidi Bou Said</small>
    </section>
    <section class="login-form">
      <div v-if="SOURCE_DOWNLOAD" class="source-banner">
        <a class="button primary wide" href="/qr-restaurant-frontend.zip" download
          ><Download :size="20" />{{ t('download') }}</a
        ><small>{{ t('setup') }}</small>
      </div>
      <div class="row">
        <h2>{{ t('login') }}</h2>
        <select v-model="locale" aria-label="Language">
          <option value="fr">Français</option>
          <option value="en">English</option>
          <option value="ar">العربية</option>
        </select>
      </div>
      <p v-if="DEMO" class="notice">{{ t('demo') }}</p>
      <form @submit.prevent="submit">
        <label
          >{{ t('username')
          }}<input
            v-model.trim="username"
            required
            autocomplete="username"
            :disabled="busy" /></label
        ><label
          >{{ t('password')
          }}<input
            v-model="password"
            type="password"
            required
            autocomplete="current-password"
            :disabled="busy"
        /></label>
        <p v-if="error" role="alert" class="error-text">{{ error }}</p>
        <button class="primary wide" :disabled="busy">
          {{ t(busy ? 'loading' : 'login') }}<ArrowRight :size="18" />
        </button>
      </form>
      <div v-if="DEMO" class="demo-accounts">
        <p>{{ t('demoHint') }}</p>
        <div class="row wrap">
          <button
            v-for="account in ['admin', 'cuisinier', 'caissier']"
            :key="account"
            class="secondary"
            @click="chooseAccount(account)"
          >
            {{ account }}
          </button>
        </div>
      </div>
    </section>
  </main>
</template>
