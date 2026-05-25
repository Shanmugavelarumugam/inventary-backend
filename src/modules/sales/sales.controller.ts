import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Param,
  Patch,
} from '@nestjs/common';
import { SalesService } from './sales.service.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { TenantGuard } from '../../common/guards/tenant.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { TenantRole } from '../../common/enums/tenant-role.enum.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import {
  SalesOrderStatus,
  SalesSource,
} from '../../common/enums/sales.enum.js';
import { PaymentMethod } from '../../database/entities/invoice.entity.js';
import { SalesOrder } from '../../database/entities/sales-order.entity.js';

export class ProcessSaleDto {
  customerId?: string;
  items: {
    productId: string;
    quantity: number;
    unitPrice: number;
    taxRate?: number;
  }[];
  paymentMethod: PaymentMethod;
  discountAmount?: number;
  source?: SalesSource;
  orderId?: string;
}

export class CreateOrderDto implements Partial<SalesOrder> {
  customerId?: string;
  totalAmount?: number;
  notes?: string;
}

export class ProcessReturnDto {
  invoiceId: string;
  reason?: string;
  refundAmount: number;
  items: { productId: string; quantity: number }[];
}

@Controller('tenant/sales')
@UseGuards(JwtAuthGuard, TenantGuard)
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  // --- Invoices & POS ---
  @Get('invoices')
  async findAllInvoices(@CurrentUser('businessId') businessId: string) {
    return this.salesService.findAllInvoices(businessId);
  }

  @Post('invoices')
  @Roles(
    TenantRole.TENANT_ADMIN,
    TenantRole.BUSINESS_MANAGER,
    TenantRole.SALES_STAFF,
  )
  async createInvoice(
    @CurrentUser('businessId') businessId: string,
    @CurrentUser('userId') userId: string,
    @Body() data: ProcessSaleDto,
  ) {
    return this.salesService.processSale(businessId, userId, data);
  }

  // --- Orders ---
  @Get('orders')
  async findAllOrders(@CurrentUser('businessId') businessId: string) {
    return this.salesService.findAllOrders(businessId);
  }

  @Post('orders')
  @Roles(
    TenantRole.TENANT_ADMIN,
    TenantRole.BUSINESS_MANAGER,
    TenantRole.SALES_STAFF,
  )
  async createOrder(
    @CurrentUser('businessId') businessId: string,
    @CurrentUser('userId') userId: string,
    @Body() data: CreateOrderDto,
  ) {
    return this.salesService.createOrder(businessId, userId, data);
  }

  @Patch('orders/:id/status')
  @Roles(
    TenantRole.TENANT_ADMIN,
    TenantRole.BUSINESS_MANAGER,
    TenantRole.SALES_STAFF,
  )
  async updateOrderStatus(
    @Param('id') id: string,
    @CurrentUser('businessId') businessId: string,
    @Body('status') status: SalesOrderStatus,
  ) {
    return this.salesService.updateOrderStatus(id, businessId, status);
  }

  // --- Returns ---
  @Post('returns')
  @Roles(TenantRole.TENANT_ADMIN, TenantRole.BUSINESS_MANAGER)
  async processReturn(
    @CurrentUser('businessId') businessId: string,
    @CurrentUser('userId') userId: string,
    @Body() data: ProcessReturnDto,
  ) {
    return this.salesService.processReturn(businessId, userId, data);
  }

  // --- Analytics ---
  @Get('analytics')
  @Roles(
    TenantRole.TENANT_ADMIN,
    TenantRole.BUSINESS_MANAGER,
    TenantRole.FINANCE_MANAGER,
  )
  async getAnalytics(@CurrentUser('businessId') businessId: string) {
    return this.salesService.getSalesAnalytics(businessId);
  }
}
