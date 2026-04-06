import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTenantStaffUserDto {
  @ApiProperty({ example: 'John Staff' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'john@business.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'Password@123', required: false })
  @IsString()
  @IsOptional()
  @MinLength(8)
  password?: string;

  @ApiProperty({ example: 'uuid-v4-role-id' })
  @IsString()
  @IsNotEmpty()
  roleId: string;
}

export class UpdateTenantStaffUserDto {
  @ApiProperty({ example: 'John Staff Updated', required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ example: 'uuid-v4-new-role-id', required: false })
  @IsString()
  @IsOptional()
  roleId?: string;
}

export class ResetTenantUserPasswordDto {
  @ApiProperty({ example: 'NewSecurePassword@123' })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  newPassword: string;
}

export class TenantUserQueryDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  page?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  limit?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  role?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  status?: 'active' | 'inactive';
}
