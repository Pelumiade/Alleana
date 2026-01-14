import { IsString, IsEnum, IsOptional, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CallType } from '../entities/call-session.entity';

export class InitiateCallDto {
  @ApiProperty({ example: '+2348012345678' })
  @IsString()
  @Matches(/^\+?[1-9]\d{1,14}$/, { message: 'Invalid phone number format' })
  recipient_phone: string;

  @ApiProperty({ example: 'John Doe', required: false })
  @IsOptional()
  @IsString()
  recipient_name?: string;

  @ApiProperty({ enum: CallType, example: CallType.AUDIO, required: false })
  @IsOptional()
  @IsEnum(CallType)
  type?: CallType;
}

