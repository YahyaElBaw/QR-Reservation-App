import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuditLog, AuditLogDocument } from './audit.schema';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);
  constructor(@InjectModel(AuditLog.name) private readonly model: Model<AuditLogDocument>) {}

  /** Never throws: auditing must not break a business operation. */
  async log(entry: {
    userId?: string; action: string; entity: string; entityId: string; meta?: Record<string, unknown>;
  }): Promise<void> {
    try {
      await this.model.create(entry);
    } catch (e) {
      this.logger.error(`audit failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
}
