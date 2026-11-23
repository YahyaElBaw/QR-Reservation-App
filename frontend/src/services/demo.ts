import type {
  User,
  Category,
  Product,
  RestaurantTable,
  Ticket,
  Entity,
  Resource,
  Role,
  PaymentMethod,
  Stats,
} from '../types'
import { getToken } from './http'
import { subtotal, total, tunisDay } from '../utils/money'
interface DB {
  users: User[]
  categories: Category[]
  products: Product[]
  tables: RestaurantTable[]
  tickets: Ticket[]
}
const key = 'medina.restaurant.demo.v2'
const stamp = () => ({ createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
function seed(): DB {
  const users: User[] = (['ADMIN', 'CAISSIER', 'CONTOIRISTE'] as Role[]).map((role, i) => ({
    _id: `u${i}`,
    name: ['Amira Mansour', 'Sami Ben Ali', 'Youssef Trabelsi'][i]!,
    username: ['admin', 'caissier', 'cuisinier'][i]!,
    role,
    active: true,
    ...stamp(),
  }))
  const categories: Category[] = [
    { _id: 'c1', name: 'Cuisine', description: 'Nos recettes maison', sortOrder: 0, ...stamp() },
    { _id: 'c2', name: 'Boissons', description: 'Fraîches et chaudes', sortOrder: 1, ...stamp() },
  ]
  const products: Product[] = [
    {
      _id: 'p1',
      name: 'Couscous maison',
      description: 'Semoule, légumes et poulet',
      price: 18.5,
      categoryId: 'c1',
      available: true,
      imageUrl: '',
      ...stamp(),
    },
    {
      _id: 'p2',
      name: 'Brik à l’œuf',
      description: 'Thon, œuf et feuille croustillante',
      price: 6.5,
      categoryId: 'c1',
      available: true,
      imageUrl: '',
      ...stamp(),
    },
    {
      _id: 'p3',
      name: 'Citronnade',
      description: 'Citron frais et menthe',
      price: 4,
      categoryId: 'c2',
      available: true,
      imageUrl: '',
      ...stamp(),
    },
    {
      _id: 'p4',
      name: 'Café direct',
      description: 'Espresso et lait chaud',
      price: 3.5,
      categoryId: 'c2',
      available: false,
      imageUrl: '',
      ...stamp(),
    },
  ]
  const tickets: Ticket[] = [1, 2, 3].map((n) => {
    const p = products[n - 1]!
    const items = [
      {
        _id: `i${n}`,
        ticketId: `t${n}`,
        productId: p._id,
        productName: p.name,
        quantity: 2,
        unitPrice: p.price,
        subtotal: subtotal(p.price, 2),
        note: n === 1 ? 'Sans piment' : '',
      },
    ]
    return {
      _id: `t${n}`,
      ticketNumber: String(1040 + n),
      tableId: `tb${n}`,
      status: 'OPEN',
      total: total(items),
      items,
      ...stamp(),
      createdAt: new Date(Date.now() - n * 600000).toISOString(),
    }
  })
  const tables: RestaurantTable[] = Array.from({ length: 12 }, (_, i) => ({
    _id: `tb${i + 1}`,
    number: i + 1,
    qrToken: `TBL-DEMO00${i + 1}`,
    status: i < 3 ? 'RESERVED' : 'AVAILABLE',
    ...stamp(),
  }))
  return { users, categories, products, tickets, tables }
}
function read(): DB {
  const raw = localStorage.getItem(key)
  if (raw)
    try {
      return JSON.parse(raw) as DB
    } catch {
      /* restore invalid demo data */
    }
  const db = seed()
  localStorage.setItem(key, JSON.stringify(db))
  return db
}
function save(db: DB) {
  localStorage.setItem(key, JSON.stringify(db))
  window.dispatchEvent(new Event('demo-updated'))
}
function fail(message: string, code = 'VALIDATION_ERROR'): never {
  throw { statusCode: 409, code, message, details: [] }
}
function staff(db: DB, roles: Role[] = ['ADMIN', 'CAISSIER', 'CONTOIRISTE']) {
  const user = db.users.find((u) => `demo:${u._id}` === getToken() && u.active)
  if (!user) fail('Session expirée. Reconnectez-vous.', 'UNAUTHORIZED')
  if (!roles.includes(user.role)) fail('Action non autorisée pour ce rôle.', 'FORBIDDEN')
  return user
}
function admin(db: DB) {
  return staff(db, ['ADMIN'])
}
function openTicket(db: DB, id: string) {
  const ticket = db.tickets.find((t) => t._id === id)
  if (!ticket) fail('Ticket introuvable.', 'NOT_FOUND')
  if (ticket.status !== 'OPEN') fail('Ce ticket n’est plus ouvert.', 'TICKET_NOT_OPEN')
  return ticket
}
export const demo = {
  async login(username: string, password: string) {
    const db = read()
    const user = db.users.find((u) => u.username === username && u.active)
    if (!user || password !== 'demo1234')
      fail('Compte démo incorrect. Mot de passe : demo1234.', 'UNAUTHORIZED')
    return { accessToken: `demo:${user._id}`, user }
  },
  async me() {
    return staff(read())
  },
  async list<T extends Entity>(resource: Resource): Promise<T[]> {
    const db = read()
    staff(db, resource === 'users' ? ['ADMIN'] : undefined)
    return db[resource] as T[]
  },
  async tickets() {
    const db = read()
    staff(db)
    return db.tickets
  },
  async ticket(id: string) {
    const db = read()
    staff(db)
    const result = db.tickets.find((t) => t._id === id)
    if (!result) fail('Ticket introuvable.', 'NOT_FOUND')
    return result
  },
  async save(resource: Resource, id: string | undefined, payload: Record<string, unknown>) {
    const db = read()
    const self = admin(db)
    const rows = db[resource] as Entity[]
    const data = { ...payload }
    delete data.password
    const existing = rows.find((row) => row._id === id)
    if (id && !existing) fail('Élément introuvable.', 'NOT_FOUND')
    if (resource === 'users') {
      if (db.users.some((u) => u.username === data.username && u._id !== id))
        fail('Identifiant déjà utilisé.')
      if (id === self._id && (data.active === false || (data.role && data.role !== 'ADMIN')))
        fail('Conservez votre compte administrateur actif.')
    }
    if (resource === 'tables') {
      if (db.tables.some((t) => t.number === data.number && t._id !== id))
        fail('Numéro de table déjà utilisé.')
      if (!id)
        Object.assign(data, {
          status: 'AVAILABLE',
          qrToken: `TBL-${crypto.randomUUID().replaceAll('-', '').slice(0, 8)}`,
        })
    }
    const result =
      existing || ({ ...data, _id: crypto.randomUUID(), ...stamp() } as unknown as Entity)
    if (existing) Object.assign(existing, data, { updatedAt: new Date().toISOString() })
    else rows.push(result)
    save(db)
    return result
  },
  async remove(resource: Resource, id: string) {
    const db = read()
    const self = admin(db)
    if (resource === 'users' && id === self._id) fail('Vous ne pouvez pas supprimer votre compte.')
    if (resource === 'tables' && db.tickets.some((t) => t.tableId === id && t.status !== 'CLOSED'))
      fail('Clôturez le ticket avant de supprimer cette table.', 'TABLE_HAS_OPEN_TICKET')
    if (resource === 'categories' && db.products.some((p) => p.categoryId === id))
      fail('Déplacez les produits de cette catégorie avant de la supprimer.')
    const rows = db[resource] as Entity[]
    const index = rows.findIndex((row) => row._id === id)
    if (index < 0) fail('Élément introuvable.', 'NOT_FOUND')
    rows.splice(index, 1)
    save(db)
  },
  async availability(id: string, available: boolean) {
    const db = read()
    staff(db, ['ADMIN', 'CONTOIRISTE'])
    const p = db.products.find((p) => p._id === id)
    if (!p) fail('Produit introuvable.', 'NOT_FOUND')
    p.available = available
    save(db)
  },
  async regenerate(id: string) {
    const db = read()
    admin(db)
    const table = db.tables.find((t) => t._id === id)
    if (!table) fail('Table introuvable.', 'NOT_FOUND')
    table.qrToken = `TBL-${crypto.randomUUID().replaceAll('-', '').slice(0, 8)}`
    save(db)
  },
  async item(
    id: string,
    action: 'add' | 'update' | 'remove',
    payload: { productId?: string; quantity?: number; note?: string; itemId?: string },
  ) {
    const db = read()
    staff(db, ['ADMIN', 'CONTOIRISTE'])
    const ticket = openTicket(db, id)
    if (
      action !== 'remove' &&
      (!Number.isInteger(payload.quantity) || Number(payload.quantity) < 1)
    )
      fail('La quantité doit être un entier supérieur à zéro.')
    if (action === 'add') {
      const p = db.products.find((p) => p._id === payload.productId)
      if (!p || !p.available)
        fail('Produit indisponible. Choisissez un autre article.', 'PRODUCT_UNAVAILABLE')
      ticket.items.push({
        _id: crypto.randomUUID(),
        ticketId: id,
        productId: p._id,
        productName: p.name,
        quantity: payload.quantity!,
        unitPrice: p.price,
        subtotal: subtotal(p.price, payload.quantity!),
        note: payload.note,
      })
    } else {
      const line = ticket.items.find((i) => i._id === payload.itemId)
      if (!line) fail('Article introuvable.', 'NOT_FOUND')
      if (action === 'remove') ticket.items = ticket.items.filter((i) => i._id !== line._id)
      else {
        line.quantity = payload.quantity!
        line.subtotal = subtotal(line.unitPrice, line.quantity)
      }
    }
    ticket.total = total(ticket.items)
    ticket.updatedAt = new Date().toISOString()
    save(db)
  },
  async pay(id: string, method: PaymentMethod) {
    const db = read()
    staff(db, ['ADMIN', 'CAISSIER'])
    const ticket = openTicket(db, id)
    ticket.status = 'PAID'
    ticket.paymentMethod = method
    ticket.paidAt = new Date().toISOString()
    save(db)
  },
  async close(id: string) {
    const db = read()
    staff(db, ['ADMIN', 'CAISSIER'])
    const ticket = db.tickets.find((t) => t._id === id)
    if (!ticket || ticket.status !== 'PAID')
      fail('Enregistrez le paiement avant de clôturer.', 'TICKET_NOT_OPEN')
    ticket.status = 'CLOSED'
    ticket.closedAt = new Date().toISOString()
    const table = db.tables.find((t) => t._id === ticket.tableId)
    if (table) table.status = 'AVAILABLE'
    save(db)
  },
  async stats(from: string, to: string): Promise<Stats> {
    const db = read()
    admin(db)
    const paid = db.tickets.filter(
      (t) => t.paidAt && tunisDay(t.paidAt) >= from && tunisDay(t.paidAt) <= to,
    )
    const salesTotal = total(paid.map((t) => ({ subtotal: t.total })))
    const days = new Map<string, number>()
    const top = new Map<string, number>()
    for (const ticket of paid) {
      const day = tunisDay(ticket.paidAt!)
      days.set(day, (days.get(day) || 0) + ticket.total)
      for (const i of ticket.items)
        top.set(i.productName, (top.get(i.productName) || 0) + i.quantity)
    }
    return {
      salesTotal,
      ticketsCount: paid.length,
      avgTicket: paid.length ? salesTotal / paid.length : 0,
      openTickets: db.tickets.filter((t) => t.status === 'OPEN').length,
      tablesOccupied: db.tables.filter((t) => t.status === 'RESERVED').length,
      salesByDay: [...days].sort().map(([date, total]) => ({ date, total })),
      topProducts: [...top]
        .sort((a, b) => b[1] - a[1])
        .map(([productName, quantity]) => ({ productName, quantity })),
    }
  },
  reset() {
    save(seed())
  },
}
