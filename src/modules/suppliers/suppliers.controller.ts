import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Param,
  Patch,
} from '@nestjs/common';
import { SuppliersService } from './suppliers.service.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { TenantGuard } from '../../common/guards/tenant.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { TenantRole } from '../../common/enums/tenant-role.enum.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Supplier } from '../../database/entities/supplier.entity.js';
import { SupplierLedgerType } from '../../common/enums/supplier.enum.js';

@Controller('tenant/suppliers')
@UseGuards(JwtAuthGuard, TenantGuard)
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Get()
  @Roles(
    TenantRole.TENANT_ADMIN,
    TenantRole.BUSINESS_MANAGER,
    TenantRole.INVENTORY_MANAGER,
    TenantRole.FINANCE_MANAGER,
  )
  async findAll(@CurrentUser('businessId') businessId: string) {
    return this.suppliersService.findAll(businessId);
  }

  @Get('analytics')
  @Roles(
    TenantRole.TENANT_ADMIN,
    TenantRole.BUSINESS_MANAGER,
    TenantRole.FINANCE_MANAGER,
  )
  async getAnalytics(@CurrentUser('businessId') businessId: string) {
    return this.suppliersService.getAnalytics(businessId);
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @CurrentUser('businessId') businessId: string,
  ) {
    return this.suppliersService.findOne(id, businessId);
  }

  @Post()
  @Roles(
    TenantRole.TENANT_ADMIN,
    TenantRole.BUSINESS_MANAGER,
    TenantRole.INVENTORY_MANAGER,
  )
  async create(
    @CurrentUser('businessId') businessId: string,
    @Body() data: Partial<Supplier>,
  ) {
    return this.suppliersService.create(businessId, data);
  }

  @Patch(':id')
  @Roles(
    TenantRole.TENANT_ADMIN,
    TenantRole.BUSINESS_MANAGER,
    TenantRole.INVENTORY_MANAGER,
  )
  async update(
    @Param('id') id: string,
    @CurrentUser('businessId') businessId: string,
    @Body() data: Partial<Supplier>,
  ) {
    return this.suppliersService.update(id, businessId, data);
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
    return this.suppliersService.getLedger(id, businessId);
  }

  @Post(':id/ledger/payment')
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
    // A payment decreases our debt to the supplier
    return this.suppliersService.updateBalance(
      businessId,
      id,
      -Math.abs(data.amount), // Always negative for payments
      SupplierLedgerType.PAYMENT,
      undefined,
      data.reference,
      data.notes,
    );
  }
}
