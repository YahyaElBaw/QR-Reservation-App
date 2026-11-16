import {
  Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query, UploadedFile, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiTags } from '@nestjs/swagger';
import { AuthUser } from '../common/auth-user';
import { CurrentUser, Public, Roles } from '../common/decorators';
import { Role } from '../common/enums';
import { AppException } from '../common/errors';
import { ParseObjectIdPipe } from '../common/parse-object-id.pipe';
import {
  AvailabilityDto, CreateProductDto, ListProductsQuery, PublicProductsQuery, UpdateProductDto,
} from './products.dto';
import { ProductsService } from './products.service';

@ApiTags('products')
@Controller('products')
@Roles(Role.ADMIN, Role.CAISSIER, Role.CONTOIRISTE)
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @Get() list(@Query() q: ListProductsQuery) { return this.products.list(q); }
  @Get(':id') one(@Param('id', ParseObjectIdPipe) id: string) { return this.products.findOne(id); }

  @Post() @Roles(Role.ADMIN)
  create(@Body() dto: CreateProductDto, @CurrentUser() u: AuthUser) { return this.products.create(dto, u); }

  @Patch(':id/availability') @Roles(Role.ADMIN, Role.CONTOIRISTE)
  availability(@Param('id', ParseObjectIdPipe) id: string, @Body() dto: AvailabilityDto, @CurrentUser() u: AuthUser) {
    return this.products.setAvailability(id, dto.available, u);
  }

  @Patch(':id') @Roles(Role.ADMIN)
  update(@Param('id', ParseObjectIdPipe) id: string, @Body() dto: UpdateProductDto, @CurrentUser() u: AuthUser) {
    return this.products.update(id, dto, u);
  }

  @Delete(':id') @Roles(Role.ADMIN) @HttpCode(204)
  async remove(@Param('id', ParseObjectIdPipe) id: string, @CurrentUser() u: AuthUser): Promise<void> {
    await this.products.remove(id, u);
  }

  @Post(':id/image') @Roles(Role.ADMIN) @HttpCode(200)
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 3 * 1024 * 1024, files: 1 },
      fileFilter: (_req, file, cb) => {
        if (/^image\/(jpeg|png|webp)$/.test(file.mimetype)) return cb(null, true);
        return cb(new AppException(400, 'VALIDATION_ERROR', 'Only jpeg, png or webp images are allowed'), false);
      },
    }),
  )
  image(
    @Param('id', ParseObjectIdPipe) id: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() u: AuthUser,
  ) { return this.products.setImage(id, file, u); }
}

@ApiTags('public')
@Controller('public/products')
export class PublicProductsController {
  constructor(private readonly products: ProductsService) {}

  @Public() @Get()
  list(@Query() q: PublicProductsQuery) { return this.products.listPublic(q.categoryId); }
}
