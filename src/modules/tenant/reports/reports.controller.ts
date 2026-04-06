import { 
  Controller, 
  Get, 
  UseGuards, 
  Query,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard.js';
import { TenantGuard } from '../../../common/guards/tenant.guard.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { ReportsService } from './reports.service.js';

@Controller('tenant/reports')
@UseGuards(JwtAuthGuard, TenantGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  private parseDates(from?: string, to?: string) {
    const fromDate = from ? new Date(from) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const toDate = to ? new Date(to) : new Date();
    toDate.setHours(23, 59, 59, 999);
    return { fromDate, toDate };
  }

  @Get('sales')
  async getSales(
    @CurrentUser('businessId') businessId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const { fromDate, toDate } = this.parseDates(from, to);
    return this.reportsService.getSalesReport(businessId, fromDate, toDate);
  }

  @Get('inventory')
  async getInventory(@CurrentUser('businessId') businessId: string) {
    return this.reportsService.getInventoryReport(businessId);
  }

  @Get('profit-loss')
  async getProfitLoss(
    @CurrentUser('businessId') businessId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const { fromDate, toDate } = this.parseDates(from, to);
    return this.reportsService.getProfitLossReport(businessId, fromDate, toDate);
  }

  @Get('stock-valuation')
  async getStockValuation(@CurrentUser('businessId') businessId: string) {
    return this.reportsService.getStockValuation(businessId);
  }

  @Get('gst')
  async getGstReport(
    @CurrentUser('businessId') businessId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const { fromDate, toDate } = this.parseDates(from, to);
    return this.reportsService.getGstReport(businessId, fromDate, toDate);
  }

  @Get('expiry')
  async getExpiryReport(@CurrentUser('businessId') businessId: string) {
    // Current reports service delegates this to a specific products query or analytics
    return this.reportsService.getInventoryReport(businessId); // Placeholder
  }
}
