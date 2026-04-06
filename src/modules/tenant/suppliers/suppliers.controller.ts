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
import { SuppliersService } from './suppliers.service.js';
import { Supplier } from '../../../database/entities/supplier.entity.js';

@Controller('tenant/suppliers')
@UseGuards(JwtAuthGuard, TenantGuard)
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Get()
  async findAll(@CurrentUser('businessId') businessId: string) {
    return this.suppliersService.findAll(businessId);
  }

  @Get(':id')
  async findOne(
    @CurrentUser('businessId') businessId: string,
    @Param('id') id: string,
  ) {
    return this.suppliersService.findOne(id, businessId);
  }

  @Post()
  @Roles(TenantRole.TENANT_ADMIN, TenantRole.BUSINESS_MANAGER)
  async create(
    @CurrentUser('businessId') businessId: string,
    @Body() data: Partial<Supplier>,
  ) {
    return this.suppliersService.create(businessId, data);
  }

  @Patch(':id')
  @Roles(TenantRole.TENANT_ADMIN, TenantRole.BUSINESS_MANAGER)
  async update(
    @CurrentUser('businessId') businessId: string,
    @Param('id') id: string,
    @Body() data: Partial<Supplier>,
  ) {
    return this.suppliersService.update(id, businessId, data);
  }

  @Delete(':id')
  @Roles(TenantRole.TENANT_ADMIN)
  async delete(
    @CurrentUser('businessId') businessId: string,
    @Param('id') id: string,
  ) {
    return this.suppliersService.delete(id, businessId);
  }

  @Get(':id/purchases')
  async getPurchases(@Param('id') id: string, @CurrentUser('businessId') businessId: string) {
    return this.suppliersService.getPurchases(id, businessId);
  }

  @Get(':id/payments')
  async getPayments(@Param('id') id: string, @CurrentUser('businessId') businessId: string) {
    return this.suppliersService.getPayments(id, businessId);
  }
}
