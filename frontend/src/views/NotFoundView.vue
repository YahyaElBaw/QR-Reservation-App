<script setup lang="ts">
import { useI18n } from 'vue-i18n'
const { t } = useI18n()
</script>
<template>
  <main class="empty">
    <h1>404 · {{ t('notFound') }}</h1>
    <RouterLink class="button primary" to="/staff">{{ t('home') }}</RouterLink>
  </main>
</template>
