import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { PlatformModule } from './modules/platform/platform.module.js';
import { BusinessModule } from './modules/business/business.module.js';
import { UsersModule } from './modules/users/users.module.js';
import { InventoryModule } from './modules/inventory/inventory.module.js';
import { HealthModule } from './health/health.module.js';
import { RedisModule } from './redis/redis.module.js';
import { QueueModule } from './queues/queue.module.js';
import { RolesModule } from './modules/roles/roles.module.js';
import { SupportModule } from './modules/support/support.module.js';

import configuration from './config/configuration.js';
import appConfig from './config/app.config.js';
import databaseConfig from './config/database.config.js';
import jwtConfig from './config/jwt.config.js';
import redisConfig from './config/redis.config.js';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration, appConfig, databaseConfig, jwtConfig, redisConfig],
    }),
    DatabaseModule,
    AuthModule,
    PlatformModule,
    BusinessModule,
    UsersModule,
    InventoryModule,
    HealthModule,
    RedisModule,
    QueueModule,
    RolesModule,
    SupportModule,
  ],

  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
