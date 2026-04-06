import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportsController } from './reports.controller.js';
import { ReportsService } from './reports.service.js';
import { Product } from '../../../database/entities/product.entity.js';
import { Invoice } from '../../../database/entities/invoice.entity.js';
import { StockMovement } from '../../../database/entities/stock-movement.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([Product, Invoice, StockMovement])],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
