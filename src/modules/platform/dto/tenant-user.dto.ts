import {
  IsString,
  IsEmail,
  IsNotEmpty,
  IsUUID,
  IsOptional,
  MinLength,
  IsInt,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePlatformTenantUserDto {
  @IsUUID()
  @IsNotEmpty()
  businessId: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password: string;

  @IsUUID()
  @IsNotEmpty()
  roleId: string;
}

export class UpdatePlatformTenantUserDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsUUID()
  @IsNotEmpty()
  roleId?: string;
}

export class ResetTenantUserPasswordNewDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  newPassword: string;
}

export class FindAllTenantUsersQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsUUID()
  businessId?: string;

  @IsOptional()
  @IsString()
  role?: string;

  @IsOptional()
  @IsString()
  status?: string;
}
