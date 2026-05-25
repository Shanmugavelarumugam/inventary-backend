import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { SystemConfigService } from '../services/system-config.service.js';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../../common/guards/roles.guard.js';
import { PlatformRoles } from '../../../common/decorators/platform-roles.decorator.js';
import { PlatformRole } from '../../../common/enums/platform-role.enum.js';

@Controller('platform/config')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SystemConfigController {
  constructor(private readonly configService: SystemConfigService) {}

  @Get()
  @PlatformRoles(PlatformRole.ROOT, PlatformRole.PLATFORM_ADMIN)
  async getConfigs() {
    return this.configService.getConfigs();
  }

  @Patch()
  @PlatformRoles(PlatformRole.ROOT)
  async updateConfigs(@Body() configs: Record<string, string>) {
    return this.configService.setMany(configs);
  }
}
