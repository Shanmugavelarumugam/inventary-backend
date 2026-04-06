import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProcurementService } from './procurement.service.js';
import { ProcurementController } from './procurement.controller.js';
import { Supplier } from '../../database/entities/supplier.entity.js';
import { Purchase } from '../../database/entities/purchase.entity.js';
import { PurchaseItem } from '../../database/entities/purchase-item.entity.js';
import { PurchaseOrder } from '../../database/entities/purchase-order.entity.js';
import { PurchaseOrderItem } from '../../database/entities/purchase-order-item.entity.js';
import { GoodsReceipt } from '../../database/entities/goods-receipt.entity.js';
import { GoodsReceiptItem } from '../../database/entities/goods-receipt-item.entity.js';
import { PurchaseInvoice } from '../../database/entities/purchase-invoice.entity.js';
import { SupplierPayment } from '../../database/entities/supplier-payment.entity.js';
import { InventoryModule } from '../inventory/inventory.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Supplier,
      Purchase,
      PurchaseItem,
      PurchaseOrder,
      PurchaseOrderItem,
      GoodsReceipt,
      GoodsReceiptItem,
      PurchaseInvoice,
      SupplierPayment,
    ]),
    InventoryModule, // To use StockMovementsService
  ],
  controllers: [ProcurementController],
  providers: [ProcurementService],
  exports: [ProcurementService],
})
export class ProcurementModule {}
