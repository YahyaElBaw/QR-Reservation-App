import {
  Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query, Req, Res,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { extractClientIp } from '../common/ip';
import { AuthUser } from '../common/auth-user';
import { CurrentUser, Public, Roles } from '../common/decorators';
import { Role } from '../common/enums';
import { ParseObjectIdPipe } from '../common/parse-object-id.pipe';
import { CreateOrderDto, ListTicketsQuery, OrderItemDto, PayDto, UpdateItemDto } from './tickets.dto';
import { TicketsService } from './tickets.service';

@ApiTags('tickets')
@Controller('tickets')
@Roles(Role.ADMIN, Role.CAISSIER, Role.CONTOIRISTE)
export class TicketsController {
  constructor(private readonly tickets: TicketsService) {}

  @Get() list(@Query() q: ListTicketsQuery) { return this.tickets.list(q); }
  @Get(':id') one(@Param('id', ParseObjectIdPipe) id: string) { return this.tickets.getView(id); }

  @Post(':id/items') @Roles(Role.ADMIN, Role.CONTOIRISTE)
  add(@Param('id', ParseObjectIdPipe) id: string, @Body() dto: OrderItemDto, @CurrentUser() u: AuthUser) {
    return this.tickets.addItem(id, dto, u);
  }

  @Patch(':id/items/:itemId') @Roles(Role.ADMIN, Role.CONTOIRISTE)
  update(
    @Param('id', ParseObjectIdPipe) id: string, @Param('itemId', ParseObjectIdPipe) itemId: string,
    @Body() dto: UpdateItemDto, @CurrentUser() u: AuthUser,
  ) { return this.tickets.updateItem(id, itemId, dto.quantity, u); }

  @Delete(':id/items/:itemId') @Roles(Role.ADMIN, Role.CONTOIRISTE)
  remove(
    @Param('id', ParseObjectIdPipe) id: string, @Param('itemId', ParseObjectIdPipe) itemId: string,
    @CurrentUser() u: AuthUser,
  ) { return this.tickets.removeItem(id, itemId, u); }

  @Post(':id/pay') @HttpCode(200) @Roles(Role.ADMIN, Role.CAISSIER)
  pay(@Param('id', ParseObjectIdPipe) id: string, @Body() dto: PayDto, @CurrentUser() u: AuthUser) {
    return this.tickets.pay(id, dto.method, u);
  }

  @Post(':id/close') @HttpCode(200) @Roles(Role.ADMIN, Role.CAISSIER)
  close(@Param('id', ParseObjectIdPipe) id: string, @CurrentUser() u: AuthUser) {
    return this.tickets.close(id, u);
  }

  @Post(':id/pay-and-close') @HttpCode(200) @Roles(Role.ADMIN, Role.CAISSIER)
  payAndClose(@Param('id', ParseObjectIdPipe) id: string, @Body() dto: PayDto, @CurrentUser() u: AuthUser) {
    return this.tickets.payAndClose(id, dto.method, u);
  }
}

@ApiTags('public')
@Controller('public/tables')
export class PublicTicketsController {
  constructor(private readonly tickets: TicketsService) {}

  @Public() @Get(':qrToken')
  table(@Param('qrToken') qrToken: string, @Req() req: Request, @Query('deviceId') deviceId?: string) {
    const ip = extractClientIp(req);
    return this.tickets.publicTable(qrToken, ip, deviceId);
  }

  /** 20 orders / min per IP + qrToken */
  @Public() @Post(':qrToken/orders')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  order(@Param('qrToken') qrToken: string, @Body() dto: CreateOrderDto, @Req() req: Request) {
    const ip = extractClientIp(req);
    return this.tickets.placeOrder(qrToken, dto, ip);
  }

  /** Returns the ticket or a literal JSON null. */
  @Public() @Get(':qrToken/ticket')
  async ticket(@Param('qrToken') qrToken: string, @Req() req: Request, @Res() res: Response): Promise<void> {
    const ip = extractClientIp(req);
    res.status(200).json(await this.tickets.publicTicket(qrToken, ip));
  }
}
