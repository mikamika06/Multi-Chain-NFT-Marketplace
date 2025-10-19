-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('CREATOR', 'BUYER', 'VERIFIER', 'ADMIN');

-- CreateEnum
CREATE TYPE "ListingType" AS ENUM ('FIXED', 'AUCTION_EN', 'AUCTION_DUTCH', 'BUNDLE');

-- CreateEnum
CREATE TYPE "ListingStatus" AS ENUM ('PENDING', 'ACTIVE', 'SOLD', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "BidStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REFUNDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BridgeMode" AS ENUM ('LOCK_MINT', 'BURN_MINT');

-- CreateEnum
CREATE TYPE "BridgeProtocol" AS ENUM ('LAYERZERO', 'WORMHOLE');

-- CreateEnum
CREATE TYPE "BridgeStatus" AS ENUM ('CREATED', 'IN_FLIGHT', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "FraudEntity" AS ENUM ('COLLECTION', 'LISTING', 'TOKEN', 'USER');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "wallet" TEXT NOT NULL,
    "email" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'BUYER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Collection" (
    "id" TEXT NOT NULL,
    "chainId" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "royaltyBps" INTEGER NOT NULL DEFAULT 0,
    "creatorWallet" TEXT NOT NULL,

    CONSTRAINT "Collection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Token" (
    "id" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "tokenId" TEXT NOT NULL,
    "chainId" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "metadataUri" TEXT NOT NULL,
    "imageUrl" TEXT,
    "attributesJson" JSONB,
    "mintedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Token_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Listing" (
    "id" TEXT NOT NULL,
    "tokenPk" TEXT NOT NULL,
    "type" "ListingType" NOT NULL,
    "price" DECIMAL(65,18) NOT NULL,
    "startTs" TIMESTAMP(3) NOT NULL,
    "endTs" TIMESTAMP(3) NOT NULL,
    "reservePrice" DECIMAL(65,18),
    "status" "ListingStatus" NOT NULL,
    "sellerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Listing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bid" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "bidderId" TEXT,
    "bidder" TEXT NOT NULL,
    "amount" DECIMAL(65,18) NOT NULL,
    "chainId" TEXT NOT NULL,
    "txHash" TEXT,
    "status" "BidStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Bid_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sale" (
    "id" TEXT NOT NULL,
    "tokenPk" TEXT NOT NULL,
    "price" DECIMAL(65,18) NOT NULL,
    "seller" TEXT NOT NULL,
    "buyer" TEXT NOT NULL,
    "chainId" TEXT NOT NULL,
    "txHash" TEXT NOT NULL,
    "ts" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "listingId" TEXT,

    CONSTRAINT "Sale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrossChainMap" (
    "id" TEXT NOT NULL,
    "tokenPk" TEXT NOT NULL,
    "canonicalChain" TEXT NOT NULL,
    "canonicalAddr" TEXT NOT NULL,
    "mirrorChain" TEXT NOT NULL,
    "mirrorAddr" TEXT NOT NULL,
    "mode" "BridgeMode" NOT NULL,

    CONSTRAINT "CrossChainMap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BridgeEvent" (
    "id" TEXT NOT NULL,
    "tokenPk" TEXT NOT NULL,
    "srcChain" TEXT NOT NULL,
    "dstChain" TEXT NOT NULL,
    "protocol" "BridgeProtocol" NOT NULL,
    "messageId" TEXT NOT NULL,
    "status" "BridgeStatus" NOT NULL,
    "eta" TIMESTAMP(3),
    "fee" DECIMAL(65,18) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BridgeEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIValuation" (
    "tokenPk" TEXT NOT NULL,
    "fairPrice" DECIMAL(65,18) NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "featuresJson" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIValuation_pkey" PRIMARY KEY ("tokenPk")
);

-- CreateTable
CREATE TABLE "FraudFlag" (
    "id" TEXT NOT NULL,
    "entityType" "FraudEntity" NOT NULL,
    "entityId" TEXT NOT NULL,
    "flag" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "FraudFlag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BundleItem" (
    "id" TEXT NOT NULL,
    "bundleId" TEXT NOT NULL,
    "tokenPk" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "BundleItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkerCursor" (
    "id" TEXT NOT NULL,
    "cursor" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkerCursor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_wallet_key" ON "User"("wallet");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Collection_slug_key" ON "Collection"("slug");

-- CreateIndex
CREATE INDEX "Collection_verified_idx" ON "Collection"("verified");

-- CreateIndex
CREATE UNIQUE INDEX "Collection_chainId_address_key" ON "Collection"("chainId", "address");

-- CreateIndex
CREATE INDEX "Token_chainId_owner_idx" ON "Token"("chainId", "owner");

-- CreateIndex
CREATE INDEX "Token_collectionId_idx" ON "Token"("collectionId");

-- CreateIndex
CREATE UNIQUE INDEX "Token_collectionId_tokenId_key" ON "Token"("collectionId", "tokenId");

-- CreateIndex
CREATE INDEX "Listing_status_endTs_idx" ON "Listing"("status", "endTs");

-- CreateIndex
CREATE INDEX "Listing_tokenPk_idx" ON "Listing"("tokenPk");

-- CreateIndex
CREATE INDEX "Bid_listingId_idx" ON "Bid"("listingId");

-- CreateIndex
CREATE INDEX "Sale_ts_idx" ON "Sale"("ts");

-- CreateIndex
CREATE INDEX "Sale_buyer_idx" ON "Sale"("buyer");

-- CreateIndex
CREATE INDEX "Sale_seller_idx" ON "Sale"("seller");

-- CreateIndex
CREATE INDEX "CrossChainMap_canonicalChain_canonicalAddr_idx" ON "CrossChainMap"("canonicalChain", "canonicalAddr");

-- CreateIndex
CREATE INDEX "CrossChainMap_mirrorChain_mirrorAddr_idx" ON "CrossChainMap"("mirrorChain", "mirrorAddr");

-- CreateIndex
CREATE INDEX "BridgeEvent_srcChain_dstChain_idx" ON "BridgeEvent"("srcChain", "dstChain");

-- CreateIndex
CREATE INDEX "BridgeEvent_status_idx" ON "BridgeEvent"("status");

-- CreateIndex
CREATE INDEX "FraudFlag_entityType_entityId_idx" ON "FraudFlag"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "FraudFlag_resolved_idx" ON "FraudFlag"("resolved");

-- CreateIndex
CREATE INDEX "BundleItem_bundleId_idx" ON "BundleItem"("bundleId");

-- CreateIndex
CREATE INDEX "ActivityLog_actor_idx" ON "ActivityLog"("actor");

-- AddForeignKey
ALTER TABLE "Token" ADD CONSTRAINT "Token_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_tokenPk_fkey" FOREIGN KEY ("tokenPk") REFERENCES "Token"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bid" ADD CONSTRAINT "Bid_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bid" ADD CONSTRAINT "Bid_bidderId_fkey" FOREIGN KEY ("bidderId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_tokenPk_fkey" FOREIGN KEY ("tokenPk") REFERENCES "Token"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrossChainMap" ADD CONSTRAINT "CrossChainMap_tokenPk_fkey" FOREIGN KEY ("tokenPk") REFERENCES "Token"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BridgeEvent" ADD CONSTRAINT "BridgeEvent_tokenPk_fkey" FOREIGN KEY ("tokenPk") REFERENCES "Token"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIValuation" ADD CONSTRAINT "AIValuation_tokenPk_fkey" FOREIGN KEY ("tokenPk") REFERENCES "Token"("id") ON DELETE CASCADE ON UPDATE CASCADE;
