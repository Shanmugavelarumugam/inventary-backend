import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  Index,
  JoinColumn,
} from 'typeorm';
import { Purchase } from './purchase.entity.js';
import { Product } from './product.entity.js';

@Entity('purchase_items')
export class PurchaseItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  purchaseId: string;

  @ManyToOne(() => Purchase, (purchase) => purchase.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'purchaseId' })
  purchase: Purchase;

  @Index()
  @Column()
  productId: string;

  @ManyToOne(() => Product)
  @JoinColumn({ name: 'productId' })
  product: Product;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  quantity: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  unitPrice: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  taxAmount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalLineAmount: number;

  // Domain specific fields for inventory load
  @Column({ nullable: true })
  batchNumber: string;

  @Column({ type: 'date', nullable: true })
  expiryDate: Date;
}
