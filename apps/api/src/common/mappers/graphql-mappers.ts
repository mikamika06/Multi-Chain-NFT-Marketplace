import {
  Collection as CollectionModel,
  Token as TokenModel,
  Listing as ListingModel,
  Bid as BidModel,
  Sale as SaleModel,
  AIValuation as AIValuationModel,
  BridgeEvent as BridgeEventModel,
  FraudFlag as FraudFlagModel,
  BundleItem as BundleItemModel,
} from '@prisma/client';
import { Collection as CollectionEntity } from '../../modules/collections/entities/collection.entity';
import { Token as TokenEntity } from '../../modules/tokens/entities/token.entity';
import {
  Listing as ListingEntity,
  ListingType as ListingTypeEntity,
} from '../../modules/listings/entities/listing.entity';
import { BundleItem as BundleItemEntity } from '../../modules/listings/entities/bundle-item.entity';
import { Bid as BidEntity } from '../../modules/bids/entities/bid.entity';
import { Sale as SaleEntity } from '../../modules/sales/entities/sale.entity';
import { Valuation as ValuationEntity } from '../../modules/valuation/entities/valuation.entity';
import { BridgeEvent as BridgeEventEntity } from '../../modules/bridge/entities/bridge-event.entity';
import { FraudFlagEntity } from '../../modules/fraud/entities/fraud-flag.entity';
import { FraudEntityEnum } from '../../modules/fraud/fraud.enums';

const toJsonString = (value: unknown): string => {
  if (value === null || value === undefined) {
    return '{}';
  }
  if (typeof value === 'string') {
    return value;
  }
  try {
    return JSON.stringify(value);
  } catch {
    return '{}';
  }
};

export const mapCollection = (collection: CollectionModel): CollectionEntity => ({
  id: collection.id,
  chainId: collection.chainId,
  address: collection.address,
  slug: collection.slug,
  name: collection.name,
  verified: collection.verified,
  royaltyBps: collection.royaltyBps,
  creatorWallet: collection.creatorWallet,
});

type TokenWithCollection = TokenModel & {
  collection?: CollectionModel | null;
};

export const mapToken = (token: TokenWithCollection): TokenEntity => ({
  id: token.id,
  collectionId: token.collectionId,
  tokenId: token.tokenId,
  chainId: token.chainId,
  owner: token.owner,
  metadataUri: token.metadataUri,
  imageUrl: token.imageUrl ?? '',
  attributesJson: toJsonString(token.attributesJson),
  mintedAt: token.mintedAt.toISOString(),
  collection: token.collection ? mapCollection(token.collection) : undefined,
});

type ListingWithToken = ListingModel & {
  token?: TokenWithCollection | null;
  bundleItems?: (BundleItemModel & {
    token?: TokenWithCollection | null;
  })[] | null;
};

const mapBundleItem = (item: BundleItemModel & { token?: TokenWithCollection | null }): BundleItemEntity => ({
  id: item.id,
  listingId: item.bundleId,
  tokenPk: item.tokenPk,
  quantity: item.quantity,
  token: item.token ? mapToken(item.token) : undefined,
});

export const mapListing = (listing: ListingWithToken): ListingEntity => ({
  id: listing.id,
  tokenPk: listing.tokenPk,
  type: listing.type as ListingTypeEntity,
  price: listing.price.toString(),
  startPrice: listing.startPrice ? listing.startPrice.toString() : null,
  endPrice: listing.endPrice ? listing.endPrice.toString() : null,
  startTs: listing.startTs.toISOString(),
  endTs: listing.endTs.toISOString(),
  reservePrice: listing.reservePrice ? listing.reservePrice.toString() : null,
  status: listing.status,
  token: listing.token ? mapToken(listing.token) : undefined,
  bundleItems:
    listing.bundleItems && listing.bundleItems.length
      ? listing.bundleItems.map(mapBundleItem)
      : undefined,
});

type BidWithRelations = BidModel & {
  listing?: ListingWithToken | null;
};

export const mapBid = (bid: BidWithRelations): BidEntity => ({
  id: bid.id,
  listingId: bid.listingId,
  bidder: bid.bidder,
  amount: bid.amount.toString(),
  chainId: bid.chainId,
  createdAt: bid.createdAt.toISOString(),
  status: bid.status,
  listing: bid.listing ? mapListing(bid.listing) : undefined,
});

type SaleWithToken = SaleModel & {
  token?: TokenWithCollection | null;
};

export const mapSale = (sale: SaleWithToken): SaleEntity => ({
  id: sale.id,
  tokenPk: sale.tokenPk,
  price: sale.price.toString(),
  seller: sale.seller,
  buyer: sale.buyer,
  chainId: sale.chainId,
  txHash: sale.txHash,
  ts: sale.ts.toISOString(),
  token: sale.token ? mapToken(sale.token) : undefined,
});

type ValuationWithToken = AIValuationModel & {
  token?: TokenWithCollection | null;
};

export const mapValuation = (valuation: ValuationWithToken): ValuationEntity => ({
  tokenPk: valuation.tokenPk,
  fairPrice: valuation.fairPrice.toString(),
  confidence: valuation.confidence,
  updatedAt: valuation.updatedAt.toISOString(),
  modelVersion: valuation.modelVersion,
  features: toJsonString(valuation.featuresJson),
  expiresAt: valuation.expiresAt ? valuation.expiresAt.toISOString() : null,
  token: valuation.token ? mapToken(valuation.token) : undefined,
});

type BridgeEventWithToken = BridgeEventModel & {
  token?: TokenWithCollection | null;
};

export const mapBridgeEvent = (event: BridgeEventWithToken): BridgeEventEntity => ({
  id: event.id,
  tokenPk: event.tokenPk,
  srcChain: event.srcChain,
  dstChain: event.dstChain,
  protocol: event.protocol,
  messageId: event.messageId,
  status: event.status,
  fee: event.fee ? Number(event.fee.toString()) : 0,
  createdAt: event.createdAt.toISOString(),
  token: event.token ? mapToken(event.token) : undefined,
});

type FraudFlagWithToken = FraudFlagModel & {
  token?: TokenWithCollection | null;
};

export const mapFraudFlag = (flag: FraudFlagWithToken): FraudFlagEntity => ({
  id: flag.id,
  entityType: flag.entityType as FraudEntityEnum,
  entityId: flag.entityId,
  flag: flag.flag,
  score: flag.score,
  reason: flag.reason,
  resolved: flag.resolved,
  createdAt: flag.createdAt.toISOString(),
  reviewerId: flag.reviewerId,
  resolutionNote: flag.resolutionNote,
  resolvedAt: flag.resolvedAt ? flag.resolvedAt.toISOString() : null,
  token: flag.token ? mapToken(flag.token) : undefined,
});
