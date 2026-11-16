import { PaymentMethod, TicketStatus } from '../common/enums';
import { toTnd } from '../common/money';
import { TicketDocument, TicketItemDocument } from './tickets.schemas';

export interface ItemView {
  _id: string; ticketId: string; productId: string; productName: string; quantity: number;
  unitPrice: number; subtotal: number; note: string | null; addedByDevice: string | null;
  createdAt: Date; updatedAt: Date;
}
export interface TicketView {
  _id: string; ticketNumber: string; tableId: string; userId: string | null; status: TicketStatus;
  total: number; paymentMethod: PaymentMethod | null; paidAt: Date | null; closedAt: Date | null;
  items: ItemView[]; createdAt: Date; updatedAt: Date;
}

export const itemView = (i: TicketItemDocument): ItemView => ({
  _id: i.id as string,
  ticketId: i.ticketId.toString(),
  productId: i.productId.toString(),
  productName: i.productName,
  quantity: i.quantity,
  unitPrice: toTnd(i.unitPrice),
  subtotal: toTnd(i.subtotal),
  note: i.note || null,
  addedByDevice: i.addedByDevice ?? null,
  createdAt: i.createdAt,
  updatedAt: i.updatedAt,
});

export const ticketView = (t: TicketDocument, items: TicketItemDocument[] = []): TicketView => ({
  _id: t.id as string,
  ticketNumber: t.ticketNumber,
  tableId: t.tableId.toString(),
  userId: t.userId ? t.userId.toString() : null,
  status: t.status,
  total: toTnd(t.total),
  paymentMethod: t.paymentMethod ?? null,
  paidAt: t.paidAt ?? null,
  closedAt: t.closedAt ?? null,
  items: items.map(itemView),
  createdAt: t.createdAt,
  updatedAt: t.updatedAt,
});
