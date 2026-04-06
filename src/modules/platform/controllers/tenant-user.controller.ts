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
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../../../common/interfaces/authenticated-request.interface.js';
import { TenantUserService } from '../services/tenant-user.service.js';
import {
  CreatePlatformTenantUserDto,
  UpdatePlatformTenantUserDto,
  ResetTenantUserPasswordNewDto,
  FindAllTenantUsersQueryDto,
} from '../dto/tenant-user.dto.js';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard.js';
import { PlatformRoleGuard } from '../../../common/guards/platform-role.guard.js';
import { PlatformRoles } from '../../../common/decorators/platform-roles.decorator.js';
import { PlatformRole } from '../../../common/enums/platform-role.enum.js';

@Controller('platform/tenant-users')
@UseGuards(JwtAuthGuard, PlatformRoleGuard)
export class TenantUserController {
  constructor(private readonly tenantUserService: TenantUserService) {}

  @Get()
  @PlatformRoles(
    PlatformRole.ROOT,
    PlatformRole.PLATFORM_ADMIN,
    PlatformRole.SUPPORT_ADMIN,
  )
  async findAll(@Query() query: FindAllTenantUsersQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    
    return this.tenantUserService.findAll({
      page,
      limit,
      search: query.search,
      businessId: query.businessId,
      role: query.role,
      status: query.status,
    });
  }

  @Get(':id')
  @PlatformRoles(
    PlatformRole.ROOT,
    PlatformRole.PLATFORM_ADMIN,
    PlatformRole.SUPPORT_ADMIN,
  )
  async findOne(@Param('id') id: string) {
    return this.tenantUserService.findOne(id);
  }

  @Post()
  @PlatformRoles(PlatformRole.ROOT, PlatformRole.PLATFORM_ADMIN)
  async create(
    @Body() dto: CreatePlatformTenantUserDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.tenantUserService.create(dto, {
      userId: req.user.userId,
      platformRole: req.user.platformRole,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });
  }

  @Patch(':id')
  @PlatformRoles(PlatformRole.ROOT, PlatformRole.PLATFORM_ADMIN)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdatePlatformTenantUserDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.tenantUserService.update(id, dto, {
      userId: req.user.userId,
      platformRole: req.user.platformRole,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });
  }

  @Post(':id/reset-password')
  @PlatformRoles(
    PlatformRole.ROOT,
    PlatformRole.PLATFORM_ADMIN,
    PlatformRole.SUPPORT_ADMIN, // Per requirements, support can reset passwords
  )
  async resetPassword(
    @Param('id') id: string,
    @Body() dto: ResetTenantUserPasswordNewDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.tenantUserService.resetPassword(id, dto.newPassword, {
      userId: req.user.userId,
      platformRole: req.user.platformRole,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });
  }

  @Patch(':id/deactivate')
  @PlatformRoles(PlatformRole.ROOT, PlatformRole.PLATFORM_ADMIN)
  async deactivate(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.tenantUserService.setStatus(id, false, {
      userId: req.user.userId,
      platformRole: req.user.platformRole,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });
  }

  @Patch(':id/activate')
  @PlatformRoles(PlatformRole.ROOT, PlatformRole.PLATFORM_ADMIN)
  async activate(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.tenantUserService.setStatus(id, true, {
      userId: req.user.userId,
      platformRole: req.user.platformRole,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });
  }
}
