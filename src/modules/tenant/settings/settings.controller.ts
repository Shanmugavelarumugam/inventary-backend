import { 
  Controller, 
  Get, 
  Patch, 
  Body, 
  UseGuards 
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard.js';
import { TenantGuard } from '../../../common/guards/tenant.guard.js';
import { Roles } from '../../../common/decorators/roles.decorator.js';
import { TenantRole } from '../../../common/enums/tenant-role.enum.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { SettingsService } from './settings.service.js';
import { Business } from '../../../database/entities/business.entity.js';

@Controller('tenant/settings')
@UseGuards(JwtAuthGuard, TenantGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('business')
  async getBusiness(@CurrentUser('businessId') businessId: string) {
    return this.settingsService.getBusinessProfile(businessId);
  }

  @Patch('business')
  @Roles(TenantRole.TENANT_ADMIN)
  async updateBusiness(
    @CurrentUser('businessId') businessId: string,
    @Body() data: Partial<Business>,
  ) {
    return this.settingsService.updateBusinessProfile(businessId, data);
  }

  @Get('tax')
  async getTax(@CurrentUser('businessId') businessId: string) {
    return this.settingsService.getTaxSettings(businessId);
  }

  @Patch('tax')
  @Roles(TenantRole.TENANT_ADMIN)
  async updateTax(@CurrentUser('businessId') businessId: string, @Body() data: any) {
    return this.settingsService.updateTaxSettings(businessId, data);
  }

  @Get('invoice-template')
  async getInvoiceTemplate(@CurrentUser('businessId') businessId: string) {
    return this.settingsService.getInvoiceTemplate(businessId);
  }

  @Patch('invoice-template')
  @Roles(TenantRole.TENANT_ADMIN)
  async updateInvoiceTemplate(@CurrentUser('businessId') businessId: string, @Body() data: any) {
    return this.settingsService.updateInvoiceTemplate(businessId, data);
  }

  @Get('notifications')
  async getNotifications(@CurrentUser('businessId') businessId: string) {
    return this.settingsService.getNotifications(businessId);
  }

  @Patch('notifications')
  @Roles(TenantRole.TENANT_ADMIN)
  async updateNotifications(@CurrentUser('businessId') businessId: string, @Body() data: any) {
    return this.settingsService.updateNotifications(businessId, data);
  }

  @Get('integrations')
  async getIntegrations(@CurrentUser('businessId') businessId: string) {
    return this.settingsService.getIntegrations(businessId);
  }

  @Patch('integrations')
  @Roles(TenantRole.TENANT_ADMIN)
  async updateIntegrations(@CurrentUser('businessId') businessId: string, @Body() data: any) {
    return this.settingsService.updateIntegrations(businessId, data);
  }
}
