import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SalesService } from './sales.service.js';
import { SalesController } from './sales.controller.js';
import { Customer } from '../../database/entities/customer.entity.js';
import { Invoice } from '../../database/entities/invoice.entity.js';
import { InvoiceItem } from '../../database/entities/invoice-item.entity.js';
import { InventoryModule } from '../inventory/inventory.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Customer, Invoice, InvoiceItem]),
    InventoryModule, // For StockMovements
  ],
  controllers: [SalesController],
  providers: [SalesService],
  exports: [SalesService],
})
export class SalesModule {}
