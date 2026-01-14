import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Wallet } from './entities/wallet.entity';
import { WalletType } from './entities/wallet.entity';
import { WalletResponseDto } from './dto/wallet-response.dto';
import { Transaction } from '../payments/entities/transaction.entity';
import { TransactionType, TransactionStatus } from '../payments/entities/transaction.entity';

@Injectable()
export class WalletsService {
  constructor(
    @InjectRepository(Wallet)
    private readonly walletRepository: Repository<Wallet>,
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    private readonly dataSource: DataSource,
  ) {}

  async createWallet(userId: number, type: WalletType = WalletType.PRIMARY): Promise<Wallet> {
    const wallet = this.walletRepository.create({
      user_id: userId,
      type,
      balance: 0,
      currency: 'NGN',
    });

    return await this.walletRepository.save(wallet);
  }

  async getOrCreatePrimaryWallet(userId: number): Promise<Wallet> {
    let wallet = await this.walletRepository.findOne({
      where: { user_id: userId, type: WalletType.PRIMARY },
    });

    if (!wallet) {
      wallet = await this.createWallet(userId, WalletType.PRIMARY);
    }

    return wallet;
  }

  async getOrCreateCallCreditsWallet(userId: number): Promise<Wallet> {
    let wallet = await this.walletRepository.findOne({
      where: { user_id: userId, type: WalletType.CALL_CREDITS },
    });

    if (!wallet) {
      wallet = await this.createWallet(userId, WalletType.CALL_CREDITS);
    }

    return wallet;
  }

  async getWalletByUuid(uuid: string, userId: number): Promise<WalletResponseDto> {
    const wallet = await this.walletRepository.findOne({
      where: { uuid, user_id: userId },
      relations: ['transactions'],
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    return this.mapToWalletResponseDto(wallet);
  }

  async getUserWallets(userId: number): Promise<WalletResponseDto[]> {
    const wallets = await this.walletRepository.find({
      where: { user_id: userId },
      order: { created_at: 'DESC' },
    });

    return wallets.map(wallet => this.mapToWalletResponseDto(wallet));
  }

  private mapToWalletResponseDto(wallet: Wallet): WalletResponseDto {
    return {
      uuid: wallet.uuid,
      type: wallet.type,
      balance: Number(wallet.balance || 0),
      currency: wallet.currency,
      created_at: wallet.created_at,
    };
  }

  async creditWallet(
    walletId: number,
    amount: number,
    description?: string,
    reference?: string,
    metadata?: Record<string, any>,
  ): Promise<Transaction> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const wallet = await queryRunner.manager.findOne(Wallet, {
        where: { id: walletId },
      });

      if (!wallet) {
        throw new NotFoundException('Wallet not found');
      }

      wallet.balance = Number(wallet.balance) + amount;
      await queryRunner.manager.save(wallet);

      const transaction = queryRunner.manager.create(Transaction, {
        wallet_id: walletId,
        type: TransactionType.CREDIT,
        amount,
        status: TransactionStatus.COMPLETED,
        description,
        reference,
        metadata,
      });

      const savedTransaction = await queryRunner.manager.save(transaction);
      await queryRunner.commitTransaction();

      return savedTransaction;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async debitWallet(
    walletId: number,
    amount: number,
    description?: string,
    reference?: string,
    metadata?: Record<string, any>,
  ): Promise<Transaction> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const wallet = await queryRunner.manager.findOne(Wallet, {
        where: { id: walletId },
      });

      if (!wallet) {
        throw new NotFoundException('Wallet not found');
      }

      if (Number(wallet.balance) < amount) {
        throw new BadRequestException('Insufficient balance');
      }

      wallet.balance = Number(wallet.balance) - amount;
      await queryRunner.manager.save(wallet);

      const transaction = queryRunner.manager.create(Transaction, {
        wallet_id: walletId,
        type: TransactionType.DEBIT,
        amount,
        status: TransactionStatus.COMPLETED,
        description,
        reference,
        metadata,
      });

      const savedTransaction = await queryRunner.manager.save(transaction);
      await queryRunner.commitTransaction();

      return savedTransaction;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async getWalletBalance(walletId: number): Promise<number> {
    const wallet = await this.walletRepository.findOne({
      where: { id: walletId },
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    return Number(wallet.balance);
  }
}
