import { Controller, Get, Post, Body, UseGuards, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard.js';
import { TenantGuard } from '../../../common/guards/tenant.guard.js';
import { Roles } from '../../../common/decorators/roles.decorator.js';
import { TenantRole } from '../../../common/enums/tenant-role.enum.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { ProductsService } from '../../inventory/products/products.service.js';
import { StockMovementsService } from '../../inventory/movements/movements.service.js';
import { BranchesService } from '../../branches/branches.service.js';
import { Product } from '../../../database/entities/product.entity.js';
import { MovementType } from '../../../database/entities/stock-movement.entity.js';

@Controller('tenant/inventory')
@UseGuards(JwtAuthGuard, TenantGuard)
export class TenantInventoryController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly stockMovementsService: StockMovementsService,
    private readonly branchesService: BranchesService,
  ) {}

  @Get('stock-overview')
  async getStockOverview(@CurrentUser('businessId') businessId: string) {
    return this.productsService.findAll(businessId);
  }

  @Post('stock-in')
  @Roles(
    TenantRole.TENANT_ADMIN,
    TenantRole.BUSINESS_MANAGER,
    TenantRole.INVENTORY_MANAGER,
  )
  async stockIn(
    @CurrentUser('businessId') businessId: string,
    @CurrentUser('userId') userId: string,
    @Body()
    data: {
      productId: string;
      quantity: number;
      warehouseId?: string;
      supplierId?: string;
      batch?: string;
    },
  ) {
    return this.stockMovementsService.adjustStock(
      businessId,
      data.productId,
      data.quantity,
      MovementType.IN,
      userId,
      `Stock In - Batch: ${data.batch || 'N/A'}`,
      data.supplierId,
      data.warehouseId,
    );
  }

  @Post('stock-out')
  @Roles(
    TenantRole.TENANT_ADMIN,
    TenantRole.BUSINESS_MANAGER,
    TenantRole.INVENTORY_MANAGER,
  )
  async stockOut(
    @CurrentUser('businessId') businessId: string,
    @CurrentUser('userId') userId: string,
    @Body() data: { productId: string; quantity: number; reason?: string },
  ) {
    return this.stockMovementsService.adjustStock(
      businessId,
      data.productId,
      -data.quantity,
      MovementType.OUT,
      userId,
      data.reason || 'Manual Stock Out',
    );
  }

  @Post('transfer')
  @Roles(TenantRole.TENANT_ADMIN, TenantRole.BUSINESS_MANAGER)
  async transfer(
    @CurrentUser('businessId') businessId: string,
    @CurrentUser('userId') userId: string,
    @Body()
    data: {
      productId: string;
      requestedQuantity: number;
      fromBranchId: string;
      toBranchId: string;
      notes?: string;
    },
  ) {
    return await this.branchesService.initiateTransfer(
      businessId,
      userId,
      data,
    );
  }

  @Post('adjustment')
  @Roles(TenantRole.TENANT_ADMIN, TenantRole.BUSINESS_MANAGER)
  async adjustment(
    @CurrentUser('businessId') businessId: string,
    @CurrentUser('userId') userId: string,
    @Body() data: { productId: string; quantity: number; reason?: string },
  ) {
    return this.stockMovementsService.adjustStock(
      businessId,
      data.productId,
      data.quantity,
      MovementType.ADJUSTMENT,
      userId,
      data.reason || 'Manual Adjustment',
    );
  }

  @Post('damage')
  @Roles(
    TenantRole.TENANT_ADMIN,
    TenantRole.BUSINESS_MANAGER,
    TenantRole.INVENTORY_MANAGER,
  )
  async damage(
    @CurrentUser('businessId') businessId: string,
    @CurrentUser('userId') userId: string,
    @Body() data: { productId: string; quantity: number; reason?: string },
  ) {
    return this.stockMovementsService.adjustStock(
      businessId,
      data.productId,
      -data.quantity,
      MovementType.DAMAGE,
      userId,
      data.reason || 'Damage Record',
    );
  }

  @Get('expiry-alerts')
  async getExpiryAlerts(@CurrentUser('businessId') businessId: string) {
    // Current ProductsService doesn't have a specific expiry method beyond what's in Analytics
    // For now we reuse the Analytics logic via the service if available or implement filter here
    const products = await this.productsService.findAll(businessId);
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    return products.items.filter(
      (p: Product) =>
        p.expiryDate &&
        new Date(p.expiryDate) <= sevenDaysFromNow &&
        new Date(p.expiryDate) >= new Date(),
    );
  }

  @Post('stock-count')
  @Roles(TenantRole.TENANT_ADMIN, TenantRole.BUSINESS_MANAGER)
  async stockCount(
    @CurrentUser('businessId') businessId: string,
    @CurrentUser('userId') userId: string,
    @Body() data: { productId: string; actualQuantity: number },
  ) {
    const product = await this.productsService.findOne(
      data.productId,
      businessId,
    );
    const difference = data.actualQuantity - product.stockQty;

    if (difference === 0) return product;

    return this.stockMovementsService.adjustStock(
      businessId,
      data.productId,
      difference,
      MovementType.ADJUSTMENT,
      userId,
      'Stock Count Adjustment',
    );
  }

  @Get('movements')
  async getMovements(
    @CurrentUser('businessId') businessId: string,
    @Query('productId') productId?: string,
  ) {
    return this.stockMovementsService.findAll(businessId, productId);
  }

  @Post('movements/adjust')
  @Roles(
    TenantRole.TENANT_ADMIN,
    TenantRole.BUSINESS_MANAGER,
    TenantRole.INVENTORY_MANAGER,
  )
  async adjust(
    @CurrentUser('businessId') businessId: string,
    @CurrentUser('userId') userId: string,
    @Body()
    data: {
      productId: string;
      quantity: number;
      type: MovementType;
      reason?: string;
      reference?: string;
      branchId?: string;
    },
  ) {
    return this.stockMovementsService.adjustStock(
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

  @Get('movements/verify-integrity')
  @Roles(TenantRole.TENANT_ADMIN, TenantRole.BUSINESS_MANAGER)
  async verifyIntegrity(@CurrentUser('businessId') businessId: string) {
    return this.stockMovementsService.verifyIntegrity(businessId);
  }
}
