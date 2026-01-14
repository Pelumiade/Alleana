import { IsNumber, IsPositive, IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PaymentMethod } from '../entities/payment.entity';

export class CreatePaymentDto {
  @ApiProperty({ example: 1000.00 })
  @IsNumber()
  @IsPositive()
  amount: number;

  @ApiProperty({ example: 'NGN', required: false })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({ enum: PaymentMethod, example: PaymentMethod.MONNIFY })
  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @ApiProperty({ example: 'Payment for call credits', required: false })
  @IsOptional()
  @IsString()
  description?: string;
}

