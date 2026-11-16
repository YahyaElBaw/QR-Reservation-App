import { PartialType } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { Role } from '../common/enums';

export class CreateUserDto {
  @IsString() @MinLength(2) @MaxLength(80) name: string;
  @IsString() @Matches(/^[a-zA-Z0-9._-]{3,30}$/, { message: 'username must be 3-30 chars (letters, digits, . _ -)' })
  username: string;
  @IsString() @MinLength(8) @MaxLength(72) password: string;
  @IsEnum(Role) role: Role;
  @IsOptional() @IsBoolean() active?: boolean;
}
export class UpdateUserDto extends PartialType(CreateUserDto) {}
