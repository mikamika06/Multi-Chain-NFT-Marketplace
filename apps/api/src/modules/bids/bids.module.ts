import { Module } from '@nestjs/common';
import { BidsResolver } from './bids.resolver';
import { BidsService } from './bids.service';
import { ListingsModule } from '../listings/listings.module';

@Module({
  imports: [ListingsModule],
  providers: [BidsResolver, BidsService],
})
export class BidsModule {}
