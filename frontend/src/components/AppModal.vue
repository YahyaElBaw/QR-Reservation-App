<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { X } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
defineProps<{ title: string; busy?: boolean }>()
const emit = defineEmits<{ close: [] }>()
const { t } = useI18n()
const dialog = ref<HTMLDialogElement>()
let previous: HTMLElement | null = null
onMounted(async () => {
  previous = document.activeElement as HTMLElement
  dialog.value?.showModal()
  await nextTick()
  dialog.value?.querySelector<HTMLElement>('input,select,button')?.focus()
})
onUnmounted(() => previous?.focus())
</script>
<template>
  <dialog
    ref="dialog"
    class="modal"
    @cancel.prevent="!busy && emit('close')"
    @click="
      (event) => {
        if (event.target === dialog && !busy) emit('close')
      }
    "
  >
    <div class="modal-body">
      <header class="row">
        <h2>{{ title }}</h2>
        <button class="icon" :disabled="busy" :aria-label="t('cancel')" @click="emit('close')">
          <X :size="20" />
        </button>
      </header>
      <slot />
    </div>
  </dialog>
</template>
