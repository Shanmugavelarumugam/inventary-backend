import { SetMetadata } from '@nestjs/common';
import { PlatformRole } from '../enums/platform-role.enum.js';
import { PLATFORM_ROLES_KEY } from '../guards/platform-role.guard.js';

export const PlatformRoles = (...roles: PlatformRole[]) =>
  SetMetadata(PLATFORM_ROLES_KEY, roles);
