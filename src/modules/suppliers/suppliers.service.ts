import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager } from 'typeorm';
import { Supplier } from '../../database/entities/supplier.entity.js';
import { SupplierLedger } from '../../database/entities/supplier-ledger.entity.js';
import {
  SupplierType,
  SupplierLedgerType,
} from '../../common/enums/supplier.enum.js';

@Injectable()
export class SuppliersService {
  constructor(
    @InjectRepository(Supplier)
    private readonly supplierRepository: Repository<Supplier>,
    @InjectRepository(SupplierLedger)
    private readonly ledgerRepository: Repository<SupplierLedger>,
    private readonly dataSource: DataSource,
  ) {}

  // --- CRUD Functions ---
  async findAll(businessId: string) {
    return this.supplierRepository.find({
      where: { businessId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, businessId: string) {
    const supplier = await this.supplierRepository.findOne({
      where: { id, businessId },
    });
    if (!supplier) throw new NotFoundException('Supplier not found');
    return supplier;
  }

  async create(businessId: string, data: Partial<Supplier>) {
    const supplier = this.supplierRepository.create({ ...data, businessId });
    return this.supplierRepository.save(supplier);
  }

  async update(id: string, businessId: string, data: Partial<Supplier>) {
    const supplier = await this.findOne(id, businessId);
    Object.assign(supplier, data);
    return this.supplierRepository.save(supplier);
  }

  // --- Financial Ledger Functions ---
  async getLedger(supplierId: string, businessId: string) {
    return this.ledgerRepository.find({
      where: { supplierId, businessId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Atomic update of supplier balance and ledger logging.
   * Can be used within an existing transaction.
   */
  async updateBalance(
    businessId: string,
    supplierId: string,
    amount: number, // positive for debt (invoice), negative for credit (payment)
    type: SupplierLedgerType,
    referenceId?: string,
    referenceNumber?: string,
    notes?: string,
    manager?: EntityManager, // Optional TypeORM EntityManager for external transactions
  ) {
    const work = async (txnManager: EntityManager) => {
      const supplier = await txnManager.findOne(Supplier, {
        where: { id: supplierId, businessId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!supplier) throw new NotFoundException('Supplier not found');

      supplier.currentBalance =
        Number(supplier.currentBalance) + Number(amount);
      await txnManager.save(supplier);

      const ledger = txnManager.create(SupplierLedger, {
        businessId,
        supplierId,
        amount,
        balanceAfter: supplier.currentBalance,
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

  // --- Analytics ---
  async getAnalytics(businessId: string) {
    const suppliers = await this.supplierRepository.find({
      where: { businessId },
    });

    const topByBalance = [...suppliers]
      .sort((a, b) => Number(b.currentBalance) - Number(a.currentBalance))
      .slice(0, 5);

    const totalOutstanding = suppliers.reduce(
      (sum, s) => sum + Number(s.currentBalance),
      0,
    );

    return {
      totalSuppliers: suppliers.length,
      totalOutstanding,
      topByBalance,
      supplierMix: {
        wholesale: suppliers.filter((s) => s.type === SupplierType.WHOLESALE)
          .length,
        distributor: suppliers.filter(
          (s) => s.type === SupplierType.DISTRIBUTOR,
        ).length,
        local: suppliers.filter((s) => s.type === SupplierType.LOCAL_VENDOR)
          .length,
        manufacturer: suppliers.filter(
          (s) => s.type === SupplierType.MANUFACTURER,
        ).length,
      },
    };
  }
}
