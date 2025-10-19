import { Module } from '@nestjs/common';
import { FraudResolver } from './fraud.resolver';
import { FraudService } from './fraud.service';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [AiModule],
  providers: [FraudResolver, FraudService],
})
export class FraudModule {}
