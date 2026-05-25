import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  Index,
  JoinColumn,
  type Relation,
} from 'typeorm';
import { Business } from './business.entity.js';
import { Customer } from './customer.entity.js';
import { User } from './user.entity.js';
import { SalesSource } from '../../common/enums/sales.enum.js';
import { InvoiceItem } from './invoice-item.entity.js';

export enum InvoiceStatus {
  DRAFT = 'DRAFT',
  PAID = 'PAID',
  VOID = 'VOID',
  CANCELLED = 'CANCELLED',
}

export enum PaymentMethod {
  CASH = 'CASH',
  CARD = 'CARD',
  UPI = 'UPI',
  CREDIT = 'CREDIT',
}

@Entity('invoices')
export class Invoice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  invoiceNumber: string;

  @Index()
  @Column({ nullable: true })
  customerId: string;

  @ManyToOne(() => Customer)
  @JoinColumn({ name: 'customerId' })
  customer: Customer;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  subTotal: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  taxAmount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  discountAmount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalAmount: number;

  @Column({
    type: 'enum',
    enum: InvoiceStatus,
    default: InvoiceStatus.PAID,
  })
  status: InvoiceStatus;

  @Column({
    type: 'enum',
    enum: PaymentMethod,
    default: PaymentMethod.CASH,
  })
  paymentMethod: PaymentMethod;

  @Column({
    type: 'enum',
    enum: SalesSource,
    default: SalesSource.POS,
  })
  source: SalesSource;

  @Column({ nullable: true })
  orderId: string;

  @Column({ type: 'text', nullable: true })
  batchInfo: string;

  @Index()
  @Column()
  businessId: string;

  @ManyToOne(() => Business)
  @JoinColumn({ name: 'businessId' })
  business: Business;

  @Column({ nullable: true })
  createdById: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'createdById' })
  createdBy: User;

  @OneToMany(() => InvoiceItem, (item) => item.invoice)
  items: Relation<InvoiceItem>[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
