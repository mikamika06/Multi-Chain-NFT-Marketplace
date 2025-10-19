import { Injectable } from '@nestjs/common';
import DataLoader from 'dataloader';
import { PrismaService } from './prisma.service';
import { Collection, Token, User, Listing, Bid } from '@prisma/client';

/**
 * DataLoader service to prevent N+1 queries in GraphQL
 * Automatically batches and caches database requests within a single request context
 */
@Injectable()
export class DataLoaderService {
  constructor(private prisma: PrismaService) {}

  /**
   * Collection loader by ID
   */
  createCollectionLoader(): DataLoader<string, Collection | null> {
    return new DataLoader<string, Collection | null>(async (ids) => {
      const collections = await this.prisma.collection.findMany({
        where: { id: { in: [...ids] } },
      });

      const collectionMap = new Map(
        collections.map((c) => [c.id, c]),
      );

      return ids.map((id) => collectionMap.get(id) || null);
    });
  }

  /**
   * Token loader by ID
   */
  createTokenLoader(): DataLoader<string, Token | null> {
    return new DataLoader<string, Token | null>(async (ids) => {
      const tokens = await this.prisma.token.findMany({
        where: { id: { in: [...ids] } },
      });

      const tokenMap = new Map(tokens.map((t) => [t.id, t]));

      return ids.map((id) => tokenMap.get(id) || null);
    });
  }

  /**
   * User loader by wallet address
   */
  createUserLoader(): DataLoader<string, User | null> {
    return new DataLoader<string, User | null>(async (wallets) => {
      const users = await this.prisma.user.findMany({
        where: { wallet: { in: [...wallets] } },
      });

      const userMap = new Map(users.map((u) => [u.wallet, u]));

      return wallets.map((wallet) => userMap.get(wallet) || null);
    });
  }

  /**
   * Listing loader by ID
   */
  createListingLoader(): DataLoader<string, Listing | null> {
    return new DataLoader<string, Listing | null>(async (ids) => {
      const listings = await this.prisma.listing.findMany({
        where: { id: { in: [...ids] } },
      });

      const listingMap = new Map(listings.map((l) => [l.id, l]));

      return ids.map((id) => listingMap.get(id) || null);
    });
  }

  /**
   * Batch loader for tokens by collection ID
   */
  createTokensByCollectionLoader(): DataLoader<string, Token[]> {
    return new DataLoader<string, Token[]>(async (collectionIds) => {
      const tokens = await this.prisma.token.findMany({
        where: { collectionId: { in: [...collectionIds] } },
      });

      const tokensByCollection = new Map<string, Token[]>();

      tokens.forEach((token) => {
        const existing = tokensByCollection.get(token.collectionId) || [];
        tokensByCollection.set(token.collectionId, [...existing, token]);
      });

      return collectionIds.map(
        (id) => tokensByCollection.get(id) || [],
      );
    });
  }

  /**
   * Batch loader for bids by listing ID
   */
  createBidsByListingLoader(): DataLoader<string, Bid[]> {
    return new DataLoader<string, Bid[]>(async (listingIds) => {
      const bids = await this.prisma.bid.findMany({
        where: { listingId: { in: [...listingIds] } },
        orderBy: { amount: 'desc' },
      });

      const bidsByListing = new Map<string, Bid[]>();

      bids.forEach((bid) => {
        const existing = bidsByListing.get(bid.listingId) || [];
        bidsByListing.set(bid.listingId, [...existing, bid]);
      });

      return listingIds.map((id) => bidsByListing.get(id) || []);
    });
  }
}
