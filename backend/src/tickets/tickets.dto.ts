import { Type } from 'class-transformer';
import {
  ArrayMaxSize, ArrayMinSize, IsArray, IsEnum, IsInt, IsMongoId, IsOptional, IsString, Max, MaxLength,
  Min, MinLength, ValidateNested,
} from 'class-validator';
import { PaymentMethod, TicketStatus } from '../common/enums';
import { PaginationQueryDto } from '../common/pagination';

export class OrderItemDto {
  @IsMongoId() productId: string;
  @IsInt() @Min(1) @Max(99) quantity: number;
  @IsOptional() @IsString() @MaxLength(140) note?: string;
}

export class CreateOrderDto {
  @IsString() @MinLength(8) @MaxLength(100) deviceId: string;
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(50) @ValidateNested({ each: true }) @Type(() => OrderItemDto)
  items: OrderItemDto[];
}

export class UpdateItemDto {
  @IsInt() @Min(1) @Max(99) quantity: number;
}
export class PayDto {
  @IsEnum(PaymentMethod) method: PaymentMethod;
}
export class ListTicketsQuery extends PaginationQueryDto {
  @IsOptional() @IsEnum(TicketStatus) status?: TicketStatus;
  @IsOptional() @IsMongoId() tableId?: string;
}
