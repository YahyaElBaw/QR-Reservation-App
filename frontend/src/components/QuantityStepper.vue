<script setup lang="ts">
import { Plus, Minus } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
defineProps<{ modelValue: number; disabled?: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [value: number] }>()
const { t } = useI18n()
</script>
<template>
  <div class="stepper">
    <button
      type="button"
      :disabled="disabled || modelValue <= 1"
      :aria-label="t('quantity') + ' −'"
      @click="emit('update:modelValue', Math.max(1, modelValue - 1))"
    >
      <Minus :size="16" /></button
    ><output>{{ modelValue }}</output
    ><button
      type="button"
      :disabled="disabled"
      :aria-label="t('quantity') + ' +'"
      @click="emit('update:modelValue', modelValue + 1)"
    >
      <Plus :size="16" />
    </button>
  </div>
</template>
