import {
  IsString,
  IsEmail,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  MinLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { DomainType } from '../../../database/entities/business.entity.js';
import { SubscriptionPlan } from '../../../common/enums/business.enum.js';

export class ProvisionTenantDto {
  @ApiProperty({ example: 'Viyan Pharma Solutions', description: 'Business display name' })
  @IsString()
  @IsNotEmpty()
  businessName: string;

  @ApiProperty({ example: 'pharmacy', enum: DomainType, description: 'Type of business domain' })
  @IsEnum(DomainType)
  domainType: DomainType;

  @ApiProperty({ example: 'contact@viyanpharma.com', description: 'Official business email' })
  @IsEmail()
  @IsNotEmpty()
  businessEmail: string;

  @ApiProperty({ example: 'Viyan Admin', description: 'Full name of the primary administrator' })
  @IsString()
  @IsNotEmpty()
  adminName: string;

  @ApiProperty({ example: 'admin@viyanpharma.com', description: 'Login email for the administrator' })
  @IsEmail()
  @IsNotEmpty()
  adminEmail: string;

  @ApiProperty({ example: 'Password@123', description: 'Administrator password (min 8 chars)' })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  adminPassword: string;

  @ApiProperty({ example: '+919876543210', required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ example: '123 Healthcare Ave, Chennai', required: false })
  @IsOptional()
  @IsString()
  address?: string;
}

export class ProvisionTenantResponseDto {
  @ApiProperty()
  message: string;

  @ApiProperty()
  business: {
    id: string;
    name: string;
    companyCode: string;
    status: string;
  };

  @ApiProperty()
  adminUser: {
    id: string;
    name: string;
    email: string;
  };

  @ApiProperty()
  subscription: {
    plan: string;
    status: string;
    trialDays: number;
  };
}
