import Link from 'next/link';
import { client, COLLECTIONS_QUERY } from '../../lib/api';

type Collection = {
  id: string;
  name: string;
  slug: string;
  chainId: string;
  verified: boolean;
  royaltyBps: number;
  creatorWallet: string;
};

type CollectionsResponse = {
  collections: Collection[];
};

export const revalidate = 30;

async function getCollections(): Promise<Collection[]> {
  const { collections } = await client.request<CollectionsResponse>(COLLECTIONS_QUERY);
  return collections;
}

const chainLabels: Record<string, string> = {
  '1': 'Ethereum',
  '137': 'Polygon',
  '42161': 'Arbitrum',
  solana: 'Solana',
};

export default async function CollectionsPage() {
  const collections = await getCollections();

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-12">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-white">Collections</h1>
        <p className="text-sm text-slate-300">
          Cross-chain galleries published by verified creators with enforced royalties.
        </p>
      </header>

      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {collections.map((collection) => (
          <article
            key={collection.id}
            className="flex flex-col justify-between rounded-2xl border border-white/10 bg-card/70 p-6 shadow"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs uppercase tracking-wide text-slate-400">
                <span>{chainLabels[collection.chainId] ?? collection.chainId}</span>
                {collection.verified ? (
                  <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-emerald-300">
                    Verified
                  </span>
                ) : (
                  <span className="rounded-full bg-yellow-500/10 px-3 py-1 text-yellow-300">
                    Pending
                  </span>
                )}
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">{collection.name}</h2>
                <p className="mt-1 text-xs text-slate-400">Slug: {collection.slug}</p>
              </div>
              <div className="text-sm text-slate-300">
                Royalty: {(collection.royaltyBps / 100).toFixed(2)}% <br />
                Creator: {collection.creatorWallet}
              </div>
            </div>
            <Link
              href={`/collections/${collection.id}`}
              className="mt-6 inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/80"
            >
              View tokens
            </Link>
          </article>
        ))}
      </section>

      {!collections.length && (
        <div className="rounded-2xl border border-white/10 bg-card/60 p-6 text-center text-sm text-slate-300">
          No collections yet. Seed the database or connect the indexers to see live data.
        </div>
      )}
    </div>
  );
}
