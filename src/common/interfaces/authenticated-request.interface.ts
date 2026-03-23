import { Request } from 'express';
import { PlatformRole } from '../enums/platform-role.enum.js';

export interface RequestUser {
  userId: string;
  email: string;
  businessId?: string;
  roleId?: string;
  role?: string;
  platformRole?: PlatformRole;
}

export interface AuthenticatedRequest extends Request {
  user: RequestUser;
}
