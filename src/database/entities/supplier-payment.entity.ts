import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { PurchaseInvoice } from './purchase-invoice.entity.js';
import { Business } from './business.entity.js';

export enum PaymentMode {
  CASH = 'CASH',
  UPI = 'UPI',
  CARD = 'CARD',
  BANK_TRANSFER = 'BANK_TRANSFER',
  CREDIT = 'CREDIT',
}

@Entity('supplier_payments')
export class SupplierPayment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  invoiceId: string;

  @ManyToOne(() => PurchaseInvoice, (invoice) => invoice.payments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'invoiceId' })
  invoice: PurchaseInvoice;

  @Index()
  @Column()
  businessId: string;

  @ManyToOne(() => Business)
  @JoinColumn({ name: 'businessId' })
  business: Business;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({ type: 'date' })
  paymentDate: Date;

  @Column({
    type: 'enum',
    enum: PaymentMode,
    default: PaymentMode.CASH,
  })
  paymentMode: PaymentMode;

  @Column({ nullable: true })
  referenceNumber: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
