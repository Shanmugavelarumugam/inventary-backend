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
import { Branch } from './branch.entity.js';
import { Business } from './business.entity.js';
import { User } from './user.entity.js';
import type { StockTransferItem } from './stock-transfer-item.entity.js';


export enum TransferStatus {
  DRAFT = 'DRAFT',
  PENDING = 'PENDING',
  SHIPPED = 'SHIPPED',
  RECEIVED = 'RECEIVED',
  CANCELLED = 'CANCELLED',
}

@Entity('stock_transfers')
export class StockTransfer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  transferNumber: string;

  @Index()
  @Column()
  fromBranchId: string;

  @ManyToOne(() => Branch)
  @JoinColumn({ name: 'fromBranchId' })
  fromBranch: Branch;

  @Index()
  @Column()
  toBranchId: string;

  @ManyToOne(() => Branch)
  @JoinColumn({ name: 'toBranchId' })
  toBranch: Branch;

  @Column({ type: 'date' })
  transferDate: Date;

  @Column({
    type: 'enum',
    enum: TransferStatus,
    default: TransferStatus.PENDING,
  })
  status: TransferStatus;

  @Column({ type: 'text', nullable: true })
  notes: string;

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

  @OneToMany('StockTransferItem', (item: any) => item.transfer)
  items: StockTransferItem[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
