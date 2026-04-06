import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  Index,
  JoinColumn,
} from 'typeorm';
import { StockTransfer } from './stock-transfer.entity.js';
import { Product } from './product.entity.js';

@Entity('stock_transfer_items')
export class StockTransferItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  transferId: string;

  @ManyToOne(() => StockTransfer, (transfer) => transfer.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'transferId' })
  transfer: StockTransfer;

  @Index()
  @Column()
  productId: string;

  @ManyToOne(() => Product)
  @JoinColumn({ name: 'productId' })
  product: Product;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  quantity: number;
}
