import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  IsEnum,
  IsOptional,
} from 'class-validator';
import { PlatformRole } from '../../../common/enums/platform-role.enum.js';

/** DTO for creating a PLATFORM_ADMIN or SUPPORT_ADMIN — ROOT use only */
export class CreatePlatformAdminDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password: string;

  @IsEnum(PlatformRole)
  @IsNotEmpty()
  role: PlatformRole;
}

/** DTO for updating a platform admin profile — ROOT use only */
export class UpdatePlatformAdminDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  status?: 'ACTIVE' | 'SUSPENDED';
}

/** DTO for resetting platform admin password — ROOT use only */
export class ResetPlatformAdminPasswordDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  newPassword: string;
}

/** DTO for bootstrapping the very first ROOT admin (disabled if ROOT exists) */
export class BootstrapRootDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(12)
  password: string;

  @IsString()
  @MinLength(12)
  confirmPassword: string;
}
