import { ref, onMounted, onUnmounted } from 'vue'
import { io, type Socket } from 'socket.io-client'
import { DEMO, getToken } from './http'
import { useUi } from '../stores/ui'
import { i18n } from '../i18n'
export const liveConnected = ref(DEMO)
export function useLive() {
  let socket: Socket | undefined
  let timer: ReturnType<typeof setTimeout> | undefined
  let audio: AudioContext | undefined
  const sound = ref(false)
  const ui = useUi()
  function refresh() {
    clearTimeout(timer)
    timer = setTimeout(() => window.dispatchEvent(new Event('data-refresh')), 200)
  }
  function changed() {
    refresh()
    ui.notify(i18n.global.t('updated'))
    if (sound.value && audio) {
      const oscillator = audio.createOscillator()
      const gain = audio.createGain()
      gain.gain.value = 0.04
      oscillator.connect(gain)
      gain.connect(audio.destination)
      oscillator.frequency.value = 660
      oscillator.start()
      oscillator.stop(audio.currentTime + 0.12)
    }
  }
  function storage(event: StorageEvent) {
    if (event.key === 'medina.restaurant.demo.v2') changed()
  }
  async function enableSound() {
    if (!audio) audio = new AudioContext()
    await audio.resume()
    sound.value = !sound.value
  }
  onMounted(() => {
    if (DEMO) {
      window.addEventListener('storage', storage)
      window.addEventListener('demo-updated', refresh)
      return
    }
    const origin =
      import.meta.env.VITE_SOCKET_URL ||
      new URL(import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1').origin
    socket = io(`${origin.replace(/\/$/, '')}/live`, { auth: { token: getToken() } })
    socket.on('connect', () => {
      liveConnected.value = true
      refresh()
    })
    socket.on('disconnect', () => (liveConnected.value = false))
    socket.on('connect_error', () => (liveConnected.value = false))
    for (const event of ['ticket.created', 'ticket.updated']) socket.on(event, changed)
    for (const event of ['ticket.closed', 'table.updated', 'product.updated'])
      socket.on(event, refresh)
  })
  onUnmounted(() => {
    socket?.disconnect()
    liveConnected.value = DEMO
    clearTimeout(timer)
    window.removeEventListener('storage', storage)
    window.removeEventListener('demo-updated', refresh)
    void audio?.close()
  })
  return { connected: liveConnected, sound, enableSound }
}
export function useRefresh(load: () => Promise<void>) {
  let running = false
  let interval: ReturnType<typeof setInterval>
  async function refresh() {
    if (running || document.hidden) return
    running = true
    try {
      await load()
    } finally {
      running = false
    }
  }
  onMounted(() => {
    void refresh()
    window.addEventListener('data-refresh', refresh)
    interval = setInterval(() => {
      if (DEMO || !liveConnected.value) void refresh()
    }, 5000)
  })
  onUnmounted(() => {
    clearInterval(interval)
    window.removeEventListener('data-refresh', refresh)
  })
  return refresh
}
