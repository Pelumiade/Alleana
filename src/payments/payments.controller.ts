import { Controller, Post, Get, Param, Body, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentResponseDto } from './dto/payment-response.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Payments')
@Controller('payments')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new payment' })
  @ApiResponse({ status: 201, description: 'Payment created successfully', type: PaymentResponseDto })
  async createPayment(@Body() createPaymentDto: CreatePaymentDto, @CurrentUser() user: any) {
    return await this.paymentsService.createPayment(user.userId, createPaymentDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get user payments' })
  @ApiResponse({ status: 200, description: 'Payments retrieved successfully', type: [PaymentResponseDto] })
  async getUserPayments(@CurrentUser() user: any) {
    return await this.paymentsService.getUserPayments(user.userId);
  }

  @Get(':uuid')
  @ApiOperation({ summary: 'Get payment by UUID' })
  @ApiResponse({ status: 200, description: 'Payment retrieved successfully', type: PaymentResponseDto })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  async getPayment(@Param('uuid') uuid: string, @CurrentUser() user: any) {
    return await this.paymentsService.getPaymentByUuid(uuid, user.userId);
  }

  @Post('verify/:paymentReference')
  @ApiOperation({ summary: 'Verify payment status' })
  @ApiResponse({ status: 200, description: 'Payment verified successfully', type: PaymentResponseDto })
  async verifyPayment(@Param('paymentReference') paymentReference: string, @CurrentUser() user: any) {
    return await this.paymentsService.verifyPayment(paymentReference);
  }
}


