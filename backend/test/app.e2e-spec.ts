import { NestExpressApplication } from '@nestjs/platform-express';
import { getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcryptjs';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Model } from 'mongoose';
import request from 'supertest';
import { configureApp } from '../src/app.setup';
import { Role } from '../src/common/enums';
import { Ticket, TicketDocument } from '../src/tickets/tickets.schemas';
import { User, UserDocument } from '../src/users/user.schema';

describe('QR ordering E2E', () => {
  let mongo: MongoMemoryServer;
  let app: NestExpressApplication;
  let http: ReturnType<NestExpressApplication['getHttpServer']>;
  let admin = '';
  let tableId = '';
  let qrToken = '';
  let productId = '';
  let ticketModel: Model<TicketDocument>;
  const auth = (t: string) => ({ Authorization: `Bearer ${t}` });
  const dev = (n: number) => `device-${n}-abcdefgh`;
  const order = (qty = 1, device = 1, pid = productId) =>
    request(http).post(`/api/v1/public/tables/${qrToken}/orders`)
      .send({ deviceId: dev(device), items: [{ productId: pid, quantity: qty }] });

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    Object.assign(process.env, {
      NODE_ENV: 'test', MONGO_URI: mongo.getUri('qr_e2e'), JWT_SECRET: 'e2e-secret-e2e-secret',
      CLOUDINARY_CLOUD_NAME: 'x', CLOUDINARY_API_KEY: 'x', CLOUDINARY_API_SECRET: 'x',
      CLIENT_BASE_URL: 'http://localhost:5173',
    });
    const { AppModule } = await import('../src/app.module');
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication<NestExpressApplication>({ bodyParser: false });
    configureApp(app);
    await app.init();
    http = app.getHttpServer();

    ticketModel = app.get(getModelToken(Ticket.name));
    await ticketModel.init(); // build the partial unique index before concurrency tests
    const users = app.get<Model<UserDocument>>(getModelToken(User.name));
    await users.create({ name: 'A', username: 'admin', role: Role.ADMIN, passwordHash: await bcrypt.hash('Admin123!', 4) });
    const cashier = { name: 'C', username: 'caissier', password: 'Caissier123!', role: Role.CAISSIER };
    admin = (await request(http).post('/api/v1/auth/login').send({ username: 'admin', password: 'Admin123!' })).body.accessToken;
    await request(http).post('/api/v1/users').set(auth(admin)).send(cashier).expect(201);

    const table = await request(http).post('/api/v1/tables').set(auth(admin)).send({ number: 1 }).expect(201);
    tableId = table.body._id; qrToken = table.body.qrToken;
    const cat = await request(http).post('/api/v1/categories').set(auth(admin)).send({ name: 'Boissons' }).expect(201);
    const prod = await request(http).post('/api/v1/products').set(auth(admin))
      .send({ name: 'Café', price: 2.5, categoryId: cat.body._id }).expect(201);
    productId = prod.body._id;
  });

  afterAll(async () => { await app?.close(); await mongo?.stop(); });

  it('unknown token -> 404 QR_INVALID', async () => {
    const res = await request(http).get('/api/v1/public/tables/TBL-NOPE1234').expect(404);
    expect(res.body.code).toBe('QR_INVALID');
  });

  it('scan: table AVAILABLE, no active ticket', async () => {
    const res = await request(http).get(`/api/v1/public/tables/${qrToken}`).expect(200);
    expect(res.body.table.status).toBe('AVAILABLE');
    expect(res.body.activeTicket).toBeNull();
  });

  it('rejects validation errors with the standard format', async () => {
    const res = await request(http).post(`/api/v1/public/tables/${qrToken}/orders`)
      .send({ deviceId: 'short', items: [], hack: 1 }).expect(400);
    expect(res.body).toMatchObject({ statusCode: 400, code: 'VALIDATION_ERROR' });
    expect(res.body.details.length).toBeGreaterThan(0);
  });

  it('first order creates ticket and reserves table; client price is ignored', async () => {
    const res = await request(http).post(`/api/v1/public/tables/${qrToken}/orders`)
      .send({ deviceId: dev(1), items: [{ productId, quantity: 2, unitPrice: 0.001 }] });
    expect(res.status).toBe(400); // unknown field is rejected (forbidNonWhitelisted)
    const ok = await order(2, 1).expect(201);
    expect(ok.body.status).toBe('OPEN');
    expect(ok.body.total).toBe(5);
    expect(ok.body.items[0].unitPrice).toBe(2.5);
    const t = await request(http).get(`/api/v1/public/tables/${qrToken}`).expect(200);
    expect(t.body.table.status).toBe('RESERVED');
  });

  it('second phone appends to the SAME ticket', async () => {
    const first = (await request(http).get(`/api/v1/public/tables/${qrToken}/ticket`)).body;
    const res = await order(1, 2).expect(201);
    expect(res.body._id).toBe(first._id);
    expect(res.body.total).toBe(7.5);
  });

  it('10 parallel orders on a fresh table -> ONE ticket', async () => {
    const t2 = await request(http).post('/api/v1/tables').set(auth(admin)).send({ number: 2 }).expect(201);
    const results = await Promise.all(Array.from({ length: 10 }, (_, i) =>
      request(http).post(`/api/v1/public/tables/${t2.body.qrToken}/orders`)
        .send({ deviceId: dev(i), items: [{ productId, quantity: 1 }] })));
    results.forEach((r) => expect(r.status).toBe(201));
    expect(new Set(results.map((r) => r.body._id)).size).toBe(1);
    expect(await ticketModel.countDocuments({ tableId: t2.body._id })).toBe(1);
    const final = (await request(http).get(`/api/v1/public/tables/${t2.body.qrToken}/ticket`)).body;
    const sum = final.items.reduce((s: number, i: { subtotal: number }) => s + i.subtotal, 0);
    expect(final.total).toBeCloseTo(sum, 3);
    expect(final.total).toBe(25);
  });

  it('unavailable product -> 409 PRODUCT_UNAVAILABLE with ids in details', async () => {
    const cat = (await request(http).get('/api/v1/public/categories')).body.data[0]._id;
    const p2 = (await request(http).post('/api/v1/products').set(auth(admin))
      .send({ name: 'Gâteau', price: 4, categoryId: cat, available: false }).expect(201)).body._id;
    const res = await order(1, 1, p2).expect(409);
    expect(res.body.code).toBe('PRODUCT_UNAVAILABLE');
    expect(res.body.details).toEqual([p2]);
  });

  it('price change does not alter old lines', async () => {
    await request(http).patch(`/api/v1/products/${productId}`).set(auth(admin)).send({ price: 9 }).expect(200);
    const t = (await request(http).get(`/api/v1/public/tables/${qrToken}/ticket`)).body;
    expect(t.items[0].unitPrice).toBe(2.5);
    expect(t.total).toBe(7.5);
    await request(http).patch(`/api/v1/products/${productId}`).set(auth(admin)).send({ price: 2.5 }).expect(200);
  });

  it('staff edits: quantity, remove, TICKET_TABLE_MISMATCH, permissions', async () => {
    const login = await request(http).post('/api/v1/auth/login').send({ username: 'caissier', password: 'Caissier123!' });
    const cashier = login.body.accessToken;
    const ticket = (await request(http).get(`/api/v1/public/tables/${qrToken}/ticket`)).body;
    // cashier cannot edit items
    await request(http).patch(`/api/v1/tickets/${ticket._id}/items/${ticket.items[0]._id}`)
      .set(auth(cashier)).send({ quantity: 1 }).expect(403);
    const upd = await request(http).patch(`/api/v1/tickets/${ticket._id}/items/${ticket.items[0]._id}`)
      .set(auth(admin)).send({ quantity: 4 }).expect(200);
    expect(upd.body.total).toBe(10);
    // item from another ticket -> mismatch
    const other = (await request(http).get('/api/v1/tickets?status=OPEN').set(auth(admin))).body.data
      .find((t: { _id: string }) => t._id !== ticket._id);
    const otherFull = (await request(http).get(`/api/v1/tickets/${other._id}`).set(auth(admin))).body;
    const res = await request(http).delete(`/api/v1/tickets/${ticket._id}/items/${otherFull.items[0]._id}`)
      .set(auth(admin)).expect(409);
    expect(res.body.code).toBe('TICKET_TABLE_MISMATCH');
    // unauthenticated staff route
    await request(http).get('/api/v1/tickets').expect(401);
  });

  it('full cycle: pay -> close -> table AVAILABLE -> new scan opens a NEW ticket; closed refuses additions', async () => {
    const cashier = (await request(http).post('/api/v1/auth/login')
      .send({ username: 'caissier', password: 'Caissier123!' })).body.accessToken;
    const ticket = (await request(http).get(`/api/v1/public/tables/${qrToken}/ticket`)).body;

    await request(http).post(`/api/v1/tickets/${ticket._id}/close`).set(auth(cashier)).expect(409); // must be PAID
    const paid = await request(http).post(`/api/v1/tickets/${ticket._id}/pay`).set(auth(cashier))
      .send({ method: 'CASH' }).expect(200);
    expect(paid.body.status).toBe('PAID');
    await order(1, 3).expect(409); // frozen
    await request(http).post(`/api/v1/tickets/${ticket._id}/items`).set(auth(admin))
      .send({ productId, quantity: 1 }).expect(409);
    await request(http).post(`/api/v1/tickets/${ticket._id}/pay`).set(auth(cashier)).send({ method: 'CASH' }).expect(409);

    const closed = await request(http).post(`/api/v1/tickets/${ticket._id}/close`).set(auth(cashier)).expect(200);
    expect(closed.body.status).toBe('CLOSED');
    const scan = await request(http).get(`/api/v1/public/tables/${qrToken}`).expect(200);
    expect(scan.body.table.status).toBe('AVAILABLE');
    expect(scan.body.activeTicket).toBeNull();

    const fresh = await order(1, 4).expect(201);
    expect(fresh.body._id).not.toBe(ticket._id);
    expect(fresh.body.ticketNumber).not.toBe(ticket.ticketNumber);

    const stats = await request(http).get('/api/v1/dashboard/stats').set(auth(admin)).expect(200);
    expect(stats.body.salesTotal).toBe(10);
    expect(stats.body.ticketsCount).toBe(1);
    expect(stats.body.topProducts[0].quantity).toBe(4);
    expect(stats.body.openTickets).toBe(2);
    await request(http).get('/api/v1/dashboard/stats').set(auth(cashier)).expect(403);
  });

  it('QR png rejects localhost and regenerate invalidates the old token', async () => {
    const bad = await request(http).get(`/api/v1/tables/${tableId}/qr.png?baseUrl=http://localhost:5173`)
      .set(auth(admin)).expect(400);
    expect(bad.body.message).toMatch(/localhost/);
    const png = await request(http).get(`/api/v1/tables/${tableId}/qr.png?baseUrl=http://192.168.1.20:5173`)
      .set(auth(admin)).expect(200);
    expect(png.headers['content-type']).toBe('image/png');
    // open ticket exists -> refused unless force
    const refused = await request(http).post(`/api/v1/tables/${tableId}/regenerate-qr`).set(auth(admin)).expect(409);
    expect(refused.body.code).toBe('TABLE_HAS_OPEN_TICKET');
    const forced = await request(http).post(`/api/v1/tables/${tableId}/regenerate-qr?force=true`).set(auth(admin)).expect(200);
    expect(forced.body.qrToken).not.toBe(qrToken);
    await request(http).get(`/api/v1/public/tables/${qrToken}`).expect(404);
  });

  it('health is public', async () => {
    const res = await request(http).get('/health').expect(200);
    expect(res.body.status).toBe('ok');
  });
});
