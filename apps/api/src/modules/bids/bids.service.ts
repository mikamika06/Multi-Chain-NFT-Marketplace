import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma, ListingStatus, ListingType, BidStatus } from '@prisma/client';
import { PrismaService } from '../../common/database/prisma.service';
import { Bid } from './entities/bid.entity';
import { mapBid } from '../../common/mappers/graphql-mappers';
import { PlaceBidInput } from './dto/place-bid.input';
import { ListingsQueueService } from '../listings/listings.queue';

const AUCTION_EXTENSION_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const AUCTION_EXTENSION_DURATION_MS = 2 * 60 * 1000; // 2 minutes

@Injectable()
export class BidsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly listingsQueue: ListingsQueueService,
  ) {}

  async findAllByListing(listingId: string): Promise<Bid[]> {
    const bids = await this.prisma.bid.findMany({
      where: { listingId },
      include: {
        listing: {
          include: {
            token: {
              include: {
                collection: true,
              },
            },
          },
        },
      },
      orderBy: {
        amount: 'desc',
      },
    });

    return bids.map(mapBid);
  }

  async placeBid(input: PlaceBidInput): Promise<Bid> {
    const result = await this.prisma.$transaction(async (tx) => {
      const listing = await tx.listing.findUnique({
        where: { id: input.listingId },
      });

      if (!listing) {
        throw new NotFoundException(`Listing ${input.listingId} not found`);
      }

      if (listing.status !== ListingStatus.ACTIVE) {
        throw new BadRequestException(`Listing ${input.listingId} is not active`);
      }

      if (listing.type !== ListingType.AUCTION_EN) {
        throw new BadRequestException('Listing does not accept bids');
      }

      const amountDecimal = new Prisma.Decimal(input.amount);

      if (amountDecimal.lessThanOrEqualTo(listing.price)) {
        throw new BadRequestException('Bid must be greater than current price');
      }

      const previousHighest = await tx.bid.findFirst({
        where: {
          listingId: input.listingId,
          status: BidStatus.PENDING,
        },
        orderBy: {
          amount: 'desc',
        },
      });

      const updateData: Prisma.ListingUpdateInput = {
        price: amountDecimal,
      };
      let extendedEndTs: Date | null = null;

      const now = Date.now();
      const timeRemaining = listing.endTs.getTime() - now;
      if (timeRemaining > 0 && timeRemaining <= AUCTION_EXTENSION_WINDOW_MS) {
        extendedEndTs = new Date(listing.endTs.getTime() + AUCTION_EXTENSION_DURATION_MS);
        updateData.endTs = extendedEndTs;
      }

      await tx.listing.update({
        where: { id: listing.id },
        data: updateData,
      });

      if (previousHighest) {
        await tx.bid.update({
          where: { id: previousHighest.id },
          data: { status: BidStatus.REFUNDED },
        });
      }

      const bid = await tx.bid.create({
        data: {
          listingId: input.listingId,
          bidder: input.bidder.toLowerCase(),
          amount: amountDecimal,
          chainId: input.chainId,
          status: BidStatus.PENDING,
        },
        include: {
          listing: {
            include: {
              token: {
                include: {
                  collection: true,
                },
              },
            },
          },
        },
      });

      return { bid, extendedEndTs };
    });

    if (result.extendedEndTs) {
      await this.listingsQueue.rescheduleSettlement(result.bid.listingId, result.extendedEndTs);
    }

    return mapBid(result.bid);
  }

  async withdrawOverbid(listingId: string, bidder: string): Promise<string> {
    const pending = await this.prisma.bid.findMany({
      where: {
        listingId,
        bidder: bidder.toLowerCase(),
        status: BidStatus.REFUNDED,
      },
    });

    if (!pending.length) {
      throw new NotFoundException('No refundable bids found');
    }

    const total = pending.reduce(
      (acc, bidItem) => acc.plus(bidItem.amount),
      new Prisma.Decimal(0),
    );

    await this.prisma.bid.updateMany({
      where: {
        listingId,
        bidder: bidder.toLowerCase(),
        status: BidStatus.REFUNDED,
      },
      data: {
        status: BidStatus.CANCELLED,
      },
    });

    return total.toString();
  }
}
