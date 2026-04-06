import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Patch, 
  Delete, 
  Param, 
  UseGuards 
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard.js';
import { TenantGuard } from '../../../common/guards/tenant.guard.js';
import { Roles } from '../../../common/decorators/roles.decorator.js';
import { TenantRole } from '../../../common/enums/tenant-role.enum.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { CustomersService } from './customers.service.js';
import { Customer } from '../../../database/entities/customer.entity.js';

@Controller('tenant/customers')
@UseGuards(JwtAuthGuard, TenantGuard)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  async findAll(@CurrentUser('businessId') businessId: string) {
    return this.customersService.findAll(businessId);
  }

  @Get(':id')
  async findOne(
    @CurrentUser('businessId') businessId: string,
    @Param('id') id: string,
  ) {
    return this.customersService.findOne(id, businessId);
  }

  @Post()
  @Roles(TenantRole.TENANT_ADMIN, TenantRole.BUSINESS_MANAGER, TenantRole.SALES_STAFF)
  async create(
    @CurrentUser('businessId') businessId: string,
    @Body() data: Partial<Customer>,
  ) {
    return this.customersService.create(businessId, data);
  }

  @Patch(':id')
  @Roles(TenantRole.TENANT_ADMIN, TenantRole.BUSINESS_MANAGER)
  async update(
    @CurrentUser('businessId') businessId: string,
    @Param('id') id: string,
    @Body() data: Partial<Customer>,
  ) {
    return this.customersService.update(id, businessId, data);
  }

  @Delete(':id')
  @Roles(TenantRole.TENANT_ADMIN)
  async delete(
    @CurrentUser('businessId') businessId: string,
    @Param('id') id: string,
  ) {
    return this.customersService.delete(id, businessId);
  }

  @Get(':id/ledger')
  async getLedger(@Param('id') id: string, @CurrentUser('businessId') businessId: string) {
    return this.customersService.getLedger(id, businessId);
  }

  @Get(':id/invoices')
  async getInvoices(@Param('id') id: string, @CurrentUser('businessId') businessId: string) {
    return this.customersService.getInvoices(id, businessId);
  }
}
