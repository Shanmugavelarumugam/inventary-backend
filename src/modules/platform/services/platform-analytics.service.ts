import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual, Between } from 'typeorm';
import { Business } from '../../../database/entities/business.entity.js';
import { Invoice } from '../../../database/entities/invoice.entity.js';
import { User } from '../../../database/entities/user.entity.js';

@Injectable()
export class PlatformAnalyticsService {
  constructor(
    @InjectRepository(Business)
    private readonly businessRepository: Repository<Business>,
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async getPlatformStats() {
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(today.getTime() - 60 * 24 * 60 * 60 * 1000);
    const twentyFourHoursAgo = new Date(
      today.getTime() - 24 * 48 * 60 * 60 * 1000,
    ); // For growth comparison
    const fortyEightHoursAgo = new Date(
      today.getTime() - 48 * 48 * 60 * 60 * 1000,
    );

    const firstOfCurrentMonth = new Date(
      today.getFullYear(),
      today.getMonth(),
      1,
    );
    const firstOfLastMonth = new Date(
      today.getFullYear(),
      today.getMonth() - 1,
      1,
    );
    const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);

    const [
      totalTenants,
      newTenantsThisMonth,
      newTenantsLastMonth,
      currentMonthInvoices,
      lastMonthInvoices,
      activeUsersNow,
      activeUsersPrevious,
    ] = await Promise.all([
      this.businessRepository.count(),
      this.businessRepository.count({
        where: { createdAt: MoreThanOrEqual(thirtyDaysAgo) },
      }),
      this.businessRepository.count({
        where: { createdAt: Between(sixtyDaysAgo, thirtyDaysAgo) },
      }),
      this.invoiceRepository.find({
        where: { createdAt: MoreThanOrEqual(firstOfCurrentMonth) },
      }),
      this.invoiceRepository.find({
        where: { createdAt: Between(firstOfLastMonth, endOfLastMonth) },
      }),
      this.userRepository.count({
        where: {
          lastLogin: MoreThanOrEqual(
            new Date(Date.now() - 24 * 60 * 60 * 1000),
          ),
        },
      }),
      this.userRepository.count({
        where: { lastLogin: Between(fortyEightHoursAgo, twentyFourHoursAgo) },
      }),
    ]);

    // 1. Revenue Growth
    const currentRevenue = currentMonthInvoices.reduce(
      (sum, inv) => sum + Number(inv.totalAmount),
      0,
    );
    const lastRevenue = lastMonthInvoices.reduce(
      (sum, inv) => sum + Number(inv.totalAmount),
      0,
    );
    const revenueGrowth =
      lastRevenue === 0
        ? 100
        : ((currentRevenue - lastRevenue) / lastRevenue) * 100;

    // 2. Tenant Growth
    const tenantGrowth =
      newTenantsLastMonth === 0
        ? 100
        : ((newTenantsThisMonth - newTenantsLastMonth) / newTenantsLastMonth) *
          100;

    // 3. Session Growth
    const sessionGrowth =
      activeUsersPrevious === 0
        ? 100
        : ((activeUsersNow - activeUsersPrevious) / activeUsersPrevious) * 100;

    // 4. System Health (Check DB connection)
    let healthScore = 99.9;
    let healthStatus = 'Stable';
    try {
      await this.businessRepository.query('SELECT 1');
    } catch (_e) {
      healthScore = 0;
      healthStatus = 'Critical';
    }

    return {
      totalTenants,
      tenantGrowth: `${tenantGrowth > 0 ? '+' : ''}${tenantGrowth.toFixed(1)}%`,
      monthlyRevenue: currentRevenue,
      revenueGrowth: `${revenueGrowth > 0 ? '+' : ''}${revenueGrowth.toFixed(1)}%`,
      activeSessions: activeUsersNow,
      sessionGrowth: `${sessionGrowth > 0 ? '+' : ''}${sessionGrowth.toFixed(1)}%`,
      systemHealth: `${healthScore.toFixed(1)}%`,
      systemStatus: healthStatus,
    };
  }

  async getRevenueGrowthChart() {
    const now = new Date();
    const trend: { month: string; value: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const start = new Date(date.getFullYear(), date.getMonth(), 1);
      const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);

      const monthData = await this.invoiceRepository
        .createQueryBuilder('invoice')
        .select('SUM(invoice.totalAmount)', 'total')
        .where('invoice.createdAt BETWEEN :start AND :end', { start, end })
        .getRawOne<{ total: string | null }>();

      trend.push({
        month: date.toLocaleString('default', { month: 'short' }),
        value: Number(monthData?.total || 0),
      });
    }
    return trend;
  }

  async getBusinessDistribution() {
    const distribution = await this.businessRepository
      .createQueryBuilder('b')
      .select('b.domainType', 'type')
      .addSelect('COUNT(b.id)', 'count')
      .groupBy('b.domainType')
      .getRawMany<{ type: string; count: string }>();

    const colors: Record<string, string> = {
      pharmacy: '#0F766E',
      supermarket: '#2DD4BF',
      retail: '#0EA5E9',
      warehouse: '#6366F1',
      restaurant: '#F59E0B',
    };

    return distribution.map((d) => ({
      name: d.type || 'Other',
      value: parseInt(d.count, 10),
      color: colors[d.type] || '#64748B',
    }));
  }

  async getTenantsWithRevenue(limit = 5) {
    const tenants = await this.businessRepository.find({
      order: { createdAt: 'DESC' },
      take: limit,
    });

    const data = await Promise.all(
      tenants.map(async (t) => {
        const revenueData = await this.invoiceRepository
          .createQueryBuilder('inv')
          .select('SUM(inv.totalAmount)', 'total')
          .where('inv.businessId = :businessId', { businessId: t.id })
          .getRawOne<{ total: string | null }>();

        return {
          businessId: t.id,
          name: t.name,
          status: t.status,
          plan: t.subscriptionPlan,
          revenue: Number(revenueData?.total || 0),
          createdAt: t.createdAt,
        };
      }),
    );

    return data;
  }

  async generateSystemReport() {
    const stats = await this.getPlatformStats();
    const distribution = await this.getBusinessDistribution();

    let recommendation = '';

    if (stats.systemStatus === 'Critical') {
      recommendation =
        'CRITICAL: Database connectivity issues detected. Immediate infrastructure audit and failover verification required.';
    } else if (parseFloat(stats.revenueGrowth) > 20) {
      recommendation =
        'Performance is exceptional. Revenue is growing rapidly—consider investing in advanced analytics for premium tiers.';
    } else if (parseFloat(stats.tenantGrowth) < 5) {
      recommendation =
        'Tenant acquisition has slowed. Recommendation: Review the registration funnel and consider a promotional campaign for new businesses.';
    } else if (stats.activeSessions < stats.totalTenants * 0.1) {
      recommendation =
        'User retention/engagement is currently below target. Advised action: Launch an email re-engagement campaign for inactive tenant admins.';
    } else {
      recommendation =
        'System performance is optimal. All KPIs are within healthy ranges. Proceed with planned feature rollouts.';
    }

    return {
      generatedAt: new Date(),
      reportType: 'SYSTEM_OVERSIGHT',
      summary: stats,
      sectors: distribution,
      recommendation,
    };
  }

  async exportTenantData() {
    const tenants = await this.businessRepository.find();
    // Simplified CSV-like array structure
    return tenants.map((t) => ({
      ID: t.id,
      Name: t.name,
      Code: t.companyCode,
      Status: t.status,
      Plan: t.subscriptionPlan,
      Joined: t.createdAt,
    }));
  }
  async getPayments(limit = 10) {
    const invoices = await this.invoiceRepository.find({
      relations: ['business'],
      order: { createdAt: 'DESC' },
      take: limit,
    });

    return invoices.map((inv) => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      tenantName: inv.business?.name || 'Unknown',
      amount: Number(inv.totalAmount),
      status: inv.status || 'PAID', // use the correct status field
      date: inv.createdAt,
    }));
  }

  async getPaymentSummary() {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const [totalRevenue, monthlyRevenue, count] = await Promise.all([
      this.invoiceRepository.sum('totalAmount'),
      this.invoiceRepository.sum('totalAmount', {
        createdAt: MoreThanOrEqual(startOfMonth),
      }),
      this.invoiceRepository.count(),
    ]);

    return {
      totalRevenue: Number(totalRevenue || 0),
      monthlyRevenue: Number(monthlyRevenue || 0),
      transactionCount: count,
      averageTransaction: count > 0 ? Number(totalRevenue || 0) / count : 0,
    };
  }
}
