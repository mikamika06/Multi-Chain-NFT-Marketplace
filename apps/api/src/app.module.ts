import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { join } from 'node:path';
import { PrismaModule } from './common/database/prisma.module';
import { PubSubModule } from './common/pubsub/pubsub.module';
import { AuthModule } from './modules/auth/auth.module';
import { CollectionsModule } from './modules/collections/collections.module';
import { TokensModule } from './modules/tokens/tokens.module';
import { ListingsModule } from './modules/listings/listings.module';
import { BidsModule } from './modules/bids/bids.module';
import { SalesModule } from './modules/sales/sales.module';
import { BridgeModule } from './modules/bridge/bridge.module';
import { ValuationModule } from './modules/valuation/valuation.module';
import { IndexerModule } from './modules/indexer/indexer.module';
import { SimilarityModule } from './modules/similarity/similarity.module';
import { FraudModule } from './modules/fraud/fraud.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'schema.gql'),
      sortSchema: false,
      subscriptions: {
        'graphql-ws': true,
      },
      playground: process.env.NODE_ENV !== 'production',
      context: ({ req, res }) => ({ req, res }),
      debug: process.env.NODE_ENV !== 'production',
      includeStacktraceInErrorResponses: process.env.NODE_ENV !== 'production',
      cache: 'bounded',
      persistedQueries: false,
    }),
    PrismaModule,
    PubSubModule,
    AuthModule,
    CollectionsModule,
    TokensModule,
    ListingsModule,
    BidsModule,
    SalesModule,
    BridgeModule,
    ValuationModule,
    SimilarityModule,
    FraudModule,
    IndexerModule,
  ],
})
export class AppModule {}
