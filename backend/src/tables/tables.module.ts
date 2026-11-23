import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Ticket, TicketSchema } from '../tickets/tickets.schemas';
import { Table, TableSchema } from './table.schema';
import { TablesController } from './tables.controller';
import { TablesService } from './tables.service';

@Module({
  imports: [MongooseModule.forFeature([
    { name: Table.name, schema: TableSchema },
    { name: Ticket.name, schema: TicketSchema },
  ])],
  controllers: [TablesController],
  providers: [TablesService],
  exports: [TablesService],
})
export class TablesModule {}
