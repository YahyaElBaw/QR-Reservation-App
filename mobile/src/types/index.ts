export type Role = 'ADMIN' | 'CAISSIER' | 'CONTOIRISTE';
export type TableStatus = 'AVAILABLE' | 'RESERVED';
export type TicketStatus = 'OPEN' | 'PAID' | 'CLOSED';
export type PaymentMethod = 'CASH' | 'CARD' | 'OTHER';

export interface BaseEntity {
  _id: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface User extends BaseEntity {
  name: string;
  username: string;
  role: Role;
  active: boolean;
}

export interface Category extends BaseEntity {
  name: string;
  description: string;
  sortOrder: number;
}

export interface Product extends BaseEntity {
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  imagePublicId?: string;
  available: boolean;
  categoryId: string;
}

export interface RestaurantTable extends BaseEntity {
  number: number;
  qrToken: string;
  status: TableStatus;
}

export interface TicketItem {
  _id: string;
  ticketId: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  note?: string;
  addedByDevice?: string;
}

export interface Ticket extends BaseEntity {
  ticketNumber: string;
  tableId: string;
  status: TicketStatus;
  total: number;
  items: TicketItem[];
  userId?: string;
  paymentMethod?: PaymentMethod;
  paidAt?: string;
  closedAt?: string;
}

export interface Stats {
  salesTotal: number;
  ticketsCount: number;
  avgTicket: number;
  openTickets: number;
  tablesOccupied: number;
  salesByDay: { date: string; total: number }[];
  topProducts: { productName: string; quantity: number }[];
}

export interface PaginatedList<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
  };
}

export interface ApiError {
  statusCode: number;
  code: string;
  message: string;
  details?: unknown[];
}

export interface CartItem {
  product: Product;
  quantity: number;
  note?: string;
}
