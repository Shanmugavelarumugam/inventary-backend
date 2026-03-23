import { Module } from '@nestjs/common';
import { RedisModule } from '../redis/redis.module.js';

@Module({
  imports: [RedisModule],
})
export class QueueModule {}
