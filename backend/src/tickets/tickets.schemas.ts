import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';
import { PaymentMethod, TicketStatus } from '../common/enums';

@Schema({ timestamps: true, toJSON: { versionKey: false } })
export class Ticket {
  @Prop({ type: String, required: true, unique: true }) ticketNumber: string;
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Table', required: true }) tableId: Types.ObjectId;
  @Prop({ type: SchemaTypes.ObjectId, ref: 'User' }) userId?: Types.ObjectId;
  @Prop({ type: String, enum: Object.values(TicketStatus), default: TicketStatus.OPEN }) status: TicketStatus;
  /** millimes */
  @Prop({ type: Number, default: 0 }) total: number;
  @Prop({ type: String, enum: Object.values(PaymentMethod) }) paymentMethod?: PaymentMethod;
  @Prop({ type: Date }) paidAt?: Date;
  @Prop({ type: Date }) closedAt?: Date;
  @Prop({ type: String }) clientIp?: string;
  @Prop({ type: String }) clientDeviceId?: string;
  createdAt!: Date;
  updatedAt!: Date;
}
export type TicketDocument = HydratedDocument<Ticket>;
export const TicketSchema = SchemaFactory.createForClass(Ticket);
// ONE open ticket per table, enforced by the database (race-proof).
TicketSchema.index(
  { tableId: 1 },
  { unique: true, partialFilterExpression: { status: TicketStatus.OPEN }, name: 'uniq_open_ticket_per_table' },
);
TicketSchema.index({ status: 1, createdAt: -1 });
TicketSchema.index({ status: 1, paidAt: 1 });

@Schema({ timestamps: true, collection: 'ticketItems', toJSON: { versionKey: false } })
export class TicketItem {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Ticket', required: true, index: true }) ticketId: Types.ObjectId;
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Product', required: true }) productId: Types.ObjectId;
  @Prop({ type: String, required: true }) productName: string;
  @Prop({ type: Number, required: true, min: 1, max: 99 }) quantity: number;
  /** snapshot, millimes */
  @Prop({ type: Number, required: true, min: 0 }) unitPrice: number;
  /** millimes */
  @Prop({ type: Number, required: true, min: 0 }) subtotal: number;
  /** '' when no note (makes merge filter simple) */
  @Prop({ type: String, default: '', maxlength: 140 }) note: string;
  @Prop({ type: String }) addedByDevice?: string;
  createdAt!: Date;
  updatedAt!: Date;
}
export type TicketItemDocument = HydratedDocument<TicketItem>;
export const TicketItemSchema = SchemaFactory.createForClass(TicketItem);

@Schema({ collection: 'counters' })
export class Counter {
  @Prop({ type: String }) _id: string;
  @Prop({ type: Number, default: 0 }) seq: number;
}
export type CounterDocument = HydratedDocument<Counter>;
export const CounterSchema = SchemaFactory.createForClass(Counter);
