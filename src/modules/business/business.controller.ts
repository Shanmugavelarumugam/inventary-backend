import { Controller, Get, UseGuards } from '@nestjs/common';
import { BusinessService } from './business.service.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { TenantGuard } from '../../common/guards/tenant.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';

@Controller('business')
@UseGuards(JwtAuthGuard, TenantGuard)
export class BusinessController {
  constructor(private readonly businessService: BusinessService) {}

  @Get('me')
  async getMe(@CurrentUser('businessId') businessId: string) {
    return this.businessService.findOne(businessId);
  }
}

