import { IsOptional, IsString, MinLength } from 'class-validator';

/** DTO for optional custom password during tenant user reset */
export class ResetTenantUserPasswordDto {
  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;
}
