import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  Index,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Product } from './product.entity.js';
import { Branch } from './branch.entity.js';
import { Business } from './business.entity.js';

@Entity('stock_levels')
@Unique(['productId', 'branchId'])
export class StockLevel {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  productId: string;

  @ManyToOne(() => Product)
  @JoinColumn({ name: 'productId' })
  product: Product;

  @Index()
  @Column()
  branchId: string;

  @ManyToOne(() => Branch)
  @JoinColumn({ name: 'branchId' })
  branch: Branch;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  quantity: number;

  @Index()
  @Column()
  businessId: string;

  @ManyToOne(() => Business)
  @JoinColumn({ name: 'businessId' })
  business: Business;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
