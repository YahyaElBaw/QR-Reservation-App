import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public, Roles } from '../common/decorators';
import { Role } from '../common/enums';
import { PaginationQueryDto } from '../common/pagination';
import { ParseObjectIdPipe } from '../common/parse-object-id.pipe';
import { CreateCategoryDto, DeleteCategoryQueryDto, UpdateCategoryDto } from './categories.dto';
import { CategoriesService } from './categories.service';

@ApiTags('categories')
@Controller('categories')
@Roles(Role.ADMIN, Role.CAISSIER, Role.CONTOIRISTE)
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @Get() list(@Query() q: PaginationQueryDto) { return this.categories.list(q); }
  @Get(':id') one(@Param('id', ParseObjectIdPipe) id: string) { return this.categories.findOne(id); }
  @Post() @Roles(Role.ADMIN) create(@Body() dto: CreateCategoryDto) { return this.categories.create(dto); }
  @Patch(':id') @Roles(Role.ADMIN)
  update(@Param('id', ParseObjectIdPipe) id: string, @Body() dto: UpdateCategoryDto) {
    return this.categories.update(id, dto);
  }
  @Delete(':id') @Roles(Role.ADMIN) @HttpCode(204)
  async remove(@Param('id', ParseObjectIdPipe) id: string, @Query() q: DeleteCategoryQueryDto): Promise<void> {
    await this.categories.remove(id, q.reassignTo);
  }
}

@ApiTags('public')
@Controller('public/categories')
export class PublicCategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @Public() @Get()
  async list() {
    const data = await this.categories.listAll();
    return { data, meta: { page: 1, limit: data.length, total: data.length } };
  }
}
