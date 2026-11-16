import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as QRCode from 'qrcode';
import PDFDocument from 'pdfkit';
import { AuthUser } from '../common/auth-user';
import { TableStatus, TicketStatus } from '../common/enums';
import { AppException, duplicateField, notFound } from '../common/errors';
import { Paginated, PaginationQueryDto, skipOf } from '../common/pagination';
import { newQrToken } from '../common/token';
import { AuditService } from '../audit/audit.service';
import { LiveGateway } from '../realtime/live.gateway';
import { Ticket, TicketDocument } from '../tickets/tickets.schemas';
import { Table, TableDocument } from './table.schema';

@Injectable()
export class TablesService {
  constructor(
    @InjectModel(Table.name) private readonly tables: Model<TableDocument>,
    @InjectModel(Ticket.name) private readonly tickets: Model<TicketDocument>,
    private readonly live: LiveGateway,
    private readonly audit: AuditService,
  ) {}

  async list(q: PaginationQueryDto): Promise<Paginated<TableDocument>> {
    const [data, total] = await Promise.all([
      this.tables.find().sort({ number: 1 }).skip(skipOf(q)).limit(q.limit),
      this.tables.countDocuments(),
    ]);
    return { data, meta: { page: q.page, limit: q.limit, total } };
  }

  async findOne(id: string): Promise<TableDocument> {
    const t = await this.tables.findById(id);
    if (!t) throw notFound('Table');
    return t;
  }

  async create(number: number): Promise<TableDocument> {
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const t = await this.tables.create({ number, qrToken: newQrToken(), status: TableStatus.AVAILABLE });
        this.live.emit('table.updated', t.toJSON());
        return t;
      } catch (e) {
        const field = duplicateField(e);
        if (field === 'number') throw new AppException(409, 'VALIDATION_ERROR', 'Table number already exists', ['number']);
        if (field === 'qrToken') continue; // collision: retry with a new token
        throw e;
      }
    }
    throw new AppException(500, 'INTERNAL_ERROR', 'Could not generate a unique QR token');
  }

  async update(id: string, number?: number): Promise<TableDocument> {
    const t = await this.findOne(id);
    if (number !== undefined) t.number = number;
    try {
      await t.save();
    } catch (e) {
      if (duplicateField(e)) throw new AppException(409, 'VALIDATION_ERROR', 'Table number already exists', ['number']);
      throw e;
    }
    this.live.emit('table.updated', t.toJSON(), t.qrToken);
    return t;
  }

  async remove(id: string): Promise<void> {
    const t = await this.findOne(id);
    await this.assertNoOpenTicket(t);
    await t.deleteOne();
  }

  async regenerateQr(id: string, force: boolean, user: AuthUser): Promise<TableDocument> {
    const t = await this.findOne(id);
    if (!force) await this.assertNoOpenTicket(t);
    const oldToken = t.qrToken;
    for (let attempt = 0; attempt < 5; attempt++) {
      t.qrToken = newQrToken();
      try {
        await t.save();
        await this.audit.log({
          userId: user.id, action: 'table.regenerate-qr', entity: 'table', entityId: t.id, meta: { force },
        });
        this.live.emit('table.updated', t.toJSON(), oldToken);
        this.live.emit('table.updated', t.toJSON(), t.qrToken);
        return t;
      } catch (e) {
        if (duplicateField(e) !== 'qrToken') throw e;
      }
    }
    throw new AppException(500, 'INTERNAL_ERROR', 'Could not generate a unique QR token');
  }

  private async assertNoOpenTicket(t: TableDocument): Promise<void> {
    if (await this.tickets.exists({ tableId: t._id, status: TicketStatus.OPEN })) {
      throw new AppException(409, 'TABLE_HAS_OPEN_TICKET', 'Table has an open ticket');
    }
  }

  // ---------- QR ----------
  static validateBaseUrl(raw: string | undefined): string {
    if (!raw) throw new AppException(400, 'VALIDATION_ERROR', 'baseUrl is required');
    let url: URL;
    try { url = new URL(raw); } catch {
      throw new AppException(400, 'VALIDATION_ERROR', 'baseUrl must be a valid http(s) URL');
    }
    if (!['http:', 'https:'].includes(url.protocol)) {
      throw new AppException(400, 'VALIDATION_ERROR', 'baseUrl must be http(s)');
    }
    if (/localhost|127\.0\.0\.1/i.test(raw)) {
      throw new AppException(
        400, 'VALIDATION_ERROR',
        'baseUrl cannot contain localhost or 127.0.0.1: phones cannot reach it. Use the PC LAN IP (e.g. http://192.168.1.20:5173) or your public domain.',
      );
    }
    return raw.replace(/\/+$/, '');
  }

  private qrBuffer(baseUrl: string, qrToken: string, width = 600): Promise<Buffer> {
    return QRCode.toBuffer(`${baseUrl}/table/${qrToken}`, { width, margin: 2, errorCorrectionLevel: 'M' });
  }

  async qrPng(id: string, baseUrlRaw: string | undefined): Promise<Buffer> {
    const baseUrl = TablesService.validateBaseUrl(baseUrlRaw);
    const t = await this.findOne(id);
    return this.qrBuffer(baseUrl, t.qrToken);
  }

  async qrSheetPdf(baseUrlRaw: string | undefined): Promise<Buffer> {
    const baseUrl = TablesService.validateBaseUrl(baseUrlRaw);
    const all = await this.tables.find().sort({ number: 1 });
    const doc = new PDFDocument({ size: 'A4', margin: 36 });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    const done = new Promise<Buffer>((resolve) => doc.on('end', () => resolve(Buffer.concat(chunks))));
    for (let i = 0; i < all.length; i++) {
      if (i > 0 && i % 6 === 0) doc.addPage();
      const pos = i % 6;
      const x = 36 + (pos % 2) * 270;
      const y = 36 + Math.floor(pos / 2) * 250;
      doc.image(await this.qrBuffer(baseUrl, all[i].qrToken, 500), x + 20, y, { width: 200 });
      doc.fontSize(18).text(`Table ${all[i].number}`, x, y + 210, { width: 240, align: 'center' });
    }
    if (all.length === 0) doc.fontSize(14).text('No tables');
    doc.end();
    return done;
  }
}
