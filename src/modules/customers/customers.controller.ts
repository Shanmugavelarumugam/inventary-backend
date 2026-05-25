import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Param,
  Patch,
} from '@nestjs/common';
import { CustomersService } from './customers.service.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { TenantGuard } from '../../common/guards/tenant.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { TenantRole } from '../../common/enums/tenant-role.enum.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Customer } from '../../database/entities/customer.entity.js';
import { LedgerEntryType } from '../../common/enums/customer.enum.js';

export class CreateCustomerDto implements Partial<Customer> {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  gstNumber?: string;
  type?: any;
  status?: any;
}

@Controller('tenant/customers')
@UseGuards(JwtAuthGuard, TenantGuard)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  @Roles(
    TenantRole.TENANT_ADMIN,
    TenantRole.BUSINESS_MANAGER,
    TenantRole.SALES_STAFF,
    TenantRole.FINANCE_MANAGER,
  )
  async findAll(@CurrentUser('businessId') businessId: string) {
    return this.customersService.findAll(businessId);
  }

  @Get('analytics')
  @Roles(
    TenantRole.TENANT_ADMIN,
    TenantRole.BUSINESS_MANAGER,
    TenantRole.FINANCE_MANAGER,
  )
  async getAnalytics(@CurrentUser('businessId') businessId: string) {
    return this.customersService.getAnalytics(businessId);
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @CurrentUser('businessId') businessId: string,
  ) {
    return this.customersService.findOne(id, businessId);
  }

  @Post()
  @Roles(
    TenantRole.TENANT_ADMIN,
    TenantRole.BUSINESS_MANAGER,
    TenantRole.SALES_STAFF,
  )
  async create(
    @CurrentUser('businessId') businessId: string,
    @Body() data: CreateCustomerDto,
  ) {
    return this.customersService.create(businessId, data);
  }

  @Patch(':id')
  @Roles(
    TenantRole.TENANT_ADMIN,
    TenantRole.BUSINESS_MANAGER,
    TenantRole.SALES_STAFF,
  )
  async update(
    @Param('id') id: string,
    @CurrentUser('businessId') businessId: string,
    @Body() data: Partial<CreateCustomerDto>,
  ) {
    return this.customersService.update(id, businessId, data);
  }

  @Get(':id/ledger')
  @Roles(
    TenantRole.TENANT_ADMIN,
    TenantRole.BUSINESS_MANAGER,
    TenantRole.FINANCE_MANAGER,
  )
  async getLedger(
    @Param('id') id: string,
    @CurrentUser('businessId') businessId: string,
  ) {
    return this.customersService.getLedger(id, businessId);
  }

  @Post(':id/payment')
  @Roles(
    TenantRole.TENANT_ADMIN,
    TenantRole.BUSINESS_MANAGER,
    TenantRole.FINANCE_MANAGER,
  )
  async addPayment(
    @Param('id') id: string,
    @CurrentUser('businessId') businessId: string,
    @Body() data: { amount: number; reference?: string; notes?: string },
  ) {
    // A payment decreases the customer balance (debt)
    return this.customersService.updateBalance(
      businessId,
      id,
      -Math.abs(data.amount), // Always negative for payments
      LedgerEntryType.PAYMENT,
      undefined,
      data.reference,
      data.notes,
    );
  }
}
