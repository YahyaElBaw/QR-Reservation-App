<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { money } from '../utils/money'
defineProps<{ value: number }>()
const { locale } = useI18n()
</script>
<template>
  <span class="money">{{ money(value, locale) }}</span>
</template>
