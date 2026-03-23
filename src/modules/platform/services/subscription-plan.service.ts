import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import type { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity.js';
import { SubscriptionPlan } from '../../../database/entities/subscription-plan.entity.js';
import { Business } from '../../../database/entities/business.entity.js';
import { BusinessStatus } from '../../../common/enums/business.enum.js';
import {
  CreateSubscriptionPlanDto,
  UpdateSubscriptionPlanDto,
} from '../dto/subscription-plan.dto.js';
import { AuditLogService } from './audit-log.service.js';
import { AuditAction } from '../../../common/enums/audit-action.enum.js';

@Injectable()
export class SubscriptionPlanService {
  constructor(
    @InjectRepository(SubscriptionPlan)
    private readonly planRepository: Repository<SubscriptionPlan>,
    @InjectRepository(Business)
    private readonly businessRepository: Repository<Business>,
    private readonly auditLogService: AuditLogService,
  ) {}

  async createPlan(
    dto: CreateSubscriptionPlanDto,
    metadata: {
      userId: string;
      userEmail?: string;
      ipAddress?: string;
      userAgent?: string;
    },
  ) {
    const { userId, userEmail, ipAddress, userAgent } = metadata;
    const exists = await this.planRepository.findOne({
      where: { name: dto.name },
    });
    if (exists) throw new ConflictException('Plan name already exists');

    // Auto-calculate duration
    let durationDays = 30;
    if (dto.billingCycle === 'YEARLY') durationDays = 365;

    const plan = this.planRepository.create({
      ...dto,
      durationDays,
      maxUsers: dto.limits.maxUsers,
      maxProducts: dto.limits.maxProducts,
      updatedBy: userId,
    });
    const saved = await this.planRepository.save(plan);

    // Audit Log
    await this.auditLogService.logAction({
      userId,
      userEmail,
      action: AuditAction.CREATE_PLAN,
      entityType: 'subscription_plan',
      entityId: saved.id,
      entityName: saved.name,
      ipAddress,
      userAgent,
      newValue: saved,
    });

    return saved;
  }

  private formatPlan(plan: SubscriptionPlan) {
    return {
      id: plan.id,
      name: plan.name,
      price: plan.price,
      currency: plan.currency,
      billingCycle: plan.billingCycle,
      status: plan.status,
      features: plan.features,
      limits: {
        maxUsers: plan.maxUsers,
        maxProducts: plan.maxProducts,
      },
      version: plan.version,
      updatedBy: plan.updatedBy,
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
    };
  }

  async findAll(status?: 'ACTIVE' | 'INACTIVE') {
    const where = status ? { status } : {};
    const plans = await this.planRepository.find({
      where,
      order: { createdAt: 'DESC' },
    });

    return {
      data: plans.map((plan) => this.formatPlan(plan)),
      meta: {
        total: plans.length,
      },
    };
  }

  async findOne(id: string) {
    const plan = await this.planRepository.findOne({ where: { id } });
    if (!plan) throw new NotFoundException('Plan not found');
    return this.formatPlan(plan);
  }

  async updatePlan(
    id: string,
    dto: UpdateSubscriptionPlanDto,
    metadata: { userId: string; ipAddress?: string; userAgent?: string },
  ) {
    const { userId, ipAddress, userAgent } = metadata;

    const plan = await this.planRepository.findOne({ where: { id } });
    if (!plan) throw new NotFoundException('Plan not found');

    // Revenue Safety Check
    const criticalFields = ['price', 'currency', 'billingCycle'];
    const isUpdatingCriticalField = criticalFields.some(
      (field) => dto[field] !== undefined,
    );

    if (isUpdatingCriticalField && plan.status === 'ACTIVE') {
      const usageCount = await this.businessRepository.count({
        where: { subscriptionPlan: plan.name },
      });
      if (usageCount > 0) {
        throw new ConflictException(
          'Cannot modify price or billing cycle of an active plan with subscribers. Please deactivate this plan and create a new version.',
        );
      }
    }

    const { limits, ...restDto } = dto;
    const updateData: Partial<SubscriptionPlan> & {
      maxUsers?: number;
      maxProducts?: number;
    } = {
      ...(restDto as unknown as Partial<SubscriptionPlan>),
      updatedBy: userId,
    };

    // Handle limits
    if (limits) {
      if (limits.maxUsers !== undefined) updateData.maxUsers = limits.maxUsers;
      if (limits.maxProducts !== undefined)
        updateData.maxProducts = limits.maxProducts;
    }

    // Increment version on update
    updateData.version = (plan.version || 0) + 1;

    await this.planRepository.update(
      id,
      updateData as unknown as QueryDeepPartialEntity<SubscriptionPlan>,
    );

    // Fetch and return full updated object
    const updatedPlan = await this.planRepository.findOne({ where: { id } });
    if (!updatedPlan) throw new Error('Update verification failed');

    // Audit Log
    await this.auditLogService.logAction({
      userId,
      action: AuditAction.UPDATE_PLAN,
      entityType: 'subscription_plan',
      entityId: id,
      entityName: plan.name,
      ipAddress,
      userAgent,
      oldValue: plan,
      newValue: updatedPlan,
    });

    return {
      message: 'Subscription plan updated successfully',
      data: this.formatPlan(updatedPlan),
    };
  }

  async setStatus(
    id: string,
    status: 'ACTIVE' | 'INACTIVE',
    metadata: { userId: string; ipAddress?: string; userAgent?: string },
  ) {
    const { userId, ipAddress, userAgent } = metadata;
    const plan = await this.findOne(id);
    await this.planRepository.update(id, { status, updatedBy: userId });

    // Audit Log
    await this.auditLogService.logAction({
      userId,
      action: AuditAction.UPDATE_PLAN,
      entityType: 'subscription_plan',
      entityId: id,
      entityName: plan.name,
      ipAddress,
      userAgent,
      newValue: { status },
    });

    return { message: `Plan ${status.toLowerCase()} successfully`, status };
  }

  async deletePlan(
    id: string,
    metadata: { userId: string; ipAddress?: string; userAgent?: string },
  ) {
    const { userId, ipAddress, userAgent } = metadata;
    const plan = await this.planRepository.findOne({ where: { id } });
    if (!plan) throw new NotFoundException('Plan not found');

    // Check if assigned to any tenants
    const usageCount = await this.businessRepository.count({
      where: { subscriptionPlan: plan.name },
    });

    if (usageCount > 0) {
      throw new ConflictException(
        'Plan is assigned to tenants and cannot be deleted',
      );
    }

    await this.planRepository.delete(id);

    // Audit Log
    await this.auditLogService.logAction({
      userId,
      action: AuditAction.DELETE_PLAN,
      entityType: 'subscription_plan',
      entityId: id,
      entityName: plan.name,
      ipAddress,
      userAgent,
      oldValue: plan,
    });

    return { message: 'Subscription plan deleted successfully' };
  }

  async getUsageSummary(id: string) {
    const plan = await this.planRepository.findOne({ where: { id } });
    if (!plan) throw new NotFoundException('Plan not found');

    // Status Counts
    const activeCount = await this.businessRepository.count({
      where: { subscriptionPlan: plan.name, status: BusinessStatus.ACTIVE },
    });

    const trialCount = await this.businessRepository.count({
      where: { subscriptionPlan: plan.name, status: BusinessStatus.TRIAL },
    });

    const suspendedCount = await this.businessRepository.count({
      where: { subscriptionPlan: plan.name, status: BusinessStatus.SUSPENDED },
    });

    // Expired count (status=ACTIVE but subscriptionExpiresAt < now)
    const now = new Date();
    const expiredCount = await this.businessRepository.count({
      where: {
        subscriptionPlan: plan.name,
        status: BusinessStatus.ACTIVE,
        subscriptionExpiresAt: LessThan(now),
      },
    });

    const totalSubscriptions = activeCount + trialCount + suspendedCount;

    // Revenue Calculations
    const price = Number(plan.price);
    let mrr = 0;

    if (plan.billingCycle === 'MONTHLY') {
      mrr = activeCount * price;
    } else if (plan.billingCycle === 'YEARLY') {
      mrr = (activeCount * price) / 12;
    }

    const arr = mrr * 12;

    return {
      planId: plan.id,
      planName: plan.name,
      subscriptions: {
        total: totalSubscriptions,
        active: activeCount,
        trial: trialCount,
        expired: expiredCount,
        suspended: suspendedCount,
      },
      revenue: {
        mrr: Number(mrr.toFixed(2)),
        arr: Number(arr.toFixed(2)),
        currency: plan.currency,
      },
    };
  }
}
