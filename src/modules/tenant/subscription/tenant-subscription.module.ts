import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Subscription } from '../../../database/entities/subscription.entity.js';
import { SubscriptionPlan } from '../../../database/entities/subscription-plan.entity.js';
import { Business } from '../../../database/entities/business.entity.js';
import { TenantSubscriptionController } from './tenant-subscription.controller.js';
import { TenantSubscriptionService } from './tenant-subscription.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Subscription, SubscriptionPlan, Business])],
  controllers: [TenantSubscriptionController],
  providers: [TenantSubscriptionService],
  exports: [TenantSubscriptionService],
})
export class TenantSubscriptionModule {}
