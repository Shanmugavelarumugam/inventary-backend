import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  Index,
  JoinColumn,
  type Relation,
} from 'typeorm';
import { Business } from './business.entity.js';
import { Role } from './role.entity.js';
import { PlatformRole } from '../../common/enums/platform-role.enum.js';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  name: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', unique: true })
  email: string;

  @Column({ type: 'varchar', select: false })
  password: string;

  /**
   * Platform-level role. NULL for business users.
   * ROOT > PLATFORM_ADMIN > SUPPORT_ADMIN
   */
  @Column({ type: 'enum', enum: PlatformRole, nullable: true })
  platformRole: PlatformRole;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Index()
  @Column({ type: 'varchar', nullable: true })
  businessId: string;

  @ManyToOne(() => Business)
  @JoinColumn({ name: 'businessId' })
  business: Relation<Business>;

  @Index()
  @Column({ type: 'varchar', nullable: true })
  roleId: string;

  @ManyToOne(() => Role)
  @JoinColumn({ name: 'roleId' })
  role: Relation<Role>;

  // ─── Security Tokens ───────────────────────────────────
  @Column({ type: 'varchar', nullable: true, select: false })
  refreshToken: string | null;

  @Column({ type: 'varchar', nullable: true, select: false })
  resetToken: string | null;

  @Column({ type: 'timestamp', nullable: true })
  resetTokenExpiry: Date | null;

  // ─── Audit ─────────────────────────────────────────────
  /** Tracks who created this platform user (userId of creator) */
  @Column({ type: 'varchar', nullable: true })
  createdBy: string;

  /** Updated on every successful login */
  @Column({ nullable: true, type: 'timestamp' })
  lastLogin: Date;

  @Column({ type: 'jsonb', default: {} })
  settings: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}
