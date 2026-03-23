import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { RolesService } from './roles.service.js';
import { CreateRoleDto, AssignPermissionsDto } from './dto/index.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { TenantGuard } from '../../common/guards/tenant.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';

@Controller('roles')
@UseGuards(JwtAuthGuard, TenantGuard)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Post()
  async create(
    @Body() dto: CreateRoleDto,
    @CurrentUser('businessId') businessId: string,
  ) {
    return this.rolesService.create(dto, businessId);
  }

  @Post(':id/permissions')
  async assignPermissions(
    @Param('id') id: string,
    @Body() dto: AssignPermissionsDto,
    @CurrentUser('businessId') businessId: string,
  ) {
    return this.rolesService.assignPermissions(id, dto, businessId);
  }

  @Get()
  async findAll(@CurrentUser('businessId') businessId: string) {
    return this.rolesService.findAll(businessId);
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @CurrentUser('businessId') businessId: string,
  ) {
    return this.rolesService.findOne(id, businessId);
  }
}
