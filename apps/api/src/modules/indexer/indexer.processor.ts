import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { EvmIndexerService } from './evm-indexer.service';
import { SolanaIndexerService } from './solana-indexer.service';

type IndexerJobData = {
  chainId: string;
  chainType: 'EVM' | 'SOLANA';
  rpcUrl: string;
  marketplaceAddress: string;
  onftAddress?: string;
  wormholeAddress?: string;
  fromBlock?: number;
};

type IndexerJobResult = {
  success: true;
};

@Processor('indexer')
export class IndexerProcessor extends WorkerHost {
  private readonly logger = new Logger(IndexerProcessor.name);

  constructor(
    private evmIndexer: EvmIndexerService,
    private solanaIndexer: SolanaIndexerService,
  ) {
    super();
  }

  async process(job: Job<IndexerJobData, IndexerJobResult, string>): Promise<IndexerJobResult> {
    const {
      chainId,
      chainType,
      rpcUrl,
      marketplaceAddress,
      onftAddress,
      wormholeAddress,
      fromBlock,
    } = job.data;

    this.logger.debug(`Processing indexer job for chain ${chainId} from block ${fromBlock}`);

    try {
      if (chainType === 'EVM') {
        await this.evmIndexer.indexBlocks(
          chainId,
          rpcUrl,
          marketplaceAddress,
          onftAddress,
          wormholeAddress,
          fromBlock ?? 0,
        );
      } else if (chainType === 'SOLANA') {
        await this.solanaIndexer.indexTransactions(chainId, rpcUrl, marketplaceAddress);
      }

      return { success: true };
    } catch (error) {
      this.logger.error(`Error indexing chain ${chainId}:`, error);
      throw error;
    }
  }
}
