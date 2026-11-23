import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema({ timestamps: true, toJSON: { versionKey: false } })
export class Category {
  @Prop({ type: String, required: true, trim: true }) name: string;
  @Prop({ type: String, default: '' }) description: string;
  @Prop({ type: Number, default: 0 }) sortOrder: number;
  createdAt!: Date;
  updatedAt!: Date;
}
export type CategoryDocument = HydratedDocument<Category>;
export const CategorySchema = SchemaFactory.createForClass(Category);
