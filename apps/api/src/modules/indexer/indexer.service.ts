import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../../common/database/prisma.service';

export interface ChainConfig {
  chainId: string;
  rpcUrl: string;
  marketplaceAddress: string;
  onftAddress?: string;
  wormholeAddress?: string;
  startBlock: number;
  type: 'EVM' | 'SOLANA';
}

@Injectable()
export class IndexerService implements OnModuleInit {
  private readonly logger = new Logger(IndexerService.name);
  private chains: ChainConfig[] = [];

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    @InjectQueue('indexer') private indexerQueue: Queue,
  ) {}

  async onModuleInit() {
    this.initializeChains();
    await this.startIndexing();
  }

  private initializeChains() {
    // Ethereum
    const ethRpc = this.configService.get<string>('ETHEREUM_RPC');
    if (ethRpc) {
      this.chains.push({
        chainId: '1',
        rpcUrl: ethRpc,
        marketplaceAddress: this.configService.get<string>('MARKETPLACE_ETH', ''),
        onftAddress: this.configService.get<string>('ONFT_ETH', ''),
        wormholeAddress: this.configService.get<string>('WORMHOLE_BRIDGE_ETH', ''),
        startBlock: 0,
        type: 'EVM',
      });
    }

    // Polygon
    const polyRpc = this.configService.get<string>('POLYGON_RPC');
    if (polyRpc) {
      this.chains.push({
        chainId: '137',
        rpcUrl: polyRpc,
        marketplaceAddress: this.configService.get<string>('MARKETPLACE_POLYGON', ''),
        onftAddress: this.configService.get<string>('ONFT_POLYGON', ''),
        wormholeAddress: this.configService.get<string>('WORMHOLE_BRIDGE_POLYGON', ''),
        startBlock: 0,
        type: 'EVM',
      });
    }

    // Arbitrum
    const arbRpc = this.configService.get<string>('ARBITRUM_RPC');
    if (arbRpc) {
      this.chains.push({
        chainId: '42161',
        rpcUrl: arbRpc,
        marketplaceAddress: this.configService.get<string>('MARKETPLACE_ARBITRUM', ''),
        onftAddress: this.configService.get<string>('ONFT_ARBITRUM', ''),
        wormholeAddress: this.configService.get<string>('WORMHOLE_BRIDGE_ARBITRUM', ''),
        startBlock: 0,
        type: 'EVM',
      });
    }

    // Solana
    const solRpc = this.configService.get<string>('SOLANA_RPC');
    if (solRpc) {
      this.chains.push({
        chainId: 'solana',
        rpcUrl: solRpc,
        marketplaceAddress: this.configService.get<string>('MARKETPLACE_SOLANA', ''),
        startBlock: 0,
        type: 'SOLANA',
      });
    }

    this.logger.log(`Initialized ${this.chains.length} chains for indexing`);
  }

  async startIndexing() {
    for (const chain of this.chains) {
      if (!chain.marketplaceAddress && !chain.onftAddress && !chain.wormholeAddress) {
        this.logger.warn(
          `Skipping chain ${chain.chainId} - no marketplace, ONFT or Wormhole bridge configured`,
        );
        continue;
      }

      // Get last indexed block from database
      const cursor = await this.prisma.workerCursor.findUnique({
        where: { id: `indexer-${chain.chainId}` },
      });

      const fromBlock = cursor?.cursor 
        ? parseInt(cursor.cursor, 10) + 1 
        : chain.startBlock;

      this.logger.log(`Starting indexer for chain ${chain.chainId} from block ${fromBlock}`);

      // Add initial job to queue
      await this.indexerQueue.add(
        `index-${chain.chainId}`,
        {
          chainId: chain.chainId,
          chainType: chain.type,
          rpcUrl: chain.rpcUrl,
          marketplaceAddress: chain.marketplaceAddress,
          onftAddress: chain.onftAddress,
          wormholeAddress: chain.wormholeAddress,
          fromBlock,
        },
        {
          repeat: {
            every: 15000, // Every 15 seconds
          },
          removeOnComplete: {
            count: 100,
          },
          removeOnFail: {
            count: 50,
          },
        },
      );
    }
  }

  async updateCursor(chainId: string, blockNumber: number): Promise<void> {
    await this.prisma.workerCursor.upsert({
      where: { id: `indexer-${chainId}` },
      create: {
        id: `indexer-${chainId}`,
        cursor: blockNumber.toString(),
      },
      update: {
        cursor: blockNumber.toString(),
      },
    });
  }

  async getCursor(chainId: string): Promise<number> {
    const cursor = await this.prisma.workerCursor.findUnique({
      where: { id: `indexer-${chainId}` },
    });

    return cursor ? parseInt(cursor.cursor || '0', 10) : 0;
  }
}
