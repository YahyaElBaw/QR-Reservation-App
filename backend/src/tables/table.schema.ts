import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { TableStatus } from '../common/enums';

@Schema({ timestamps: true, toJSON: { versionKey: false } })
export class Table {
  @Prop({ type: Number, required: true, unique: true }) number: number;
  @Prop({ type: String, required: true, unique: true }) qrToken: string;
  @Prop({ type: String, enum: Object.values(TableStatus), default: TableStatus.AVAILABLE }) status: TableStatus;
  createdAt!: Date;
  updatedAt!: Date;
}
export type TableDocument = HydratedDocument<Table>;
export const TableSchema = SchemaFactory.createForClass(Table);
