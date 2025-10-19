import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/database/prisma.module';
import { BridgeResolver } from './bridge.resolver';
import { BridgeService } from './bridge.service';

@Module({
  imports: [PrismaModule],
  providers: [BridgeResolver, BridgeService],
  exports: [BridgeService],
})
export class BridgeModule {}
