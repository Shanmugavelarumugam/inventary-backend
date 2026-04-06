import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BusinessService } from './business.service.js';
import { BusinessController } from './business.controller.js';
import { Business } from '../../database/entities/business.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([Business])],
  controllers: [BusinessController],
  providers: [BusinessService],
  exports: [BusinessService],
})
export class BusinessModule {}

