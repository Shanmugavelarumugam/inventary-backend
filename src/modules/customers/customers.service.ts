import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager } from 'typeorm';
import { Customer } from '../../database/entities/customer.entity.js';
import { CustomerLedger } from '../../database/entities/customer-ledger.entity.js';
import {
  CustomerType,
  LedgerEntryType,
} from '../../common/enums/customer.enum.js';

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
    @InjectRepository(CustomerLedger)
    private readonly ledgerRepository: Repository<CustomerLedger>,
    private readonly dataSource: DataSource,
  ) {}

  // --- CRUD Functions ---
  async findAll(businessId: string) {
    return this.customerRepository.find({
      where: { businessId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, businessId: string) {
    const customer = await this.customerRepository.findOne({
      where: { id, businessId },
    });
    if (!customer) throw new NotFoundException('Customer not found');
    return customer;
  }

  async create(businessId: string, data: Partial<Customer>) {
    const customer = this.customerRepository.create({ ...data, businessId });
    return this.customerRepository.save(customer);
  }

  async update(id: string, businessId: string, data: Partial<Customer>) {
    const customer = await this.findOne(id, businessId);
    Object.assign(customer, data);
    return this.customerRepository.save(customer);
  }

  // --- Financial Ledger Functions ---
  async getLedger(customerId: string, businessId: string) {
    return this.ledgerRepository.find({
      where: { customerId, businessId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Atomic update of customer balance and ledger logging.
   * Can be used within an existing transaction.
   */
  async updateBalance(
    businessId: string,
    customerId: string,
    amount: number, // positive for debt (invoice), negative for credit (payment)
    type: LedgerEntryType,
    referenceId?: string,
    referenceNumber?: string,
    notes?: string,
    manager?: EntityManager, // Optional TypeORM EntityManager for external transactions
  ) {
    const work = async (txnManager: EntityManager) => {
      const customer = await txnManager.findOne(Customer, {
        where: { id: customerId, businessId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!customer) throw new NotFoundException('Customer not found');

      // Check credit limit for new debt
      if (amount > 0 && customer.type !== CustomerType.CORPORATE) {
        const newBalance = Number(customer.currentBalance) + Number(amount);
        if (newBalance > Number(customer.creditLimit)) {
          // Allow small tolerance or strict block
          // throw new BadRequestException(`Credit limit exceeded for ${customer.name}`);
        }
      }

      customer.currentBalance =
        Number(customer.currentBalance) + Number(amount);
      await txnManager.save(customer);

      const ledger = txnManager.create(CustomerLedger, {
        businessId,
        customerId,
        amount,
        balanceAfter: customer.currentBalance,
        type,
        referenceId,
        referenceNumber,
        notes,
      });

      return txnManager.save(ledger);
    };

    if (manager) return work(manager);
    return this.dataSource.transaction(work);
  }

  // --- Loyalty Functions ---
  async addLoyaltyPoints(
    businessId: string,
    customerId: string,
    points: number,
    manager?: EntityManager,
  ) {
    const work = async (txnManager: EntityManager) => {
      const customer = await txnManager.findOne(Customer, {
        where: { id: customerId, businessId },
      });
      if (!customer) return;
      customer.loyaltyPoints += Math.round(points);
      return txnManager.save(customer);
    };

    if (manager) return work(manager);
    return this.dataSource.transaction(work);
  }

  // --- Analytics ---
  async getAnalytics(businessId: string) {
    const customers = await this.customerRepository.find({
      where: { businessId },
    });

    const topByBalance = [...customers]
      .sort((a, b) => Number(b.currentBalance) - Number(a.currentBalance))
      .slice(0, 5);

    const totalOutstanding = customers.reduce(
      (sum, c) => sum + Number(c.currentBalance),
      0,
    );

    return {
      totalCustomers: customers.length,
      totalOutstanding,
      topByBalance,
      customerMix: {
        retail: customers.filter((c) => c.type === CustomerType.RETAIL).length,
        wholesale: customers.filter((c) => c.type === CustomerType.WHOLESALE)
          .length,
        member: customers.filter((c) => c.type === CustomerType.MEMBER).length,
        corporate: customers.filter((c) => c.type === CustomerType.CORPORATE)
          .length,
      },
    };
  }
}
