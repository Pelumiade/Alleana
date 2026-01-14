import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';

export enum CallStatus {
  INITIATED = 'initiated',
  RINGING = 'ringing',
  ANSWERED = 'answered',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export enum CallType {
  AUDIO = 'audio',
  VIDEO = 'video',
}

@Entity('call_sessions')
export class CallSession extends BaseEntity {
  @ManyToOne(() => User, (user) => user.call_sessions)
  @JoinColumn({ name: 'initiator_id' })
  initiator: User;

  @Column()
  initiator_id: number;

  @Column()
  recipient_phone: string;

  @Column({ nullable: true })
  recipient_name: string;

  @Column({ type: 'enum', enum: CallStatus, default: CallStatus.INITIATED })
  status: CallStatus;

  @Column({ type: 'enum', enum: CallType, default: CallType.AUDIO })
  type: CallType;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  cost: number;

  @Column({ nullable: true })
  started_at: Date;

  @Column({ nullable: true })
  ended_at: Date;

  @Column({ type: 'int', nullable: true })
  duration_seconds: number;

  @Column({ nullable: true })
  signaling_url: string;

  @Column({ type: 'jsonb', nullable: true })
  signaling_data: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;
}
