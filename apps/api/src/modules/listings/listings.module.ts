import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ListingsResolver } from './listings.resolver';
import { ListingsService } from './listings.service';
import { ListingsQueueService } from './listings.queue';
import { ListingsProcessor } from './listings.processor';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'listings',
    }),
  ],
  providers: [ListingsResolver, ListingsService, ListingsQueueService, ListingsProcessor],
  exports: [ListingsService, ListingsQueueService],
})
export class ListingsModule {}
