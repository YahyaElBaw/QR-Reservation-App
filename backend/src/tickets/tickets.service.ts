import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AuthUser } from '../common/auth-user';
import { PaymentMethod, TableStatus, TicketStatus } from '../common/enums';
import { AppException, duplicateField, notFound } from '../common/errors';
import { Paginated } from '../common/pagination';
import { AuditService } from '../audit/audit.service';
import { Product, ProductDocument } from '../products/product.schema';
import { LiveEvent, LiveGateway } from '../realtime/live.gateway';
import { Table, TableDocument } from '../tables/table.schema';
import { ticketView, TicketView } from './ticket.mapper';
import { CreateOrderDto, ListTicketsQuery, OrderItemDto } from './tickets.dto';
import {
  Counter, CounterDocument, Ticket, TicketDocument, TicketItem, TicketItemDocument,
} from './tickets.schemas';

interface Line { productId: Types.ObjectId; productName: string; unitPrice: number; quantity: number; note: string }

/**
 * MERGE POLICY (documented choice): a new line is merged into an existing line of the same ticket when
 * productId + note + unitPrice are identical and the merged quantity stays <= 99. Otherwise a new line
 * is created. Merging keeps the first line's addedByDevice.
 */
@Injectable()
export class TicketsService {
  private readonly logger = new Logger(TicketsService.name);

  constructor(
    @InjectModel(Ticket.name) private readonly tickets: Model<TicketDocument>,
    @InjectModel(TicketItem.name) private readonly items: Model<TicketItemDocument>,
    @InjectModel(Table.name) private readonly tables: Model<TableDocument>,
    @InjectModel(Product.name) private readonly products: Model<ProductDocument>,
    @InjectModel(Counter.name) private readonly counters: Model<CounterDocument>,
    private readonly live: LiveGateway,
    private readonly audit: AuditService,
  ) {}

  // ------------------------------------------------------------ reads
  async getView(id: string): Promise<TicketView> {
    const t = await this.tickets.findById(id);
    if (!t) throw notFound('Ticket');
    const items = await this.items.find({ ticketId: t._id }).sort({ createdAt: 1, _id: 1 });
    return ticketView(t, items);
  }

  async list(q: ListTicketsQuery): Promise<Paginated<TicketView>> {
    const f: Record<string, unknown> = {};
    if (q.status) f.status = q.status;
    if (q.tableId) f.tableId = new Types.ObjectId(q.tableId);
    const [docs, total] = await Promise.all([
      this.tickets.find(f).sort({ createdAt: -1 }).skip((q.page - 1) * q.limit).limit(q.limit),
      this.tickets.countDocuments(f),
    ]);
    return { data: docs.map((t) => ticketView(t)), meta: { page: q.page, limit: q.limit, total } };
  }

  private async tableByQr(rawToken: string): Promise<TableDocument> {
    const token = (rawToken || '').trim();
    let t = await this.tables.findOne({
      $or: [{ qrToken: token }, { qrToken: { $regex: new RegExp(`^${token}$`, 'i') } }],
    });
    if (!t) {
      const match = token.match(/\d+/);
      if (match) {
        const num = parseInt(match[0], 10);
        t = await this.tables.findOne({ number: num });
      }
    }
    if (!t) throw new AppException(404, 'QR_INVALID', 'Invalid or revoked QR code');
    return t;
  }

  async activeTicketOfTable(table: TableDocument): Promise<TicketView | null> {
    const t = await this.tickets.findOne({ tableId: table._id, status: TicketStatus.OPEN });
    return t ? this.getView(t.id as string) : null;
  }

  async publicTable(qrToken: string, clientIp?: string, deviceId?: string) {
    const table = await this.tableByQr(qrToken);
    const activeTicket = await this.activeTicketOfTable(table);
    const hasLock = Boolean(activeTicket?.clientIp);
    const isOwner = !hasLock || (
      (activeTicket?.clientIp && clientIp && activeTicket.clientIp === clientIp) ||
      (activeTicket?.clientDeviceId && deviceId && activeTicket.clientDeviceId === deviceId)
    );
    return {
      table: { number: table.number, status: table.status, qrToken: table.qrToken },
      activeTicket,
      isOwner,
      lockedToOtherDevice: !isOwner,
    };
  }

  async publicTicket(qrToken: string, _clientIp?: string): Promise<TicketView | null> {
    return this.activeTicketOfTable(await this.tableByQr(qrToken));
  }

  // ------------------------------------------------------------ public order (core)
  async placeOrder(qrToken: string, dto: CreateOrderDto, clientIp?: string): Promise<TicketView> {
    const table = await this.tableByQr(qrToken);
    const lines = await this.resolveLines(dto.items);
    const { ticket, created } = await this.openTicketFor(table, clientIp, dto.deviceId);
    await this.assertOpen(ticket._id);
    await this.appendLines(ticket._id, lines, dto.deviceId);
    await this.recompute(ticket._id);
    const view = await this.getView(ticket.id as string);
    if (created) {
      const fresh = await this.tables.findById(table._id);
      this.live.emit('ticket.created', view, qrToken);
      if (fresh) this.live.emit('table.updated', fresh.toJSON(), qrToken);
    } else {
      this.live.emit('ticket.updated', view, qrToken);
    }
    return view;
  }

  /**
   * Atomic "get or create the OPEN ticket": the partial unique index guarantees a single winner;
   * losers catch E11000 and re-read the winner's ticket.
   */
  private async openTicketFor(
    table: TableDocument,
    clientIp?: string,
    deviceId?: string,
  ): Promise<{ ticket: TicketDocument; created: boolean }> {
    const existing = await this.tickets.findOne({ tableId: table._id, status: TicketStatus.OPEN });
    if (existing) {
      const hasIpLock = Boolean(existing.clientIp);
      const isSameIp = !existing.clientIp || !clientIp || existing.clientIp === clientIp;
      const isSameDevice = !existing.clientDeviceId || !deviceId || existing.clientDeviceId === deviceId;
      if (hasIpLock && !isSameIp && !isSameDevice) {
        throw new AppException(
          403,
          'TABLE_OCCUPIED_BY_ANOTHER_CLIENT',
          'Cette table est déjà réservée par un autre client. Seul le téléphone ayant ouvert la session peut modifier ou ajouter des articles jusqu\'à la libération de la table.',
        );
      }
      return { ticket: existing, created: false };
    }
    const paid = await this.tickets.findOne({ tableId: table._id, status: TicketStatus.PAID });
    if (paid) throw new AppException(409, 'TICKET_NOT_OPEN', 'Ticket is paid and awaiting closure');
    try {
      const ticket = await this.tickets.create({
        ticketNumber: await this.nextTicketNumber(),
        tableId: table._id,
        status: TicketStatus.OPEN,
        total: 0,
        clientIp: clientIp || undefined,
        clientDeviceId: deviceId || undefined,
      });
      await this.tables.updateOne({ _id: table._id }, { status: TableStatus.RESERVED });
      return { ticket, created: true };
    } catch (e) {
      if (duplicateField(e) === 'tableId' || duplicateField(e) === 'unknown') {
        const winner = await this.tickets.findOne({ tableId: table._id, status: TicketStatus.OPEN });
        if (winner) {
          const hasIpLock = Boolean(winner.clientIp);
          const isSameIp = !winner.clientIp || !clientIp || winner.clientIp === clientIp;
          const isSameDevice = !winner.clientDeviceId || !deviceId || winner.clientDeviceId === deviceId;
          if (hasIpLock && !isSameIp && !isSameDevice) {
            throw new AppException(
              403,
              'TABLE_OCCUPIED_BY_ANOTHER_CLIENT',
              'Cette table est déjà réservée par un autre client.',
            );
          }
          return { ticket: winner, created: false };
        }
      }
      throw e;
    }
  }

  /** Sequential, atomic. A lost race may burn a number (gaps are possible, duplicates are not). */
  private async nextTicketNumber(): Promise<string> {
    const c = await this.counters.findOneAndUpdate(
      { _id: 'ticket' }, { $inc: { seq: 1 } }, { upsert: true, new: true },
    );
    return String(c.seq).padStart(6, '0');
  }

  /** Loads products from DB (never trusts client prices), rejects missing/deleted/unavailable. */
  private async resolveLines(input: OrderItemDto[]): Promise<Line[]> {
    const ids = [...new Set(input.map((i) => i.productId))];
    const docs = await this.products.find({ _id: { $in: ids }, deletedAt: null });
    const byId = new Map(docs.map((p) => [p.id as string, p]));
    const bad = ids.filter((id) => !byId.get(id)?.available);
    if (bad.length > 0) {
      throw new AppException(409, 'PRODUCT_UNAVAILABLE', 'Some products are unavailable', bad);
    }
    return input.map((i) => {
      const p = byId.get(i.productId) as ProductDocument;
      return {
        productId: p._id, productName: p.name, unitPrice: p.price, quantity: i.quantity, note: i.note?.trim() ?? '',
      };
    });
  }

  private async appendLines(ticketId: Types.ObjectId, lines: Line[], deviceId?: string): Promise<void> {
    for (const l of lines) {
      const merged = await this.items.findOneAndUpdate(
        {
          ticketId, productId: l.productId, unitPrice: l.unitPrice, note: l.note,
          quantity: { $lte: 99 - l.quantity },
        },
        [{
          $set: {
            quantity: { $add: ['$quantity', l.quantity] },
            subtotal: { $multiply: [{ $add: ['$quantity', l.quantity] }, '$unitPrice'] },
          },
        }],
        { new: true },
      );
      if (!merged) {
        await this.items.create({
          ticketId, productId: l.productId, productName: l.productName, quantity: l.quantity,
          unitPrice: l.unitPrice, subtotal: l.unitPrice * l.quantity, note: l.note, addedByDevice: deviceId,
        });
      }
    }
  }

  /** total = sum(subtotals), always recomputed server side. */
  private async recompute(ticketId: Types.ObjectId): Promise<void> {
    const [agg] = await this.items.aggregate<{ total: number }>([
      { $match: { ticketId } },
      { $group: { _id: null, total: { $sum: '$subtotal' } } },
    ]);
    await this.tickets.updateOne({ _id: ticketId }, { total: agg?.total ?? 0 });
  }

  private async assertOpen(id: Types.ObjectId | string): Promise<void> {
    if (!(await this.tickets.exists({ _id: id, status: TicketStatus.OPEN }))) {
      throw new AppException(409, 'TICKET_NOT_OPEN', 'Ticket is not open');
    }
  }

  private async requireOpen(id: string): Promise<TicketDocument> {
    const t = await this.tickets.findById(id);
    if (!t) throw notFound('Ticket');
    if (t.status !== TicketStatus.OPEN) throw new AppException(409, 'TICKET_NOT_OPEN', 'Ticket is not open');
    return t;
  }

  private async publish(event: LiveEvent, ticketId: Types.ObjectId | string): Promise<TicketView> {
    const view = await this.getView(String(ticketId));
    const table = await this.tables.findById(view.tableId);
    this.live.emit(event, view, table?.qrToken);
    return view;
  }

  // ------------------------------------------------------------ staff item operations
  async addItem(ticketId: string, dto: OrderItemDto, user: AuthUser): Promise<TicketView> {
    const t = await this.requireOpen(ticketId);
    const lines = await this.resolveLines([dto]);
    await this.appendLines(t._id, lines);
    await this.recompute(t._id);
    await this.audit.log({
      userId: user.id, action: 'ticket.item.add', entity: 'ticket', entityId: ticketId,
      meta: { productId: dto.productId, quantity: dto.quantity },
    });
    return this.publish('ticket.updated', t._id);
  }

  private async itemOf(ticket: TicketDocument, itemId: string): Promise<TicketItemDocument> {
    const item = await this.items.findById(itemId);
    if (!item) throw notFound('Ticket item');
    if (!item.ticketId.equals(ticket._id)) {
      throw new AppException(409, 'TICKET_TABLE_MISMATCH', 'Item does not belong to this ticket');
    }
    return item;
  }

  async updateItem(ticketId: string, itemId: string, quantity: number, user: AuthUser): Promise<TicketView> {
    const t = await this.requireOpen(ticketId);
    const item = await this.itemOf(t, itemId);
    const before = item.quantity;
    item.quantity = quantity;
    item.subtotal = item.unitPrice * quantity;
    await item.save();
    await this.recompute(t._id);
    await this.audit.log({
      userId: user.id, action: 'ticket.item.update', entity: 'ticket', entityId: ticketId,
      meta: { itemId, before, after: quantity },
    });
    return this.publish('ticket.updated', t._id);
  }

  /** Removing the last item keeps the ticket OPEN with total 0. */
  async removeItem(ticketId: string, itemId: string, user: AuthUser): Promise<TicketView> {
    const t = await this.requireOpen(ticketId);
    const item = await this.itemOf(t, itemId);
    await item.deleteOne();
    await this.recompute(t._id);
    await this.audit.log({
      userId: user.id, action: 'ticket.item.remove', entity: 'ticket', entityId: ticketId,
      meta: { itemId, productName: item.productName, quantity: item.quantity },
    });
    return this.publish('ticket.updated', t._id);
  }

  // ------------------------------------------------------------ payment & closing
  async pay(id: string, method: PaymentMethod, user: AuthUser): Promise<TicketView> {
    const t = await this.tickets.findOneAndUpdate(
      { _id: id, status: TicketStatus.OPEN, total: { $gt: 0 } },
      { status: TicketStatus.PAID, paidAt: new Date(), userId: new Types.ObjectId(user.id), paymentMethod: method },
      { new: true },
    );
    if (!t) {
      const existing = await this.tickets.findById(id);
      if (!existing) throw notFound('Ticket');
      if (existing.status !== TicketStatus.OPEN) throw new AppException(409, 'TICKET_NOT_OPEN', 'Ticket is not open');
      throw new AppException(400, 'VALIDATION_ERROR', 'Cannot pay an empty ticket');
    }
    await this.audit.log({
      userId: user.id, action: 'ticket.pay', entity: 'ticket', entityId: id, meta: { method, total: t.total },
    });
    return this.publish('ticket.updated', t._id);
  }

  async close(id: string, user: AuthUser): Promise<TicketView> {
    const t = await this.tickets.findOneAndUpdate(
      { _id: id, status: TicketStatus.PAID },
      { status: TicketStatus.CLOSED, closedAt: new Date() },
      { new: true },
    );
    if (!t) {
      const existing = await this.tickets.findById(id);
      if (!existing) throw notFound('Ticket');
      throw new AppException(409, 'TICKET_NOT_OPEN', `Ticket must be PAID to be closed (current: ${existing.status})`);
    }
    const table = await this.tables.findByIdAndUpdate(t.tableId, { status: TableStatus.AVAILABLE }, { new: true });
    await this.audit.log({ userId: user.id, action: 'ticket.close', entity: 'ticket', entityId: id });
    const view = await this.getView(id);
    this.live.emit('ticket.closed', view, table?.qrToken);
    if (table) this.live.emit('table.updated', table.toJSON(), table.qrToken);
    return view;
  }

  async payAndClose(id: string, method: PaymentMethod, user: AuthUser): Promise<TicketView> {
    await this.pay(id, method, user);
    return this.close(id, user);
  }
}

