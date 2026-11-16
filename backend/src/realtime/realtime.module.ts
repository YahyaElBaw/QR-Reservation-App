import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Table, TableSchema } from '../tables/table.schema';
import { LiveGateway } from './live.gateway';

@Global()
@Module({
  imports: [MongooseModule.forFeature([{ name: Table.name, schema: TableSchema }])],
  providers: [LiveGateway],
  exports: [LiveGateway],
})
export class RealtimeModule {}
