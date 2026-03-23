import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuditLogService } from '../services/audit-log.service.js';
import { AuditLogQueryDto } from '../dto/audit-log.dto.js';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard.js';
import { PlatformRoleGuard } from '../../../common/guards/platform-role.guard.js';
import { PlatformRoles } from '../../../common/decorators/platform-roles.decorator.js';
import { PlatformRole } from '../../../common/enums/platform-role.enum.js';

@Controller('platform/audit-logs')
@UseGuards(JwtAuthGuard, PlatformRoleGuard)
@PlatformRoles(PlatformRole.ROOT, PlatformRole.PLATFORM_ADMIN)
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get()
  async findAll(@Query() query: AuditLogQueryDto) {
    return this.auditLogService.findAll(query);
  }
}
