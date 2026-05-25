import { Module } from '@nestjs/common';
import { TenantManagementService } from './services/tenant-management.service.js';
import { TenantProvisioningService } from './services/tenant-provisioning.service.js';
import { TenantManagementController } from './controllers/tenant-management.controller.js';
import { AuditLogController } from './controllers/audit-log.controller.js';
import { TenantUserController } from './controllers/tenant-user.controller.js';
import { TenantUserService } from './services/tenant-user.service.js';
import { SystemConfigService } from './services/system-config.service.js';
import { SystemConfigController } from './controllers/system-config.controller.js';

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
import { SystemConfig } from '../../database/entities/system-config.entity.js';
import { AuditLogService } from './services/audit-log.service.js';
import { PlatformAnalyticsService } from './services/platform-analytics.service.js';
import { PlatformAnalyticsController } from './controllers/platform-analytics.controller.js';

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
      SystemConfig,
    ]),
  ],
  controllers: [
    TenantManagementController,
    SubscriptionPlanController,
    AuditLogController,
    TenantUserController,
    PlatformAnalyticsController,
    SystemConfigController,
  ],
  providers: [
    TenantManagementService,
    TenantProvisioningService,
    SubscriptionPlanService,
    AuditLogService,
    TenantUserService,
    PlatformAnalyticsService,
    SystemConfigService,
  ],
  exports: [
    AuditLogService,
    TenantProvisioningService,
    TenantUserService,
    SystemConfigService,
  ],
})
export class PlatformModule {}
