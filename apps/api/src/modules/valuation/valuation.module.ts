import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { ValuationResolver } from './valuation.resolver';
import { ValuationService } from './valuation.service';

@Module({
  imports: [AiModule],
  providers: [ValuationResolver, ValuationService],
})
export class ValuationModule {}
