import { Transform } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateTableDto {
  @IsInt() @Min(1) @Max(9999) number: number;
}
export class UpdateTableDto {
  @IsOptional() @IsInt() @Min(1) @Max(9999) number?: number;
}
export class RegenerateQueryDto {
  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : value === 'true' || value === true))
  @IsBoolean()
  force?: boolean;
}
export class QrQueryDto {
  @IsString() baseUrl: string;
}
