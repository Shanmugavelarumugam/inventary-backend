import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { SupportTicket } from './support-ticket.entity.js';
import { User } from './user.entity.js';

@Entity('support_attachments')
export class SupportAttachment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  ticketId: string;

  @ManyToOne(() => SupportTicket)
  @JoinColumn({ name: 'ticketId' })
  ticket: SupportTicket;

  @Column()
  fileUrl: string;

  @Index()
  @Column()
  uploadedBy: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'uploadedBy' })
  uploader: User;

  @CreateDateColumn()
  createdAt: Date;
}
