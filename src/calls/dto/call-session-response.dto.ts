import { ApiProperty } from '@nestjs/swagger';

export class CallSessionResponseDto {
  @ApiProperty()
  uuid: string;

  @ApiProperty()
  recipient_phone: string;

  @ApiProperty({ required: false })
  recipient_name?: string;

  @ApiProperty()
  status: string;

  @ApiProperty()
  type: string;

  @ApiProperty({ required: false })
  cost?: number;

  @ApiProperty({ required: false })
  started_at?: Date;

  @ApiProperty({ required: false })
  ended_at?: Date;

  @ApiProperty({ required: false })
  duration_seconds?: number;

  @ApiProperty({ required: false })
  signaling_url?: string;

  @ApiProperty()
  created_at: Date;
}


