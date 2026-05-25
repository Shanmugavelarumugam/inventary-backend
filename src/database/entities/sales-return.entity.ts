import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  Index,
  JoinColumn,
} from 'typeorm';
import { Business } from './business.entity.js';
import { Invoice } from './invoice.entity.js';
import { User } from './user.entity.js';

@Entity('sales_returns')
export class SalesReturn {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  invoiceId: string;

  @ManyToOne(() => Invoice)
  @JoinColumn({ name: 'invoiceId' })
  invoice: Invoice;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  refundAmount: number;

  @Column()
  reason: string;

  @Column({ default: 'CASH' })
  refundMode: string;

  @Column({ type: 'jsonb', nullable: true })
  returnedItems: any;

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

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
