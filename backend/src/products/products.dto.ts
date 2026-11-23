import { PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean, IsMongoId, IsNumber, IsOptional, IsPositive, IsString, Max, MaxLength, MinLength,
} from 'class-validator';
import { PaginationQueryDto } from '../common/pagination';

const toBool = ({ value }: { value: unknown }): boolean | undefined =>
  value === undefined || value === '' ? undefined : value === 'true' || value === true;

export class CreateProductDto {
  @IsString() @MinLength(1) @MaxLength(120) name: string;
  @IsOptional() @IsString() @MaxLength(500) description?: string;
  /** TND, > 0, max 3 decimals */
  @IsNumber({ maxDecimalPlaces: 3, allowNaN: false, allowInfinity: false }) @IsPositive() @Max(100000)
  price: number;
  @IsMongoId() categoryId: string;
  @IsOptional() @IsBoolean() available?: boolean;
}
export class UpdateProductDto extends PartialType(CreateProductDto) {}
export class AvailabilityDto {
  @IsBoolean() available: boolean;
}
export class ListProductsQuery extends PaginationQueryDto {
  @IsOptional() @IsMongoId() categoryId?: string;
  @IsOptional() @Transform(toBool) @IsBoolean() available?: boolean;
  @IsOptional() @IsString() @MaxLength(80) q?: string;
}
export class PublicProductsQuery {
  @IsOptional() @IsMongoId() categoryId?: string;
}
