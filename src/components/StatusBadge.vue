<script setup lang="ts">
import { computed } from 'vue'
import { CircleCheck, Users, Receipt, Banknote, Lock } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
const props = defineProps<{ status: string }>()
const { t } = useI18n()
const entry = computed(
  () =>
    ({
      AVAILABLE: { label: 'available', tone: 'success', icon: CircleCheck },
      RESERVED: { label: 'occupied', tone: 'warning', icon: Users },
      OPEN: { label: 'open', tone: 'info', icon: Receipt },
      PAID: { label: 'paid', tone: 'accent', icon: Banknote },
      CLOSED: { label: 'closed', tone: 'neutral', icon: Lock },
    })[props.status] || { label: props.status, tone: 'neutral', icon: Lock },
)
</script>
<template>
  <span class="badge" :class="entry.tone"
    ><component :is="entry.icon" :size="16" />{{ t(entry.label) }}</span
  >
</template>
