import Link from 'next/link';

// Force dynamic rendering to ensure server-side execution
export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface Listing {
  id: string;
  tokenPk: string;
  price: string;
  status: string;
  type: string;
  startTs: string;
  endTs: string;
  token?: {
    id: string;
    tokenId: string;
    imageUrl?: string;
    collection?: {
      name: string;
    };
  };
}

async function getListings() {
  try {
    // Use Next.js API route proxy which handles both SSR and client-side
    // In SSR: web container calls localhost:3000/api/graphql -> api:4000/graphql
    // In browser: browser calls localhost:3000/api/graphql -> api:4000/graphql
    const isServer = typeof window === 'undefined';
    const apiUrl = isServer 
      ? 'http://localhost:3000/api/graphql'  // SSR inside web container
      : '/api/graphql';  // Client-side relative URL
    
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `
          query {
            listings {
              id
              tokenPk
              price
              status
              type
              startTs
              endTs
              token {
                id
                tokenId
                imageUrl
                collection {
                  name
                }
              }
            }
          }
        `,
      }),
      cache: 'no-store',
    });

    if (!res.ok) {
      console.error('Failed to fetch listings:', res.status);
      return [];
    }

    const data = await res.json();
    return data.data?.listings || [];
  } catch (error) {
    console.error('Error fetching listings:', error);
    return [];
  }
}

export default async function ListingsPage() {
  const listings = await getListings();

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Marketplace</h1>
        <p className="mt-2 text-slate-400">
          Active NFT listings
        </p>
      </div>

      {listings.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-card/50 p-12 text-center">
          <p className="text-slate-400">No active listings found</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {listings.map((listing: Listing) => (
            <Link
              key={listing.id}
              href={`/listings/${listing.id}`}
              className="group rounded-2xl border border-white/10 bg-card/50 p-4 transition hover:border-white/20 hover:bg-card/70"
            >
              <div className="aspect-square overflow-hidden rounded-xl bg-white/5">
                {listing.token?.imageUrl ? (
                  <img
                    src={listing.token.imageUrl}
                    alt={listing.token.tokenId || 'NFT'}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-slate-500">
                    No Image
                  </div>
                )}
              </div>
              <div className="mt-4">
                <h3 className="font-semibold text-white group-hover:text-primary">
                  Token #{listing.token?.tokenId || listing.tokenPk}
                </h3>
                <p className="text-sm text-slate-400">
                  {listing.token?.collection?.name || 'Unknown Collection'}
                </p>
                <div className="mt-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-500">Price</p>
                    <p className="font-semibold text-white">{listing.price} ETH</p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      listing.type === 'AUCTION_EN' || listing.type === 'AUCTION_DUTCH'
                        ? 'bg-purple-500/20 text-purple-300'
                        : 'bg-green-500/20 text-green-300'
                    }`}
                  >
                    {listing.type}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
