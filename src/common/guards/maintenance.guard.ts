import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ServiceUnavailableException,
} from '@nestjs/common';
import { SystemConfigService } from '../../modules/platform/services/system-config.service.js';
import { PlatformRole } from '../enums/platform-role.enum.js';

@Injectable()
export class MaintenanceGuard implements CanActivate {
  constructor(private readonly configService: SystemConfigService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isMaintenance = await this.configService.isMaintenanceMode();
    if (!isMaintenance) return true;

    const request = context.switchToHttp().getRequest<{
      user?: { platformRole: PlatformRole };
    }>();
    const user = request.user;

    // Platform admins can still access the app during maintenance
    if (
      user &&
      (user.platformRole === PlatformRole.ROOT ||
        user.platformRole === PlatformRole.PLATFORM_ADMIN)
    ) {
      return true;
    }

    throw new ServiceUnavailableException({
      message:
        'Platform is currently under maintenance. Please try again later.',
      errorCode: 'MAINTENANCE_MODE',
    });
  }
}
