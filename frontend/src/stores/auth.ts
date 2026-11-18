import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { api } from '../services/api'
import { getToken, setToken } from '../services/http'
import type { User } from '../types'
export const useAuth = defineStore('auth', () => {
  const user = ref<User | null>(null)
  let restored = false
  const isAdmin = computed(() => user.value?.role === 'ADMIN')
  const canEdit = computed(() => isAdmin.value || user.value?.role === 'CONTOIRISTE')
  const canPay = computed(() => isAdmin.value || user.value?.role === 'CAISSIER')
  async function restore() {
    if (restored) return
    restored = true
    if (getToken())
      try {
        user.value = await api.me()
      } catch {
        logout()
      }
  }
  async function login(username: string, password: string) {
    const result = await api.login(username, password)
    setToken(result.accessToken)
    user.value = result.user
    restored = true
  }
  function logout() {
    setToken('')
    user.value = null
  }
  return { user, isAdmin, canEdit, canPay, restore, login, logout }
})
