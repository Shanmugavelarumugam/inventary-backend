import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SalesService } from './sales.service.js';
import { SalesController } from './sales.controller.js';
import { Customer } from '../../database/entities/customer.entity.js';
import { Invoice } from '../../database/entities/invoice.entity.js';
import { InvoiceItem } from '../../database/entities/invoice-item.entity.js';
import { SalesOrder } from '../../database/entities/sales-order.entity.js';
import { SalesReturn } from '../../database/entities/sales-return.entity.js';
import { SalesQuote } from '../../database/entities/sales-quote.entity.js';
import { InventoryModule } from '../inventory/inventory.module.js';
import { CustomersModule } from '../customers/customers.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Customer,
      Invoice,
      InvoiceItem,
      SalesOrder,
      SalesReturn,
      SalesQuote,
    ]),
    InventoryModule, // For StockMovements
    CustomersModule,
  ],
  controllers: [SalesController],
  providers: [SalesService],
  exports: [SalesService],
})
export class SalesModule {}
