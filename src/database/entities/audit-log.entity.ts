import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { PlatformRole } from '../../common/enums/platform-role.enum.js';
import { AuditAction } from '../../common/enums/audit-action.enum.js';

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ nullable: true })
  userId: string;

  @Index()
  @Column({ nullable: true })
  userEmail: string;

  @Column({ type: 'enum', enum: PlatformRole, nullable: true })
  userRole: PlatformRole;

  @Index()
  @Column({ type: 'enum', enum: AuditAction })
  action: AuditAction;

  @Column({ nullable: true })
  entityType: string;

  @Index()
  @Column({ nullable: true })
  entityId: string;

  @Column({ nullable: true })
  entityName: string;

  @Column({ type: 'jsonb', nullable: true })
  oldValue: any;

  @Column({ type: 'jsonb', nullable: true })
  newValue: any;

  @Column({ nullable: true })
  ipAddress: string;

  @Column({ nullable: true })
  userAgent: string;

  @Index()
  @Column({ nullable: true })
  businessId: string;

  @CreateDateColumn()
  createdAt: Date;
}
