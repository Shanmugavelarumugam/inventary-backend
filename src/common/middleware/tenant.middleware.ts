import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  use(
    req: Request & { tenantId?: string | string[] },
    res: Response,
    next: NextFunction,
  ) {
    const tenantId = req.headers['x-tenant-id'];
    if (tenantId) {
      req.tenantId = tenantId;
    }
    next();
  }
}
