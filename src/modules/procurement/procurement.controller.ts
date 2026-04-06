import { Controller, Get, Post, Body, UseGuards, Param, Patch } from '@nestjs/common';
import { ProcurementService } from './procurement.service.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { TenantGuard } from '../../common/guards/tenant.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { TenantRole } from '../../common/enums/tenant-role.enum.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';

@Controller('procurement')
@UseGuards(JwtAuthGuard, TenantGuard)
export class ProcurementController {
  constructor(private readonly procurementService: ProcurementService) {}

  // --- Suppliers ---
  @Get('suppliers')
  async findAllSuppliers(@CurrentUser('businessId') businessId: string) {
    return this.procurementService.findAllSuppliers(businessId);
  }

  @Post('suppliers')
  @Roles(TenantRole.TENANT_ADMIN, TenantRole.BUSINESS_MANAGER)
  async createSupplier(
    @CurrentUser('businessId') businessId: string,
    @Body() data: any,
  ) {
    return this.procurementService.createSupplier(businessId, data);
  }

  // --- Purchase Orders (PO) ---
  @Get('po')
  @Roles(TenantRole.TENANT_ADMIN, TenantRole.BUSINESS_MANAGER, TenantRole.INVENTORY_MANAGER, TenantRole.FINANCE_MANAGER)
  async findAllPOs(@CurrentUser('businessId') businessId: string) {
    return this.procurementService.findAllPOs(businessId);
  }

  @Post('po')
  @Roles(TenantRole.TENANT_ADMIN, TenantRole.BUSINESS_MANAGER, TenantRole.INVENTORY_MANAGER)
  async createPO(
    @CurrentUser('businessId') businessId: string,
    @CurrentUser('id') userId: string,
    @Body() data: any,
  ) {
    return this.procurementService.createPO(businessId, userId, data);
  }

  @Patch('po/:id/status')
  @Roles(TenantRole.TENANT_ADMIN, TenantRole.BUSINESS_MANAGER)
  async updatePOStatus(
    @Param('id') id: string,
    @CurrentUser('businessId') businessId: string,
    @Body('status') status: any,
  ) {
    return this.procurementService.updatePOStatus(id, businessId, status);
  }

  // --- Goods Receipt (GRN) ---
  @Get('grn')
  @Roles(TenantRole.TENANT_ADMIN, TenantRole.BUSINESS_MANAGER, TenantRole.INVENTORY_MANAGER, TenantRole.FINANCE_MANAGER)
  async findAllGRNs(@CurrentUser('businessId') businessId: string) {
    return this.procurementService.findAllGRNs(businessId);
  }

  @Post('grn')
  @Roles(TenantRole.TENANT_ADMIN, TenantRole.BUSINESS_MANAGER, TenantRole.INVENTORY_MANAGER)
  async createGRN(
    @CurrentUser('businessId') businessId: string,
    @CurrentUser('id') userId: string,
    @Body() data: any,
  ) {
    return this.procurementService.createGRN(businessId, userId, data);
  }

  // --- Invoices ---
  @Get('invoices')
  @Roles(TenantRole.TENANT_ADMIN, TenantRole.BUSINESS_MANAGER, TenantRole.FINANCE_MANAGER, TenantRole.INVENTORY_MANAGER)
  async findAllInvoices(@CurrentUser('businessId') businessId: string) {
    return this.procurementService.findAllInvoices(businessId);
  }

  @Post('invoices')
  @Roles(TenantRole.TENANT_ADMIN, TenantRole.BUSINESS_MANAGER, TenantRole.FINANCE_MANAGER)
  async createInvoice(
    @CurrentUser('businessId') businessId: string,
    @Body() data: any,
  ) {
    return this.procurementService.createInvoice(businessId, data);
  }

  // --- Payments ---
  @Post('payments')
  @Roles(TenantRole.TENANT_ADMIN, TenantRole.BUSINESS_MANAGER, TenantRole.FINANCE_MANAGER)
  async recordPayment(
    @CurrentUser('businessId') businessId: string,
    @Body() data: any,
  ) {
    return this.procurementService.recordPayment(businessId, data);
  }

  // Legacy Purchases (Backward Compatibility)
  @Get('purchases')
  async findAllPurchases(@CurrentUser('businessId') businessId: string) {
    return this.procurementService.findAllPurchases(businessId);
  }

  @Post('purchases')
  @Roles(TenantRole.TENANT_ADMIN, TenantRole.BUSINESS_MANAGER, TenantRole.FINANCE_MANAGER)
  async createPurchase(
    @CurrentUser('businessId') businessId: string,
    @CurrentUser('id') userId: string,
    @Body() data: any,
  ) {
    return this.procurementService.createPurchase(businessId, userId, data);
  }

  @Patch('purchases/:id/confirm')
  @Roles(TenantRole.TENANT_ADMIN, TenantRole.BUSINESS_MANAGER)
  async confirmPurchase(
    @Param('id') id: string,
    @CurrentUser('businessId') businessId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.procurementService.confirmPurchase(id, businessId, userId);
  }
}
