import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';
import { DomainType } from '../../../database/entities/business.entity.js';
import { BusinessStatus } from '../../../common/enums/business.enum.js';

export class UpdateTenantDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(BusinessStatus)
  status?: BusinessStatus;

  @IsOptional()
  @IsEnum(DomainType)
  domainType?: DomainType;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  address?: string;
}

export class UpdateTenantStatusDto {
  @IsEnum(BusinessStatus)
  status: BusinessStatus;

  @IsOptional()
  @IsString()
  reason?: string;
}
