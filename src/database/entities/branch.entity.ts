import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  Index,
  JoinColumn,
  type Relation,
} from 'typeorm';
import { Business } from './business.entity.js';
import { User } from './user.entity.js';
import { BranchType, BranchStatus } from '../../common/enums/branch.enum.js';

@Entity('branches')
export class Branch {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  name: string;

  @Index()
  @Column({ type: 'varchar', unique: true, nullable: true })
  code: string;

  @Column({ type: 'text', nullable: true })
  address: string;

  @Column({ type: 'varchar', nullable: true })
  city: string;

  @Column({ type: 'varchar', nullable: true })
  phone: string;

  @Column({
    type: 'enum',
    enum: BranchType,
    default: BranchType.STORE,
  })
  type: BranchType;

  @Column({
    type: 'enum',
    enum: BranchStatus,
    default: BranchStatus.ACTIVE,
  })
  status: BranchStatus;

  @Column({ type: 'timestamp', nullable: true })
  openingDate: Date;

  @Column({ type: 'varchar', nullable: true })
  managerUserId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'managerUserId' })
  manager: Relation<User>;

  @Index()
  @Column({ type: 'varchar' })
  businessId: string;

  @ManyToOne(() => Business)
  @JoinColumn({ name: 'businessId' })
  business: Relation<Business>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
