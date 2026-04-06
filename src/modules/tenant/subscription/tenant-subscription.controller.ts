import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  UseGuards 
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard.js';
import { TenantGuard } from '../../../common/guards/tenant.guard.js';
import { Roles } from '../../../common/decorators/roles.decorator.js';
import { TenantRole } from '../../../common/enums/tenant-role.enum.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { TenantSubscriptionService } from './tenant-subscription.service.js';

@Controller('tenant/subscription')
@UseGuards(JwtAuthGuard, TenantGuard)
export class TenantSubscriptionController {
  constructor(private readonly subscriptionService: TenantSubscriptionService) {}

  @Get('current')
  async getCurrent(@CurrentUser('businessId') businessId: string) {
    return this.subscriptionService.getCurrent(businessId);
  }

  @Get('plans')
  async getPlans() {
    return this.subscriptionService.getPlans();
  }

  @Post('upgrade')
  @Roles(TenantRole.TENANT_ADMIN)
  async upgrade(
    @CurrentUser('businessId') businessId: string,
    @Body('planId') planId: string,
  ) {
    return this.subscriptionService.upgrade(businessId, planId);
  }

  @Get('payments')
  async getPayments(@CurrentUser('businessId') businessId: string) {
    return this.subscriptionService.getPayments(businessId);
  }

  @Get('invoices')
  async getInvoices(@CurrentUser('businessId') businessId: string) {
    return this.subscriptionService.getInvoices(businessId);
  }
}
