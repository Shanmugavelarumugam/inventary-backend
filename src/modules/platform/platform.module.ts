import { Module } from '@nestjs/common';
import { TenantManagementService } from './services/tenant-management.service.js';
import { TenantManagementController } from './controllers/tenant-management.controller.js';
import { AuditLogController } from './controllers/audit-log.controller.js';

import { TypeOrmModule } from '@nestjs/typeorm';
import { Business } from '../../database/entities/business.entity.js';
import { User } from '../../database/entities/user.entity.js';
import { Role } from '../../database/entities/role.entity.js';
import { Permission } from '../../database/entities/permission.entity.js';
import { Subscription } from '../../database/entities/subscription.entity.js';
import { Invoice } from '../../database/entities/invoice.entity.js';

import { SubscriptionPlanService } from './services/subscription-plan.service.js';
import { SubscriptionPlanController } from './controllers/subscription-plan.controller.js';
import { SubscriptionPlan } from '../../database/entities/subscription-plan.entity.js';
import { AuditLog } from '../../database/entities/audit-log.entity.js';
import { AuditLogService } from './services/audit-log.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Business,
      User,
      Role,
      Permission,
      Subscription,
      Invoice,
      SubscriptionPlan,
      AuditLog,
    ]),
  ],
  controllers: [
    TenantManagementController,
    SubscriptionPlanController,
    AuditLogController,
  ],
  providers: [
    TenantManagementService,
    SubscriptionPlanService,
    AuditLogService,
  ],
  exports: [AuditLogService],
})
export class PlatformModule {}
