import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcryptjs';
import { Model } from 'mongoose';
import { Role } from '../common/enums';
import { AppException, duplicateField, notFound } from '../common/errors';
import { Paginated, PaginationQueryDto, skipOf } from '../common/pagination';
import { CreateUserDto, UpdateUserDto } from './users.dto';
import { User, UserDocument } from './user.schema';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private readonly model: Model<UserDocument>) {}

  async list(q: PaginationQueryDto): Promise<Paginated<UserDocument>> {
    const [data, total] = await Promise.all([
      this.model.find().sort({ createdAt: 1 }).skip(skipOf(q)).limit(q.limit),
      this.model.countDocuments(),
    ]);
    return { data, meta: { page: q.page, limit: q.limit, total } };
  }

  async findById(id: string): Promise<UserDocument> {
    const user = await this.model.findById(id);
    if (!user) throw notFound('User');
    return user;
  }

  findActiveById(id: string): Promise<UserDocument | null> {
    return this.model.findOne({ _id: id, active: true });
  }

  findForLogin(username: string): Promise<UserDocument | null> {
    return this.model.findOne({ username: username.toLowerCase().trim() }).select('+passwordHash');
  }

  async create(dto: CreateUserDto): Promise<UserDocument> {
    const { password, ...rest } = dto;
    try {
      return await this.model.create({ ...rest, passwordHash: await bcrypt.hash(password, 10) });
    } catch (e) {
      throw this.mapDuplicate(e);
    }
  }

  async update(id: string, dto: UpdateUserDto): Promise<UserDocument> {
    const user = await this.findById(id);
    const { password, ...rest } = dto;
    const losesAdmin = (rest.role !== undefined && rest.role !== Role.ADMIN) || rest.active === false;
    if (user.role === Role.ADMIN && user.active && losesAdmin) await this.assertAnotherAdmin(id);
    Object.assign(user, rest);
    if (password) user.passwordHash = await bcrypt.hash(password, 10);
    try {
      return await user.save();
    } catch (e) {
      throw this.mapDuplicate(e);
    }
  }

  async remove(id: string): Promise<void> {
    const user = await this.findById(id);
    if (user.role === Role.ADMIN && user.active) await this.assertAnotherAdmin(id);
    await user.deleteOne();
  }

  private async assertAnotherAdmin(excludeId: string): Promise<void> {
    const others = await this.model.countDocuments({ role: Role.ADMIN, active: true, _id: { $ne: excludeId } });
    if (others === 0) throw new AppException(403, 'FORBIDDEN', 'Cannot remove or disable the last active ADMIN');
  }

  private mapDuplicate(e: unknown): unknown {
    return duplicateField(e)
      ? new AppException(409, 'VALIDATION_ERROR', 'Username already exists', ['username'])
      : e;
  }
}
