import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  Index,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { PurchaseOrder } from './purchase-order.entity.js';
import { Business } from './business.entity.js';
import type { SupplierPayment } from './supplier-payment.entity.js';

export enum InvoiceStatus {
  UNPAID = 'UNPAID',
  PARTIAL = 'PARTIAL',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
}

@Entity('purchase_invoices')
export class PurchaseInvoice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  invoiceNumber: string;

  @Index()
  @Column()
  purchaseOrderId: string;

  @ManyToOne(() => PurchaseOrder)
  @JoinColumn({ name: 'purchaseOrderId' })
  purchaseOrder: PurchaseOrder;

  @Index()
  @Column()
  businessId: string;

  @ManyToOne(() => Business)
  @JoinColumn({ name: 'businessId' })
  business: Business;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  totalAmount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  paidAmount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  dueAmount: number;

  @Column({
    type: 'enum',
    enum: InvoiceStatus,
    default: InvoiceStatus.UNPAID,
  })
  status: InvoiceStatus;

  @Column({ type: 'date', nullable: true })
  dueDate: Date;

  @OneToMany('SupplierPayment', (payment: any) => payment.invoice)
  payments: SupplierPayment[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
