import { Controller, Get, Post, Body, Query, UseGuards, Param } from '@nestjs/common';
import { StockMovementsService } from './movements.service.js';
import { MovementType } from '../../../database/entities/stock-movement.entity.js';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard.js';
import { TenantGuard } from '../../../common/guards/tenant.guard.js';
import { Roles } from '../../../common/decorators/roles.decorator.js';
import { TenantRole } from '../../../common/enums/tenant-role.enum.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';

@Controller('inventory/movements')
@UseGuards(JwtAuthGuard, TenantGuard)
export class StockMovementsController {
  constructor(private readonly movementsService: StockMovementsService) {}

  @Get()
  async findAll(
    @CurrentUser('businessId') businessId: string,
    @Query('productId') productId?: string,
  ) {
    return this.movementsService.findAll(businessId, productId);
  }

  @Post('adjust')
  @Roles(TenantRole.TENANT_ADMIN, TenantRole.BUSINESS_MANAGER, TenantRole.INVENTORY_MANAGER)
  async adjust(
    @CurrentUser('businessId') businessId: string,
    @CurrentUser('id') userId: string,
    @Body() data: { 
      productId: string; 
      quantity: number; 
      type: MovementType; 
      reason?: string;
      reference?: string;
      branchId?: string;
    },
  ) {
    return this.movementsService.adjustStock(
      businessId,
      data.productId,
      data.quantity,
      data.type,
      userId,
      data.reason,
      data.reference,
      data.branchId,
    );
  }
}
