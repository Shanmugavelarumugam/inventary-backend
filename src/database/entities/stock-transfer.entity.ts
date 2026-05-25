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
  type Relation,
} from 'typeorm';
import { Branch } from './branch.entity.js';
import { Business } from './business.entity.js';
import { User } from './user.entity.js';
import { StockTransferStatus } from '../../common/enums/branch.enum.js';
import { StockTransferItem } from './stock-transfer-item.entity.js';

@Entity('stock_transfers')
export class StockTransfer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

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

  @Column({
    type: 'enum',
    enum: StockTransferStatus,
    default: StockTransferStatus.PENDING,
  })
  status: StockTransferStatus;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ nullable: true })
  transferredById: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'transferredById' })
  transferredBy: User;

  @Column({ nullable: true })
  receivedById: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'receivedById' })
  receivedBy: User;

  @OneToMany(() => StockTransferItem, (item) => item.transfer, {
    cascade: true,
  })
  items: Relation<StockTransferItem>[];

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
