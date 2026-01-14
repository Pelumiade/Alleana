import { ApiProperty } from '@nestjs/swagger';

export class PaymentResponseDto {
  @ApiProperty()
  uuid: string;

  @ApiProperty()
  amount: number;

  @ApiProperty()
  currency: string;

  @ApiProperty()
  status: string;

  @ApiProperty()
  method: string;

  @ApiProperty()
  payment_reference: string;

  @ApiProperty({ required: false })
  monnify_payment_reference?: string;

  @ApiProperty({ required: false })
  checkout_url?: string;

  @ApiProperty()
  created_at: Date;
}


