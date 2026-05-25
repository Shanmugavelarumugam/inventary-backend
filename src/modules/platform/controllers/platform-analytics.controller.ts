import { Controller, Get } from '@nestjs/common';
import { PlatformAnalyticsService } from '../services/platform-analytics.service.js';

@Controller('platform/analytics')
export class PlatformAnalyticsController {
  constructor(private readonly analyticsService: PlatformAnalyticsService) {}

  @Get('stats')
  async getStats() {
    return this.analyticsService.getPlatformStats();
  }

  @Get('revenue-chart')
  async getRevenueChart() {
    return this.analyticsService.getRevenueGrowthChart();
  }

  @Get('distribution')
  async getDistribution() {
    return this.analyticsService.getBusinessDistribution();
  }

  @Get('recent-registrations')
  async getRecentRegistrations() {
    return this.analyticsService.getTenantsWithRevenue(5);
  }

  @Get('report/system')
  async getSystemReport() {
    return this.analyticsService.generateSystemReport();
  }

  @Get('export/tenants')
  async exportTenants() {
    return this.analyticsService.exportTenantData();
  }

  @Get('payments')
  async getPayments() {
    return this.analyticsService.getPayments(20);
  }

  @Get('payments/summary')
  async getPaymentSummary() {
    return this.analyticsService.getPaymentSummary();
  }
}
