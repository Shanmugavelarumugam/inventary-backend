import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  Index,
  JoinColumn,
} from 'typeorm';
import { Business } from './business.entity.js';
import { Supplier } from './supplier.entity.js';
import { SupplierLedgerType } from '../../common/enums/supplier.enum.js';

@Entity('supplier_ledgers')
export class SupplierLedger {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  supplierId: string;

  @ManyToOne(() => Supplier)
  @JoinColumn({ name: 'supplierId' })
  supplier: Supplier;

  @Column({
    type: 'enum',
    enum: SupplierLedgerType,
  })
  type: SupplierLedgerType;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  balanceAfter: number;

  @Column({ nullable: true })
  referenceId: string;

  @Column({ nullable: true })
  referenceNumber: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Index()
  @Column()
  businessId: string;

  @ManyToOne(() => Business)
  @JoinColumn({ name: 'businessId' })
  business: Business;

  @CreateDateColumn()
  createdAt: Date;
}
