import axios from 'axios'
import type { ApiError } from '../types'
export const DEMO = import.meta.env.VITE_DEMO_MODE !== 'false'
export const SOURCE_DOWNLOAD = import.meta.env.VITE_SOURCE_DOWNLOAD === 'true'
const key = DEMO ? 'medina.demo.token' : 'medina.api.token'
let token = localStorage.getItem(key) || ''
export function getToken() {
  return token
}
export function setToken(value: string) {
  token = value
  if (value) localStorage.setItem(key, value)
  else localStorage.removeItem(key)
}
export const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1',
  timeout: 15000,
})
http.interceptors.request.use((config) => {
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})
http.interceptors.response.use(
  (response) => response,
  (error) => {
    const statusCode = error.response?.status || 0
    const body = error.response?.data
    if (statusCode === 401) {
      setToken('')
      window.dispatchEvent(new Event('session-expired'))
    }
    const normalized: ApiError = {
      statusCode,
      code: body?.code || 'NETWORK_ERROR',
      message: body?.message || 'Connexion indisponible. Vérifiez le réseau et réessayez.',
      details: body?.details || [],
    }
    return Promise.reject(normalized)
  },
)
