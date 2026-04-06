import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'user@example.com', description: 'User email address' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password123', description: 'User password' })
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiProperty({ example: 'COMP001', description: 'Company code', required: false })
  @IsOptional()
  @IsString()
  companyCode?: string;
}

export class RefreshTokenDto {
  @ApiProperty({ example: 'refresh_token_here', description: 'Refresh token string' })
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}

export class LogoutDto {
  @ApiProperty({ example: 'refresh_token_here', description: 'Refresh token to logout' })
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}

export class ChangePasswordDto {
  @ApiProperty({ example: 'old_password_123', description: 'Current password' })
  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  @ApiProperty({ example: 'new_password_456', description: 'New password', minLength: 6 })
  @IsString()
  @MinLength(6)
  newPassword: string;
}

export class ForgotPasswordDto {
  @ApiProperty({ example: 'user@example.com', description: 'User email for password reset' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'COMP001', description: 'Company code', required: false })
  @IsOptional()
  @IsString()
  companyCode?: string;
}

export class ResetPasswordDto {
  @ApiProperty({ example: 'reset_token_here', description: 'Reset token received in email' })
  @IsString()
  @IsNotEmpty()
  resetToken: string;

  @ApiProperty({ example: 'new_password_123', description: 'New password to set', minLength: 6 })
  @IsString()
  @MinLength(6)
  newPassword: string;
}
