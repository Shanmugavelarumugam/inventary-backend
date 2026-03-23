import { Module } from '@nestjs/common';
import { RetailService } from './retail.service.js';
import { RetailController } from './retail.controller.js';

@Module({
  controllers: [RetailController],
  providers: [RetailService],
})
export class RetailModule {}
