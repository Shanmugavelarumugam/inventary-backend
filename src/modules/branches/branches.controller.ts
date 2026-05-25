import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Param,
  Patch,
} from '@nestjs/common';
import { BranchesService } from './branches.service.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { TenantGuard } from '../../common/guards/tenant.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { TenantRole } from '../../common/enums/tenant-role.enum.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { RequestUser } from '../../common/interfaces/authenticated-request.interface.js';
import { Branch } from '../../database/entities/branch.entity.js';

@Controller('tenant/branches')
@UseGuards(JwtAuthGuard, TenantGuard)
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  @Get()
  @Roles(
    TenantRole.TENANT_ADMIN,
    TenantRole.BUSINESS_MANAGER,
    TenantRole.INVENTORY_MANAGER,
    TenantRole.FINANCE_MANAGER,
  )
  async findAll(@CurrentUser() user: RequestUser) {
    // If SALES_STAFF, only return their assigned branch
    if (user.role === TenantRole.SALES_STAFF && user.branchId) {
      const branch = await this.branchesService.findOne(
        user.branchId,
        user.businessId as string,
      );
      return [branch];
    }
    return this.branchesService.findAll(user.businessId as string);
  }

  @Get('performance')
  @Roles(
    TenantRole.TENANT_ADMIN,
    TenantRole.BUSINESS_MANAGER,
    TenantRole.FINANCE_MANAGER,
  )
  async getPerformance(@CurrentUser('businessId') businessId: string) {
    return this.branchesService.getPerformance(businessId);
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @CurrentUser('businessId') businessId: string,
  ) {
    return this.branchesService.findOne(id, businessId);
  }

  @Post()
  @Roles(TenantRole.TENANT_ADMIN, TenantRole.BUSINESS_MANAGER)
  async create(
    @CurrentUser('businessId') businessId: string,
    @Body() data: Partial<Branch>,
  ) {
    return this.branchesService.create(businessId, data);
  }

  @Patch(':id')
  @Roles(TenantRole.TENANT_ADMIN, TenantRole.BUSINESS_MANAGER)
  async update(
    @Param('id') id: string,
    @CurrentUser('businessId') businessId: string,
    @Body() data: Partial<Branch>,
  ) {
    return this.branchesService.update(id, businessId, data);
  }

  @Get(':id/inventory')
  @Roles(
    TenantRole.TENANT_ADMIN,
    TenantRole.BUSINESS_MANAGER,
    TenantRole.INVENTORY_MANAGER,
  )
  async getInventory(
    @Param('id') id: string,
    @CurrentUser('businessId') businessId: string,
  ) {
    return this.branchesService.getBranchInventory(id, businessId);
  }

  @Post(':id/assign')
  @Roles(TenantRole.TENANT_ADMIN, TenantRole.BUSINESS_MANAGER)
  async assignUser(
    @Param('id') branchId: string,
    @CurrentUser('businessId') businessId: string,
    @Body('userId') userId: string,
  ) {
    return this.branchesService.assignUser(userId, branchId, businessId);
  }
}
