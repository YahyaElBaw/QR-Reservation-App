import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Category, CategorySchema } from '../categories/category.schema';
import { UploadsModule } from '../uploads/uploads.module';
import { Product, ProductSchema } from './product.schema';
import { ProductsController, PublicProductsController } from './products.controller';
import { ProductsService } from './products.service';

@Module({
  imports: [
    UploadsModule,
    MongooseModule.forFeature([
      { name: Product.name, schema: ProductSchema },
      { name: Category.name, schema: CategorySchema },
    ]),
  ],
  controllers: [ProductsController, PublicProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
