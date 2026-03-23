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
  Req,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../../../common/interfaces/authenticated-request.interface.js';
import { SubscriptionPlanService } from '../services/subscription-plan.service.js';
import {
  CreateSubscriptionPlanDto,
  UpdateSubscriptionPlanDto,
} from '../dto/subscription-plan.dto.js';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard.js';
import { PlatformRoleGuard } from '../../../common/guards/platform-role.guard.js';
import { PlatformRoles } from '../../../common/decorators/platform-roles.decorator.js';
import { PlatformRole } from '../../../common/enums/platform-role.enum.js';

@Controller('platform/subscription-plans')
@UseGuards(JwtAuthGuard, PlatformRoleGuard)
export class SubscriptionPlanController {
  constructor(private readonly planService: SubscriptionPlanService) {}

  @Post()
  @PlatformRoles(PlatformRole.ROOT)
  async create(
    @Body() dto: CreateSubscriptionPlanDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.planService.createPlan(dto, {
      userId: req.user.userId,
      userEmail: req.user.email,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });
  }

  @Get()
  @PlatformRoles(
    PlatformRole.ROOT,
    PlatformRole.PLATFORM_ADMIN,
    PlatformRole.SUPPORT_ADMIN,
  )
  async findAll(@Query('status') status?: 'ACTIVE' | 'INACTIVE') {
    return this.planService.findAll(status);
  }

  @Get(':id')
  @PlatformRoles(
    PlatformRole.ROOT,
    PlatformRole.PLATFORM_ADMIN,
    PlatformRole.SUPPORT_ADMIN,
  )
  async findOne(@Param('id') id: string) {
    return this.planService.findOne(id);
  }

  @Patch(':id')
  @PlatformRoles(PlatformRole.ROOT)
  async updatePlan(
    @Param('id') id: string,
    @Body() dto: UpdateSubscriptionPlanDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.planService.updatePlan(id, dto, {
      userId: req.user.userId,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });
  }

  @Patch(':id/activate')
  @PlatformRoles(PlatformRole.ROOT)
  async activatePlan(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.planService.setStatus(id, 'ACTIVE', {
      userId: req.user.userId,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });
  }

  @Patch(':id/deactivate')
  @PlatformRoles(PlatformRole.ROOT)
  async deactivatePlan(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.planService.setStatus(id, 'INACTIVE', {
      userId: req.user.userId,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });
  }

  @Delete(':id')
  @PlatformRoles(PlatformRole.ROOT)
  async deletePlan(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.planService.deletePlan(id, {
      userId: req.user.userId,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });
  }

  @Get(':id/usage')
  @PlatformRoles(PlatformRole.ROOT, PlatformRole.PLATFORM_ADMIN)
  async getUsageSummary(@Param('id') id: string) {
    return this.planService.getUsageSummary(id);
  }
}
