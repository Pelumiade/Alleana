import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment, PaymentStatus, PaymentMethod } from './entities/payment.entity';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentResponseDto } from './dto/payment-response.dto';
import { MonnifyService } from './monnify.service';
import { WalletsService } from '../wallets/wallets.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    private readonly monnifyService: MonnifyService,
    private readonly walletsService: WalletsService,
    private readonly usersService: UsersService,
  ) {}

  private generatePaymentReference(): string {
    return `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  }

  async createPayment(userId: number, createPaymentDto: CreatePaymentDto): Promise<PaymentResponseDto> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const paymentReference = this.generatePaymentReference();
    const payment = this.paymentRepository.create({
      user_id: userId,
      amount: createPaymentDto.amount,
      currency: createPaymentDto.currency || 'NGN',
      method: createPaymentDto.method,
      status: PaymentStatus.PENDING,
      payment_reference: paymentReference,
      description: createPaymentDto.description,
    });

    const savedPayment = await this.paymentRepository.save(payment);

    if (createPaymentDto.method === PaymentMethod.MONNIFY) {
      await this.initiateMonnifyPayment(savedPayment, user);
    } else if (createPaymentDto.method === PaymentMethod.WALLET) {
      await this.processWalletPayment(savedPayment, userId);
    }

    const finalPayment = await this.paymentRepository.findOne({
      where: { id: savedPayment.id },
    });

    return this.mapToPaymentResponseDto(finalPayment);
  }

  private async initiateMonnifyPayment(payment: Payment, user: any): Promise<void> {
    try {
      const monnifyResponse = await this.monnifyService.initiatePayment({
        amount: Number(payment.amount),
        customerName: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email,
        customerEmail: user.email,
        paymentReference: payment.payment_reference,
        paymentDescription: payment.description || 'Payment for AIleana services',
        currencyCode: payment.currency,
        redirectUrl: 'https://alleana.com/payment/callback',
      });

      if (monnifyResponse.requestSuccessful) {
        payment.monnify_transaction_reference = monnifyResponse.responseBody.transactionReference;
        payment.monnify_payment_reference = monnifyResponse.responseBody.paymentReference;
        payment.monnify_response = monnifyResponse.responseBody;
        payment.status = PaymentStatus.PROCESSING;
      } else {
        payment.status = PaymentStatus.FAILED;
      }

      await this.paymentRepository.save(payment);
    } catch (error) {
      payment.status = PaymentStatus.FAILED;
      await this.paymentRepository.save(payment);
      throw error;
    }
  }

  private async processWalletPayment(payment: Payment, userId: number): Promise<void> {
    try {
      const wallet = await this.walletsService.getOrCreatePrimaryWallet(userId);
      const balance = await this.walletsService.getWalletBalance(wallet.id);

      if (balance < Number(payment.amount)) {
        payment.status = PaymentStatus.FAILED;
        await this.paymentRepository.save(payment);
        throw new BadRequestException('Insufficient wallet balance');
      }

      await this.walletsService.debitWallet(
        wallet.id,
        Number(payment.amount),
        payment.description || 'Wallet payment',
        payment.payment_reference,
        { payment_id: payment.id },
      );

      payment.status = PaymentStatus.COMPLETED;
      await this.paymentRepository.save(payment);

      // Credit the call credits wallet
      const callCreditsWallet = await this.walletsService.getOrCreateCallCreditsWallet(userId);
      await this.walletsService.creditWallet(
        callCreditsWallet.id,
        Number(payment.amount),
        'Call credits purchase',
        payment.payment_reference,
        { payment_id: payment.id },
      );
    } catch (error) {
      payment.status = PaymentStatus.FAILED;
      await this.paymentRepository.save(payment);
      throw error;
    }
  }

  async verifyPayment(paymentReference: string): Promise<PaymentResponseDto> {
    const payment = await this.paymentRepository.findOne({
      where: { payment_reference: paymentReference },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.method === PaymentMethod.MONNIFY && payment.monnify_transaction_reference) {
      const verification = await this.monnifyService.verifyTransaction(
        payment.monnify_transaction_reference,
      );

      if (verification.responseBody.paymentStatus === 'PAID' && payment.status !== PaymentStatus.COMPLETED) {
        payment.status = PaymentStatus.COMPLETED;
        payment.monnify_response = verification.responseBody;
        await this.paymentRepository.save(payment);

        // Credit the call credits wallet
        const wallet = await this.walletsService.getOrCreateCallCreditsWallet(payment.user_id);
        await this.walletsService.creditWallet(
          wallet.id,
          Number(payment.amount),
          'Payment received',
          payment.payment_reference,
          { payment_id: payment.id },
        );
      }
    }

    return this.mapToPaymentResponseDto(payment);
  }

  async getUserPayments(userId: number): Promise<PaymentResponseDto[]> {
    const payments = await this.paymentRepository.find({
      where: { user_id: userId },
      order: { created_at: 'DESC' },
    });

    return payments.map(payment => this.mapToPaymentResponseDto(payment, false));
  }

  async getPaymentByUuid(uuid: string, userId: number): Promise<PaymentResponseDto> {
    const payment = await this.paymentRepository.findOne({
      where: { uuid, user_id: userId },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return this.mapToPaymentResponseDto(payment);
  }

  private mapToPaymentResponseDto(payment: Payment, includeCheckoutUrl: boolean = true): PaymentResponseDto {
    return {
      uuid: payment.uuid,
      amount: Number(payment.amount),
      currency: payment.currency,
      status: payment.status,
      method: payment.method,
      payment_reference: payment.payment_reference,
      monnify_payment_reference: payment.monnify_payment_reference,
      checkout_url: includeCheckoutUrl ? payment.monnify_response?.checkoutUrl : undefined,
      created_at: payment.created_at,
    };
  }
}
