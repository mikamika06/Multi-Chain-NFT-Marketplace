import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { ListingStatus, ListingType as PrismaListingType, Prisma, UserRole } from '@prisma/client';
import { Listing } from './entities/listing.entity';
import { CreateListingInput } from './dto/create-listing.input';
import { PrismaService } from '../../common/database/prisma.service';
import { mapListing, mapSale } from '../../common/mappers/graphql-mappers';
import { BuyNowInput } from './dto/buy-now.input';
import { Sale } from '../sales/entities/sale.entity';
import { CreateEnglishAuctionInput } from './dto/create-english-auction.input';
import { CreateDutchAuctionInput } from './dto/create-dutch-auction.input';
import { CreateBundleListingInput } from './dto/create-bundle-listing.input';
import { BundleListingItemInput } from './dto/bundle-listing-item.input';
import { ListingsQueueService } from './listings.queue';

const DUTCH_SYNC_INTERVAL_MS = 60 * 1000; // 1 minute

type ListingWithRelations = Prisma.ListingGetPayload<{
  include: {
    token: {
      include: {
        collection: true;
      };
    };
    seller: true;
    bundleItems: {
      include: {
        token: {
          include: {
            collection: true;
          };
        };
      };
    };
  };
}>;

type TokenWithCollection = Prisma.TokenGetPayload<{
  include: {
    collection: true;
  };
}>;

@Injectable()
export class ListingsService {
  private readonly listingInclude = {
    token: {
      include: {
        collection: true,
      },
    },
    seller: true,
    bundleItems: {
      include: {
        token: {
          include: {
            collection: true,
          },
        },
      },
    },
  } as const;

  constructor(
    private readonly prisma: PrismaService,
    private readonly listingsQueue: ListingsQueueService,
  ) {}

  async findAll(): Promise<Listing[]> {
    const listings = await this.prisma.listing.findMany({
      include: this.listingInclude,
      orderBy: {
        createdAt: 'desc',
      },
    });

    return listings.map(mapListing);
  }

  async findById(id: string): Promise<Listing | null> {
    const listing = await this.prisma.listing.findUnique({
      where: { id },
      include: this.listingInclude,
    });

    return listing ? mapListing(listing) : null;
  }

  async create(payload: CreateListingInput): Promise<Listing> {
    if (payload.type !== PrismaListingType.FIXED) {
      throw new BadRequestException(
        'Use the dedicated mutations for auction or bundle listings.',
      );
    }

    const startTs = this.toDate(payload.startTs);
    const endTs = this.toDate(payload.endTs);
    this.assertChronology(startTs, endTs);

    const price = this.toDecimal(payload.price);
    const reservePrice = payload.reservePrice ? this.toDecimal(payload.reservePrice) : null;
    const { token, seller } = await this.prepareToken(payload.tokenPk);

    const listing = await this.prisma.listing.create({
      data: {
        tokenPk: token.id,
        type: PrismaListingType.FIXED,
        price,
        startPrice: price,
        endPrice: price,
        startTs,
        endTs,
        reservePrice,
        status: this.initialStatus(startTs),
        sellerId: seller.id,
      },
      include: this.listingInclude,
    });

    await this.scheduleLifecycle(listing);
    return mapListing(listing);
  }

  async createEnglishAuction(input: CreateEnglishAuctionInput): Promise<Listing> {
    const startTs = this.toDate(input.startTs);
    const endTs = this.toDate(input.endTs);
    this.assertChronology(startTs, endTs);

    const startPrice = this.toDecimal(input.startPrice);
    const reservePrice = input.reservePrice ? this.toDecimal(input.reservePrice) : null;

    if (reservePrice && reservePrice.greaterThan(startPrice)) {
      throw new BadRequestException('Reserve price cannot exceed start price.');
    }

    const { token, seller } = await this.prepareToken(input.tokenPk);

    const listing = await this.prisma.listing.create({
      data: {
        tokenPk: token.id,
        type: PrismaListingType.AUCTION_EN,
        price: startPrice,
        startPrice,
        endPrice: startPrice,
        reservePrice,
        startTs,
        endTs,
        status: this.initialStatus(startTs),
        sellerId: seller.id,
      },
      include: this.listingInclude,
    });

    await this.scheduleLifecycle(listing);
    return mapListing(listing);
  }

  async createDutchAuction(input: CreateDutchAuctionInput): Promise<Listing> {
    const startTs = this.toDate(input.startTs);
    const endTs = this.toDate(input.endTs);
    this.assertChronology(startTs, endTs);

    const startPrice = this.toDecimal(input.startPrice);
    const endPrice = this.toDecimal(input.endPrice);

    if (!startPrice.greaterThan(endPrice)) {
      throw new BadRequestException('End price must be lower than start price.');
    }

    const { token, seller } = await this.prepareToken(input.tokenPk);

    const listing = await this.prisma.listing.create({
      data: {
        tokenPk: token.id,
        type: PrismaListingType.AUCTION_DUTCH,
        price: startPrice,
        startPrice,
        endPrice,
        startTs,
        endTs,
        status: this.initialStatus(startTs),
        sellerId: seller.id,
      },
      include: this.listingInclude,
    });

    await this.scheduleLifecycle(listing);
    return mapListing(listing);
  }

  async createBundleListing(input: CreateBundleListingInput): Promise<Listing> {
    const startTs = this.toDate(input.startTs);
    const endTs = this.toDate(input.endTs);
    this.assertChronology(startTs, endTs);

    const price = this.toDecimal(input.price);
    const { token: bundleToken, seller } = await this.prepareToken(input.bundleTokenPk);

    const bundleItems = await this.prepareBundleItems(input.items, bundleToken.owner);

    const listing = await this.prisma.listing.create({
      data: {
        tokenPk: bundleToken.id,
        type: PrismaListingType.BUNDLE,
        price,
        startPrice: price,
        endPrice: price,
        startTs,
        endTs,
        status: this.initialStatus(startTs),
        sellerId: seller.id,
        bundleItems: {
          create: bundleItems.map((item) => ({
            tokenPk: item.tokenPk,
            quantity: item.quantity,
          })),
        },
      },
      include: this.listingInclude,
    });

    await this.scheduleLifecycle(listing);
    return mapListing(listing);
  }

  async buyNow(input: BuyNowInput): Promise<Sale> {
    const listing = await this.prisma.listing.findUnique({
      where: { id: input.listingId },
      include: {
        token: true,
        seller: true,
        bundleItems: true,
      },
    });

    if (!listing) {
      throw new NotFoundException(`Listing ${input.listingId} not found`);
    }

    if (
      listing.type !== PrismaListingType.FIXED &&
      listing.type !== PrismaListingType.AUCTION_DUTCH &&
      listing.type !== PrismaListingType.BUNDLE
    ) {
      throw new BadRequestException('Listing is not available for instant purchase');
    }

    if (listing.status !== ListingStatus.ACTIVE) {
      throw new BadRequestException('Listing is not active');
    }

    const amount = this.toDecimal(input.amount);
    const buyer = input.buyer.toLowerCase();

    await this.prisma.$transaction(async (tx) => {
      await tx.listing.update({
        where: { id: listing.id },
        data: {
          status: ListingStatus.SOLD,
          price: amount,
        },
      });

      if (listing.type === PrismaListingType.BUNDLE) {
        const ownershipUpdates = listing.bundleItems.map((item) =>
          tx.token.update({
            where: { id: item.tokenPk },
            data: { owner: buyer },
          }),
        );
        await Promise.all(ownershipUpdates);
      }

      await tx.token.update({
        where: { id: listing.tokenPk },
        data: {
          owner: buyer,
        },
      });
    });

    await this.listingsQueue.clearScheduledJobs(listing.id);

    const sale = await this.prisma.sale.create({
      data: {
        tokenPk: listing.tokenPk,
        price: amount,
        seller: listing.seller?.wallet ?? 'unknown',
        buyer,
        chainId: input.chainId,
        txHash: '',
        ts: new Date(),
        listingId: listing.id,
      },
      include: {
        token: {
          include: {
            collection: true,
          },
        },
      },
    });

    return mapSale(sale);
  }

  private async scheduleLifecycle(listing: ListingWithRelations): Promise<void> {
    if (listing.startTs.getTime() > Date.now()) {
      await this.listingsQueue.scheduleActivation(listing.id, listing.startTs);
    }

    if (listing.type === PrismaListingType.AUCTION_EN || listing.type === PrismaListingType.AUCTION_DUTCH) {
      await this.listingsQueue.scheduleSettlement(listing.id, listing.endTs);

      if (listing.type === PrismaListingType.AUCTION_DUTCH && listing.status === ListingStatus.ACTIVE) {
        const firstRun = new Date(Math.max(Date.now(), listing.startTs.getTime()) + DUTCH_SYNC_INTERVAL_MS);
        await this.listingsQueue.scheduleDutchPriceSync(listing.id, firstRun);
      }
    }

    if (listing.type === PrismaListingType.BUNDLE) {
      await this.listingsQueue.scheduleSettlement(listing.id, listing.endTs);
    }
  }

  private async prepareToken(tokenPk: string) {
    const token = await this.prisma.token.findUnique({
      where: { id: tokenPk },
      include: {
        collection: true,
      },
    });

    if (!token) {
      throw new NotFoundException(`Token ${tokenPk} not found`);
    }

    const sellerWallet = token.owner.toLowerCase();
    const seller = await this.prisma.user.upsert({
      where: { wallet: sellerWallet },
      update: {},
      create: {
        wallet: sellerWallet,
        role: UserRole.CREATOR,
      },
    });

    return { token, seller };
  }

  private async prepareBundleItems(
    items: BundleListingItemInput[],
    expectedOwner: string,
  ): Promise<{ tokenPk: string; quantity: number }[]> {
    const owner = expectedOwner.toLowerCase();
    const seen = new Set<string>();
    const prepared: { tokenPk: string; quantity: number }[] = [];

    for (const item of items) {
      const tokenPk = item.tokenPk;
      if (seen.has(tokenPk)) {
        throw new BadRequestException('Duplicate token in bundle items');
      }
      seen.add(tokenPk);

      const token = await this.prisma.token.findUnique({
        where: { id: tokenPk },
      });

      if (!token) {
        throw new NotFoundException(`Bundle item token ${tokenPk} not found`);
      }

      if (token.owner.toLowerCase() !== owner) {
        throw new BadRequestException('All bundle items must be owned by the seller');
      }

      prepared.push({ tokenPk, quantity: item.quantity ?? 1 });
    }

    return prepared;
  }

  private initialStatus(start: Date): ListingStatus {
    return start.getTime() > Date.now() ? ListingStatus.PENDING : ListingStatus.ACTIVE;
  }

  private toDecimal(value: string): Prisma.Decimal {
    try {
      return new Prisma.Decimal(value);
    } catch (error) {
      throw new BadRequestException('Invalid numeric value', { cause: error as Error });
    }
  }

  private toDate(value: string): Date {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`Invalid date value: ${value}`);
    }
    return date;
  }

  private assertChronology(start: Date, end: Date) {
    if (end.getTime() <= start.getTime()) {
      throw new BadRequestException('End time must be later than start time');
    }
  }
}
