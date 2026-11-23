import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Product, ProductSchema } from '../products/product.schema';
import { Table, TableSchema } from '../tables/table.schema';
import { PublicTicketsController, TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';
import {
  Counter, CounterSchema, Ticket, TicketItem, TicketItemSchema, TicketSchema,
} from './tickets.schemas';

@Module({
  imports: [MongooseModule.forFeature([
    { name: Ticket.name, schema: TicketSchema },
    { name: TicketItem.name, schema: TicketItemSchema },
    { name: Counter.name, schema: CounterSchema },
    { name: Table.name, schema: TableSchema },
    { name: Product.name, schema: ProductSchema },
  ])],
  controllers: [TicketsController, PublicTicketsController],
  providers: [TicketsService],
  exports: [TicketsService, MongooseModule],
})
export class TicketsModule {}
