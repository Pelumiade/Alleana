import { Controller, Post, Get, Param, Body, UseGuards, Patch } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CallsService } from './calls.service';
import { InitiateCallDto } from './dto/initiate-call.dto';
import { CallSessionResponseDto } from './dto/call-session-response.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Calls')
@Controller('calls')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CallsController {
  constructor(private readonly callsService: CallsService) {}

  @Post()
  @ApiOperation({ summary: 'Initiate a new call' })
  @ApiResponse({ status: 201, description: 'Call initiated successfully', type: CallSessionResponseDto })
  @ApiResponse({ status: 400, description: 'Insufficient balance' })
  async initiateCall(@Body() initiateCallDto: InitiateCallDto, @CurrentUser() user: any) {
    return await this.callsService.initiateCall(user.userId, initiateCallDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get user call sessions' })
  @ApiResponse({ status: 200, description: 'Call sessions retrieved successfully', type: [CallSessionResponseDto] })
  async getUserCallSessions(@CurrentUser() user: any) {
    return await this.callsService.getUserCallSessions(user.userId);
  }

  @Get(':uuid')
  @ApiOperation({ summary: 'Get call session by UUID' })
  @ApiResponse({ status: 200, description: 'Call session retrieved successfully', type: CallSessionResponseDto })
  @ApiResponse({ status: 404, description: 'Call session not found' })
  async getCallSession(@Param('uuid') uuid: string, @CurrentUser() user: any) {
    return await this.callsService.getCallSessionByUuid(uuid, user.userId);
  }

  @Patch(':uuid/answer')
  @ApiOperation({ summary: 'Answer a call' })
  @ApiResponse({ status: 200, description: 'Call answered successfully', type: CallSessionResponseDto })
  async answerCall(@Param('uuid') uuid: string, @CurrentUser() user: any) {
    return await this.callsService.answerCall(uuid, user.userId);
  }

  @Patch(':uuid/end')
  @ApiOperation({ summary: 'End a call' })
  @ApiResponse({ status: 200, description: 'Call ended successfully', type: CallSessionResponseDto })
  async endCall(@Param('uuid') uuid: string, @CurrentUser() user: any) {
    return await this.callsService.endCall(uuid, user.userId);
  }
}


