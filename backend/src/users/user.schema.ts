import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { Role } from '../common/enums';

@Schema({
  timestamps: true,
  toJSON: {
    versionKey: false,
    transform: (_doc, ret: Record<string, unknown>) => { delete ret.passwordHash; return ret; },
  },
})
export class User {
  @Prop({ type: String, required: true, trim: true }) name: string;
  @Prop({ type: String, required: true, unique: true, trim: true, lowercase: true }) username: string;
  @Prop({ type: String, required: true, select: false }) passwordHash: string;
  @Prop({ type: String, enum: Object.values(Role), required: true }) role: Role;
  @Prop({ type: Boolean, default: true }) active: boolean;
  createdAt!: Date;
  updatedAt!: Date;
}
export type UserDocument = HydratedDocument<User>;
export const UserSchema = SchemaFactory.createForClass(User);
