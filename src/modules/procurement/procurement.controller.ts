import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Param,
  Patch,
} from '@nestjs/common';
import { ProcurementService } from './procurement.service.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { TenantGuard } from '../../common/guards/tenant.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { TenantRole } from '../../common/enums/tenant-role.enum.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Supplier } from '../../database/entities/supplier.entity.js';
import { POStatus } from '../../database/entities/purchase-order.entity.js';
import { PaymentMode } from '../../database/entities/supplier-payment.entity.js';

export class CreateSupplierDto implements Partial<Supplier> {
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  gstNumber?: string;
  type?: any; // Enum handling
  status?: any;
}

export class CreatePODto {
  supplierId: string;
  expectedDate?: Date;
  notes?: string;
  items: {
    productId: string;
    quantity: number;
    unitPrice: number;
    taxAmount?: number;
  }[];
}

export class CreateGRNDto {
  poId: string;
  receivedDate?: Date;
  notes?: string;
  items: {
    productId: string;
    quantityReceived: number;
    batchNumber?: string;
    expiryDate?: Date;
  }[];
}

export class CreateInvoiceDto {
  poId: string;
  invoiceNumber: string;
  totalAmount: number;
  dueDate?: Date;
}

export class RecordPaymentDto {
  invoiceId: string;
  amount: number;
  paymentDate?: Date;
  paymentMode?: PaymentMode;
  referenceNumber?: string;
  notes?: string;
}

export class CreatePurchaseDto {
  supplierId: string;
  billNumber?: string;
  purchaseDate?: Date;
  items: {
    productId: string;
    quantity: number;
    unitPrice: number;
    taxAmount?: number;
    batchNumber?: string;
    expiryDate?: Date;
  }[];
}

@Controller('procurement')
@UseGuards(JwtAuthGuard, TenantGuard)
export class ProcurementController {
  constructor(private readonly procurementService: ProcurementService) {}

  // --- Purchase Orders (PO) ---
  @Get('po')
  @Roles(
    TenantRole.TENANT_ADMIN,
    TenantRole.BUSINESS_MANAGER,
    TenantRole.INVENTORY_MANAGER,
    TenantRole.FINANCE_MANAGER,
  )
  async findAllPOs(@CurrentUser('businessId') businessId: string) {
    return this.procurementService.findAllPOs(businessId);
  }

  @Post('po')
  @Roles(
    TenantRole.TENANT_ADMIN,
    TenantRole.BUSINESS_MANAGER,
    TenantRole.INVENTORY_MANAGER,
  )
  async createPO(
    @CurrentUser('businessId') businessId: string,
    @CurrentUser('id') userId: string,
    @Body() data: CreatePODto,
  ) {
    return this.procurementService.createPO(businessId, userId, data);
  }

  @Patch('po/:id/status')
  @Roles(TenantRole.TENANT_ADMIN, TenantRole.BUSINESS_MANAGER)
  async updatePOStatus(
    @Param('id') id: string,
    @CurrentUser('businessId') businessId: string,
    @Body('status') status: POStatus,
  ) {
    return this.procurementService.updatePOStatus(id, businessId, status);
  }

  // --- Goods Receipt (GRN) ---
  @Get('grn')
  @Roles(
    TenantRole.TENANT_ADMIN,
    TenantRole.BUSINESS_MANAGER,
    TenantRole.INVENTORY_MANAGER,
    TenantRole.FINANCE_MANAGER,
  )
  async findAllGRNs(@CurrentUser('businessId') businessId: string) {
    return this.procurementService.findAllGRNs(businessId);
  }

  @Post('grn')
  @Roles(
    TenantRole.TENANT_ADMIN,
    TenantRole.BUSINESS_MANAGER,
    TenantRole.INVENTORY_MANAGER,
  )
  async createGRN(
    @CurrentUser('businessId') businessId: string,
    @CurrentUser('id') userId: string,
    @Body() data: CreateGRNDto,
  ) {
    return this.procurementService.createGRN(businessId, userId, data);
  }

  // --- Invoices ---
  @Get('invoices')
  @Roles(
    TenantRole.TENANT_ADMIN,
    TenantRole.BUSINESS_MANAGER,
    TenantRole.FINANCE_MANAGER,
    TenantRole.INVENTORY_MANAGER,
  )
  async findAllInvoices(@CurrentUser('businessId') businessId: string) {
    return this.procurementService.findAllInvoices(businessId);
  }

  @Post('invoices')
  @Roles(
    TenantRole.TENANT_ADMIN,
    TenantRole.BUSINESS_MANAGER,
    TenantRole.FINANCE_MANAGER,
  )
  async createInvoice(
    @CurrentUser('businessId') businessId: string,
    @Body() data: CreateInvoiceDto,
  ) {
    return this.procurementService.createInvoice(businessId, data);
  }

  // --- Payments ---
  @Post('payments')
  @Roles(
    TenantRole.TENANT_ADMIN,
    TenantRole.BUSINESS_MANAGER,
    TenantRole.FINANCE_MANAGER,
  )
  async recordPayment(
    @CurrentUser('businessId') businessId: string,
    @Body() data: RecordPaymentDto,
  ) {
    return this.procurementService.recordPayment(businessId, data);
  }

  // Legacy Purchases (Backward Compatibility)
  @Get('purchases')
  async findAllPurchases(@CurrentUser('businessId') businessId: string) {
    return this.procurementService.findAllPurchases(businessId);
  }

  @Post('purchases')
  @Roles(
    TenantRole.TENANT_ADMIN,
    TenantRole.BUSINESS_MANAGER,
    TenantRole.FINANCE_MANAGER,
  )
  async createPurchase(
    @CurrentUser('businessId') businessId: string,
    @CurrentUser('id') userId: string,
    @Body() data: CreatePurchaseDto,
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

  @Get('analytics')
  @Roles(
    TenantRole.TENANT_ADMIN,
    TenantRole.BUSINESS_MANAGER,
    TenantRole.FINANCE_MANAGER,
  )
  async getAnalytics(@CurrentUser('businessId') businessId: string) {
    return this.procurementService.getProcurementAnalytics(businessId);
  }
}
