import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subscription } from '../../../database/entities/subscription.entity.js';
import { SubscriptionPlan } from '../../../database/entities/subscription-plan.entity.js';
import { Business } from '../../../database/entities/business.entity.js';

@Injectable()
export class TenantSubscriptionService {
  constructor(
    @InjectRepository(Subscription)
    private readonly subscriptionRepository: Repository<Subscription>,
    @InjectRepository(SubscriptionPlan)
    private readonly planRepository: Repository<SubscriptionPlan>,
    @InjectRepository(Business)
    private readonly businessRepository: Repository<Business>,
  ) {}

  async getCurrent(businessId: string) {
    const subscription = await this.subscriptionRepository.findOne({
      where: { businessId },
    });
    if (!subscription) throw new NotFoundException('No active subscription found');
    return subscription;
  }

  async getPlans() {
    return this.planRepository.find({ where: { status: 'ACTIVE' }, order: { price: 'ASC' } });
  }

  async upgrade(businessId: string, planId: string) {
    const plan = await this.planRepository.findOne({ where: { id: planId } });
    if (!plan) throw new NotFoundException('Plan not found');

    const business = await this.businessRepository.findOne({ where: { id: businessId } });
    if (!business) throw new NotFoundException('Business not found');

    let subscription = await this.subscriptionRepository.findOne({ where: { businessId } });
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30);
    
    if (subscription) {
      subscription.plan = plan.name;
      subscription.status = 'ACTIVE';
      subscription.endDate = endDate;
      await this.subscriptionRepository.save(subscription);
    } else {
      subscription = this.subscriptionRepository.create({
        businessId,
        plan: plan.name,
        status: 'ACTIVE',
        startDate: new Date(),
        endDate: endDate,
      });
      await this.subscriptionRepository.save(subscription);
    }

    // Update business limits based on plan
    business.maxUsers = plan.maxUsers;
    await this.businessRepository.save(business);

    return { message: 'Subscription upgraded successfully', plan: plan.name };
  }

  async getPayments(businessId: string) {
    // Placeholder for payment history
    return [];
  }

  async getInvoices(businessId: string) {
    // Placeholder for subscription invoices
    return [];
  }
}
