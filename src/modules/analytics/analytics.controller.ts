import { Controller, Get, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { TenantGuard } from '../../common/guards/tenant.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';

@Controller('tenant/dashboard')
@UseGuards(JwtAuthGuard, TenantGuard)
export class TenantDashboardController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('summary')
  async getSummary(@CurrentUser('businessId') businessId: string) {
    return this.analyticsService.getTenantStats(businessId);
  }

  @Get('sales-overview')
  async getSalesOverview(@CurrentUser('businessId') businessId: string) {
    return this.analyticsService.getSalesTrend(businessId);
  }

  @Get('inventory-alerts')
  async getInventoryAlerts(@CurrentUser('businessId') businessId: string) {
    const stats = await this.analyticsService.getTenantStats(businessId);
    return {
      lowStockCount: stats.lowStockCount,
      outOfStockCount: stats.outOfStockCount,
      nearExpiryCount: stats.nearExpiryCount,
    };
  }

  @Get('recent-activities')
  async getRecentActivities(@CurrentUser('businessId') businessId: string) {
    return this.analyticsService.getRecentActivity(businessId);
  }

  @Get('top-products')
  async getTopProducts(@CurrentUser('businessId') businessId: string) {
    const stats = await this.analyticsService.getTenantStats(businessId);
    return stats.topProducts;
  }

  @Get('insights')
  async getInsights(@CurrentUser('businessId') businessId: string) {
    return this.analyticsService.getAdvancedStats(businessId);
  }

  @Get('domain-widgets')
  async getDomainWidgets(@CurrentUser('businessId') businessId: string) {
    // Placeholder for domain-specific widgets
    return [];
  }
}


