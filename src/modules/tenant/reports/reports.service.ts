import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Product } from '../../../database/entities/product.entity.js';
import { Invoice } from '../../../database/entities/invoice.entity.js';
import { StockMovement } from '../../../database/entities/stock-movement.entity.js';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
    @InjectRepository(StockMovement)
    private readonly stockMovementRepository: Repository<StockMovement>,
  ) {}

  async getSalesReport(businessId: string, from: Date, to: Date) {
    const invoices = await this.invoiceRepository.find({
      where: { businessId, createdAt: Between(from, to) },
      relations: ['customer', 'items', 'items.product'],
    });

    const totalRevenue = invoices.reduce((sum, inv) => sum + Number(inv.totalAmount), 0);
    const totalTax = invoices.reduce((sum, inv) => sum + Number(inv.taxAmount), 0);

    return {
      period: { from, to },
      totalRevenue,
      totalTax,
      invoiceCount: invoices.length,
      data: invoices,
    };
  }

  async getInventoryReport(businessId: string) {
    const products = await this.productRepository.find({
      where: { businessId },
      relations: ['category'],
    });

    return {
      timestamp: new Date(),
      totalItems: products.length,
      data: products,
    };
  }

  async getProfitLossReport(businessId: string, from: Date, to: Date) {
    const invoices = await this.invoiceRepository.find({
      where: { businessId, createdAt: Between(from, to) },
      relations: ['items', 'items.product'],
    });

    let totalRevenue = 0;
    let totalCOGS = 0;

    for (const inv of invoices) {
      totalRevenue += Number(inv.totalAmount);
      for (const item of inv.items) {
        // COGS = quantity * purchasePrice
        const purchasePrice = item.product?.purchasePrice || 0;
        totalCOGS += Number(item.quantity) * Number(purchasePrice);
      }
    }

    return {
      period: { from, to },
      totalRevenue,
      totalCOGS,
      grossProfit: totalRevenue - totalCOGS,
    };
  }

  async getStockValuation(businessId: string) {
    const products = await this.productRepository.find({
      where: { businessId },
    });

    const totalValue = products.reduce((sum, p) => sum + (Number(p.stockQty) * Number(p.purchasePrice)), 0);
    const totalRetailValue = products.reduce((sum, p) => sum + (Number(p.stockQty) * Number(p.price)), 0);

    return {
      totalItems: products.length,
      totalCostValue: totalValue,
      totalRetailValue: totalRetailValue,
      potentialProfit: totalRetailValue - totalValue,
    };
  }

  async getGstReport(businessId: string, from: Date, to: Date) {
    const invoices = await this.invoiceRepository.find({
      where: { businessId, createdAt: Between(from, to) },
    });

    const totalTax = invoices.reduce((sum, inv) => sum + Number(inv.taxAmount), 0);
    const taxableAmount = invoices.reduce((sum, inv) => sum + (Number(inv.totalAmount) - Number(inv.taxAmount)), 0);

    return {
      period: { from, to },
      totalTaxableAmount: taxableAmount,
      totalGstCollected: totalTax,
    };
  }
}
