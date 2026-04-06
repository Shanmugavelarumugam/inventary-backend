import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Customer } from '../../database/entities/customer.entity.js';
import { Invoice, InvoiceStatus } from '../../database/entities/invoice.entity.js';
import { InvoiceItem } from '../../database/entities/invoice-item.entity.js';
import { StockMovementsService } from '../inventory/movements/movements.service.js';
import { MovementType } from '../../database/entities/stock-movement.entity.js';

@Injectable()
export class SalesService {
  constructor(
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
    @InjectRepository(InvoiceItem)
    private readonly invoiceItemRepository: Repository<InvoiceItem>,
    private readonly stockMovementsService: StockMovementsService,
    private readonly dataSource: DataSource,
  ) {}

  // Customer CRUD
  async findAllCustomers(businessId: string) {
    return this.customerRepository.find({ where: { businessId } });
  }

  async createCustomer(businessId: string, data: Partial<Customer>) {
    const customer = this.customerRepository.create({ ...data, businessId });
    return this.customerRepository.save(customer);
  }

  // Invoice / Sales Entry
  async findAllInvoices(businessId: string) {
    return this.invoiceRepository.find({
      where: { businessId },
      relations: ['customer', 'createdBy', 'items', 'items.product'],
      order: { createdAt: 'DESC' },
    });
  }

  async processSale(businessId: string, userId: string, data: any) {
    const { customerId, items, paymentMethod, discountAmount = 0 } = data;

    return this.dataSource.transaction(async (manager) => {
      // 1. Generate Invoice Number (Simple sequential or random for now)
      const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;

      // 2. Initial Totals
      let subTotal = 0;
      let taxTotal = 0;

      // 3. Create Invoice Header (Temporary save to get ID)
      const invoice = manager.create(Invoice, {
        businessId,
        invoiceNumber,
        customerId,
        createdById: userId,
        paymentMethod,
        status: InvoiceStatus.PAID, // Standard POS is paid immediately
        discountAmount,
      });

      const savedInvoice = await manager.save(invoice);

      // 4. Process Items & Deduct Stock
      for (const item of items) {
        const lineSubTotal = Number(item.quantity) * Number(item.unitPrice);
        const lineTax = lineSubTotal * (item.taxRate || 0) / 100;
        const lineTotal = lineSubTotal + lineTax;

        subTotal += lineSubTotal;
        taxTotal += lineTax;

        // Create Invoice Item
        const invoiceItem = manager.create(InvoiceItem, {
          invoiceId: savedInvoice.id,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          taxAmount: lineTax,
          totalLineAmount: lineTotal,
        });
        await manager.save(invoiceItem);

        // --- CRITICAL: INVENTORY DEDUCTION ---
        // Every sale decrements stock by quantity
        await this.stockMovementsService.adjustStock(
            businessId,
            item.productId,
            -item.quantity, // Negative for SALE
            MovementType.SALE,
            userId,
            `Sale Invoice #${invoiceNumber}`,
            savedInvoice.id
        );
      }

      // 5. Finalize Header Totals
      savedInvoice.subTotal = subTotal;
      savedInvoice.taxAmount = taxTotal;
      savedInvoice.totalAmount = subTotal + taxTotal - Number(discountAmount);
      
      return manager.save(savedInvoice);
    });
  }

  async findOneInvoice(id: string, businessId: string) {
    const invoice = await this.invoiceRepository.findOne({
      where: { id, businessId },
      relations: ['customer', 'createdBy', 'items', 'items.product'],
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
    return invoice;
  }

  async updateInvoice(id: string, businessId: string, data: any) {
    const invoice = await this.findOneInvoice(id, businessId);
    Object.assign(invoice, data);
    return this.invoiceRepository.save(invoice);
  }

  async processPayment(id: string, businessId: string, data: any) {
    const invoice = await this.findOneInvoice(id, businessId);
    // In a real system, this would create a Payment record and update invoice status
    invoice.status = InvoiceStatus.PAID;
    if (data.paymentMethod) {
      invoice.paymentMethod = data.paymentMethod;
    }
    return this.invoiceRepository.save(invoice);
  }

  async processReturn(id: string, businessId: string, userId: string, data: any) {
    const invoice = await this.findOneInvoice(id, businessId);
    
    return this.dataSource.transaction(async (manager) => {
      // 1. Mark invoice as having a return or update status
      invoice.status = InvoiceStatus.VOID; // Simple logic for MVP: Void the invoice on return
      await manager.save(invoice);

      // 2. Adjust stock back (Positive quantity for RETURN)
      for (const item of invoice.items) {
        await this.stockMovementsService.adjustStock(
          businessId,
          item.productId,
          item.quantity, // Positive to add back to stock
          MovementType.ADJUSTMENT,
          userId,
          `Return for Invoice #${invoice.invoiceNumber}`,
          invoice.id
        );
      }
      
      return invoice;
    });
  }
}
