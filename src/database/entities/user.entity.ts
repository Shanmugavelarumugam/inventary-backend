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
} from 'typeorm';
import { Business } from './business.entity.js';
import { Role } from './role.entity.js';
import { PlatformRole } from '../../common/enums/platform-role.enum.js';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Index({ unique: true })
  @Column({ unique: true })
  email: string;

  @Column({ select: false })
  password: string;

  /**
   * Platform-level role. NULL for business users.
   * ROOT > PLATFORM_ADMIN > SUPPORT_ADMIN
   */
  @Column({ type: 'enum', enum: PlatformRole, nullable: true })
  platformRole: PlatformRole;

  @Column({ default: true })
  isActive: boolean;

  @Index()
  @Column({ nullable: true })
  businessId: string;

  @ManyToOne(() => Business)
  @JoinColumn({ name: 'businessId' })
  business: Business;

  @Index()
  @Column({ nullable: true })
  roleId: string;

  @ManyToOne(() => Role)
  @JoinColumn({ name: 'roleId' })
  role: Role;

  // ─── Security Tokens ───────────────────────────────────
  @Column({ type: 'varchar', nullable: true, select: false })
  refreshToken: string | null;

  @Column({ type: 'varchar', nullable: true, select: false })
  resetToken: string | null;

  @Column({ type: 'timestamp', nullable: true })
  resetTokenExpiry: Date | null;

  // ─── Audit ─────────────────────────────────────────────
  /** Tracks who created this platform user (userId of creator) */
  @Column({ nullable: true })
  createdBy: string;

  /** Updated on every successful login */
  @Column({ nullable: true, type: 'timestamp' })
  lastLogin: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}
