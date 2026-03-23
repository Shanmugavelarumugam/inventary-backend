import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../interfaces/authenticated-request.interface.js';

@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    // Platform staff should not access tenant-specific logic directly
    if (user.platformRole) {
      throw new ForbiddenException(
        'Platform Admins cannot perform tenant-specific operations',
      );
    }

    if (!user.businessId) {
      throw new ForbiddenException('User is not associated with any business');
    }

    return true;
  }
}
