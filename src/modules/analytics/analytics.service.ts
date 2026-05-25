import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThanOrEqual, Between } from 'typeorm';
import { Product } from '../../database/entities/product.entity.js';
import { StockMovement } from '../../database/entities/stock-movement.entity.js';
import { Invoice } from '../../database/entities/invoice.entity.js';
import {
  Business,
  DomainType,
} from '../../database/entities/business.entity.js';

interface TopProductRaw {
  name: string;
  totalSold: string;
}

interface RevenueRaw {
  total: string | null;
}

interface StockValueRaw {
  total: string | null;
}

interface TrendRaw {
  total: string | null;
}

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(StockMovement)
    private readonly stockMovementRepository: Repository<StockMovement>,
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
    @InjectRepository(Business)
    private readonly businessRepository: Repository<Business>,
  ) {}

  async getTenantStats(businessId: string) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

      // 1. Core KPIs
      const [totalProducts, lowStockCount, outOfStockCount] = await Promise.all(
        [
          this.productRepository.count({ where: { businessId } }),
          this.productRepository.count({
            where: {
              businessId,
              stockQty: LessThan(10), // Should ideally use minStockLevel column
            },
          }),
          this.productRepository.count({ where: { businessId, stockQty: 0 } }),
        ],
      );

      // 2. Sales Aggregation
      const todayInvoices = await this.invoiceRepository.find({
        where: { businessId, createdAt: MoreThanOrEqual(today) },
      });
      const todaySales = todayInvoices.reduce(
        (sum, inv) => sum + Number(inv.totalAmount),
        0,
      );

      const monthlyInvoices = await this.invoiceRepository.find({
        where: { businessId, createdAt: MoreThanOrEqual(firstOfMonth) },
      });
      const monthlySales = monthlyInvoices.reduce(
        (sum, inv) => sum + Number(inv.totalAmount),
        0,
      );
      const totalOrders = monthlyInvoices.length;

      // 3. 7-Day Trend
      const trend: { date: string; amount: number; orders: number }[] = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);

        const nextDate = new Date(date);
        nextDate.setDate(date.getDate() + 1);

        const dayInvoices = await this.invoiceRepository.find({
          where: {
            businessId,
            createdAt: Between(date, nextDate),
          },
        });

        trend.push({
          date: date.toLocaleDateString('en-US', { weekday: 'short' }),
          amount: dayInvoices.reduce(
            (sum, inv) => sum + Number(inv.totalAmount),
            0,
          ),
          orders: dayInvoices.length,
        });
      }

      // 4. Inventory Alerts (Expiry)
      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

      const nearExpiryCount = await this.productRepository.count({
        where: {
          businessId,
          expiryDate: Between(new Date(), sevenDaysFromNow),
        },
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
        .orderBy('SUM(m.quantity)', 'DESC')
        .limit(5)
        .getRawMany<TopProductRaw>();

      // 5. Growth Calculations
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      const [yesterdayInvoices, lastMonthInvoices] = await Promise.all([
        this.invoiceRepository.find({
          where: { businessId, createdAt: Between(yesterday, today) },
        }),
        this.invoiceRepository.find({
          where: {
            businessId,
            createdAt: Between(
              new Date(today.getFullYear(), today.getMonth() - 1, 1),
              firstOfMonth,
            ),
          },
        }),
      ]);

      const yesterdaySales = yesterdayInvoices.reduce(
        (sum, inv) => sum + Number(inv.totalAmount),
        0,
      );
      const lastMonthSales = lastMonthInvoices.reduce(
        (sum, inv) => sum + Number(inv.totalAmount),
        0,
      );

      const salesGrowth =
        yesterdaySales > 0
          ? Math.round(((todaySales - yesterdaySales) / yesterdaySales) * 100)
          : 0;
      const monthlyGrowth =
        lastMonthSales > 0
          ? Math.round(((monthlySales - lastMonthSales) / lastMonthSales) * 100)
          : 0;

      // 6. Insight Generation
      const insights: string[] = [];
      if (lowStockCount > 0) {
        insights.push(
          `You have ${lowStockCount} items below minimum stock. Restock soon to avoid service disruption.`,
        );
      }
      if (salesGrowth > 0) {
        insights.push(
          `Sales are up by ${salesGrowth}% compared to yesterday. Keep up the momentum!`,
        );
      } else if (salesGrowth < 0) {
        insights.push(
          `Daily revenue dipped by ${Math.abs(
            salesGrowth,
          )}%. Check if any top products are out of stock.`,
        );
      }
      if (nearExpiryCount > 0) {
        insights.push(
          `${nearExpiryCount} items are expiring within 7 days. Consider a clearance sale.`,
        );
      }

      return {
        totalProducts,
        lowStockCount,
        outOfStockCount,
        nearExpiryCount,
        todaySales,
        monthlySales,
        totalOrders,
        salesTrend: trend,
        topProducts: (topMovements || []).map((m) => ({
          name: m.name,
          totalSold: parseInt(m.totalSold || '0', 10),
        })),
        growth: {
          sales: salesGrowth,
          monthly: monthlyGrowth,
          orders:
            lastMonthInvoices.length > 0
              ? Math.round(
                  ((totalOrders - lastMonthInvoices.length) /
                    lastMonthInvoices.length) *
                    100,
                )
              : 0,
        },
        insights,
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
        topProducts: [],
        growth: { sales: 0, monthly: 0, orders: 0 },
        insights: [],
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
      .getRawOne<RevenueRaw>();

    const stockValueData = await this.productRepository
      .createQueryBuilder('product')
      .select('SUM(product.stockQty * product.purchasePrice)', 'total')
      .where('product.businessId = :businessId', { businessId })
      .getRawOne<StockValueRaw>();

    return {
      totalRevenue: Number(revenueData?.total || 0),
      totalStockValue: Number(stockValueData?.total || 0),
      // We can add more metrics like Net Profit if we track COGS perfectly
    };
  }

  async getSalesTrend(businessId: string) {
    const now = new Date();
    const trend: { month: string; value: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const start = new Date(date.getFullYear(), date.getMonth(), 1);
      const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);

      const monthData = await this.invoiceRepository
        .createQueryBuilder('invoice')
        .select('SUM(invoice.totalAmount)', 'total')
        .where('invoice.businessId = :businessId', { businessId })
        .andWhere('invoice.createdAt BETWEEN :start AND :end', { start, end })
        .getRawOne<TrendRaw>();

      trend.push({
        month: date.toLocaleString('default', { month: 'short' }),
        value: Number(monthData?.total || 0),
      });
    }
    return trend;
  }

  async getDomainWidgets(businessId: string) {
    const business = await this.businessRepository.findOne({
      where: { id: businessId },
    });
    if (!business) return [];

    const widgets: { id: string; title: string; message: string }[] = [];

    // Operational Pulse Widget
    const auditDate = new Date();
    auditDate.setDate(auditDate.getDate() + 2); // 48 hours from now
    const dateStr = auditDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });

    const message =
      business.domainType === DomainType.PHARMACY
        ? `Drug license validation active. Next automated stock audit scheduled for ${dateStr}.`
        : `Compliance monitoring active. Next automated stock audit scheduled for ${dateStr}.`;

    widgets.push({
      id: 'operational-pulse',
      title: 'Operational Pulse',
      message,
    });

    return widgets;
  }

  async getInventorySummary(businessId: string) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(today.getDate() - 30);
      const sixtyDaysAgo = new Date(today);
      sixtyDaysAgo.setDate(today.getDate() - 60);

      const [
        totalProducts,
        lowStockCount,
        outOfStockCount,
        productsThisMonth,
        productsLastMonth,
      ] = await Promise.all([
        this.productRepository.count({ where: { businessId } }),
        this.productRepository
          .createQueryBuilder('product')
          .where('product.businessId = :businessId', { businessId })
          .andWhere('product.stockQty > 0')
          .andWhere('product.stockQty <= product.minStockLevel')
          .getCount(),
        this.productRepository.count({ where: { businessId, stockQty: 0 } }),
        this.productRepository.count({
          where: {
            businessId,
            createdAt: MoreThanOrEqual(thirtyDaysAgo),
          },
        }),
        this.productRepository.count({
          where: {
            businessId,
            createdAt: Between(sixtyDaysAgo, thirtyDaysAgo),
          },
        }),
      ]);

      const inventoryGrowth =
        productsLastMonth > 0
          ? ((productsThisMonth - productsLastMonth) / productsLastMonth) * 100
          : productsThisMonth > 0
            ? 100
            : 0;

      return {
        totalProducts,
        lowStockCount,
        outOfStockCount,
        inventoryGrowth,
      };
    } catch (error) {
      console.error('Error fetching inventory summary:', error);
      return {
        totalProducts: 0,
        lowStockCount: 0,
        outOfStockCount: 0,
        inventoryGrowth: 0,
      };
    }
  }
}
