import { PrismaClient, UserRole, ListingType, ListingStatus, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seed...');

  // Create test users
  const creator = await prisma.user.upsert({
    where: { wallet: '0x1111111111111111111111111111111111111111' },
    update: {},
    create: {
      wallet: '0x1111111111111111111111111111111111111111',
      email: 'creator@example.com',
      role: UserRole.CREATOR,
    },
  });

  const buyer = await prisma.user.upsert({
    where: { wallet: '0x2222222222222222222222222222222222222222' },
    update: {},
    create: {
      wallet: '0x2222222222222222222222222222222222222222',
      email: 'buyer@example.com',
      role: UserRole.BUYER,
    },
  });

  const admin = await prisma.user.upsert({
    where: { wallet: '0x3333333333333333333333333333333333333333' },
    update: {},
    create: {
      wallet: '0x3333333333333333333333333333333333333333',
      email: 'admin@example.com',
      role: UserRole.ADMIN,
    },
  });

  console.log('Created users:', { creator: creator.id, buyer: buyer.id, admin: admin.id });

  // Create test collections
  const collection1 = await prisma.collection.upsert({
    where: { slug: 'cool-cats' },
    update: {},
    create: {
      chainId: '1',
      address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      slug: 'cool-cats',
      name: 'Cool Cats',
      verified: true,
      royaltyBps: 500, // 5%
      creatorWallet: creator.wallet,
    },
  });

  const collection2 = await prisma.collection.upsert({
    where: { slug: 'cyber-punks' },
    update: {},
    create: {
      chainId: '137',
      address: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      slug: 'cyber-punks',
      name: 'Cyber Punks',
      verified: true,
      royaltyBps: 750, // 7.5%
      creatorWallet: creator.wallet,
    },
  });

  console.log('Created collections:', { collection1: collection1.id, collection2: collection2.id });

  // Create test tokens
  const token1 = await prisma.token.upsert({
    where: {
      collectionId_tokenId: {
        collectionId: collection1.id,
        tokenId: '1',
      },
    },
    update: {
      owner: creator.wallet,
      attributesJson: {
        background: 'blue',
        eyes: 'laser',
        rarity: 'legendary',
      },
    },
    create: {
      id: 'token-cool-cats-1',
      collectionId: collection1.id,
      tokenId: '1',
      chainId: '1',
      owner: creator.wallet,
      metadataUri: 'ipfs://QmExample1',
      imageUrl: 'https://example.com/image1.png',
      attributesJson: {
        background: 'blue',
        eyes: 'laser',
        rarity: 'legendary',
      },
    },
  });

  const token2 = await prisma.token.upsert({
    where: {
      collectionId_tokenId: {
        collectionId: collection1.id,
        tokenId: '2',
      },
    },
    update: {
      owner: creator.wallet,
      attributesJson: {
        background: 'red',
        eyes: 'normal',
        rarity: 'common',
      },
    },
    create: {
      id: 'token-cool-cats-2',
      collectionId: collection1.id,
      tokenId: '2',
      chainId: '1',
      owner: creator.wallet,
      metadataUri: 'ipfs://QmExample2',
      imageUrl: 'https://example.com/image2.png',
      attributesJson: {
        background: 'red',
        eyes: 'normal',
        rarity: 'common',
      },
    },
  });

  const token3 = await prisma.token.upsert({
    where: {
      collectionId_tokenId: {
        collectionId: collection2.id,
        tokenId: '1',
      },
    },
    update: {
      owner: creator.wallet,
      attributesJson: {
        type: 'punk',
        accessories: 'sunglasses',
        rarity: 'rare',
      },
    },
    create: {
      id: 'token-cyber-punks-1',
      collectionId: collection2.id,
      tokenId: '1',
      chainId: '137',
      owner: creator.wallet,
      metadataUri: 'ipfs://QmExample3',
      imageUrl: 'https://example.com/image3.png',
      attributesJson: {
        type: 'punk',
        accessories: 'sunglasses',
        rarity: 'rare',
      },
    },
  });

  console.log('Created tokens:', { token1: token1.id, token2: token2.id, token3: token3.id });

  // Create test listings
  const listing1 = await prisma.listing.upsert({
    where: { id: 'listing-fixed-token1' },
    update: {
      price: '1.5',
      status: ListingStatus.ACTIVE,
    },
    create: {
      id: 'listing-fixed-token1',
      tokenPk: token1.id,
      type: ListingType.FIXED,
      price: '1.5',
      startTs: new Date(),
      endTs: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      status: ListingStatus.ACTIVE,
      sellerId: creator.id,
    },
  });

  const listing2 = await prisma.listing.upsert({
    where: { id: 'listing-auction-token2' },
    update: {
      price: '0.5',
      reservePrice: '2.0',
      status: ListingStatus.ACTIVE,
    },
    create: {
      id: 'listing-auction-token2',
      tokenPk: token2.id,
      type: ListingType.AUCTION_EN,
      price: '0.5',
      reservePrice: '2.0',
      startTs: new Date(),
      endTs: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      status: ListingStatus.ACTIVE,
      sellerId: creator.id,
    },
  });

  console.log('Created listings:', { listing1: listing1.id, listing2: listing2.id });

  const bundleToken = await prisma.token.upsert({
    where: {
      id: 'bundle-cool-cats-special',
    },
    update: {
      owner: creator.wallet,
    },
    create: {
      id: 'bundle-cool-cats-special',
      collectionId: collection1.id,
      tokenId: 'bundle-special',
      chainId: '1',
      owner: creator.wallet,
      metadataUri: 'ipfs://bundle-token',
      imageUrl: 'https://example.com/bundle.png',
      attributesJson: Prisma.JsonNull,
    },
  });

  const bundleListing = await prisma.listing.upsert({
    where: { id: 'listing-bundle' },
    update: {
      price: '3.5',
      status: ListingStatus.ACTIVE,
    },
    create: {
      id: 'listing-bundle',
      tokenPk: bundleToken.id,
      type: ListingType.BUNDLE,
      price: '3.5',
      startTs: new Date(),
      endTs: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      status: ListingStatus.ACTIVE,
      sellerId: creator.id,
    },
  });

  // Delete existing bundle items and create new ones
  await prisma.bundleItem.deleteMany({});
  
  await prisma.bundleItem.create({
    data: {
      bundleId: bundleListing.id,
      tokenPk: token1.id,
      quantity: 1,
    },
  });
  await prisma.bundleItem.create({
    data: {
      bundleId: bundleListing.id,
      tokenPk: token3.id,
      quantity: 1,
    },
  });

  console.log('Created bundle listing:', { bundleListing: bundleListing.id });

  // Create test AI valuations
  await prisma.aIValuation.upsert({
    where: { tokenPk: token1.id },
    update: {
      fairPrice: '1.8',
      confidence: 0.85,
      featuresJson: {
        rarityScore: 95,
        avgSalePrice: 1.6,
        trend: 'up',
      },
    },
    create: {
      tokenPk: token1.id,
      fairPrice: '1.8',
      confidence: 0.85,
      featuresJson: {
        rarityScore: 95,
        avgSalePrice: 1.6,
        trend: 'up',
      },
    },
  });

  await prisma.aIValuation.upsert({
    where: { tokenPk: token2.id },
    update: {
      fairPrice: '0.7',
      confidence: 0.72,
      featuresJson: {
        rarityScore: 45,
        avgSalePrice: 0.65,
        trend: 'stable',
      },
    },
    create: {
      tokenPk: token2.id,
      fairPrice: '0.7',
      confidence: 0.72,
      featuresJson: {
        rarityScore: 45,
        avgSalePrice: 0.65,
        trend: 'stable',
      },
    },
  });

  console.log('Created AI valuations');

  await prisma.fraudFlag.upsert({
    where: { id: 'fraud-collection-sample' },
    update: {
      flag: 'monitor',
      score: 0.45,
      reason: 'New collection with limited history; monitoring enabled.',
      resolved: false,
    },
    create: {
      id: 'fraud-collection-sample',
      entityType: 'COLLECTION',
      entityId: collection2.id,
      flag: 'monitor',
      score: 0.45,
      reason: 'New collection with limited history; monitoring enabled.',
      resolved: false,
    },
  });

  await prisma.fraudFlag.upsert({
    where: { id: 'fraud-token-sample' },
    update: {
      flag: 'review',
      score: 0.62,
      reason: 'Token metadata incomplete; requires verifier check.',
      resolved: false,
    },
    create: {
      id: 'fraud-token-sample',
      entityType: 'TOKEN',
      entityId: token2.id,
      flag: 'review',
      score: 0.62,
      reason: 'Token metadata incomplete; requires verifier check.',
      resolved: false,
    },
  });

  console.log('Registered AI fraud flag baseline');

  // Create worker cursors
  await prisma.workerCursor.upsert({
    where: { id: 'indexer-1' },
    update: {},
    create: {
      id: 'indexer-1',
      cursor: '18500000',
    },
  });

  await prisma.workerCursor.upsert({
    where: { id: 'indexer-137' },
    update: {},
    create: {
      id: 'indexer-137',
      cursor: '50000000',
    },
  });

  console.log('Created worker cursors');

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
