import { Module } from '@nestjs/common';
import { SalesResolver } from './sales.resolver';
import { SalesService } from './sales.service';

@Module({
  providers: [SalesResolver, SalesService],
})
export class SalesModule {}
