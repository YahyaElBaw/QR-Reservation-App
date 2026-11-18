export type Role = 'ADMIN' | 'CAISSIER' | 'CONTOIRISTE'
export type TicketStatus = 'OPEN' | 'PAID' | 'CLOSED'
export type PaymentMethod = 'CASH' | 'CARD' | 'OTHER'
export interface Base {
  _id: string
  createdAt: string
  updatedAt: string
}
export interface User extends Base {
  name: string
  username: string
  role: Role
  active: boolean
}
export interface Category extends Base {
  name: string
  description: string
  sortOrder: number
}
export interface Product extends Base {
  name: string
  description: string
  price: number
  imageUrl: string
  available: boolean
  categoryId: string
  imagePublicId?: string
}
export interface RestaurantTable extends Base {
  number: number
  qrToken: string
  status: 'AVAILABLE' | 'RESERVED'
}
export interface TicketItem {
  _id: string
  ticketId: string
  productId: string
  productName: string
  quantity: number
  unitPrice: number
  subtotal: number
  note?: string
}
export interface Ticket extends Base {
  ticketNumber: string
  tableId: string
  status: TicketStatus
  total: number
  items: TicketItem[]
  paymentMethod?: PaymentMethod
  paidAt?: string
  closedAt?: string
}
export interface Stats {
  salesTotal: number
  ticketsCount: number
  avgTicket: number
  openTickets: number
  tablesOccupied: number
  salesByDay: { date: string; total: number }[]
  topProducts: { productName: string; quantity: number }[]
}
export interface List<T> {
  data: T[]
  meta: { page: number; limit: number; total: number }
}
export interface ApiError {
  statusCode: number
  code: string
  message: string
  details: unknown[]
}
export type Resource = 'users' | 'categories' | 'products' | 'tables'
export type Entity = User | Category | Product | RestaurantTable
