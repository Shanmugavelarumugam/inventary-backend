import { Module } from '@nestjs/common';
import { SubscriptionService } from './subscription.service.js';

@Module({
  providers: [SubscriptionService],
})
export class SubscriptionModule {}
