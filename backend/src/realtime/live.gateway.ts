import { InjectModel } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { OnGatewayConnection, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Model } from 'mongoose';
import { Namespace, Socket } from 'socket.io';
import { JwtPayload } from '../common/auth-user';
import { Table, TableDocument } from '../tables/table.schema';

export type LiveEvent =
  | 'ticket.created' | 'ticket.updated' | 'ticket.closed' | 'table.updated' | 'product.updated';

/**
 * Namespace /live.
 * Staff:     io('/live', { auth: { token: '<jwt>' } })      -> room "staff"
 * Customers: io('/live', { auth: { qrToken: 'TBL-XXXX' } }) -> room "table:<qrToken>" (read-only)
 * Gateway declares NO @SubscribeMessage handlers: clients can only listen.
 */
@WebSocketGateway({ namespace: '/live', cors: { origin: true, credentials: true } })
export class LiveGateway implements OnGatewayConnection {
  @WebSocketServer() server: Namespace;

  constructor(
    private readonly jwt: JwtService,
    @InjectModel(Table.name) private readonly tables: Model<TableDocument>,
  ) {}

  async handleConnection(client: Socket): Promise<void> {
    const auth = client.handshake.auth as { token?: string; qrToken?: string };
    const header = client.handshake.headers.authorization;
    const token = auth.token ?? (header?.startsWith('Bearer ') ? header.slice(7) : undefined);
    try {
      if (token) {
        const payload = await this.jwt.verifyAsync<JwtPayload>(token);
        client.data.userId = payload.sub;
        await client.join('staff');
        return;
      }
      if (auth.qrToken && (await this.tables.exists({ qrToken: auth.qrToken }))) {
        await client.join(`table:${auth.qrToken}`);
        return;
      }
    } catch {
      /* fallthrough: reject below */
    }
    client.emit('error', { code: 'UNAUTHORIZED', message: 'Invalid credentials' });
    client.disconnect(true);
  }

  /** Staff always receive it; the table's customers too when qrToken is given. Full objects. */
  emit(event: LiveEvent, payload: unknown, qrToken?: string): void {
    if (!this.server) return;
    const rooms = qrToken ? ['staff', `table:${qrToken}`] : ['staff'];
    this.server.to(rooms).emit(event, payload);
  }

  /** Everyone connected (menu availability changes). */
  broadcast(event: LiveEvent, payload: unknown): void {
    this.server?.emit(event, payload);
  }
}
