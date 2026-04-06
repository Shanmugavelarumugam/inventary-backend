import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsService } from './analytics.service.js';
import { TenantDashboardController } from './analytics.controller.js';
import { Product } from '../../database/entities/product.entity.js';
import { StockMovement } from '../../database/entities/stock-movement.entity.js';
import { Invoice } from '../../database/entities/invoice.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([Product, StockMovement, Invoice])],
  controllers: [TenantDashboardController],
  providers: [AnalyticsService],
})
export class AnalyticsModule {}

