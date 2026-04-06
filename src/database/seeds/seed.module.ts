import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { User } from '../entities/user.entity.js';
import { Role } from '../entities/role.entity.js';
import { Permission } from '../entities/permission.entity.js';
import { SeedService } from './seed.service.js';
import { TenantRoleMigrationService } from './tenant-role-migration.service.js';
import { Business } from '../entities/business.entity.js';
import { Subscription } from '../entities/subscription.entity.js';
import { SubscriptionPlan as SubscriptionPlanEntity } from '../entities/subscription-plan.entity.js';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
      User,
      Role,
      Permission,
      Business,
      Subscription,
      SubscriptionPlanEntity,
    ]),
  ],
  providers: [SeedService, TenantRoleMigrationService],
  exports: [SeedService, TenantRoleMigrationService],
})
export class SeedModule {}
