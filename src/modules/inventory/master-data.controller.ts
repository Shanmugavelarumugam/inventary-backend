import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { MasterDataService } from './master-data.service.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { TenantGuard } from '../../common/guards/tenant.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { TenantRole } from '../../common/enums/tenant-role.enum.js';

import { CurrentUser } from '../../common/decorators/current-user.decorator.js';

@Controller('inventory/master-data')
@UseGuards(JwtAuthGuard, TenantGuard)
export class MasterDataController {
  constructor(private readonly masterDataService: MasterDataService) {}

  @Get('categories')
  async getCategories(@CurrentUser('businessId') businessId: string) {
    return this.masterDataService.getCategories(businessId);
  }

  @Post('categories')
  @Roles(TenantRole.TENANT_ADMIN, TenantRole.BUSINESS_MANAGER, TenantRole.INVENTORY_MANAGER)
  async createCategory(
    @CurrentUser('businessId') businessId: string,
    @Body() data: { name: string; description?: string },
  ) {
    return this.masterDataService.createCategory(businessId, data.name, data.description);
  }

  @Get('units')
  async getUnits(@CurrentUser('businessId') businessId: string) {
    return this.masterDataService.getUnits(businessId);
  }

  @Post('units')
  @Roles(TenantRole.TENANT_ADMIN, TenantRole.BUSINESS_MANAGER, TenantRole.INVENTORY_MANAGER)
  async createUnit(
    @CurrentUser('businessId') businessId: string,
    @Body() data: { name: string; shortName?: string },
  ) {
    return this.masterDataService.createUnit(businessId, data.name, data.shortName);
  }

  @Get('brands')
  async getBrands(@CurrentUser('businessId') businessId: string) {
    return this.masterDataService.getBrands(businessId);
  }

  @Post('brands')
  @Roles(TenantRole.TENANT_ADMIN, TenantRole.BUSINESS_MANAGER, TenantRole.INVENTORY_MANAGER)
  async createBrand(
    @CurrentUser('businessId') businessId: string,
    @Body() data: { name: string },
  ) {
    return this.masterDataService.createBrand(businessId, data.name);
  }
}
