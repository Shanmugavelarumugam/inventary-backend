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
import { PurchaseOrder } from './purchase-order.entity.js';
import { Business } from './business.entity.js';
import { User } from './user.entity.js';
import type { GoodsReceiptItem } from './goods-receipt-item.entity.js';

@Entity('goods_receipts')
export class GoodsReceipt {
  @PrimaryGeneratedColumn('uuid')
  id: string;

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

  @Index()
  @Column()
  receivedById: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'receivedById' })
  receivedBy: User;

  @Column({ type: 'date' })
  receivedDate: Date;

  @OneToMany('GoodsReceiptItem', (item: any) => item.goodsReceipt)
  items: GoodsReceiptItem[];

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
