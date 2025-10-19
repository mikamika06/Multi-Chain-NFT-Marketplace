import { DASHBOARD_QUERY, client } from '../../lib/api';

type DashboardData = {
  collections: Array<{
    id: string;
    name: string;
    chainId: string;
    royaltyBps: number;
    verified: boolean;
  }>;
  listings: Array<{
    id: string;
    type: string;
    price: string;
    status: string;
    token?: {
      id: string;
      imageUrl: string;
      collection?: { name: string | null } | null;
    } | null;
  }>;
  recentSales: Array<{
    id: string;
    price: string;
    ts: string;
    buyer: string;
    chainId: string;
    token?: {
      imageUrl: string | null;
      collection?: { name: string | null } | null;
    } | null;
  }>;
};

export const revalidate = 15;

async function getDashboardData(): Promise<DashboardData> {
  try {
    return await client.request<DashboardData>(DASHBOARD_QUERY);
  } catch (error) {
    console.warn('Failed to fetch dashboard data, falling back to placeholders', error);
    return {
      collections: [],
      listings: [],
      recentSales: [],
    };
  }
}

export default async function DashboardPage() {
  const data = await getDashboardData();

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-12 px-6 py-10">
      <header>
        <h1 className="text-3xl font-semibold text-white">Live Marketplace Dashboard</h1>
        <p className="mt-2 text-sm text-slate-300">
          Snapshot across chains with auction status, royalty enforcement, and bridge KPIs.
        </p>
      </header>

      <section className="grid gap-6 md:grid-cols-3">
        {data.collections.map((collection) => (
          <article
            key={collection.id}
            className="rounded-2xl border border-white/10 bg-card/70 p-5 shadow-lg"
          >
            <div className="flex items-center justify-between text-xs uppercase tracking-wide text-slate-400">
              <span>{collection.chainId}</span>
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
            <h2 className="mt-3 text-lg font-semibold text-white">{collection.name}</h2>
            <p className="mt-2 text-sm text-slate-400">
              Royalty: {(collection.royaltyBps / 100).toFixed(2)}%
            </p>
          </article>
        ))}
      </section>

      <section>
        <h2 className="text-xl font-semibold text-white">Active Listings</h2>
        <div className="mt-4 grid gap-5 md:grid-cols-2">
          {data.listings.map((listing) => (
            <article
              key={listing.id}
              className="flex gap-4 rounded-2xl border border-white/10 bg-card/60 p-4"
            >
              <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl bg-white/5">
                {listing.token?.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={listing.token.imageUrl}
                    alt={listing.token.collection?.name ?? 'NFT artwork'}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">
                    No image
                  </div>
                )}
              </div>
              <div className="flex flex-col justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400">{listing.type}</p>
                  <h3 className="text-lg font-semibold text-white">
                    {listing.token?.collection?.name ?? 'Unknown Collection'}
                  </h3>
                </div>
                <div className="flex items-center justify-between text-sm text-slate-300">
                  <span>Status: {listing.status}</span>
                  <span className="font-semibold text-white">{listing.price} ETH</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-white">Recent Sales</h2>
        <div className="mt-4 space-y-4">
          {data.recentSales.map((sale) => (
            <div
              key={sale.id}
              className="flex items-center justify-between rounded-2xl border border-white/10 bg-card/50 px-5 py-3 text-sm text-slate-300"
            >
              <div>
                <p className="text-white">{sale.token?.collection?.name ?? 'Uncatalogued NFT'}</p>
                <p className="text-xs text-slate-400">
                  Buyer {sale.buyer} · {new Date(sale.ts).toLocaleString()}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-white">{sale.price} ETH</p>
                <p className="text-xs uppercase tracking-wide text-slate-400">{sale.chainId}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
