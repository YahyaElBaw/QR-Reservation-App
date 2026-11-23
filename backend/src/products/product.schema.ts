import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';

@Schema({ timestamps: true, toJSON: { versionKey: false } })
export class Product {
  @Prop({ type: String, required: true, trim: true }) name: string;
  @Prop({ type: String, default: '' }) description: string;
  /** integer millimes */
  @Prop({ type: Number, required: true, min: 1 }) price: number;
  @Prop({ type: String }) imageUrl?: string;
  @Prop({ type: String }) imagePublicId?: string;
  @Prop({ type: Boolean, default: true }) available: boolean;
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Category', required: true, index: true }) categoryId: Types.ObjectId;
  @Prop({ type: Date, default: null }) deletedAt: Date | null;
  createdAt!: Date;
  updatedAt!: Date;
}
export type ProductDocument = HydratedDocument<Product>;
export const ProductSchema = SchemaFactory.createForClass(Product);
