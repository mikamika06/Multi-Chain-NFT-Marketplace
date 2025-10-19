import { Injectable, Logger } from '@nestjs/common';
import {
  AbiEvent,
  Address,
  Log,
  PublicClient,
  createPublicClient,
  http,
  parseAbiItem,
  formatEther,
} from 'viem';
import { randomUUID } from 'node:crypto';
import {
  Prisma,
  ListingStatus,
  ListingType as PrismaListingType,
  BridgeStatus,
  BridgeProtocol,
} from '@prisma/client';
import { PrismaService } from '../../common/database/prisma.service';
import { IndexerService } from './indexer.service';

type EvmEventLog = Log & {
  eventName?: string;
  args?: Record<string, unknown>;
};

const MARKETPLACE_EVENT_SIGNATURES = [
  'event ListingCreated(bytes32 indexed listingId, address indexed seller, address indexed tokenContract, uint256 tokenId, uint256 price, uint8 listingType)',
  'event BidPlaced(bytes32 indexed listingId, address indexed bidder, uint256 amount)',
  'event SaleSettled(bytes32 indexed listingId, address indexed buyer, uint256 amount)',
  'event ListingCancelled(bytes32 indexed listingId)',
  'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)',
  'event AuctionExtended(bytes32 indexed listingId,uint64 newEndTime)',
] as const;

const ONFT_EVENT_SIGNATURES = [
  'event BridgeInitiated(address indexed sender,uint16 indexed dstChainId,address indexed to,uint256 tokenId,bool burnMint,string uri,bytes adapterParams)',
  'event BridgeReceived(uint16 indexed srcChainId,address indexed to,uint256 tokenId,bool burnMint,string uri)',
] as const;

const WORMHOLE_EVENT_SIGNATURES = [
  'event WormholeTransferInitiated(address indexed sender,uint16 indexed dstChainId,address indexed token,uint256 tokenId,string uri)',
  'event WormholeTransferCompleted(uint16 indexed srcChainId,address indexed receiver,address indexed token,uint256 tokenId,string uri)',
] as const;

const MARKETPLACE_EVENTS: AbiEvent[] = MARKETPLACE_EVENT_SIGNATURES.map(
  (signature) => parseAbiItem(signature) as AbiEvent,
);

const ONFT_EVENTS: AbiEvent[] = ONFT_EVENT_SIGNATURES.map(
  (signature) => parseAbiItem(signature) as AbiEvent,
);

const WORMHOLE_EVENTS: AbiEvent[] = WORMHOLE_EVENT_SIGNATURES.map(
  (signature) => parseAbiItem(signature) as AbiEvent,
);

type MinimalPublicClientConfig = {
  transport: ReturnType<typeof http>;
};

const createUntypedPublicClient =
  createPublicClient as unknown as (config: MinimalPublicClientConfig) => PublicClient;

@Injectable()
export class EvmIndexerService {
  private readonly logger = new Logger(EvmIndexerService.name);

  constructor(
    private prisma: PrismaService,
    private indexerService: IndexerService,
  ) {}

  async indexBlocks(
    chainId: string,
    rpcUrl: string,
    marketplaceAddress: string,
    onftAddress: string | undefined,
    wormholeAddress: string | undefined,
    fromBlock: number,
  ): Promise<void> {
    const client = createUntypedPublicClient({
      transport: http(rpcUrl),
    });

    try {
      const latestBlock = await client.getBlockNumber();
      const toBlock = Math.min(Number(latestBlock), fromBlock + 999); // Process max 1000 blocks at a time

      if (fromBlock > toBlock) {
        return; // Already up to date
      }

      this.logger.debug(`Indexing chain ${chainId} blocks ${fromBlock} to ${toBlock}`);

      const events: EvmEventLog[] = [];

      if (marketplaceAddress) {
        const marketplaceEvents = await this.fetchEvents(
          client,
          marketplaceAddress,
          MARKETPLACE_EVENTS,
          BigInt(fromBlock),
          BigInt(toBlock),
        );
        events.push(...marketplaceEvents);
      }

      if (onftAddress) {
        const onftEvents = await this.fetchEvents(
          client,
          onftAddress,
          ONFT_EVENTS,
          BigInt(fromBlock),
          BigInt(toBlock),
        );
        events.push(...onftEvents);
      }

      if (wormholeAddress) {
        const wormholeEvents = await this.fetchEvents(
          client,
          wormholeAddress,
          WORMHOLE_EVENTS,
          BigInt(fromBlock),
          BigInt(toBlock),
        );
        events.push(...wormholeEvents);
      }

      // Process events
      await this.processEvents(chainId, events);

      // Update cursor
      await this.indexerService.updateCursor(chainId, toBlock);

      this.logger.log(`Indexed chain ${chainId} up to block ${toBlock}, processed ${events.length} events`);
    } catch (error) {
      this.logger.error(`Error indexing chain ${chainId}:`, error);
      throw error;
    }
  }

  private async fetchEvents(
    client: PublicClient,
    address: string,
    events: AbiEvent[],
    fromBlock: bigint,
    toBlock: bigint,
  ): Promise<EvmEventLog[]> {
    const targetAddress = address as Address;
    const logs = await Promise.all(
      events.map((event) =>
        client.getLogs({
          address: targetAddress,
          event,
          fromBlock,
          toBlock,
        }),
      ),
    );

    return logs.flat() as EvmEventLog[];
  }

  private async processEvents(chainId: string, events: EvmEventLog[]): Promise<void> {
    for (const event of events) {
      try {
        const eventName = event.eventName ?? '';

        switch (eventName) {
          case 'ListingCreated':
            await this.handleListingCreated(chainId, event);
            break;
          case 'BidPlaced':
            await this.handleBidPlaced(chainId, event);
            break;
          case 'SaleSettled':
            await this.handleSale(chainId, event);
            break;
          case 'ListingCancelled':
            await this.handleListingCancelled(event);
            break;
          case 'Transfer':
            await this.handleTransfer(chainId, event);
            break;
          case 'AuctionExtended':
            await this.handleAuctionExtended(event);
            break;
          case 'BridgeInitiated':
            await this.handleBridgeInitiated(chainId, event);
            break;
          case 'BridgeReceived':
            await this.handleBridgeReceived(chainId, event);
            break;
          case 'WormholeTransferInitiated':
            await this.handleWormholeInitiated(chainId, event);
            break;
          case 'WormholeTransferCompleted':
            await this.handleWormholeCompleted(chainId, event);
            break;
          default:
            this.logger.warn(`Unknown event: ${eventName}`);
        }
      } catch (error) {
        this.logger.error(`Error processing event:`, error);
      }
    }
  }

  private async handleListingCreated(chainId: string, event: EvmEventLog): Promise<void> {
    const args = event.args as
      | {
          listingId: `0x${string}`;
          seller: string;
          tokenContract: string;
          tokenId: bigint;
          price: bigint;
          listingType: bigint;
        }
      | undefined;

    if (!args) {
      this.logger.warn('ListingCreated event missing args');
      return;
    }

    const listingId = args.listingId;
    const sellerWallet = args.seller.toLowerCase();
    const tokenContract = args.tokenContract.toLowerCase();
    const tokenId = args.tokenId.toString();
    const listingTypeValue = Number(args.listingType ?? 0n);
    const listingType = this.mapListingType(listingTypeValue);
    const priceEth = formatEther(args.price ?? 0n);
    const priceDecimal = new Prisma.Decimal(priceEth);

    const sellerUser = await this.prisma.user.upsert({
      where: { wallet: sellerWallet },
      update: {},
      create: {
        wallet: sellerWallet,
        role: 'CREATOR',
      },
    });

    const collection = await this.prisma.collection.upsert({
      where: {
        chainId_address: {
          chainId,
          address: tokenContract,
        },
      },
      update: {},
      create: {
        chainId,
        address: tokenContract,
        slug: `auto-${tokenContract.slice(2, 10)}`,
        name: `Collection ${tokenContract.slice(0, 6)}`,
        verified: false,
        royaltyBps: 0,
        creatorWallet: sellerWallet,
      },
    });

    const token = await this.prisma.token.upsert({
      where: {
        collectionId_tokenId: {
          collectionId: collection.id,
          tokenId,
        },
      },
      update: {
        owner: sellerWallet,
        chainId,
      },
      create: {
        collectionId: collection.id,
        tokenId,
        chainId,
        owner: sellerWallet,
        metadataUri: '',
        imageUrl: '',
        attributesJson: Prisma.JsonNull,
      },
    });

    const now = new Date();
    const defaultDurationMs = 7 * 24 * 60 * 60 * 1000;

    await this.prisma.listing.upsert({
      where: { id: listingId },
      update: {
        type: listingType,
        price: priceDecimal,
        status: ListingStatus.ACTIVE,
        startTs: now,
        endTs: new Date(now.getTime() + defaultDurationMs),
      },
      create: {
        id: listingId,
        tokenPk: token.id,
        type: listingType,
        price: priceDecimal,
        startTs: now,
        endTs: new Date(now.getTime() + defaultDurationMs),
        reservePrice: null,
        status: ListingStatus.ACTIVE,
        sellerId: sellerUser.id,
      },
    });

    this.logger.debug(
      `ListingCreated stored listing ${listingId} for token ${token.id} on chain ${chainId}`,
    );
  }

  private async handleBidPlaced(chainId: string, event: EvmEventLog): Promise<void> {
    const args = event.args as
      | {
          listingId: `0x${string}`;
          bidder: string;
          amount: bigint;
        }
      | undefined;

    if (!args) {
      this.logger.warn('BidPlaced event missing args');
      return;
    }

    const listingId = args.listingId;
    const bidderWallet = args.bidder.toLowerCase();
    const amountEth = formatEther(args.amount ?? 0n);

    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
    });

    if (!listing) {
      this.logger.warn(`Received bid for unknown listing ${listingId}`);
      return;
    }

    await this.prisma.user.upsert({
      where: { wallet: bidderWallet },
      update: {},
      create: {
        wallet: bidderWallet,
        role: 'BUYER',
      },
    });

    await this.prisma.bid.create({
      data: {
        listingId,
        bidder: bidderWallet,
        amount: new Prisma.Decimal(amountEth),
        chainId,
        txHash: event.transactionHash ?? null,
      },
    });

    await this.prisma.listing.update({
      where: { id: listingId },
      data: {
        price: new Prisma.Decimal(amountEth),
      },
    });

    this.logger.debug(
      `Stored bid for listing ${listingId} amount ${amountEth} ETH on ${chainId}`,
    );
  }

  private async handleSale(chainId: string, event: EvmEventLog): Promise<void> {
    const args = event.args as
      | {
          listingId: `0x${string}`;
          buyer: string;
          amount: bigint;
        }
      | undefined;

    if (!args) {
      this.logger.warn('SaleSettled event missing args');
      return;
    }

    const listingId = args.listingId;
    const buyerWallet = args.buyer.toLowerCase();
    const amountEth = formatEther(args.amount ?? 0n);

    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      include: {
        token: true,
        seller: true,
      },
    });

    if (!listing) {
      this.logger.warn(`Sale for unknown listing ${listingId}`);
      return;
    }

    await this.prisma.listing.update({
      where: { id: listingId },
      data: {
        status: ListingStatus.SOLD,
        price: new Prisma.Decimal(amountEth),
        endTs: new Date(),
      },
    });

    await this.prisma.user.upsert({
      where: { wallet: buyerWallet },
      update: {},
      create: {
        wallet: buyerWallet,
        role: 'BUYER',
      },
    });

    await this.prisma.sale.create({
      data: {
        id: event.transactionHash ?? randomUUID(),
        tokenPk: listing.tokenPk,
        price: new Prisma.Decimal(amountEth),
        seller: listing.seller?.wallet ?? 'unknown',
        buyer: buyerWallet,
        chainId,
        txHash: event.transactionHash ?? '',
        ts: new Date(),
        listingId,
      },
    });

    this.logger.debug(
      `Recorded sale for listing ${listingId} buyer ${buyerWallet} amount ${amountEth} ETH`,
    );
  }

  private async handleListingCancelled(event: EvmEventLog): Promise<void> {
    const args = event.args as { listingId: `0x${string}` } | undefined;

    if (!args) {
      this.logger.warn('ListingCancelled event missing args');
      return;
    }

    await this.prisma.listing.updateMany({
      where: { id: args.listingId },
      data: { status: ListingStatus.CANCELLED },
    });

    this.logger.debug(`Cancelled listing ${args.listingId}`);
  }

  private async handleAuctionExtended(event: EvmEventLog): Promise<void> {
    const args = event.args as
      | {
          listingId: `0x${string}`;
          newEndTime: bigint;
        }
      | undefined;

    if (!args) {
      this.logger.warn('AuctionExtended event missing args');
      return;
    }

    const endTimestampMs = Number(args.newEndTime) * 1000;
    const endDate = new Date(endTimestampMs);

    await this.prisma.listing.updateMany({
      where: { id: args.listingId },
      data: {
        endTs: endDate,
      },
    });
  }

  private async handleTransfer(chainId: string, event: EvmEventLog): Promise<void> {
    const args = event.args as
      | {
          from: string;
          to: string;
          tokenId: bigint;
        }
      | undefined;

    if (!args) {
      return;
    }

    const toWallet = args.to.toLowerCase();
    const tokenId = args.tokenId.toString();
    const tokenContract = (event.address ?? '').toLowerCase();

    const collection = await this.prisma.collection.findFirst({
      where: {
        chainId,
        address: tokenContract,
      },
    });

    if (!collection) {
      return;
    }

    await this.prisma.token.updateMany({
      where: {
        collectionId: collection.id,
        tokenId,
      },
      data: {
        owner: toWallet,
      },
    });

    this.logger.debug(`Transfer updated token ${tokenId} owner to ${toWallet} on ${chainId}`);
  }

  private async handleBridgeInitiated(chainId: string, event: EvmEventLog): Promise<void> {
    const args = event.args as
      | {
          sender: string;
          dstChainId: bigint;
          to: string;
          tokenId: bigint;
          burnMint: boolean;
          uri: string;
          adapterParams?: string;
        }
      | undefined;

    if (!args) {
      this.logger.warn('BridgeInitiated event missing args');
      return;
    }

    await this.recordBridgeInitiated({
      chainId,
      protocol: BridgeProtocol.LAYERZERO,
      tokenContract: (event.address ?? '').toLowerCase(),
      tokenId: args.tokenId?.toString() ?? '0',
      actor: args.sender?.toLowerCase() ?? '0x0',
      lockedOwner: args.sender?.toLowerCase() ?? '0x0',
      metadataUri: args.uri ?? '',
      destinationChain: args.dstChainId ? args.dstChainId.toString() : '',
      burnMint: Boolean(args.burnMint),
      transactionHash: event.transactionHash,
      logIndex: event.logIndex,
    });
  }

  private async handleBridgeReceived(chainId: string, event: EvmEventLog): Promise<void> {
    const args = event.args as
      | {
          srcChainId: bigint;
          to: string;
          tokenId: bigint;
          burnMint: boolean;
          uri: string;
        }
      | undefined;

    if (!args) {
      this.logger.warn('BridgeReceived event missing args');
      return;
    }

    await this.recordBridgeCompleted({
      chainId,
      protocol: BridgeProtocol.LAYERZERO,
      tokenContract: (event.address ?? '').toLowerCase(),
      tokenId: args.tokenId?.toString() ?? '0',
      owner: args.to?.toLowerCase() ?? '0x0',
      metadataUri: args.uri ?? '',
      srcChain: args.srcChainId ? args.srcChainId.toString() : '',
      transactionHash: event.transactionHash,
      logIndex: event.logIndex,
    });
  }

  private async handleWormholeInitiated(chainId: string, event: EvmEventLog): Promise<void> {
    const args = event.args as
      | {
          sender: string;
          dstChainId: bigint;
          token: string;
          tokenId: bigint;
          uri: string;
        }
      | undefined;

    if (!args) {
      this.logger.warn('WormholeTransferInitiated event missing args');
      return;
    }

    await this.recordBridgeInitiated({
      chainId,
      protocol: BridgeProtocol.WORMHOLE,
      tokenContract: args.token?.toLowerCase() ?? '',
      tokenId: args.tokenId?.toString() ?? '0',
      actor: args.sender?.toLowerCase() ?? '0x0',
      lockedOwner: args.sender?.toLowerCase() ?? '0x0',
      metadataUri: args.uri ?? '',
      destinationChain: args.dstChainId ? args.dstChainId.toString() : '',
      burnMint: false,
      transactionHash: event.transactionHash,
      logIndex: event.logIndex,
    });
  }

  private async handleWormholeCompleted(chainId: string, event: EvmEventLog): Promise<void> {
    const args = event.args as
      | {
          srcChainId: bigint;
          receiver: string;
          token: string;
          tokenId: bigint;
          uri: string;
        }
      | undefined;

    if (!args) {
      this.logger.warn('WormholeTransferCompleted event missing args');
      return;
    }

    await this.recordBridgeCompleted({
      chainId,
      protocol: BridgeProtocol.WORMHOLE,
      tokenContract: args.token?.toLowerCase() ?? '',
      tokenId: args.tokenId?.toString() ?? '0',
      owner: args.receiver?.toLowerCase() ?? '0x0',
      metadataUri: args.uri ?? '',
      srcChain: args.srcChainId ? args.srcChainId.toString() : '',
      transactionHash: event.transactionHash,
      logIndex: event.logIndex,
    });
  }

  private async recordBridgeInitiated(params: {
    chainId: string;
    protocol: BridgeProtocol;
    tokenContract: string;
    tokenId: string;
    actor: string;
    lockedOwner: string;
    metadataUri: string;
    destinationChain: string;
    burnMint: boolean;
    transactionHash?: string | null;
    logIndex?: number | bigint | null;
  }): Promise<void> {
    const collection = await this.prisma.collection.upsert({
      where: {
        chainId_address: {
          chainId: params.chainId,
          address: params.tokenContract,
        },
      },
      update: {},
      create: {
        chainId: params.chainId,
        address: params.tokenContract,
        slug: `onft-${params.tokenContract.slice(2, 10)}`,
        name: `ONFT ${params.tokenContract.slice(0, 6)}`,
        verified: false,
        royaltyBps: 0,
        creatorWallet: params.actor,
      },
    });

    const existingToken = await this.prisma.token.findUnique({
      where: {
        collectionId_tokenId: {
          collectionId: collection.id,
          tokenId: params.tokenId,
        },
      },
    });

    const ownerAddress = params.burnMint
      ? '0x0000000000000000000000000000000000000000'
      : params.lockedOwner;

    let tokenPk: string;
    if (existingToken) {
      await this.prisma.token.update({
        where: { id: existingToken.id },
        data: {
          owner: ownerAddress,
          chainId: params.chainId,
          metadataUri:
            params.metadataUri.length > 0 ? params.metadataUri : existingToken.metadataUri,
        },
      });
      tokenPk = existingToken.id;
    } else {
      const createdToken = await this.prisma.token.create({
        data: {
          collectionId: collection.id,
          tokenId: params.tokenId,
          chainId: params.chainId,
          owner: ownerAddress,
          metadataUri: params.metadataUri,
          imageUrl: params.metadataUri,
          attributesJson: Prisma.JsonNull,
        },
      });
      tokenPk = createdToken.id;
    }

    await this.prisma.bridgeEvent.create({
      data: {
        tokenPk,
        srcChain: params.chainId,
        dstChain: params.destinationChain,
        protocol: params.protocol,
        messageId: `${params.transactionHash ?? randomUUID()}:${params.logIndex ?? '0'}`,
        status: BridgeStatus.IN_FLIGHT,
        fee: new Prisma.Decimal(0),
      },
    });
  }

  private async recordBridgeCompleted(params: {
    chainId: string;
    protocol: BridgeProtocol;
    tokenContract: string;
    tokenId: string;
    owner: string;
    metadataUri: string;
    srcChain: string;
    transactionHash?: string | null;
    logIndex?: number | bigint | null;
  }): Promise<void> {
    const collection = await this.prisma.collection.upsert({
      where: {
        chainId_address: {
          chainId: params.chainId,
          address: params.tokenContract,
        },
      },
      update: {},
      create: {
        chainId: params.chainId,
        address: params.tokenContract,
        slug: `onft-${params.tokenContract.slice(2, 10)}`,
        name: `ONFT ${params.tokenContract.slice(0, 6)}`,
        verified: false,
        royaltyBps: 0,
        creatorWallet: params.owner,
      },
    });

    const existingToken = await this.prisma.token.findUnique({
      where: {
        collectionId_tokenId: {
          collectionId: collection.id,
          tokenId: params.tokenId,
        },
      },
    });

    let tokenPk: string;
    if (existingToken) {
      await this.prisma.token.update({
        where: { id: existingToken.id },
        data: {
          owner: params.owner,
          chainId: params.chainId,
          metadataUri:
            params.metadataUri.length > 0 ? params.metadataUri : existingToken.metadataUri,
        },
      });
      tokenPk = existingToken.id;
    } else {
      const createdToken = await this.prisma.token.create({
        data: {
          collectionId: collection.id,
          tokenId: params.tokenId,
          chainId: params.chainId,
          owner: params.owner,
          metadataUri: params.metadataUri,
          imageUrl: params.metadataUri,
          attributesJson: Prisma.JsonNull,
        },
      });
      tokenPk = createdToken.id;
    }

    const inflight = await this.prisma.bridgeEvent.findFirst({
      where: {
        tokenPk,
        status: BridgeStatus.IN_FLIGHT,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (inflight) {
      await this.prisma.bridgeEvent.update({
        where: { id: inflight.id },
        data: {
          status: BridgeStatus.COMPLETED,
        },
      });
    } else {
      await this.prisma.bridgeEvent.create({
        data: {
          tokenPk,
          srcChain: params.srcChain,
          dstChain: params.chainId,
          protocol: params.protocol,
          messageId: `${params.transactionHash ?? randomUUID()}:${params.logIndex ?? '0'}`,
          status: BridgeStatus.COMPLETED,
          fee: new Prisma.Decimal(0),
        },
      });
    }
  }

  private mapListingType(value: number): PrismaListingType {
    switch (value) {
      case 0:
        return 'FIXED';
      case 1:
        return 'AUCTION_EN';
      case 2:
        return 'AUCTION_DUTCH';
      default:
        return 'FIXED';
    }
  }
}
