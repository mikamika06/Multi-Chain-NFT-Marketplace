import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { Prisma, ListingStatus, ListingType as PrismaListingType, BidStatus } from '@prisma/client';
import { PrismaService } from '../../common/database/prisma.service';
import { ListingsQueueService } from './listings.queue';

@Processor('listings')
export class ListingsProcessor extends WorkerHost {
  private readonly logger = new Logger(ListingsProcessor.name);
  private static readonly DUTCH_SYNC_INTERVAL_MS = 60 * 1000;

  constructor(
    private readonly prisma: PrismaService,
    private readonly listingsQueue: ListingsQueueService,
  ) {
    super();
  }

  async process(job: Job<any>): Promise<void> {
    switch (job.name) {
      case 'activate-listing':
        await this.handleActivation(job);
        break;
      case 'settle-auction':
        await this.handleSettlement(job);
        break;
      case 'sync-dutch-price':
        await this.handleDutchSync(job);
        break;
      default:
        this.logger.warn(`Unknown job ${job.name}`);
    }
  }

  private async handleActivation(job: Job<{ listingId: string }>): Promise<void> {
    const { listingId } = job.data;
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
    });

    if (!listing) {
      this.logger.warn(`activate-listing: listing ${listingId} not found`);
      return;
    }

    if (listing.status !== ListingStatus.PENDING) {
      return;
    }

    if (listing.startTs.getTime() > Date.now()) {
      await this.listingsQueue.scheduleActivation(listingId, listing.startTs);
      return;
    }

    await this.prisma.listing.update({
      where: { id: listingId },
      data: { status: ListingStatus.ACTIVE },
    });

    if (listing.type === PrismaListingType.AUCTION_DUTCH) {
      const firstRun = new Date(
        Math.max(Date.now(), listing.startTs.getTime()) + ListingsProcessor.DUTCH_SYNC_INTERVAL_MS,
      );
      await this.listingsQueue.scheduleDutchPriceSync(listingId, firstRun);
    }
  }

  private async handleSettlement(job: Job<{ listingId: string }>): Promise<void> {
    const { listingId } = job.data;
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
    });

    if (!listing) {
      this.logger.warn(`settle-auction: listing ${listingId} not found`);
      return;
    }

    if (listing.status !== ListingStatus.ACTIVE) {
      return;
    }

    if (listing.endTs.getTime() > Date.now()) {
      await this.listingsQueue.scheduleSettlement(listingId, listing.endTs);
      return;
    }

    await this.prisma.listing.update({
      where: { id: listingId },
      data: { status: ListingStatus.EXPIRED },
    });

    await this.prisma.bid.updateMany({
      where: {
        listingId,
        status: BidStatus.PENDING,
      },
      data: {
        status: BidStatus.CANCELLED,
      },
    });
  }

  private async handleDutchSync(job: Job<{ listingId: string }>): Promise<void> {
    const { listingId } = job.data;
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
    });

    if (!listing) {
      this.logger.warn(`sync-dutch-price: listing ${listingId} not found`);
      return;
    }

    if (
      listing.type !== PrismaListingType.AUCTION_DUTCH ||
      listing.status !== ListingStatus.ACTIVE
    ) {
      return;
    }

    const now = Date.now();
    if (now >= listing.endTs.getTime()) {
      await this.listingsQueue.scheduleSettlement(listingId, listing.endTs);
      return;
    }

    const duration = listing.endTs.getTime() - listing.startTs.getTime();
    if (duration <= 0) {
      return;
    }

    const elapsed = now - listing.startTs.getTime();
    const startPrice = Number(listing.startPrice ?? listing.price);
    const endPrice = Number(listing.endPrice ?? listing.price);
    const priceDiff = startPrice - endPrice;
    const interpolated = startPrice - (priceDiff * elapsed) / duration;
    const nextPrice = Math.max(interpolated, endPrice);

    await this.prisma.listing.update({
      where: { id: listingId },
      data: {
        price: new Prisma.Decimal(nextPrice.toFixed(18)),
      },
    });

    const nextRun = new Date(now + ListingsProcessor.DUTCH_SYNC_INTERVAL_MS);
    await this.listingsQueue.scheduleDutchPriceSync(listingId, nextRun);
  }
}
