import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  Index,
  JoinColumn,
} from 'typeorm';
import { Product } from './product.entity.js';
import { Business } from './business.entity.js';
import { User } from './user.entity.js';
import { Branch } from './branch.entity.js';

export enum MovementType {
  IN = 'IN',
  OUT = 'OUT',
  ADJUSTMENT = 'ADJUSTMENT',
  DAMAGE = 'DAMAGE',
  SCRAP = 'SCRAP',
  PURCHASE = 'PURCHASE',
  SALE = 'SALE',
  TRANSFER = 'TRANSFER',
  RETURN = 'RETURN',
}

@Entity('stock_movements')
export class StockMovement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  productId: string;

  @ManyToOne(() => Product)
  @JoinColumn({ name: 'productId' })
  product: Product;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  quantity: number; // Signed: Positive for increase, Negative for decrease

  @Column({
    type: 'enum',
    enum: MovementType,
  })
  type: MovementType;

  @Column({ nullable: true })
  reason: string;

  @Column({ nullable: true })
  reference: string; // Order #, Invoice #, etc.

  @Index()
  @Column()
  businessId: string;

  @ManyToOne(() => Business)
  @JoinColumn({ name: 'businessId' })
  business: Business;

  @Column({ nullable: true })
  branchId: string;

  @ManyToOne(() => Branch, { nullable: true })
  @JoinColumn({ name: 'branchId' })
  branch: Branch;

  @Column({ nullable: true })
  performedById: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'performedById' })
  performedBy: User;

  @CreateDateColumn()
  createdAt: Date;
}

