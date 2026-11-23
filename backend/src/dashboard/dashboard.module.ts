import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Table, TableSchema } from '../tables/table.schema';
import { Ticket, TicketItem, TicketItemSchema, TicketSchema } from '../tickets/tickets.schemas';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [MongooseModule.forFeature([
    { name: Ticket.name, schema: TicketSchema },
    { name: TicketItem.name, schema: TicketItemSchema },
    { name: Table.name, schema: TableSchema },
  ])],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
