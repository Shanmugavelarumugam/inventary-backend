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
} from 'typeorm';
import { Supplier } from './supplier.entity.js';
import { Business } from './business.entity.js';
import { User } from './user.entity.js';
import type { PurchaseOrderItem } from './purchase-order-item.entity.js';

export enum POStatus {
  DRAFT = 'DRAFT',
  SENT = 'SENT',
  PARTIAL = 'PARTIAL',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

@Entity('purchase_orders')
export class PurchaseOrder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, nullable: true })
  poNumber: string;

  @Index()
  @Column()
  supplierId: string;

  @ManyToOne(() => Supplier)
  @JoinColumn({ name: 'supplierId' })
  supplier: Supplier;

  @Column({ type: 'date', nullable: true })
  expectedDate: Date;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalAmount: number;

  @Column({
    type: 'enum',
    enum: POStatus,
    default: POStatus.DRAFT,
  })
  status: POStatus;

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

  @OneToMany('PurchaseOrderItem', (item: any) => item.purchaseOrder)
  items: PurchaseOrderItem[];

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
