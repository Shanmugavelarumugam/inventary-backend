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
import { GoodsReceipt } from './goods-receipt.entity.js';
import { Product } from './product.entity.js';

@Entity('goods_receipt_items')
export class GoodsReceiptItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  goodsReceiptId: string;

  @ManyToOne(() => GoodsReceipt, (gr) => gr.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'goodsReceiptId' })
  goodsReceipt: GoodsReceipt;

  @Index()
  @Column()
  productId: string;

  @ManyToOne(() => Product)
  @JoinColumn({ name: 'productId' })
  product: Product;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  quantityReceived: number;

  @Column({ nullable: true })
  batchNumber: string;

  @Column({ type: 'date', nullable: true })
  expiryDate: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
