import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, BridgeProtocol, BridgeStatus } from '@prisma/client';
import { PrismaService } from '../../common/database/prisma.service';
import { BridgeQuote } from './entities/bridge-quote.entity';
import { BridgeQuoteInput } from './dto/bridge-quote.input';
import { BridgeEvent as BridgeEventGraph } from './entities/bridge-event.entity';
import { TransferCrossChainInput } from './dto/transfer-cross-chain.input';
import { mapBridgeEvent } from '../../common/mappers/graphql-mappers';

@Injectable()
export class BridgeService {
  constructor(private readonly prisma: PrismaService) {}

  async quote(input: BridgeQuoteInput): Promise<BridgeQuote> {
    const baseFee = 0.05; // placeholder
    const multiplier = input.priorityMultiplier ?? 0.3;
    const estimatedFee = (baseFee + multiplier * 0.02).toFixed(4);
    const estimatedTimeSeconds = Math.round(60 + multiplier * 120);

    return {
      dstChain: input.dstChain,
      estimatedFee,
      estimatedTimeSeconds,
    };
  }

  async getEvents(limit = 25): Promise<BridgeEventGraph[]> {
    const events = await this.prisma.bridgeEvent.findMany({
      include: {
        token: {
          include: {
            collection: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return events.map(mapBridgeEvent);
  }

  async getEventsByToken(tokenPk: string): Promise<BridgeEventGraph[]> {
    const events = await this.prisma.bridgeEvent.findMany({
      where: { tokenPk },
      include: {
        token: {
          include: {
            collection: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return events.map(mapBridgeEvent);
  }

  async registerTransfer(input: TransferCrossChainInput): Promise<BridgeEventGraph> {
    const token = await this.prisma.token.findUnique({
      where: { id: input.tokenPk },
      include: { collection: true },
    });

    if (!token) {
      throw new NotFoundException('Token not found');
    }

    const protocol = (input.protocol ?? 'LAYERZERO').toUpperCase() as BridgeProtocol;

    const event = await this.prisma.bridgeEvent.create({
      data: {
        tokenPk: token.id,
        srcChain: token.chainId,
        dstChain: input.dstChain,
        protocol,
        messageId: input.clientRequestId ?? `${token.id}:${Date.now()}`,
        status: BridgeStatus.CREATED,
        fee: new Prisma.Decimal(input.feeEstimate ?? '0'),
      },
      include: {
        token: {
          include: {
            collection: true,
          },
        },
      },
    });

    return mapBridgeEvent(event);
  }
}
