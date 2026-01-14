import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { Transaction } from '../../payments/entities/transaction.entity';

export enum WalletType {
  PRIMARY = 'primary',
  CALL_CREDITS = 'call_credits',
}

@Entity('wallets')
export class Wallet extends BaseEntity {
  @ManyToOne(() => User, (user) => user.wallets)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column()
  user_id: number;

  @Column({ type: 'enum', enum: WalletType, default: WalletType.PRIMARY })
  type: WalletType;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  balance: number;

  @Column({ default: 'NGN' })
  currency: string;

  @OneToMany(() => Transaction, (transaction) => transaction.wallet)
  transactions: Transaction[];
}
