import { Controller, Get, Post, Body, UseGuards, Param, Patch } from '@nestjs/common';
import { BranchesService } from './branches.service.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { TenantGuard } from '../../common/guards/tenant.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { TenantRole } from '../../common/enums/tenant-role.enum.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';

@Controller('branches')
@UseGuards(JwtAuthGuard, TenantGuard)
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  // Branch CRUD
  @Get()
  async findAll(@CurrentUser('businessId') businessId: string) {
    return this.branchesService.findAllBranches(businessId);
  }

  @Post()
  @Roles(TenantRole.TENANT_ADMIN, TenantRole.BUSINESS_MANAGER)
  async create(
    @CurrentUser('businessId') businessId: string,
    @Body() data: any,
  ) {
    return this.branchesService.createBranch(businessId, data);
  }

  // Stock Transfers
  @Get('transfers')
  async findAllTransfers(@CurrentUser('businessId') businessId: string) {
    return this.branchesService.findAllTransfers(businessId);
  }

  @Post('transfers/initiate')
  @Roles(TenantRole.TENANT_ADMIN, TenantRole.BUSINESS_MANAGER)
  async initiateTransfer(
    @CurrentUser('businessId') businessId: string,
    @CurrentUser('id') userId: string,
    @Body() data: any,
  ) {
    return this.branchesService.initiateTransfer(businessId, userId, data);
  }

  @Patch('transfers/:id/receive')
  @Roles(TenantRole.TENANT_ADMIN, TenantRole.BUSINESS_MANAGER)
  async receiveTransfer(
    @Param('id') id: string,
    @CurrentUser('businessId') businessId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.branchesService.receiveTransfer(id, businessId, userId);
  }
}
