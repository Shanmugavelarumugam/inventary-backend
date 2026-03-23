import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  UseGuards,
  Query,
} from '@nestjs/common';
import { UsersService } from './users.service.js';
import { CreateUserDto, UpdateUserDto } from './dto/index.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { TenantGuard } from '../../common/guards/tenant.guard.js';
import { PermissionsGuard } from '../../common/guards/permissions.guard.js';
import { Permissions } from '../../common/decorators/permissions.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';

@Controller('users')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Permissions('create_user')
  async create(
    @Body() dto: CreateUserDto,
    @CurrentUser('businessId') businessId: string,
  ) {
    return this.usersService.create(dto, businessId);
  }

  @Get()
  @Permissions('view_user')
  async findAll(
    @CurrentUser('businessId') businessId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.usersService.findAll(
      businessId,
      page ? Number(page) : 1,
      limit ? Number(limit) : 10,
    );
  }

  @Patch(':id/role')
  @Permissions('update_user') // Assuming update_user for role change
  async updateRole(
    @Param('id') id: string,
    @Body('roleId') roleId: string,
    @CurrentUser('businessId') businessId: string,
  ) {
    return this.usersService.updateRole(id, roleId, businessId);
  }

  @Patch(':id/deactivate')
  @Permissions('delete_user')
  async deactivate(
    @Param('id') id: string,
    @CurrentUser('businessId') businessId: string,
  ) {
    return this.usersService.deactivate(id, businessId);
  }

  @Patch(':id/activate')
  @Permissions('update_user')
  async activate(
    @Param('id') id: string,
    @CurrentUser('businessId') businessId: string,
  ) {
    return this.usersService.activate(id, businessId);
  }

  @Get(':id')
  @Permissions('view_user')
  async findOne(
    @Param('id') id: string,
    @CurrentUser('businessId') businessId: string,
  ) {
    return this.usersService.findOne(id, businessId);
  }

  @Patch(':id')
  @Permissions('update_user')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser('businessId') businessId: string,
  ) {
    return this.usersService.update(id, dto, businessId);
  }
}
