import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SeedModule } from './seeds/seed.module.js';
import { Business } from './entities/business.entity.js';
import { User } from './entities/user.entity.js';
import { Role } from './entities/role.entity.js';
import { Permission } from './entities/permission.entity.js';
import { Product } from './entities/product.entity.js';
import { StockMovement } from './entities/stock-movement.entity.js';
import { Branch } from './entities/branch.entity.js';
import { Invoice } from './entities/invoice.entity.js';
import { Subscription } from './entities/subscription.entity.js';
import { AuditLog } from './entities/audit-log.entity.js';
import { SupportTicket } from './entities/support-ticket.entity.js';
import { SupportMessage } from './entities/support-message.entity.js';
import { SupportAttachment } from './entities/support-attachment.entity.js';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('database.host'),
        port: configService.get<number>('database.port'),
        username: configService.get<string>('database.username'),
        password: configService.get<string>('database.password'),
        database: configService.get<string>('database.name'),
        entities: [
          Business,
          User,
          Role,
          Permission,
          Product,
          StockMovement,
          Branch,
          Invoice,
          Subscription,
          AuditLog,
          SupportTicket,
          SupportMessage,
          SupportAttachment,
        ],

        autoLoadEntities: true,
        synchronize: configService.get<boolean>('database.synchronize'),
        logging: true,
      }),
      inject: [ConfigService],
    }),
    SeedModule,
  ],
})
export class DatabaseModule {}
