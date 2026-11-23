import { ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Role, TableStatus, TicketStatus } from '../common/enums';
import { AppException } from '../common/errors';
import { toTnd } from '../common/money';
import { Table, TableDocument } from '../tables/table.schema';
import { Ticket, TicketDocument, TicketItem, TicketItemDocument } from '../tickets/tickets.schemas';

const TZ = 'Africa/Tunis';
const TUNIS_OFFSET = '+01:00'; // Tunisia has no DST (UTC+1 all year)

@Injectable()
export class DashboardService {
  constructor(
    @InjectModel(Ticket.name) private readonly tickets: Model<TicketDocument>,
    @InjectModel(TicketItem.name) private readonly items: Model<TicketItemDocument>,
    @InjectModel(Table.name) private readonly tables: Model<TableDocument>,
    private readonly config: ConfigService,
  ) {}

  assertAllowed(role: Role): void {
    if (role === Role.ADMIN) return;
    const extra = this.config.get<string>('DASHBOARD_EXTRA_ROLES', '').split(',').map((s) => s.trim());
    if (!extra.includes(role)) throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Insufficient permissions', details: [] });
  }

  private range(from?: string, to?: string): { start: Date; end: Date } {
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date());
    const start = new Date(`${from ?? today}T00:00:00${TUNIS_OFFSET}`);
    const lastDay = new Date(`${to ?? today}T00:00:00${TUNIS_OFFSET}`);
    if (isNaN(start.getTime()) || isNaN(lastDay.getTime())) {
      throw new AppException(400, 'VALIDATION_ERROR', 'from/to must be valid YYYY-MM-DD dates');
    }
    if (lastDay < start) throw new AppException(400, 'VALIDATION_ERROR', '"to" must be >= "from"');
    return { start, end: new Date(lastDay.getTime() + 86_400_000) }; // `to` inclusive
  }

  async stats(from?: string, to?: string) {
    const { start, end } = this.range(from, to);
    const match = { status: { $in: [TicketStatus.PAID, TicketStatus.CLOSED] }, paidAt: { $gte: start, $lt: end } };

    const [totals] = await this.tickets.aggregate<{ sales: number; count: number }>([
      { $match: match },
      { $group: { _id: null, sales: { $sum: '$total' }, count: { $sum: 1 } } },
    ]);
    const byDay = await this.tickets.aggregate<{ _id: string; sales: number; count: number }>([
      { $match: match },
      { $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$paidAt', timezone: TZ } },
        sales: { $sum: '$total' }, count: { $sum: 1 },
      } },
      { $sort: { _id: 1 } },
    ]);
    const ids = (await this.tickets.find(match).select('_id')).map((t) => t._id);
    const top = await this.items.aggregate<{ _id: unknown; name: string; quantity: number; revenue: number }>([
      { $match: { ticketId: { $in: ids } } },
      { $group: { _id: '$productId', name: { $last: '$productName' }, quantity: { $sum: '$quantity' }, revenue: { $sum: '$subtotal' } } },
      { $sort: { quantity: -1, revenue: -1 } },
      { $limit: 5 },
    ]);
    const [openTickets, tablesOccupied] = await Promise.all([
      this.tickets.countDocuments({ status: TicketStatus.OPEN }),
      this.tables.countDocuments({ status: TableStatus.RESERVED }),
    ]);

    const sales = totals?.sales ?? 0;
    const count = totals?.count ?? 0;
    return {
      salesTotal: toTnd(sales),
      ticketsCount: count,
      avgTicket: count ? toTnd(Math.round(sales / count)) : 0,
      topProducts: top.map((p) => ({
        productId: String(p._id), productName: p.name, quantity: p.quantity, revenue: toTnd(p.revenue),
      })),
      salesByDay: byDay.map((d) => ({ date: d._id, sales: toTnd(d.sales), ticketsCount: d.count })),
      openTickets,
      tablesOccupied,
    };
  }
}
