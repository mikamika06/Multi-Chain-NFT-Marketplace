import { Module } from '@nestjs/common';
import { CollectionsResolver } from './collections.resolver';
import { CollectionsService } from './collections.service';

@Module({
  providers: [CollectionsResolver, CollectionsService],
  exports: [CollectionsService],
})
export class CollectionsModule {}
