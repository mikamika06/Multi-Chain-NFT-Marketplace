import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { DataLoaderService } from './dataloader.service';

@Global()
@Module({
  providers: [PrismaService, DataLoaderService],
  exports: [PrismaService, DataLoaderService],
})
export class PrismaModule {}
