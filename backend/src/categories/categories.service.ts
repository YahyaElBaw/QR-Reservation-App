import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AppException, notFound } from '../common/errors';
import { Paginated, PaginationQueryDto, skipOf } from '../common/pagination';
import { Product, ProductDocument } from '../products/product.schema';
import { Category, CategoryDocument } from './category.schema';
import { CreateCategoryDto, UpdateCategoryDto } from './categories.dto';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectModel(Category.name) private readonly model: Model<CategoryDocument>,
    @InjectModel(Product.name) private readonly products: Model<ProductDocument>,
  ) {}

  async list(q: PaginationQueryDto): Promise<Paginated<CategoryDocument>> {
    const [data, total] = await Promise.all([
      this.model.find().sort({ sortOrder: 1, name: 1 }).skip(skipOf(q)).limit(q.limit),
      this.model.countDocuments(),
    ]);
    return { data, meta: { page: q.page, limit: q.limit, total } };
  }

  listAll(): Promise<CategoryDocument[]> {
    return this.model.find().sort({ sortOrder: 1, name: 1 });
  }

  async findOne(id: string): Promise<CategoryDocument> {
    const c = await this.model.findById(id);
    if (!c) throw notFound('Category');
    return c;
  }

  create(dto: CreateCategoryDto): Promise<CategoryDocument> { return this.model.create(dto); }

  async update(id: string, dto: UpdateCategoryDto): Promise<CategoryDocument> {
    const c = await this.findOne(id);
    Object.assign(c, dto);
    return c.save();
  }

  async remove(id: string, reassignTo?: string): Promise<void> {
    const c = await this.findOne(id);
    const count = await this.products.countDocuments({ categoryId: c._id, deletedAt: null });
    if (count > 0) {
      if (!reassignTo) {
        throw new AppException(409, 'VALIDATION_ERROR', 'Category has products: pass ?reassignTo=<categoryId>', [
          { products: count },
        ]);
      }
      if (reassignTo === id) throw new AppException(400, 'VALIDATION_ERROR', 'reassignTo must differ');
      await this.findOne(reassignTo);
    }
    // soft-deleted products are reassigned too so references stay valid
    if (reassignTo) await this.products.updateMany({ categoryId: c._id }, { categoryId: reassignTo });
    await c.deleteOne();
  }
}
