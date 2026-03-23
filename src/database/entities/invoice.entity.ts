import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
} from 'typeorm';
import { Business } from './business.entity.js';

@Entity('invoices')
export class Invoice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  invoiceNumber: string;

  @Column('decimal', { precision: 12, scale: 2 })
  totalAmount: number;

  @ManyToOne(() => Business)
  business: Business;

  @Column()
  businessId: string;

  @CreateDateColumn()
  createdAt: Date;
}
