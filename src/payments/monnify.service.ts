import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface MonnifyInitiatePaymentRequest {
  amount: number;
  customerName: string;
  customerEmail: string;
  paymentReference: string;
  paymentDescription: string;
  currencyCode?: string;
  contractCode?: string;
  redirectUrl?: string;
}

export interface MonnifyInitiatePaymentResponse {
  requestSuccessful: boolean;
  responseMessage: string;
  responseCode: string;
  responseBody: {
    transactionReference: string;
    paymentReference: string;
    merchantName: string;
    apiKey: string;
    enabledPaymentMethod: string[];
    checkoutUrl: string;
  };
}

@Injectable()
export class MonnifyService {
  private readonly logger = new Logger(MonnifyService.name);
  private readonly apiKey: string;
  private readonly secretKey: string;
  private readonly baseUrl: string;
  private readonly contractCode: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('MONNIFY_API_KEY') || 'mock-api-key';
    this.secretKey = this.configService.get<string>('MONNIFY_SECRET_KEY') || 'mock-secret-key';
    this.baseUrl = this.configService.get<string>('MONNIFY_BASE_URL') || 'https://api.monnify.com';
    this.contractCode = this.configService.get<string>('MONNIFY_CONTRACT_CODE') || 'mock-contract-code';
  }

  private generateAuthToken(): string {
    const credentials = Buffer.from(`${this.apiKey}:${this.secretKey}`).toString('base64');
    return `Basic ${credentials}`;
  }

  async initiatePayment(request: MonnifyInitiatePaymentRequest): Promise<MonnifyInitiatePaymentResponse> {
    this.logger.log(`Initiating payment: ${request.paymentReference}`);

    if (this.apiKey === 'mock-api-key' || this.secretKey === 'mock-secret-key') {
      return this.mockInitiatePayment(request);
    }

    return this.mockInitiatePayment(request);
  }

  private mockInitiatePayment(request: MonnifyInitiatePaymentRequest): MonnifyInitiatePaymentResponse {
    const transactionReference = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const checkoutUrl = `https://checkout.monnify.com/mock/${request.paymentReference}`;

    return {
      requestSuccessful: true,
      responseMessage: 'Success',
      responseCode: '0',
      responseBody: {
        transactionReference,
        paymentReference: request.paymentReference,
        merchantName: 'AIleana',
        apiKey: this.apiKey,
        enabledPaymentMethod: ['CARD', 'ACCOUNT_TRANSFER', 'USSD'],
        checkoutUrl,
      },
    };
  }

  async verifyTransaction(transactionReference: string): Promise<any> {
    this.logger.log(`Verifying transaction: ${transactionReference}`);

    if (this.apiKey === 'mock-api-key' || this.secretKey === 'mock-secret-key') {
      return {
        requestSuccessful: true,
        responseMessage: 'Success',
        responseCode: '0',
        responseBody: {
          transactionReference,
          paymentReference: `PAY-${transactionReference}`,
          amountPaid: 0,
          totalPayable: 0,
          settlementAmount: 0,
          paidOn: new Date().toISOString(),
          paymentStatus: 'PAID',
          paymentDescription: 'Mock payment',
          currency: 'NGN',
          paymentMethod: 'CARD',
          customer: {
            email: 'customer@example.com',
            name: 'Test Customer',
          },
        },
      };
    }

    return this.mockInitiatePayment({
      amount: 0,
      customerName: 'Test',
      customerEmail: 'test@example.com',
      paymentReference: transactionReference,
      paymentDescription: 'Verification',
    });
  }
}


