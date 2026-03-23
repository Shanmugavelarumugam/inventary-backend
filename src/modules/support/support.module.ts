import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SupportTicket } from '../../database/entities/support-ticket.entity.js';
import { SupportMessage } from '../../database/entities/support-message.entity.js';
import { SupportAttachment } from '../../database/entities/support-attachment.entity.js';
import { SupportService } from './support.service.js';
import { PlatformModule } from '../platform/platform.module.js';

import { TenantSupportController } from './controllers/tenant-support.controller.js';
import { PlatformSupportController } from './controllers/platform-support.controller.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SupportTicket,
      SupportMessage,
      SupportAttachment,
    ]),
    PlatformModule,
  ],

  controllers: [TenantSupportController, PlatformSupportController],
  providers: [SupportService],
  exports: [SupportService],
})
export class SupportModule {}
