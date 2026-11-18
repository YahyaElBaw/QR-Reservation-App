import { Controller, Get, Module, ServiceUnavailableException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import * as os from 'os';
import { Public } from '../common/decorators';

function getLocalIp(): string {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

@Controller()
export class HealthController {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  @Public()
  @Get(['health', 'api/v1/health'])
  async check(): Promise<{ status: string; mongo: string; ip: string }> {
    try {
      const db = this.connection.db;
      if (!db) throw new Error('no db');
      await db.command({ ping: 1 });
      return { status: 'ok', mongo: 'up', ip: getLocalIp() };
    } catch {
      throw new ServiceUnavailableException({ code: 'INTERNAL_ERROR', message: 'Mongo is down', details: [] });
    }
  }
}

@Module({ controllers: [HealthController] })
export class HealthModule {}
