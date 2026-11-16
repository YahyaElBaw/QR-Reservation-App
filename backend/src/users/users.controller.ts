import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators';
import { Role } from '../common/enums';
import { PaginationQueryDto } from '../common/pagination';
import { ParseObjectIdPipe } from '../common/parse-object-id.pipe';
import { CreateUserDto, UpdateUserDto } from './users.dto';
import { UsersService } from './users.service';

@ApiTags('users')
@Controller('users')
@Roles(Role.ADMIN)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get() list(@Query() q: PaginationQueryDto) { return this.users.list(q); }
  @Get(':id') one(@Param('id', ParseObjectIdPipe) id: string) { return this.users.findById(id); }
  @Post() create(@Body() dto: CreateUserDto) { return this.users.create(dto); }
  @Patch(':id') update(@Param('id', ParseObjectIdPipe) id: string, @Body() dto: UpdateUserDto) {
    return this.users.update(id, dto);
  }
  @Delete(':id') @HttpCode(204) async remove(@Param('id', ParseObjectIdPipe) id: string): Promise<void> {
    await this.users.remove(id);
  }
}
