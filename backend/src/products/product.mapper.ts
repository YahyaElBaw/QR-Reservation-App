import { toTnd } from '../common/money';
import { ProductDocument } from './product.schema';

export function productView(p: ProductDocument) {
  return {
    _id: p.id as string,
    name: p.name,
    description: p.description,
    price: toTnd(p.price),
    imageUrl: p.imageUrl ?? null,
    imagePublicId: p.imagePublicId ?? null,
    available: p.available,
    categoryId: p.categoryId.toString(),
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}
export type ProductView = ReturnType<typeof productView>;
