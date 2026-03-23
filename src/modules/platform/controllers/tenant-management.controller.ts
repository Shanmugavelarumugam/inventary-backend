import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Query,
  Request,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../../../common/interfaces/authenticated-request.interface.js';
import { TenantManagementService } from '../services/tenant-management.service.js';
import {
  CreateTenantDto,
  UpdateTenantDto,
  CreatePlatformAdminDto,
  UpdatePlatformAdminDto,
  ResetPlatformAdminPasswordDto,
  BootstrapRootDto,
  ResetTenantUserPasswordDto,
  AssignPlanDto,
} from '../dto/index.js';
import { BusinessStatus } from '../../../common/enums/business.enum.js';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard.js';
import { PlatformRoleGuard } from '../../../common/guards/platform-role.guard.js';
import { PlatformRoles } from '../../../common/decorators/platform-roles.decorator.js';
import { PlatformRole } from '../../../common/enums/platform-role.enum.js';

@Controller('platform')
export class TenantManagementController {
  constructor(private readonly tenantService: TenantManagementService) {}

  // ════════════════════════════════════════════════════════════════
  // ROOT BOOTSTRAP — Public, one-time only
  // ════════════════════════════════════════════════════════════════

  @Post('root/bootstrap')
  async bootstrapRoot(@Body() dto: BootstrapRootDto) {
    return this.tenantService.bootstrapRoot(dto);
  }

  // ════════════════════════════════════════════════════════════════
  // PLATFORM ADMIN MANAGEMENT — ROOT ONLY
  // ════════════════════════════════════════════════════════════════

  @Post('admins')
  @UseGuards(JwtAuthGuard, PlatformRoleGuard)
  @PlatformRoles(PlatformRole.ROOT, PlatformRole.PLATFORM_ADMIN)
  async createAdmin(
    @Body() dto: CreatePlatformAdminDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.tenantService.createAdmin(dto, {
      userId: req.user.userId,
      platformRole: req.user.platformRole!,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });
  }

  @Get('admins')
  @UseGuards(JwtAuthGuard, PlatformRoleGuard)
  @PlatformRoles(PlatformRole.ROOT, PlatformRole.PLATFORM_ADMIN)
  async findAllAdmins(
    @Request() req: AuthenticatedRequest,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.tenantService.findAllAdmins(req.user.platformRole!, {
      page,
      limit,
    });
  }

  @Get('admins/:id')
  @UseGuards(JwtAuthGuard, PlatformRoleGuard)
  @PlatformRoles(PlatformRole.ROOT, PlatformRole.PLATFORM_ADMIN)
  async findOneAdmin(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.tenantService.findOneAdmin(id, req.user.platformRole!);
  }

  @Patch('admins/:id')
  @UseGuards(JwtAuthGuard, PlatformRoleGuard)
  @PlatformRoles(PlatformRole.ROOT)
  async updateAdmin(
    @Param('id') id: string,
    @Body() dto: UpdatePlatformAdminDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.tenantService.updateAdmin(id, dto, {
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });
  }

  @Post('admins/:id/suspend')
  @UseGuards(JwtAuthGuard, PlatformRoleGuard)
  @PlatformRoles(PlatformRole.ROOT)
  async suspendAdmin(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.tenantService.suspendAdmin(id, {
      userId: req.user.userId,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });
  }

  @Post('admins/:id/activate')
  @UseGuards(JwtAuthGuard, PlatformRoleGuard)
  @PlatformRoles(PlatformRole.ROOT)
  async activateAdmin(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.tenantService.activateAdmin(id, {
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });
  }

  @Post('admins/:id/reset-password')
  @UseGuards(JwtAuthGuard, PlatformRoleGuard)
  @PlatformRoles(PlatformRole.ROOT)
  async resetAdminPassword(
    @Param('id') id: string,
    @Body() dto: ResetPlatformAdminPasswordDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.tenantService.resetAdminPassword(id, dto, {
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });
  }

  @Delete('admins/:id')
  @UseGuards(JwtAuthGuard, PlatformRoleGuard)
  @PlatformRoles(PlatformRole.ROOT)
  async deleteAdmin(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.tenantService.deleteAdmin(id, {
      userId: req.user.userId,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });
  }

  // ════════════════════════════════════════════════════════════════
  // SUPPORT CAPABILITIES — Tenant User Password Reset
  // ════════════════════════════════════════════════════════════════

  /**
   * POST /platform/tenants/users/:id/reset-password
   * Allows ROOT, PLATFORM_ADMIN, and SUPPORT_ADMIN to reset tenant passwords.
   */
  @Post('tenants/users/:id/reset-password')
  @UseGuards(JwtAuthGuard, PlatformRoleGuard)
  @PlatformRoles(
    PlatformRole.ROOT,
    PlatformRole.PLATFORM_ADMIN,
    PlatformRole.SUPPORT_ADMIN,
  )
  async resetTenantUserPassword(
    @Param('id') id: string,
    @Body() dto: ResetTenantUserPasswordDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.tenantService.resetTenantUserPassword(id, {
      password: dto.password,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });
  }

  // ════════════════════════════════════════════════════════════════
  // TENANT MANAGEMENT — ROOT + PLATFORM_ADMIN
  // ════════════════════════════════════════════════════════════════

  @Post('tenants')
  @UseGuards(JwtAuthGuard, PlatformRoleGuard)
  @PlatformRoles(PlatformRole.ROOT, PlatformRole.PLATFORM_ADMIN)
  async createTenant(
    @Body() dto: CreateTenantDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.tenantService.createTenant(dto, {
      userId: req.user.userId,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });
  }

  /**
   * GET /platform/tenants
   * Query: search, status, plan, sortBy, order, page, limit
   */
  @Get('tenants')
  @UseGuards(JwtAuthGuard, PlatformRoleGuard)
  @PlatformRoles(
    PlatformRole.ROOT,
    PlatformRole.PLATFORM_ADMIN,
    PlatformRole.SUPPORT_ADMIN,
  )
  async findAllTenants(
    @Query('search') search?: string,
    @Query('status') status?: BusinessStatus,
    @Query('plan') plan?: string,
    @Query('sortBy') sortBy?: string,
    @Query('order') order?: 'ASC' | 'DESC',
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit?: number,
  ) {
    return this.tenantService.findAllTenants({
      page,
      limit,
      search,
      status,
      plan,
      sortBy,
      order,
    });
  }

  @Get('tenants/:id')
  @UseGuards(JwtAuthGuard, PlatformRoleGuard)
  @PlatformRoles(
    PlatformRole.ROOT,
    PlatformRole.PLATFORM_ADMIN,
    PlatformRole.SUPPORT_ADMIN,
  )
  async findOneTenant(@Param('id') id: string) {
    return this.tenantService.findOneTenant(id);
  }

  @Patch('tenants/:id')
  @UseGuards(JwtAuthGuard, PlatformRoleGuard)
  @PlatformRoles(PlatformRole.ROOT, PlatformRole.PLATFORM_ADMIN)
  async updateTenant(@Param('id') id: string, @Body() dto: UpdateTenantDto) {
    return this.tenantService.updateTenant(id, dto);
  }

  @Delete('tenants/:id')
  @UseGuards(JwtAuthGuard, PlatformRoleGuard)
  @PlatformRoles(PlatformRole.ROOT)
  async deleteTenant(@Param('id') id: string) {
    return this.tenantService.deleteTenant(id);
  }

  @Post('tenants/:id/suspend')
  @UseGuards(JwtAuthGuard, PlatformRoleGuard)
  @PlatformRoles(PlatformRole.ROOT, PlatformRole.PLATFORM_ADMIN)
  async suspendTenant(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.tenantService.updateTenantStatus(
      id,
      {
        status: BusinessStatus.SUSPENDED,
        reason: 'Suspended by platform admin',
      },
      {
        userId: req.user.userId,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      },
    );
  }

  @Post('tenants/:id/activate')
  @UseGuards(JwtAuthGuard, PlatformRoleGuard)
  @PlatformRoles(PlatformRole.ROOT, PlatformRole.PLATFORM_ADMIN)
  async activateTenant(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.tenantService.updateTenantStatus(
      id,
      { status: BusinessStatus.ACTIVE, reason: 'Activated by platform admin' },
      {
        userId: req.user.userId,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      },
    );
  }

  @Post('tenants/:id/assign-plan')
  @UseGuards(JwtAuthGuard, PlatformRoleGuard)
  @PlatformRoles(PlatformRole.ROOT, PlatformRole.PLATFORM_ADMIN)
  async assignPlan(
    @Param('id') id: string,
    @Body() dto: AssignPlanDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.tenantService.assignPlan(id, dto, {
      userId: req.user.userId,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });
  }

  @Get('tenants/:id/subscription')
  @UseGuards(JwtAuthGuard, PlatformRoleGuard)
  @PlatformRoles(PlatformRole.ROOT, PlatformRole.PLATFORM_ADMIN)
  async getSubscription(@Param('id') id: string) {
    return this.tenantService.getSubscription(id);
  }

  @Get('tenants/:id/payments')
  @UseGuards(JwtAuthGuard, PlatformRoleGuard)
  @PlatformRoles(PlatformRole.ROOT, PlatformRole.PLATFORM_ADMIN)
  async getPayments(@Param('id') id: string) {
    return this.tenantService.getPayments(id);
  }

  @Get('tenants/:id/users')
  @UseGuards(JwtAuthGuard, PlatformRoleGuard)
  @PlatformRoles(
    PlatformRole.ROOT,
    PlatformRole.PLATFORM_ADMIN,
    PlatformRole.SUPPORT_ADMIN,
  )
  async getTenantUsers(
    @Param('id') id: string,
    @Query('search') search?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit?: number,
  ) {
    return this.tenantService.getTenantUsers(id, { page, limit, search });
  }
}
