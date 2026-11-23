import { PartialType } from '@nestjs/swagger';
import { IsInt, IsMongoId, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class CreateCategoryDto {
  @IsString() @MinLength(1) @MaxLength(80) name: string;
  @IsOptional() @IsString() @MaxLength(300) description?: string;
  @IsOptional() @IsInt() @Min(0) @Max(9999) sortOrder?: number;
}
export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {}
export class DeleteCategoryQueryDto {
  @IsOptional() @IsMongoId() reassignTo?: string;
}
