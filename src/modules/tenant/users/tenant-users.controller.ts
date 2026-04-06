import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  Delete,
} from '@nestjs/common';
import { TenantUsersService } from './tenant-users.service.js';
import {
  CreateTenantStaffUserDto,
  UpdateTenantStaffUserDto,
  TenantUserQueryDto,
  ResetTenantUserPasswordDto,
} from './dto/tenant-user.dto.js';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard.js';
import { TenantGuard } from '../../../common/guards/tenant.guard.js';
import { RolesGuard } from '../../../common/guards/roles.guard.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { Roles } from '../../../common/decorators/roles.decorator.js';
import { TenantRole } from '../../../common/enums/tenant-role.enum.js';

@Controller('tenant/users')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
export class TenantUsersController {
  constructor(private readonly tenantUsersService: TenantUsersService) {}

  @Post()
  @Roles(TenantRole.TENANT_ADMIN)
  async create(
    @Body() dto: CreateTenantStaffUserDto,
    @CurrentUser('businessId') businessId: string,
  ) {
    return this.tenantUsersService.create(dto, businessId);
  }

  @Get()
  @Roles(
    TenantRole.TENANT_ADMIN,
    TenantRole.BUSINESS_MANAGER,
    TenantRole.FINANCE_MANAGER,
    TenantRole.VIEWER,
  )
  async findAll(
    @CurrentUser('businessId') businessId: string,
    @Query() query: TenantUserQueryDto,
  ) {
    return this.tenantUsersService.findAll(businessId, query);
  }

  @Get(':id')
  @Roles(
    TenantRole.TENANT_ADMIN,
    TenantRole.BUSINESS_MANAGER,
    TenantRole.FINANCE_MANAGER,
  )
  async findOne(
    @Param('id') id: string,
    @CurrentUser('businessId') businessId: string,
  ) {
    return this.tenantUsersService.findOne(id, businessId);
  }

  @Patch(':id')
  @Roles(TenantRole.TENANT_ADMIN, TenantRole.BUSINESS_MANAGER)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateTenantStaffUserDto,
    @CurrentUser('businessId') businessId: string,
  ) {
    return this.tenantUsersService.update(id, dto, businessId);
  }

  @Post(':id/reset-password')
  @Roles(TenantRole.TENANT_ADMIN)
  async resetPassword(
    @Param('id') id: string,
    @Body() dto: ResetTenantUserPasswordDto,
    @CurrentUser('businessId') businessId: string,
  ) {
    return this.tenantUsersService.resetPassword(
      id,
      dto.newPassword,
      businessId,
    );
  }

  @Patch(':id/deactivate')
  @Roles(TenantRole.TENANT_ADMIN)
  async deactivate(
    @Param('id') id: string,
    @CurrentUser('businessId') businessId: string,
  ) {
    return this.tenantUsersService.setStatus(id, false, businessId);
  }

  @Patch(':id/activate')
  @Roles(TenantRole.TENANT_ADMIN)
  async activate(
    @Param('id') id: string,
    @CurrentUser('businessId') businessId: string,
  ) {
    return this.tenantUsersService.setStatus(id, true, businessId);
  }

  @Delete(':id')
  @Roles(TenantRole.TENANT_ADMIN)
  async delete(
    @Param('id') id: string,
    @CurrentUser('businessId') businessId: string,
  ) {
    return this.tenantUsersService.delete(id, businessId);
  }
}
