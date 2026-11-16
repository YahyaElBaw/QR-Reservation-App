import { Controller, Get, Module, ServiceUnavailableException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { Public } from '../common/decorators';

@Controller('health')
export class HealthController {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  @Public()
  @Get()
  async check(): Promise<{ status: string; mongo: string }> {
    try {
      const db = this.connection.db;
      if (!db) throw new Error('no db');
      await db.command({ ping: 1 });
      return { status: 'ok', mongo: 'up' };
    } catch {
      throw new ServiceUnavailableException({ code: 'INTERNAL_ERROR', message: 'Mongo is down', details: [] });
    }
  }
}

@Module({ controllers: [HealthController] })
export class HealthModule {}
