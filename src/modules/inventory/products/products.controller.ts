import { 
  Controller, 
  Get, 
  Post, 
  Patch, 
  Delete, 
  Body, 
  Param, 
  Query, 
  UseGuards 
} from '@nestjs/common';
import { ProductsService } from './products.service.js';
import { MasterDataService } from '../master-data.service.js';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard.js';
import { TenantGuard } from '../../../common/guards/tenant.guard.js';
import { Roles } from '../../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { TenantRole } from '../../../common/enums/tenant-role.enum.js';
import { Product, ProductStatus } from '../../../database/entities/product.entity.js';

@Controller('tenant/products')
@UseGuards(JwtAuthGuard, TenantGuard)
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly masterDataService: MasterDataService,
  ) {}

  @Get()
  async findAll(
    @CurrentUser('businessId') businessId: string,
    @Query('search') search?: string,
  ) {
    return this.productsService.findAll(businessId, search);
  }

  @Get('categories')
  async getCategories(@CurrentUser('businessId') businessId: string) {
    return this.masterDataService.getCategories(businessId);
  }

  @Post('categories')
  @Roles(TenantRole.TENANT_ADMIN, TenantRole.BUSINESS_MANAGER)
  async createCategory(
    @CurrentUser('businessId') businessId: string,
    @Body() data: any,
  ) {
    return this.masterDataService.createCategory(businessId, data.name, data);
  }

  @Patch('categories/:id')
  @Roles(TenantRole.TENANT_ADMIN, TenantRole.BUSINESS_MANAGER)
  async updateCategory(
    @CurrentUser('businessId') businessId: string,
    @Param('id') id: string,
    @Body() data: any,
  ) {
    return this.masterDataService.updateCategory(id, businessId, data);
  }

  @Delete('categories/:id')
  @Roles(TenantRole.TENANT_ADMIN)
  async deleteCategory(
    @CurrentUser('businessId') businessId: string,
    @Param('id') id: string,
  ) {
    return this.masterDataService.deleteCategory(id, businessId);
  }

  @Get('brands')
  async getBrands(@CurrentUser('businessId') businessId: string) {
    return this.masterDataService.getBrands(businessId);
  }

  @Post('brands')
  @Roles(TenantRole.TENANT_ADMIN, TenantRole.BUSINESS_MANAGER)
  async createBrand(
    @CurrentUser('businessId') businessId: string,
    @Body() data: { name: string },
  ) {
    return this.masterDataService.createBrand(businessId, data.name);
  }

  @Get('units')
  async getUnits(@CurrentUser('businessId') businessId: string) {
    return this.masterDataService.getUnits(businessId);
  }

  @Post('units')
  @Roles(TenantRole.TENANT_ADMIN, TenantRole.BUSINESS_MANAGER, TenantRole.INVENTORY_MANAGER)
  async createUnit(
    @CurrentUser('businessId') businessId: string,
    @Body() data: { name: string; shortName?: string },
  ) {
    return this.masterDataService.createUnit(businessId, data.name, data.shortName);
  }

  @Get(':id')
  async findOne(
    @CurrentUser('businessId') businessId: string,
    @Param('id') id: string,
  ) {
    return this.productsService.findOne(id, businessId);
  }

  @Post()
  @Roles(TenantRole.TENANT_ADMIN, TenantRole.BUSINESS_MANAGER, TenantRole.INVENTORY_MANAGER)
  async create(
    @CurrentUser('businessId') businessId: string,
    @Body() data: Partial<Product>,
  ) {
    return this.productsService.create(businessId, data);
  }

  @Patch(':id')
  @Roles(TenantRole.TENANT_ADMIN, TenantRole.BUSINESS_MANAGER, TenantRole.INVENTORY_MANAGER)
  async update(
    @CurrentUser('businessId') businessId: string,
    @Param('id') id: string,
    @Body() data: Partial<Product>,
  ) {
    return this.productsService.update(id, businessId, data);
  }

  @Post(':id/duplicate')
  @Roles(TenantRole.TENANT_ADMIN, TenantRole.BUSINESS_MANAGER)
  async duplicate(
    @CurrentUser('businessId') businessId: string,
    @Param('id') id: string,
  ) {
    return this.productsService.duplicate(id, businessId);
  }

  @Patch(':id/status')
  @Roles(TenantRole.TENANT_ADMIN, TenantRole.BUSINESS_MANAGER)
  async setStatus(
    @CurrentUser('businessId') businessId: string,
    @Param('id') id: string,
    @Body('status') status: ProductStatus,
  ) {
    return this.productsService.setProductStatus(id, businessId, status);
  }

  @Post('bulk-import')
  @Roles(TenantRole.TENANT_ADMIN, TenantRole.BUSINESS_MANAGER, TenantRole.INVENTORY_MANAGER)
  async bulkImport(
    @CurrentUser('businessId') businessId: string,
    @Body() products: Partial<Product>[],
  ) {
    return this.productsService.bulkImport(businessId, products);
  }

  @Post('barcode/:id')
  @Roles(TenantRole.TENANT_ADMIN, TenantRole.BUSINESS_MANAGER, TenantRole.INVENTORY_MANAGER)
  async generateBarcode(
    @CurrentUser('businessId') businessId: string,
    @Param('id') id: string,
  ) {
    return this.productsService.generateBarcode(id, businessId);
  }

  @Delete(':id')
  @Roles(TenantRole.TENANT_ADMIN)
  async delete(
    @CurrentUser('businessId') businessId: string,
    @Param('id') id: string,
  ) {
    return this.productsService.delete(id, businessId);
  }
}


