import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

@Schema({ timestamps: true, toJSON: { versionKey: false } })
export class AuditLog {
  @Prop({ type: Types.ObjectId, ref: 'User' }) userId?: Types.ObjectId;
  @Prop({ type: String, required: true, index: true }) action: string;
  @Prop({ type: String, required: true }) entity: string;
  @Prop({ type: String, required: true, index: true }) entityId: string;
  @Prop({ type: Object }) meta?: Record<string, unknown>;
}
export type AuditLogDocument = HydratedDocument<AuditLog>;
export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);
