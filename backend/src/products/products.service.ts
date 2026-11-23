import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import { AuthUser } from '../common/auth-user';
import { AppException, notFound } from '../common/errors';
import { toMillimes } from '../common/money';
import { Paginated, skipOf } from '../common/pagination';
import { AuditService } from '../audit/audit.service';
import { Category, CategoryDocument } from '../categories/category.schema';
import { LiveGateway } from '../realtime/live.gateway';
import { CloudinaryService } from '../uploads/cloudinary.service';
import { productView, ProductView } from './product.mapper';
import { Product, ProductDocument } from './product.schema';
import { CreateProductDto, ListProductsQuery, UpdateProductDto } from './products.dto';

const escapeRegex = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product.name) private readonly model: Model<ProductDocument>,
    @InjectModel(Category.name) private readonly categories: Model<CategoryDocument>,
    private readonly cloud: CloudinaryService,
    private readonly live: LiveGateway,
    private readonly audit: AuditService,
  ) {}

  private filterOf(q: { categoryId?: string; available?: boolean; q?: string }): FilterQuery<ProductDocument> {
    const f: FilterQuery<ProductDocument> = { deletedAt: null };
    if (q.categoryId) f.categoryId = q.categoryId;
    if (q.available !== undefined) f.available = q.available;
    if (q.q) {
      const rx = new RegExp(escapeRegex(q.q), 'i');
      f.$or = [{ name: rx }, { description: rx }];
    }
    return f;
  }

  async list(q: ListProductsQuery): Promise<Paginated<ProductView>> {
    const f = this.filterOf(q);
    const [docs, total] = await Promise.all([
      this.model.find(f).sort({ name: 1 }).skip(skipOf(q)).limit(q.limit),
      this.model.countDocuments(f),
    ]);
    return { data: docs.map(productView), meta: { page: q.page, limit: q.limit, total } };
  }

  /** Public: everything not deleted, with the `available` flag. */
  async listPublic(categoryId?: string): Promise<Paginated<ProductView>> {
    const docs = await this.model.find(this.filterOf({ categoryId })).sort({ name: 1 });
    return { data: docs.map(productView), meta: { page: 1, limit: docs.length, total: docs.length } };
  }

  private async findActive(id: string): Promise<ProductDocument> {
    const p = await this.model.findOne({ _id: id, deletedAt: null });
    if (!p) throw notFound('Product');
    return p;
  }

  async findOne(id: string): Promise<ProductView> { return productView(await this.findActive(id)); }

  private async assertCategory(id: string): Promise<void> {
    if (!(await this.categories.exists({ _id: id }))) {
      throw new AppException(400, 'VALIDATION_ERROR', 'categoryId does not exist', ['categoryId']);
    }
  }

  async create(dto: CreateProductDto, user: AuthUser): Promise<ProductView> {
    await this.assertCategory(dto.categoryId);
    const p = await this.model.create({ ...dto, price: toMillimes(dto.price) });
    await this.audit.log({ userId: user.id, action: 'product.create', entity: 'product', entityId: p.id });
    return this.emit(p);
  }

  async update(id: string, dto: UpdateProductDto, user: AuthUser): Promise<ProductView> {
    const p = await this.findActive(id);
    if (dto.categoryId) await this.assertCategory(dto.categoryId);
    const { price, ...rest } = dto;
    Object.assign(p, rest);
    if (price !== undefined) p.price = toMillimes(price);
    await p.save();
    await this.audit.log({ userId: user.id, action: 'product.update', entity: 'product', entityId: id, meta: { ...dto } });
    return this.emit(p);
  }

  async setAvailability(id: string, available: boolean, user: AuthUser): Promise<ProductView> {
    const p = await this.findActive(id);
    p.available = available;
    await p.save();
    await this.audit.log({ userId: user.id, action: 'product.availability', entity: 'product', entityId: id, meta: { available } });
    return this.emit(p);
  }

  /** Soft delete: history (ticket items snapshots) stays valid. */
  async remove(id: string, user: AuthUser): Promise<void> {
    const p = await this.findActive(id);
    p.deletedAt = new Date();
    p.available = false;
    await p.save();
    await this.audit.log({ userId: user.id, action: 'product.delete', entity: 'product', entityId: id });
    this.emit(p);
  }

  async setImage(id: string, file: Express.Multer.File | undefined, user: AuthUser): Promise<ProductView> {
    if (!file) throw new AppException(400, 'VALIDATION_ERROR', 'Missing multipart field "file"');
    const p = await this.findActive(id);
    const previous = p.imagePublicId;
    const up = await this.cloud.upload(file.buffer);
    p.imageUrl = up.secure_url;
    p.imagePublicId = up.public_id;
    await p.save();
    if (previous) await this.cloud.destroy(previous);
    await this.audit.log({ userId: user.id, action: 'product.image', entity: 'product', entityId: id });
    return this.emit(p);
  }

  private emit(p: ProductDocument): ProductView {
    const view = productView(p);
    this.live.broadcast('product.updated', view);
    return view;
  }
}
