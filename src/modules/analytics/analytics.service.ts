import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, LessThan, MoreThanOrEqual, Between } from 'typeorm';
import { Product } from '../../database/entities/product.entity.js';
import { StockMovement } from '../../database/entities/stock-movement.entity.js';
import { Invoice } from '../../database/entities/invoice.entity.js';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(StockMovement)
    private readonly stockMovementRepository: Repository<StockMovement>,
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
  ) {}

  async getTenantStats(businessId: string) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

      // 1. Core KPIs
      const [totalProducts, lowStockCount, outOfStockCount] = await Promise.all([
        this.productRepository.count({ where: { businessId } }),
        this.productRepository.count({ 
            where: { 
                businessId, 
                stockQty: LessThan(10) // Should ideally use minStockLevel column
            } 
        }),
        this.productRepository.count({ where: { businessId, stockQty: 0 } }),
      ]);

      // 2. Sales Aggregation
      const todayInvoices = await this.invoiceRepository.find({
        where: { businessId, createdAt: MoreThanOrEqual(today) },
      });
      const todaySales = todayInvoices.reduce((sum, inv) => sum + Number(inv.totalAmount), 0);

      const monthlyInvoices = await this.invoiceRepository.find({
        where: { businessId, createdAt: MoreThanOrEqual(firstOfMonth) },
      });
      const monthlySales = monthlyInvoices.reduce((sum, inv) => sum + Number(inv.totalAmount), 0);
      const totalOrders = monthlyInvoices.length;

      // 3. 7-Day Trend
      const trend: { date: string; amount: number }[] = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);
        
        const nextDate = new Date(date);
        nextDate.setDate(date.getDate() + 1);

        const dayInvoices = await this.invoiceRepository.find({
            where: { 
                businessId, 
                createdAt: Between(date, nextDate)
            }
        });

        trend.push({
            date: date.toLocaleDateString('en-US', { weekday: 'short' }),
            amount: dayInvoices.reduce((sum, inv) => sum + Number(inv.totalAmount), 0)
        });
      }

      // 4. Inventory Alerts (Expiry)
      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

      const nearExpiryCount = await this.productRepository.count({
          where: {
              businessId,
              expiryDate: Between(new Date(), sevenDaysFromNow)
          }
      });

      // 4. Top Products (By Outgoing Movements)
      const topMovements = await this.stockMovementRepository
        .createQueryBuilder('m')
        .leftJoinAndSelect('m.product', 'p')
        .select('p.name', 'name')
        .addSelect('SUM(m.quantity)', 'totalSold')
        .where('m.businessId = :businessId', { businessId })
        .andWhere('m.type = :type', { type: 'OUT' })
        .groupBy('p.name')
        .orderBy('totalSold', 'DESC')
        .limit(5)
        .getRawMany();

      return {
        totalProducts,
        lowStockCount,
        outOfStockCount,
        nearExpiryCount,
        todaySales,
        monthlySales,
        totalOrders,
        salesTrend: trend,
        topProducts: topMovements.map(m => ({
            name: m.name,
            totalSold: parseInt(m.totalSold)
        }))
      };
    } catch (error) {
      console.error('Error fetching tenant stats:', error);
      return {
        totalProducts: 0,
        lowStockCount: 0,
        outOfStockCount: 0,
        nearExpiryCount: 0,
        todaySales: 0,
        monthlySales: 0,
        totalOrders: 0,
        salesTrend: [],
        topProducts: []
      };
    }

  }

  async getRecentActivity(businessId: string) {
    try {
      const movements = await this.stockMovementRepository.find({
        where: { businessId },
        relations: ['product'],
        order: { createdAt: 'DESC' },
        take: 10,
      });

      return movements.map((m) => ({
        id: m.id,
        productName: m.product?.name || 'Deleted Product',
        quantity: m.quantity || 0,
        type: m.type || 'OUT',
        createdAt: m.createdAt,
      }));
    } catch (error) {
      console.error('Error fetching recent activity:', error);
      return [];
    }
  }

  async getAdvancedStats(businessId: string) {
    const revenueData = await this.invoiceRepository
      .createQueryBuilder('invoice')
      .select('SUM(invoice.totalAmount)', 'total')
      .where('invoice.businessId = :businessId', { businessId })
      .getRawOne();

    const stockValueData = await this.productRepository
      .createQueryBuilder('product')
      .select('SUM(product.stockQty * product.purchasePrice)', 'total')
      .where('product.businessId = :businessId', { businessId })
      .getRawOne();

    return {
      totalRevenue: Number(revenueData?.total || 0),
      totalStockValue: Number(stockValueData?.total || 0),
      // We can add more metrics like Net Profit if we track COGS perfectly
    };
  }

  async getSalesTrend(businessId: string) {
    const now = new Date();
    const trend: any[] = [];
    for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const start = new Date(date.getFullYear(), date.getMonth(), 1);
        const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);

        const monthData = await this.invoiceRepository
            .createQueryBuilder('invoice')
            .select('SUM(invoice.totalAmount)', 'total')
            .where('invoice.businessId = :businessId', { businessId })
            .andWhere('invoice.createdAt BETWEEN :start AND :end', { start, end })
            .getRawOne();

        trend.push({
            month: date.toLocaleString('default', { month: 'short' }),
            value: Number(monthData?.total || 0),
        });
    }
    return trend;
  }
}




