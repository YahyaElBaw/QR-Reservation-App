import { http, DEMO } from './http'
import { demo } from './demo'
import type { Entity, Resource, List, Ticket, User, PaymentMethod, Stats } from '../types'
type RawStats = Omit<Stats, 'salesByDay'> & {
  salesByDay: { date: string; sales?: number; total?: number }[]
}
async function all<T>(path: string): Promise<T[]> {
  let page = 1
  const result: T[] = []
  while (true) {
    const { data } = await http.get<List<T>>(path, { params: { page, limit: 100 } })
    result.push(...data.data)
    if (result.length >= data.meta.total || !data.data.length) return result
    page++
  }
}
export const api = {
  login: (username: string, password: string) =>
    DEMO
      ? demo.login(username, password)
      : http
          .post<{ accessToken: string; user: User }>('/auth/login', { username, password })
          .then((r) => r.data),
  me: () => (DEMO ? demo.me() : http.get<User>('/auth/me').then((r) => r.data)),
  list: <T extends Entity>(resource: Resource): Promise<T[]> =>
    DEMO ? demo.list<T>(resource) : all<T>(`/${resource}`),
  save: (resource: Resource, id: string | undefined, data: Record<string, unknown>) =>
    DEMO
      ? demo.save(resource, id, data)
      : (id
          ? http.patch<Entity>(`/${resource}/${id}`, data)
          : http.post<Entity>(`/${resource}`, data)
        ).then((r) => r.data),
  remove: (resource: Resource, id: string) =>
    DEMO ? demo.remove(resource, id) : http.delete(`/${resource}/${id}`).then(() => {}),
  tickets: () => (DEMO ? demo.tickets() : all<Ticket>('/tickets')),
  ticket: (id: string) =>
    DEMO ? demo.ticket(id) : http.get<Ticket>(`/tickets/${id}`).then((r) => r.data),
  availability: (id: string, available: boolean) =>
    DEMO
      ? demo.availability(id, available)
      : http.patch(`/products/${id}/availability`, { available }).then(() => {}),
  regenerate: (id: string) =>
    DEMO ? demo.regenerate(id) : http.post(`/tables/${id}/regenerate-qr`).then(() => {}),
  qr: (id: string, baseUrl: string) =>
    http
      .get<Blob>(`/tables/${id}/qr.png`, { params: { baseUrl }, responseType: 'blob' })
      .then((r) => r.data),
  image: async (id: string, file: File) => {
    if (DEMO) {
      const url = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result))
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
      await demo.save('products', id, { imageUrl: url })
      return
    }
    const body = new FormData()
    body.append('file', file)
    await http.post(`/products/${id}/image`, body)
  },
  item: (
    id: string,
    action: 'add' | 'update' | 'remove',
    data: { productId?: string; quantity?: number; note?: string; itemId?: string },
  ) => {
    if (DEMO) return demo.item(id, action, data)
    const path = `/tickets/${id}/items`
    if (action === 'add')
      return http.post(path, {
        productId: data.productId,
        quantity: data.quantity,
        note: data.note,
      })
    if (action === 'update')
      return http.patch(`${path}/${data.itemId}`, { quantity: data.quantity })
    return http.delete(`${path}/${data.itemId}`)
  },
  pay: (id: string, method: PaymentMethod) =>
    DEMO ? demo.pay(id, method) : http.post(`/tickets/${id}/pay`, { method }).then(() => {}),
  close: (id: string) => (DEMO ? demo.close(id) : http.post(`/tickets/${id}/close`).then(() => {})),
  stats: (from: string, to: string) =>
    DEMO
      ? demo.stats(from, to)
      : http.get<RawStats>('/dashboard/stats', { params: { from, to } }).then(
          (r): Stats => ({
            ...r.data,
            // le backend renvoie { date, sales, ticketsCount } ; l'écran lit { date, total }
            salesByDay: r.data.salesByDay.map((d) => ({
              date: d.date,
              total: d.total ?? d.sales ?? 0,
            })),
          }),
        ),
}