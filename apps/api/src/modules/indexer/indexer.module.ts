import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { IndexerService } from './indexer.service';
import { EvmIndexerService } from './evm-indexer.service';
import { SolanaIndexerService } from './solana-indexer.service';
import { IndexerProcessor } from './indexer.processor';

@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('REDIS_HOST', 'localhost'),
          port: configService.get<number>('REDIS_PORT', 6379),
        },
      }),
    }),
    BullModule.registerQueue({
      name: 'indexer',
    }),
  ],
  providers: [
    IndexerService,
    EvmIndexerService,
    SolanaIndexerService,
    IndexerProcessor,
  ],
  exports: [IndexerService],
})
export class IndexerModule {}
