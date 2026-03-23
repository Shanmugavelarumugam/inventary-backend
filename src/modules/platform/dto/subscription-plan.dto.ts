import {
  IsString,
  IsNumber,
  IsObject,
  IsOptional,
  Min,
  IsNotEmpty,
} from 'class-validator';

class PlanLimitsDto {
  @IsNumber()
  @Min(0)
  maxUsers: number;

  @IsNumber()
  @Min(0)
  maxProducts: number;
}

export class CreateSubscriptionPlanDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsString()
  @IsOptional()
  currency?: string = 'INR';

  @IsString()
  @IsNotEmpty()
  billingCycle: string;

  @IsObject()
  @IsNotEmpty()
  features: Record<string, boolean>;

  @IsObject()
  @IsNotEmpty()
  limits: PlanLimitsDto;
}

export class UpdateSubscriptionPlanDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsObject()
  features?: Record<string, boolean>;

  @IsOptional()
  @IsObject()
  limits?: Partial<PlanLimitsDto>;
}
