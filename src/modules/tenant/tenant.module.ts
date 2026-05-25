import { Module } from '@nestjs/common';
import { TenantUsersModule } from './users/tenant-users.module.js';
import { TenantInventoryController } from './inventory/tenant-inventory.controller.js';
import { InventoryModule } from '../inventory/inventory.module.js';
import { BranchesModule } from '../branches/branches.module.js';
import { ReportsModule } from './reports/reports.module.js';
import { TenantSubscriptionModule } from './subscription/tenant-subscription.module.js';
import { SettingsModule } from './settings/settings.module.js';

@Module({
  imports: [
    TenantUsersModule,
    InventoryModule,
    BranchesModule,
    ReportsModule,
    TenantSubscriptionModule,
    SettingsModule,
  ],
  controllers: [TenantInventoryController],
  providers: [],
  exports: [TenantUsersModule],
})
export class TenantModule {}
