import { Controller, Get, Post, Body, UseGuards, Param } from '@nestjs/common';
import {
  StockTransfersService,
  InitiateTransferDto,
} from './transfers.service.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { TenantGuard } from '../../common/guards/tenant.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { TenantRole } from '../../common/enums/tenant-role.enum.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';

@Controller('tenant/transfers')
@UseGuards(JwtAuthGuard, TenantGuard)
export class StockTransfersController {
  constructor(private readonly transfersService: StockTransfersService) {}

  @Get()
  @Roles(
    TenantRole.TENANT_ADMIN,
    TenantRole.BUSINESS_MANAGER,
    TenantRole.INVENTORY_MANAGER,
  )
  async findAll(@CurrentUser('businessId') businessId: string) {
    return this.transfersService.findAll(businessId);
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @CurrentUser('businessId') businessId: string,
  ) {
    return this.transfersService.findOne(id, businessId);
  }

  @Post()
  @Roles(
    TenantRole.TENANT_ADMIN,
    TenantRole.BUSINESS_MANAGER,
    TenantRole.INVENTORY_MANAGER,
  )
  async initiate(
    @CurrentUser('userId') userId: string,
    @CurrentUser('businessId') businessId: string,
    @Body() data: InitiateTransferDto,
  ) {
    return this.transfersService.initiate(businessId, userId, data);
  }

  @Post(':id/dispatch')
  @Roles(
    TenantRole.TENANT_ADMIN,
    TenantRole.BUSINESS_MANAGER,
    TenantRole.INVENTORY_MANAGER,
  )
  async dispatch(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
    @CurrentUser('businessId') businessId: string,
  ) {
    return this.transfersService.dispatch(id, businessId, userId);
  }

  @Post(':id/receive')
  @Roles(
    TenantRole.TENANT_ADMIN,
    TenantRole.BUSINESS_MANAGER,
    TenantRole.INVENTORY_MANAGER,
  )
  async receive(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
    @CurrentUser('businessId') businessId: string,
  ) {
    return this.transfersService.receive(id, businessId, userId);
  }

  @Post(':id/cancel')
  @Roles(TenantRole.TENANT_ADMIN, TenantRole.BUSINESS_MANAGER)
  async cancel(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
    @CurrentUser('businessId') businessId: string,
  ) {
    return this.transfersService.cancel(id, businessId, userId);
  }
}
