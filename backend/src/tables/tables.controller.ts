import {
  Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query, StreamableFile,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthUser } from '../common/auth-user';
import { CurrentUser, Roles } from '../common/decorators';
import { Role } from '../common/enums';
import { PaginationQueryDto } from '../common/pagination';
import { ParseObjectIdPipe } from '../common/parse-object-id.pipe';
import { CreateTableDto, QrQueryDto, RegenerateQueryDto, UpdateTableDto } from './tables.dto';
import { TablesService } from './tables.service';

@ApiTags('tables')
@Controller('tables')
@Roles(Role.ADMIN, Role.CAISSIER, Role.CONTOIRISTE)
export class TablesController {
  constructor(private readonly tables: TablesService) {}

  @Get() list(@Query() q: PaginationQueryDto) { return this.tables.list(q); }

  // must stay BEFORE ':id'
  @Get('qr-sheet.pdf') @Roles(Role.ADMIN)
  async sheet(@Query() q: QrQueryDto) {
    return new StreamableFile(await this.tables.qrSheetPdf(q.baseUrl), {
      type: 'application/pdf', disposition: 'inline; filename="qr-sheet.pdf"',
    });
  }

  @Get(':id') one(@Param('id', ParseObjectIdPipe) id: string) { return this.tables.findOne(id); }

  @Get(':id/qr.png') @Roles(Role.ADMIN)
  async qr(@Param('id', ParseObjectIdPipe) id: string, @Query() q: QrQueryDto) {
    return new StreamableFile(await this.tables.qrPng(id, q.baseUrl), { type: 'image/png' });
  }

  @Post() @Roles(Role.ADMIN) create(@Body() dto: CreateTableDto) { return this.tables.create(dto.number); }

  @Patch(':id') @Roles(Role.ADMIN)
  update(@Param('id', ParseObjectIdPipe) id: string, @Body() dto: UpdateTableDto) {
    return this.tables.update(id, dto.number);
  }

  @Delete(':id') @Roles(Role.ADMIN) @HttpCode(204)
  async remove(@Param('id', ParseObjectIdPipe) id: string): Promise<void> { await this.tables.remove(id); }

  @Post(':id/regenerate-qr') @Roles(Role.ADMIN) @HttpCode(200)
  regenerate(
    @Param('id', ParseObjectIdPipe) id: string,
    @Query() q: RegenerateQueryDto,
    @CurrentUser() user: AuthUser,
  ) { return this.tables.regenerateQr(id, q.force === true, user); }
}
