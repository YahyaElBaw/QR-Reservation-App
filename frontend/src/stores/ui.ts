import { defineStore } from 'pinia'
import { ref } from 'vue'
export const useUi = defineStore('ui', () => {
  const notices = ref<{ id: number; message: string; error: boolean }[]>([])
  function notify(message: string, error = false) {
    const id = Date.now() + Math.random()
    notices.value.push({ id, message, error })
    setTimeout(() => (notices.value = notices.value.filter((n) => n.id !== id)), 4500)
  }
  function error(e: unknown) {
    notify(
      e && typeof e === 'object' && 'message' in e
        ? String(e.message)
        : 'Une erreur est survenue. Réessayez.',
      true,
    )
  }
  return { notices, notify, error }
})
