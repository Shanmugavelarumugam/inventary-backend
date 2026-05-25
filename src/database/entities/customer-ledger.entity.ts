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
import { Customer } from './customer.entity.js';
import { LedgerEntryType } from '../../common/enums/customer.enum.js';

@Entity('customer_ledgers')
export class CustomerLedger {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  customerId: string;

  @ManyToOne(() => Customer)
  @JoinColumn({ name: 'customerId' })
  customer: Customer;

  @Column({
    type: 'enum',
    enum: LedgerEntryType,
  })
  type: LedgerEntryType;

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
