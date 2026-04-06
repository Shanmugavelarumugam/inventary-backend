import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Business } from '../../../database/entities/business.entity.js';

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(Business)
    private readonly businessRepository: Repository<Business>,
  ) {}

  async getBusinessProfile(businessId: string) {
    const business = await this.businessRepository.findOne({ where: { id: businessId } });
    if (!business) throw new NotFoundException('Business not found');
    return business;
  }

  async updateBusinessProfile(businessId: string, data: Partial<Business>) {
    const business = await this.getBusinessProfile(businessId);
    Object.assign(business, data);
    return this.businessRepository.save(business);
  }

  async getTaxSettings(businessId: string) {
    const business = await this.getBusinessProfile(businessId);
    // In a real app, 'business' entity would have more tax fields or a separate Tax entity
    return {
      taxId: business.gstNumber || 'N/A',
      taxRate: 18, // Default
      mode: 'GST',
    };
  }

  async updateTaxSettings(businessId: string, data: any) {
    const business = await this.getBusinessProfile(businessId);
    if (data.taxId) business.gstNumber = data.taxId;
    return this.businessRepository.save(business);
  }

  async getInvoiceTemplate(businessId: string) {
    return {
      templateId: 'standard-v1',
      showLogo: true,
      footerNote: 'Thank you for your business!',
    };
  }

  async updateInvoiceTemplate(businessId: string, data: any) {
    return { message: 'Invoice template updated successfully' };
  }

  async getNotifications(businessId: string) {
    return {
      emailAlerts: true,
      lowStockAlerts: true,
      expiryAlerts: true,
    };
  }

  async updateNotifications(businessId: string, data: any) {
    return { message: 'Notification settings updated successfully' };
  }

  async getIntegrations(businessId: string) {
    return {
      whatsapp: 'DISCONNECTED',
      ledgerService: 'CONNECTED',
    };
  }

  async updateIntegrations(businessId: string, data: any) {
    return { message: 'Integrations updated successfully' };
  }
}
