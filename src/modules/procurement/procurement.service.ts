import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Supplier } from '../../database/entities/supplier.entity.js';
import { Purchase, PurchaseStatus } from '../../database/entities/purchase.entity.js';
import { PurchaseItem } from '../../database/entities/purchase-item.entity.js';
import { PurchaseOrder, POStatus } from '../../database/entities/purchase-order.entity.js';
import { PurchaseOrderItem } from '../../database/entities/purchase-order-item.entity.js';
import { GoodsReceipt } from '../../database/entities/goods-receipt.entity.js';
import { GoodsReceiptItem } from '../../database/entities/goods-receipt-item.entity.js';
import { PurchaseInvoice, InvoiceStatus } from '../../database/entities/purchase-invoice.entity.js';
import { SupplierPayment } from '../../database/entities/supplier-payment.entity.js';
import { StockMovementsService } from '../inventory/movements/movements.service.js';
import { MovementType } from '../../database/entities/stock-movement.entity.js';

@Injectable()
export class ProcurementService {
  constructor(
    @InjectRepository(Supplier)
    private readonly supplierRepository: Repository<Supplier>,
    @InjectRepository(Purchase)
    private readonly purchaseRepository: Repository<Purchase>,
    @InjectRepository(PurchaseItem)
    private readonly purchaseItemRepository: Repository<PurchaseItem>,
    @InjectRepository(PurchaseOrder)
    private readonly poRepository: Repository<PurchaseOrder>,
    @InjectRepository(PurchaseOrderItem)
    private readonly poItemRepository: Repository<PurchaseOrderItem>,
    @InjectRepository(GoodsReceipt)
    private readonly grnRepository: Repository<GoodsReceipt>,
    @InjectRepository(GoodsReceiptItem)
    private readonly grnItemRepository: Repository<GoodsReceiptItem>,
    @InjectRepository(PurchaseInvoice)
    private readonly invoiceRepository: Repository<PurchaseInvoice>,
    @InjectRepository(SupplierPayment)
    private readonly paymentRepository: Repository<SupplierPayment>,
    private readonly stockMovementsService: StockMovementsService,
    private readonly dataSource: DataSource,
  ) {}

  // Suppliers
  async findAllSuppliers(businessId: string) {
    return this.supplierRepository.find({ where: { businessId } });
  }

  async createSupplier(businessId: string, data: Partial<Supplier>) {
    const supplier = this.supplierRepository.create({ ...data, businessId });
    return this.supplierRepository.save(supplier);
  }

  // --- Purchase Orders (PO) ---
  async findAllPOs(businessId: string) {
    return this.poRepository.find({
      where: { businessId },
      relations: ['supplier', 'items', 'items.product'],
      order: { createdAt: 'DESC' },
    });
  }

  async createPO(businessId: string, userId: string, data: any) {
    const { supplierId, expectedDate, items, notes } = data;

    return this.dataSource.transaction(async (manager) => {
      const poCount = await manager.count(PurchaseOrder, { where: { businessId } });
      const poNumber = `PO-${(poCount + 1).toString().padStart(5, '0')}`;

      const po = manager.create(PurchaseOrder, {
        businessId,
        supplierId,
        poNumber,
        expectedDate,
        notes,
        createdById: userId,
        status: POStatus.DRAFT,
      });

      const savedPO = await manager.save(po);

      let totalAmount = 0;
      for (const item of items) {
        const lineTotal = Number(item.quantity) * Number(item.unitPrice) + Number(item.taxAmount || 0);
        totalAmount += lineTotal;

        const poItem = manager.create(PurchaseOrderItem, {
          purchaseOrderId: savedPO.id,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          taxAmount: item.taxAmount || 0,
          totalLineAmount: lineTotal,
        });
        await manager.save(poItem);
      }

      savedPO.totalAmount = totalAmount;
      return manager.save(savedPO);
    });
  }

  async updatePOStatus(id: string, businessId: string, status: POStatus) {
    const po = await this.poRepository.findOne({ where: { id, businessId } });
    if (!po) throw new NotFoundException('Purchase Order not found');
    po.status = status;
    return this.poRepository.save(po);
  }

  // --- Goods Receipt (GRN) ---
  async findAllGRNs(businessId: string) {
    return this.grnRepository.find({
      where: { businessId },
      relations: ['purchaseOrder', 'purchaseOrder.supplier', 'items', 'items.product'],
      order: { receivedDate: 'DESC' },
    });
  }

  async createGRN(businessId: string, userId: string, data: any) {
    const { poId, receivedDate, items, notes } = data;

    const po = await this.poRepository.findOne({ where: { id: poId, businessId } });
    if (!po) throw new NotFoundException('Purchase Order not found');

    return this.dataSource.transaction(async (manager) => {
      const grn = manager.create(GoodsReceipt, {
        businessId,
        purchaseOrderId: poId,
        receivedById: userId,
        receivedDate,
        notes,
      });

      const savedGRN = await manager.save(grn);

      for (const item of items) {
        // Save GRN Item
        const grnItem = manager.create(GoodsReceiptItem, {
          goodsReceiptId: savedGRN.id,
          productId: item.productId,
          quantityReceived: item.quantityReceived,
          batchNumber: item.batchNumber,
          expiryDate: item.expiryDate,
        });
        await manager.save(grnItem);

        // TRIGGER STOCK UPDATE
        await this.stockMovementsService.adjustStock(
          businessId,
          item.productId,
          item.quantityReceived,
          MovementType.PURCHASE,
          userId,
          `GRN Recv for PO: ${po.poNumber}`,
          savedGRN.id,
        );
      }

      // Automatically update PO status to COMPLETED if fully received (simplified logic)
      po.status = POStatus.COMPLETED;
      await manager.save(po);

      return savedGRN;
    });
  }

  // --- Purchase Invoices ---
  async findAllInvoices(businessId: string) {
    return this.invoiceRepository.find({
      where: { businessId },
      relations: ['purchaseOrder', 'purchaseOrder.supplier', 'payments'],
      order: { createdAt: 'DESC' },
    });
  }

  async createInvoice(businessId: string, data: any) {
    const { poId, invoiceNumber, totalAmount, dueDate } = data;

    const invoice = this.invoiceRepository.create({
      businessId,
      purchaseOrderId: poId,
      invoiceNumber,
      totalAmount,
      dueAmount: totalAmount,
      dueDate,
      status: InvoiceStatus.UNPAID,
    });

    return this.invoiceRepository.save(invoice);
  }

  // --- Supplier Payments ---
  async recordPayment(businessId: string, data: any) {
    const { invoiceId, amount, paymentDate, paymentMode, referenceNumber, notes } = data;

    const invoice = await this.invoiceRepository.findOne({ where: { id: invoiceId, businessId } });
    if (!invoice) throw new NotFoundException('Invoice not found');

    return this.dataSource.transaction(async (manager) => {
      const payment = manager.create(SupplierPayment, {
        businessId,
        invoiceId,
        amount,
        paymentDate,
        paymentMode,
        referenceNumber,
        notes,
      });

      const savedPayment = await manager.save(payment);

      // Update Invoice Dues
      invoice.paidAmount = Number(invoice.paidAmount) + Number(amount);
      invoice.dueAmount = Number(invoice.totalAmount) - invoice.paidAmount;

      if (invoice.dueAmount <= 0) {
        invoice.status = InvoiceStatus.PAID;
      } else {
        invoice.status = InvoiceStatus.PARTIAL;
      }

      await manager.save(invoice);
      return savedPayment;
    });
  }

  // --- Legacy Methods (Keep for backward compatibility) ---
  async findAllPurchases(businessId: string) {
    return this.purchaseRepository.find({
      where: { businessId },
      relations: ['supplier', 'createdBy', 'items'],
      order: { purchaseDate: 'DESC' },
    });
  }

  async createPurchase(businessId: string, userId: string, data: any) {
    const { supplierId, billNumber, purchaseDate, items } = data;
    return this.dataSource.transaction(async (manager) => {
      const purchase = manager.create(Purchase, {
        businessId,
        supplierId,
        billNumber,
        purchaseDate,
        createdById: userId,
        status: PurchaseStatus.DRAFT,
      });
      const savedPurchase = await manager.save(purchase);
      let totalAmount = 0;
      for (const item of items) {
        const lineTotal = Number(item.quantity) * Number(item.unitPrice) + Number(item.taxAmount || 0);
        totalAmount += lineTotal;
        const purchaseItem = manager.create(PurchaseItem, {
          purchaseId: savedPurchase.id,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          taxAmount: item.taxAmount || 0,
          totalLineAmount: lineTotal,
          batchNumber: item.batchNumber,
          expiryDate: item.expiryDate,
        });
        await manager.save(purchaseItem);
      }
      savedPurchase.totalAmount = totalAmount;
      return manager.save(savedPurchase);
    });
  }

  async confirmPurchase(id: string, businessId: string, userId: string) {
    const purchase = await this.purchaseRepository.findOne({
      where: { id, businessId },
      relations: ['items'],
    });
    if (!purchase) throw new NotFoundException('Purchase not found');
    if (purchase.status !== PurchaseStatus.DRAFT) {
      throw new BadRequestException('Only draft purchases can be confirmed');
    }
    return this.dataSource.transaction(async (manager) => {
      purchase.status = PurchaseStatus.CONFIRMED;
      await manager.save(purchase);
      for (const item of purchase.items) {
        await this.stockMovementsService.adjustStock(
            businessId,
            item.productId,
            item.quantity,
            MovementType.PURCHASE,
            userId,
            `Purchase Bill #${purchase.billNumber || purchase.id.split('-')[0]}`,
            purchase.id
        );
      }
      return purchase;
    });
  }
}
