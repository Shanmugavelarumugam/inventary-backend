import { Controller, Get, Post, Body, UseGuards, Param, Patch } from '@nestjs/common';
import { SalesService } from './sales.service.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { TenantGuard } from '../../common/guards/tenant.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { TenantRole } from '../../common/enums/tenant-role.enum.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';

@Controller('tenant/sales')
@UseGuards(JwtAuthGuard, TenantGuard)
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Get('invoices')
  async findAllInvoices(@CurrentUser('businessId') businessId: string) {
    return this.salesService.findAllInvoices(businessId);
  }

  @Get('invoices/:id')
  async findOneInvoice(
    @CurrentUser('businessId') businessId: string,
    @Param('id') id: string,
  ) {
    return this.salesService.findOneInvoice(id, businessId);
  }

  @Post('invoices')
  @Roles(TenantRole.TENANT_ADMIN, TenantRole.BUSINESS_MANAGER, TenantRole.SALES_STAFF)
  async createInvoice(
    @CurrentUser('businessId') businessId: string,
    @CurrentUser('userId') userId: string,
    @Body() data: any,
  ) {
    return this.salesService.processSale(businessId, userId, data);
  }

  @Patch('invoices/:id')
  @Roles(TenantRole.TENANT_ADMIN, TenantRole.BUSINESS_MANAGER)
  async updateInvoice(
    @Param('id') id: string,
    @CurrentUser('businessId') businessId: string,
    @Body() data: any,
  ) {
    // Basic status update for now
    return this.salesService.updateInvoice(id, businessId, data);
  }

  @Post('invoices/:id/payment')
  @Roles(TenantRole.TENANT_ADMIN, TenantRole.BUSINESS_MANAGER, TenantRole.SALES_STAFF)
  async addPayment(
    @Param('id') id: string,
    @CurrentUser('businessId') businessId: string,
    @Body() data: any,
  ) {
    return this.salesService.processPayment(id, businessId, data);
  }

  @Post('invoices/:id/return')
  @Roles(TenantRole.TENANT_ADMIN, TenantRole.BUSINESS_MANAGER)
  async processReturn(
    @Param('id') id: string,
    @CurrentUser('businessId') businessId: string,
    @CurrentUser('userId') userId: string,
    @Body() data: any,
  ) {
    return this.salesService.processReturn(id, businessId, userId, data);
  }

  @Get('orders')
  async findAllOrders(@CurrentUser('businessId') businessId: string) {
    // Orders can be an alias to all sales or special status invoices
    return this.salesService.findAllInvoices(businessId);
  }

  @Post('quotes')
  @Roles(TenantRole.TENANT_ADMIN, TenantRole.BUSINESS_MANAGER, TenantRole.SALES_STAFF)
  async createQuote(
    @CurrentUser('businessId') businessId: string,
    @CurrentUser('userId') userId: string,
    @Body() data: any,
  ) {
    // Create as DRAFT invoice for now
    return this.salesService.processSale(businessId, userId, { ...data, status: 'DRAFT' });
  }

  @Get('payments')
  async findAllPayments(@CurrentUser('businessId') businessId: string) {
    // In POS context, this lists all processed invoice payments
    return this.salesService.findAllInvoices(businessId);
  }
}
