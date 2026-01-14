import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CallSession, CallStatus, CallType } from './entities/call-session.entity';
import { InitiateCallDto } from './dto/initiate-call.dto';
import { CallSessionResponseDto } from './dto/call-session-response.dto';
import { WalletsService } from '../wallets/wallets.service';

@Injectable()
export class CallsService {
  private readonly CALL_COST_PER_MINUTE = 10; // NGN per minute

  constructor(
    @InjectRepository(CallSession)
    private readonly callSessionRepository: Repository<CallSession>,
    private readonly walletsService: WalletsService,
  ) {}

  async initiateCall(userId: number, initiateCallDto: InitiateCallDto): Promise<CallSessionResponseDto> {
    // Check call credits wallet balance
    const wallet = await this.walletsService.getOrCreateCallCreditsWallet(userId);
    const balance = await this.walletsService.getWalletBalance(wallet.id);

    // Estimate cost (assuming 1 minute minimum)
    const estimatedCost = this.CALL_COST_PER_MINUTE;

    if (balance < estimatedCost) {
      throw new BadRequestException('Insufficient balance to initiate call');
    }

    // Create call session
    const callSession = this.callSessionRepository.create({
      initiator_id: userId,
      recipient_phone: initiateCallDto.recipient_phone,
      recipient_name: initiateCallDto.recipient_name,
      status: CallStatus.INITIATED,
      type: initiateCallDto.type || CallType.AUDIO,
      cost: estimatedCost,
      signaling_url: this.generateSignalingUrl(),
      signaling_data: {
        call_id: `CALL-${Date.now()}`,
        initiator_id: userId,
        recipient: initiateCallDto.recipient_phone,
        type: initiateCallDto.type || CallType.AUDIO,
      },
    });

    const savedSession = await this.callSessionRepository.save(callSession);

    // Reserve funds (debit immediately for initiated call)
    try {
      await this.walletsService.debitWallet(
        wallet.id,
        estimatedCost,
        `Call to ${initiateCallDto.recipient_phone}`,
        `CALL-${savedSession.uuid}`,
        { call_session_id: savedSession.id },
      );
    } catch (error) {
      savedSession.status = CallStatus.FAILED;
      await this.callSessionRepository.save(savedSession);
      throw error;
    }

    return this.mapToCallSessionResponseDto(savedSession);
  }

  async answerCall(callSessionUuid: string, userId: number): Promise<CallSessionResponseDto> {
    const callSession = await this.callSessionRepository.findOne({
      where: { uuid: callSessionUuid },
    });

    if (!callSession) {
      throw new NotFoundException('Call session not found');
    }

    if (callSession.initiator_id !== userId) {
      throw new BadRequestException('You are not authorized to answer this call');
    }

    if (callSession.status !== CallStatus.INITIATED && callSession.status !== CallStatus.RINGING) {
      throw new BadRequestException('Call cannot be answered in current status');
    }

    callSession.status = CallStatus.ANSWERED;
    callSession.started_at = new Date();
    await this.callSessionRepository.save(callSession);

    return this.mapToCallSessionResponseDto(callSession, false);
  }

  async endCall(callSessionUuid: string, userId: number): Promise<CallSessionResponseDto> {
    const callSession = await this.callSessionRepository.findOne({
      where: { uuid: callSessionUuid },
    });

    if (!callSession) {
      throw new NotFoundException('Call session not found');
    }

    if (callSession.initiator_id !== userId) {
      throw new BadRequestException('You are not authorized to end this call');
    }

    if (callSession.status === CallStatus.COMPLETED || callSession.status === CallStatus.CANCELLED) {
      return this.mapToCallSessionResponseDto(callSession);
    }

    const now = new Date();
    callSession.ended_at = now;
    callSession.status = CallStatus.COMPLETED;

    if (callSession.started_at) {
      const durationMs = now.getTime() - callSession.started_at.getTime();
      callSession.duration_seconds = Math.floor(durationMs / 1000);

      // Calculate actual cost based on duration
      const actualCost = Math.ceil((callSession.duration_seconds / 60) * this.CALL_COST_PER_MINUTE);
      callSession.cost = actualCost;

      // Refund or charge difference if needed
      const wallet = await this.walletsService.getOrCreateCallCreditsWallet(userId);
      const initialCharge = this.CALL_COST_PER_MINUTE;
      const difference = actualCost - initialCharge;

      if (difference > 0) {
        // Charge additional amount
        await this.walletsService.debitWallet(
          wallet.id,
          difference,
          `Additional charge for call ${callSessionUuid}`,
          `CALL-ADD-${callSession.uuid}`,
          { call_session_id: callSession.id },
        );
      } else if (difference < 0) {
        // Refund excess
        await this.walletsService.creditWallet(
          wallet.id,
          Math.abs(difference),
          `Refund for call ${callSessionUuid}`,
          `CALL-REF-${callSession.uuid}`,
          { call_session_id: callSession.id },
        );
      }
    } else {
      // Call was not answered, refund the initial charge
      const wallet = await this.walletsService.getOrCreateCallCreditsWallet(userId);
      await this.walletsService.creditWallet(
        wallet.id,
        this.CALL_COST_PER_MINUTE,
        `Refund for unanswered call ${callSessionUuid}`,
        `CALL-REF-${callSession.uuid}`,
        { call_session_id: callSession.id },
      );
      callSession.status = CallStatus.CANCELLED;
    }

    await this.callSessionRepository.save(callSession);
    return this.mapToCallSessionResponseDto(callSession);
  }

  async getUserCallSessions(userId: number): Promise<CallSessionResponseDto[]> {
    const callSessions = await this.callSessionRepository.find({
      where: { initiator_id: userId },
      order: { created_at: 'DESC' },
    });

    return callSessions.map(session => this.mapToCallSessionResponseDto(session));
  }

  async getCallSessionByUuid(uuid: string, userId: number): Promise<CallSessionResponseDto> {
    const callSession = await this.callSessionRepository.findOne({
      where: { uuid },
    });

    if (!callSession) {
      throw new NotFoundException('Call session not found');
    }

    if (callSession.initiator_id !== userId) {
      throw new BadRequestException('You are not authorized to view this call session');
    }

    return this.mapToCallSessionResponseDto(callSession);
  }

  private mapToCallSessionResponseDto(callSession: CallSession, includeSignalingUrl: boolean = true): CallSessionResponseDto {
    return {
      uuid: callSession.uuid,
      recipient_phone: callSession.recipient_phone,
      recipient_name: callSession.recipient_name,
      status: callSession.status,
      type: callSession.type,
      cost: callSession.cost ? Number(callSession.cost) : undefined,
      started_at: callSession.started_at,
      ended_at: callSession.ended_at,
      duration_seconds: callSession.duration_seconds,
      signaling_url: includeSignalingUrl ? callSession.signaling_url : undefined,
      created_at: callSession.created_at,
    };
  }

  private generateSignalingUrl(): string {
    // Mock signaling URL - In production, this would be a real WebRTC signaling server endpoint
    return `https://signaling.alleana.com/call/${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
