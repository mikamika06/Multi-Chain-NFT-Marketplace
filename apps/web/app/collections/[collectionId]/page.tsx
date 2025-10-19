import Link from 'next/link';
import {
  client,
  COLLECTIONS_QUERY,
  TOKENS_BY_COLLECTION_QUERY,
} from '../../../lib/api';

type Collection = {
  id: string;
  name: string;
  slug: string;
  chainId: string;
};

type CollectionsResponse = {
  collections: Collection[];
};

type Token = {
  id: string;
  tokenId: string;
  imageUrl: string;
  metadataUri: string;
  owner: string;
};

type TokensResponse = {
  tokens: Token[];
};

type PageProps = {
  params: {
    collectionId: string;
  };
};

export const revalidate = 30;

async function getCollection(collectionId: string): Promise<Collection | undefined> {
  const { collections } = await client.request<CollectionsResponse>(COLLECTIONS_QUERY);
  return collections.find((collection) => collection.id === collectionId);
}

async function getTokens(collectionId: string): Promise<Token[]> {
  const { tokens } = await client.request<TokensResponse>(TOKENS_BY_COLLECTION_QUERY, {
    collectionId,
  });
  return tokens;
}

export default async function CollectionDetailPage({ params }: PageProps) {
  const collection = await getCollection(params.collectionId);
  const tokens = await getTokens(params.collectionId);

  if (!collection) {
    return (
      <div className="mx-auto flex max-w-4xl flex-col gap-6 px-6 py-12">
        <Link href="/collections" className="text-sm text-primary hover:underline">
          ← Back to collections
        </Link>
        <div className="rounded-2xl border border-white/10 bg-card/70 p-10 text-center text-slate-300">
          Collection not found. It might have been removed or the indexer has not synced yet.
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-12">
      <Link href="/collections" className="text-sm text-primary hover:underline">
        ← Back to collections
      </Link>

      <header className="space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-semibold text-white">{collection.name}</h1>
          <span className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-wide text-slate-300">
            Chain {collection.chainId}
          </span>
        </div>
        <p className="text-sm text-slate-300">
          Tokens minted in collection <code className="text-slate-200">{collection.slug}</code>.
          View individual listings to buy, bid, or bridge across chains.
        </p>
      </header>

      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {tokens.map((token) => (
          <article
            key={token.id}
            className="flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-card/60"
          >
            <div className="h-48 w-full bg-white/5">
              {token.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={token.imageUrl}
                  alt={`Token ${token.tokenId}`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">
                  No preview
                </div>
              )}
            </div>
            <div className="flex flex-1 flex-col justify-between p-4">
              <div className="space-y-2">
                <h2 className="text-lg font-semibold text-white">Token #{token.tokenId}</h2>
                <p className="text-xs text-slate-400 break-all">Owner: {token.owner}</p>
              </div>
              <Link
                href={`/tokens/${token.id}`}
                className="mt-4 inline-flex items-center justify-center rounded-lg border border-white/10 px-3 py-2 text-sm font-semibold text-white transition hover:border-white/30"
              >
                Explore listings
              </Link>
            </div>
          </article>
        ))}
      </section>

      {!tokens.length && (
        <div className="rounded-2xl border border-white/10 bg-card/60 p-6 text-center text-sm text-slate-300">
          No tokens indexed for this collection yet. Mint assets or wait for the indexer to sync.
        </div>
      )}
    </div>
  );
}
