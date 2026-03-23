import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PlatformRole } from '../enums/platform-role.enum.js';
import type { AuthenticatedRequest } from '../interfaces/authenticated-request.interface.js';

export const PLATFORM_ROLES_KEY = 'platformRoles';

/**
 * Guard that checks platformRole on the authenticated user.
 * Decorate routes with @PlatformRoles(PlatformRole.ROOT, ...)
 *
 * Role hierarchy enforced:
 *   ROOT > PLATFORM_ADMIN > SUPPORT_ADMIN
 */
@Injectable()
export class PlatformRoleGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<PlatformRole[]>(
      PLATFORM_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no role restriction set, just ensure user is a platform user
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    if (!user || !user.platformRole) {
      throw new ForbiddenException('Access restricted to Platform users only');
    }

    if (!requiredRoles || requiredRoles.length === 0) {
      return true; // Any platform role is OK
    }

    if (!requiredRoles.includes(user.platformRole)) {
      throw new ForbiddenException(
        `Access requires one of: ${requiredRoles.join(', ')}. Your role: ${user.platformRole}`,
      );
    }

    return true;
  }
}
