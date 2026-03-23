import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from '../../database/entities/role.entity.js';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator.js';
import type { AuthenticatedRequest } from '../interfaces/authenticated-request.interface.js';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    if (!user) {
      return false;
    }

    // Platform staff (ROOT/PLATFORM_ADMIN/SUPPORT_ADMIN) bypass business-level permissions
    if (user.platformRole) {
      return true;
    }

    if (!user.roleId) {
      return false;
    }

    const role = await this.roleRepository.findOne({
      where: { id: user.roleId },
      relations: ['permissions'],
    });

    if (!role || !role.permissions) {
      return false;
    }

    const userPermissions = role.permissions.map((p) => p.key);
    return requiredPermissions.every((permission) =>
      userPermissions.includes(permission),
    );
  }
}
