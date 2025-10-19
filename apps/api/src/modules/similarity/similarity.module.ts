import { Module } from '@nestjs/common';
import { SimilarityResolver } from './similarity.resolver';
import { SimilarityService } from './similarity.service';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [AiModule],
  providers: [SimilarityResolver, SimilarityService],
})
export class SimilarityModule {}
