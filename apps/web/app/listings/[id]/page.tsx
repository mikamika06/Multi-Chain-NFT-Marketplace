import Link from 'next/link';
import { client, LISTING_QUERY } from '../../../lib/api';
import { ListingActions } from '../../../components/listing-actions';

type ListingQueryResponse = {
  listing: {
    id: string;
    type: string;
    price: string;
    startPrice?: string | null;
    endPrice?: string | null;
    status: string;
    startTs: string;
    endTs: string;
    reservePrice?: string | null;
    bundleItems?: Array<{
      tokenPk: string;
      quantity: number;
      token?: {
        id: string;
        tokenId: string;
        imageUrl: string;
        owner: string;
      } | null;
    }> | null;
    token?: {
      id: string;
      tokenId: string;
      imageUrl: string;
      metadataUri: string;
      owner: string;
      collection?: {
        id: string;
        name: string;
        chainId: string;
      } | null;
    } | null;
  } | null;
  bids: Array<{
    id: string;
    bidder: string;
    amount: string;
    chainId: string;
    createdAt: string;
  }>;
  recentSales: Array<{
    id: string;
    tokenPk: string;
    price: string;
    ts: string;
    buyer: string;
    chainId: string;
  }>;
};

type PageProps = {
  params: {
    id: string;
  };
};

export const revalidate = 15;

async function getListing(id: string) {
  const data = await client.request<ListingQueryResponse>(LISTING_QUERY, { id });
  return data;
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

export default async function ListingPage({ params }: PageProps) {
  const { listing, bids, recentSales } = await getListing(params.id);

  if (!listing) {
    return (
      <div className="mx-auto flex max-w-4xl flex-col gap-6 px-6 py-12">
        <Link href="/collections" className="text-sm text-primary hover:underline">
          ← Back to collections
        </Link>
        <div className="rounded-2xl border border-white/10 bg-card/70 p-10 text-center text-slate-300">
          Listing not found. It might have expired or the indexer has not synced it yet.
        </div>
      </div>
    );
  }

  const token = listing.token;
  const isEnglishAuction = listing.type === 'AUCTION_EN';
  const isDutchAuction = listing.type === 'AUCTION_DUTCH';
  const isBundle = listing.type === 'BUNDLE';
  const displayPrice = listing.price;
  const startPrice = listing.startPrice ?? listing.price;
  const endPrice = listing.endPrice ?? listing.price;
  const bundleItems = listing.bundleItems ?? [];

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-12 px-6 py-12">
      <Link href={`/tokens/${token?.id ?? ''}`} className="text-sm text-primary hover:underline">
        ← Back to token
      </Link>

      <div className="grid gap-10 lg:grid-cols-[320px,1fr]">
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-card/60">
          {token?.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={token.imageUrl} alt={`Token ${token.tokenId}`} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-80 items-center justify-center text-sm text-slate-400">
              No preview available
            </div>
          )}
        </div>

        <div className="space-y-5">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wide text-slate-500">{listing.type}</p>
            <h1 className="text-3xl font-semibold text-white">
              {token?.collection?.name ?? 'Unknown Collection'} · Token #{token?.tokenId ?? '—'}
            </h1>
            <p className="text-sm text-slate-300">
              Current price <span className="text-white">{displayPrice} ETH</span>
            </p>
            {(isEnglishAuction || isDutchAuction) && (
              <p className="text-xs text-slate-400">
                Start price: {startPrice} ETH
                {isDutchAuction ? ` · End price: ${endPrice} ETH` : ''}
              </p>
            )}
            {listing.reservePrice ? (
              <p className="text-xs text-slate-400">Reserve price: {listing.reservePrice} ETH</p>
            ) : null}
            <p className="text-xs text-slate-400">Status: {listing.status}</p>
            <p className="text-xs text-slate-400">
              Ends {formatDate(listing.endTs)} · Started {formatDate(listing.startTs)}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-card/60 p-5 text-sm text-slate-200">
            <p>
              Owner:{' '}
              <span className="font-mono text-slate-300">
                {token?.owner ?? 'Unknown'}
              </span>
            </p>
            <p className="mt-2 text-xs text-slate-400">
              Metadata:{' '}
              {token?.metadataUri ? (
                <a href={token.metadataUri} className="text-primary hover:underline">
                  {token.metadataUri}
                </a>
              ) : (
                'Not available'
              )}
            </p>
          </div>
        </div>
      </div>

      {isBundle && bundleItems.length ? (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-white">Bundle Contents</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {bundleItems.map((item) => (
              <div
                key={item.tokenPk}
                className="rounded-2xl border border-white/10 bg-card/60 p-4 text-sm text-slate-200"
              >
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  Quantity {item.quantity}
                </p>
                <p className="text-white">Token {item.token?.tokenId ?? '—'}</p>
                <p className="text-xs text-slate-400">Owner {item.token?.owner ?? '—'}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white">Live Bids</h2>
          <div className="space-y-3">
            {bids.map((bid) => (
              <div
                key={bid.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-card/60 px-4 py-3 text-sm text-slate-200"
              >
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400">
                    {bid.chainId}
                  </p>
                  <p className="text-white">{bid.amount} ETH</p>
                  <p className="text-xs text-slate-400">Bidder {bid.bidder}</p>
                </div>
                <p className="text-xs text-slate-400">{formatDate(bid.createdAt)}</p>
              </div>
            ))}
          </div>
          {!bids.length && (
            <div className="rounded-2xl border border-white/10 bg-card/60 p-6 text-center text-sm text-slate-300">
              No bids yet. Place the first bid to start the auction.
            </div>
          )}
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white">Recent Sales</h2>
          <div className="space-y-3">
            {recentSales.map((sale) => (
              <div
                key={sale.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-card/60 px-4 py-3 text-sm text-slate-200"
              >
                <div>
                  <p className="text-white">{sale.price} ETH</p>
                  <p className="text-xs text-slate-400">Buyer {sale.buyer}</p>
                </div>
                <p className="text-xs text-slate-400">{formatDate(sale.ts)}</p>
              </div>
            ))}
          </div>
          {!recentSales.length && (
            <div className="rounded-2xl border border-white/10 bg-card/60 p-6 text-center text-sm text-slate-300">
              No historical sales recorded for this asset so far.
            </div>
          )}
        </div>
      </section>

      <ListingActions
        listingId={listing.id}
        listingType={listing.type}
        currentPrice={listing.price}
        chainId={token?.collection?.chainId ?? '1'}
        bundleItems={bundleItems}
      />
    </div>
  );
}
