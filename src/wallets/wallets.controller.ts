import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { WalletsService } from './wallets.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { WalletResponseDto } from './dto/wallet-response.dto';

@ApiTags('Wallets')
@Controller('wallets')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WalletsController {
  constructor(private readonly walletsService: WalletsService) {}

  @Get()
  @ApiOperation({ summary: 'Get user wallets' })
  @ApiResponse({ status: 200, description: 'Wallets retrieved successfully', type: [WalletResponseDto] })
  async getUserWallets(@CurrentUser() user: any) {
    return await this.walletsService.getUserWallets(user.userId);
  }

  @Get(':uuid')
  @ApiOperation({ summary: 'Get wallet by UUID' })
  @ApiResponse({ status: 200, description: 'Wallet retrieved successfully', type: WalletResponseDto })
  @ApiResponse({ status: 404, description: 'Wallet not found' })
  async getWallet(@Param('uuid') uuid: string, @CurrentUser() user: any) {
    return await this.walletsService.getWalletByUuid(uuid, user.userId);
  }
}

