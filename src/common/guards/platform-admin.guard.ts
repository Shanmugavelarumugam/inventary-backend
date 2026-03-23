import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../interfaces/authenticated-request.interface.js';

/** @deprecated Use PlatformRoleGuard with @PlatformRoles() decorator instead */
@Injectable()
export class PlatformAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    if (!user || !user.platformRole) {
      throw new ForbiddenException(
        'Access restricted to Platform Administrators only',
      );
    }

    return true;
  }
}
