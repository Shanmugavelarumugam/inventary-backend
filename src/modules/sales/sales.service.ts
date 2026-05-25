import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Between } from 'typeorm';
import { Customer } from '../../database/entities/customer.entity.js';
import {
  Invoice,
  InvoiceStatus,
} from '../../database/entities/invoice.entity.js';
import { InvoiceItem } from '../../database/entities/invoice-item.entity.js';
import { SalesOrder } from '../../database/entities/sales-order.entity.js';
import { SalesReturn } from '../../database/entities/sales-return.entity.js';
import { SalesQuote } from '../../database/entities/sales-quote.entity.js';
import { StockMovementsService } from '../inventory/movements/movements.service.js';
import { MovementType } from '../../database/entities/stock-movement.entity.js';
import {
  SalesSource,
  SalesOrderStatus,
} from '../../common/enums/sales.enum.js';
import { CustomersService } from '../customers/customers.service.js';
import { PaymentMethod } from '../../database/entities/invoice.entity.js';
import { LedgerEntryType } from '../../common/enums/customer.enum.js';

@Injectable()
export class SalesService {
  constructor(
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
    @InjectRepository(InvoiceItem)
    private readonly invoiceItemRepository: Repository<InvoiceItem>,
    @InjectRepository(SalesOrder)
    private readonly orderRepository: Repository<SalesOrder>,
    @InjectRepository(SalesReturn)
    private readonly returnRepository: Repository<SalesReturn>,
    @InjectRepository(SalesQuote)
    private readonly quoteRepository: Repository<SalesQuote>,
    private readonly stockMovementsService: StockMovementsService,
    private readonly customersService: CustomersService,
    private readonly dataSource: DataSource,
  ) {}

  // --- Customers ---
  async findAllCustomers(businessId: string) {
    return this.customerRepository.find({ where: { businessId } });
  }

  async createCustomer(businessId: string, data: Partial<Customer>) {
    const customer = this.customerRepository.create({ ...data, businessId });
    return this.customerRepository.save(customer);
  }

  // --- Invoices / POS ---
  async findAllInvoices(businessId: string): Promise<Invoice[]> {
    return this.invoiceRepository.find({
      where: { businessId },
      relations: ['customer', 'createdBy', 'items', 'items.product'],
      order: { createdAt: 'DESC' },
    });
  }

  async processSale(
    businessId: string,
    userId: string,
    data: {
      customerId?: string;
      items: {
        productId: string;
        quantity: number;
        unitPrice: number;
        taxRate?: number;
      }[];
      paymentMethod: PaymentMethod;
      discountAmount?: number;
      source?: SalesSource;
      orderId?: string;
    },
  ): Promise<Invoice> {
    const {
      customerId,
      items,
      paymentMethod,
      discountAmount = 0,
      source = SalesSource.POS,
      orderId,
    } = data;

    return this.dataSource.transaction(async (manager) => {
      const invoiceCount = await manager.count(Invoice, {
        where: { businessId },
      });
      const invoiceNumber = `INV-${(invoiceCount + 1).toString().padStart(6, '0')}`;

      let subTotal = 0;
      let taxTotal = 0;

      const invoice = manager.create(Invoice, {
        businessId,
        invoiceNumber,
        customerId,
        createdById: userId,
        paymentMethod,
        source,
        orderId,
        status: InvoiceStatus.PAID,
        discountAmount,
      });

      const savedInvoice = await manager.save(invoice);

      for (const item of items) {
        const lineSubTotal = item.quantity * item.unitPrice;
        const lineTax = (lineSubTotal * (item.taxRate || 0)) / 100;
        const lineTotal = lineSubTotal + lineTax;

        subTotal += lineSubTotal;
        taxTotal += lineTax;

        const invoiceItem = manager.create(InvoiceItem, {
          invoiceId: savedInvoice.id,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          taxAmount: lineTax,
          totalLineAmount: lineTotal,
        });
        await manager.save(invoiceItem);

        // Deduct Stock
        await this.stockMovementsService.adjustStock(
          businessId,
          item.productId,
          -item.quantity,
          MovementType.SALE,
          userId,
          `Sale Invoice #${invoiceNumber}`,
          savedInvoice.id,
        );
      }

      savedInvoice.subTotal = subTotal;
      savedInvoice.taxAmount = taxTotal;
      savedInvoice.totalAmount = subTotal + taxTotal - Number(discountAmount);
      const finalInvoice = await manager.save(savedInvoice);

      // --- Customers Management Integration ---
      if (customerId) {
        // Loyalty Points: 1 point per 100 spent
        const pts = Math.floor(finalInvoice.totalAmount / 100);
        if (pts > 0) {
          await this.customersService.addLoyaltyPoints(
            businessId,
            customerId,
            pts,
            manager,
          );
        }

        // Credit Ledger tracking
        if (paymentMethod === PaymentMethod.CREDIT) {
          await this.customersService.updateBalance(
            businessId,
            customerId,
            finalInvoice.totalAmount, // Increases debt
            LedgerEntryType.INVOICE,
            finalInvoice.id,
            finalInvoice.invoiceNumber,
            'Credit Sale',
            manager,
          );
        }
      }

      return finalInvoice;
    });
  }

  // --- Sales Orders ---
  async findAllOrders(businessId: string) {
    return this.orderRepository.find({
      where: { businessId },
      relations: ['customer', 'createdBy'],
      order: { createdAt: 'DESC' },
    });
  }

  async createOrder(
    businessId: string,
    userId: string,
    data: Partial<SalesOrder>,
  ): Promise<SalesOrder> {
    const orderCount = await this.orderRepository.count({
      where: { businessId },
    });
    const orderNumber = `ORD-${(orderCount + 1).toString().padStart(6, '0')}`;

    const order = this.orderRepository.create({
      ...data,
      businessId,
      orderNumber,
      createdById: userId,
      status: SalesOrderStatus.PENDING,
    });
    return this.orderRepository.save(order);
  }

  async updateOrderStatus(
    id: string,
    businessId: string,
    status: SalesOrderStatus,
  ) {
    const order = await this.orderRepository.findOne({
      where: { id, businessId },
    });
    if (!order) throw new NotFoundException('Order not found');
    order.status = status;
    return this.orderRepository.save(order);
  }

  // --- Returns ---
  async processReturn(
    businessId: string,
    userId: string,
    data: {
      invoiceId: string;
      reason?: string;
      refundAmount: number;
      items: { productId: string; quantity: number }[];
    },
  ): Promise<SalesReturn> {
    const { invoiceId, reason, refundAmount, items } = data;

    const invoice = await this.invoiceRepository.findOne({
      where: { id: invoiceId, businessId },
      relations: ['items'],
    });
    if (!invoice) throw new NotFoundException('Invoice not found');

    return this.dataSource.transaction(async (manager) => {
      const salesReturn = manager.create(SalesReturn, {
        businessId,
        invoiceId,
        reason,
        refundAmount,
        returnedItems: items, // Properly typed since items comes from 'data'
        createdById: userId,
      });

      const savedReturn = await manager.save(salesReturn);

      // --- Customers Management Integration ---
      if (invoice.customerId) {
        await this.customersService.updateBalance(
          businessId,
          invoice.customerId,
          -Number(refundAmount), // Decreases debt
          LedgerEntryType.RETURN,
          savedReturn.id,
          `RET-${invoice.invoiceNumber}`,
          'Sales Return Adjustment',
          manager,
        );
      }

      // Restore Stock
      for (const item of items) {
        await this.stockMovementsService.adjustStock(
          businessId,
          item.productId,
          item.quantity, // Positive for restoration
          MovementType.ADJUSTMENT,
          userId,
          `Return for Invoice #${invoice.invoiceNumber}`,
          invoice.id,
        );
      }

      return savedReturn;
    });
  }

  // --- Analytics ---
  async getSalesAnalytics(businessId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const invoicesToday = await this.invoiceRepository.find({
      where: {
        businessId,
        createdAt: Between(today, new Date()),
      },
    });

    const totalDailySales = invoicesToday.reduce(
      (sum, inv) => sum + Number(inv.totalAmount),
      0,
    );

    const paymentModeSplit = invoicesToday.reduce(
      (acc: Record<string, number>, inv) => {
        acc[inv.paymentMethod] =
          (acc[inv.paymentMethod] || 0) + Number(inv.totalAmount);
        return acc;
      },
      {},
    );

    // Calculate dynamic weekly sales trend
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const invoicesWeek = await this.invoiceRepository.find({
      where: {
        businessId,
        createdAt: Between(sevenDaysAgo, new Date()),
      },
      relations: ['items', 'items.product', 'items.product.category'],
    });

    // Generate weekly data
    const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const trendMap: Record<string, number> = {};
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      trendMap[weekday[d.getDay()]] = 0;
    }

    invoicesWeek.forEach((inv) => {
      const dayName = weekday[new Date(inv.createdAt).getDay()];
      if (trendMap[dayName] !== undefined) {
        trendMap[dayName] += Number(inv.totalAmount);
      }
    });

    const salesTrend = Object.entries(trendMap)
      .reverse()
      .map(([name, value]) => ({ name, value }));

    // Calculate category breakdown
    const categoryMap: Record<string, number> = {};
    invoicesWeek.forEach((inv) => {
      inv.items?.forEach((item) => {
        const catName = item.product?.category?.name || 'General';
        const itemVal = Number(item.unitPrice) * Number(item.quantity);
        categoryMap[catName] = (categoryMap[catName] || 0) + itemVal;
      });
    });

    const categoryData = Object.entries(categoryMap).map(([name, value]) => ({
      name,
      value,
    }));

    // If there's no real data, seed a basic fallback so the charts aren't completely empty
    if (salesTrend.length === 0 || salesTrend.every((v) => v.value === 0)) {
      salesTrend.push({ name: 'Today', value: totalDailySales || 0 });
    }

    if (categoryData.length === 0) {
      categoryData.push({ name: 'No Data Yet', value: 1 });
    }

    return {
      dailySales: totalDailySales,
      orderCount: invoicesToday.length,
      paymentModeSplit,
      salesTrend,
      categoryData,
    };
  }
}
