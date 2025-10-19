import Link from 'next/link';
import {
  client,
  TOKEN_QUERY,
  TOKEN_VALUATION_QUERY,
  LISTINGS_QUERY,
  SIMILAR_TOKENS_QUERY,
  FRAUD_FLAGS_QUERY,
} from '../../../lib/api';
import { ListTokenForm } from '../../../components/list-token-form';
import { RequestValuationButton } from '../../../components/request-valuation-button';
import { RequestFraudScoreButton } from '../../../components/request-fraud-score-button';
import { BundleComposer } from '../../../components/bundle-composer';

type TokenResponse = {
  token: {
    id: string;
    tokenId: string;
    imageUrl: string;
    metadataUri: string;
    attributesJson: string;
    owner: string;
    chainId: string;
    collection?: {
      id: string;
      name: string;
      slug: string;
      chainId: string;
    } | null;
  } | null;
};

type ValuationResponse = {
  valuation: {
    tokenPk: string;
    fairPrice: string;
    confidence: number;
    updatedAt: string;
    modelVersion: string;
    features: string | null;
    expiresAt: string | null;
  } | null;
};

type SimilarTokensResponse = {
  similarTokens: Array<{
    tokenPk: string;
    score: number;
    token?: {
      id: string;
      tokenId: string;
      imageUrl: string;
      collection?: {
        id: string;
        name: string;
        chainId: string;
      } | null;
    } | null;
  }>;
};

type FraudFlagsResponse = {
  fraudFlags: Array<{
    id: string;
    flag: string;
    score: number;
    reason: string;
    createdAt: string;
    entityId: string;
    entityType: string;
  }>;
};

type ListingsResponse = {
  listings: Array<{
    id: string;
    tokenPk: string;
    type: string;
    price: string;
    startPrice?: string | null;
    endPrice?: string | null;
    status: string;
    startTs: string;
    endTs: string;
    bundleItems?: Array<{ tokenPk: string; quantity: number }> | null;
  }>;
};

type PageProps = {
  params: {
    tokenId: string;
  };
};

export const revalidate = 30;

async function getToken(tokenId: string) {
  const { token } = await client.request<TokenResponse>(TOKEN_QUERY, { id: tokenId });
  return token;
}

async function getValuation(tokenPk: string) {
  const { valuation } = await client.request<ValuationResponse>(TOKEN_VALUATION_QUERY, {
    tokenPk,
  });
  return valuation;
}

async function getListingsForToken(tokenPk: string) {
  const { listings } = await client.request<ListingsResponse>(LISTINGS_QUERY);
  return listings.filter((listing) => listing.tokenPk === tokenPk);
}

async function getSimilarTokens(tokenPk: string) {
  try {
    const { similarTokens } = await client.request<SimilarTokensResponse>(SIMILAR_TOKENS_QUERY, {
      tokenPk,
      topK: 6,
    });
    return similarTokens;
  } catch (error) {
    console.warn('Failed to fetch similar tokens', error);
    return [] as SimilarTokensResponse['similarTokens'];
  }
}

async function getFraudFlags(tokenPk: string) {
  try {
    const { fraudFlags } = await client.request<FraudFlagsResponse>(FRAUD_FLAGS_QUERY, {
      entityId: tokenPk,
      entityType: 'TOKEN',
    });
    return fraudFlags.sort((a, b) => b.score - a.score);
  } catch (error) {
    console.warn('Failed to fetch fraud flags', error);
    return [] as FraudFlagsResponse['fraudFlags'];
  }
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

const parseFeatureEntries = (raw: string | null | undefined) => {
  if (!raw || raw === '{}' || raw === 'null') {
    return [] as Array<[string, number]>;
  }

  try {
    const parsed = JSON.parse(raw) as Record<string, number>;
    return Object.entries(parsed);
  } catch (error) {
    console.warn('Unable to parse valuation features', error);
    return [] as Array<[string, number]>;
  }
};

export default async function TokenDetailPage({ params }: PageProps) {
  const token = await getToken(params.tokenId);

  if (!token) {
    return (
      <div className="mx-auto flex max-w-4xl flex-col gap-6 px-6 py-12">
        <Link href="/collections" className="text-sm text-primary hover:underline">
          ← Back to collections
        </Link>
        <div className="rounded-2xl border border-white/10 bg-card/70 p-10 text-center text-slate-300">
          Token not found. It may not be indexed yet or the identifier is invalid.
        </div>
      </div>
    );
  }

  const [valuation, listings, similarTokens, fraudFlags] = await Promise.all([
    getValuation(token.id),
    getListingsForToken(token.id),
    getSimilarTokens(token.id),
    getFraudFlags(token.id),
  ]);

  const attributes =
    token.attributesJson && token.attributesJson !== '{}'
      ? Object.entries(JSON.parse(token.attributesJson) as Record<string, string>)
      : [];

  const featureEntries = parseFeatureEntries(valuation?.features ?? null);
  const primaryFraudFlag = fraudFlags[0];
  const suggestedPrice = listings.length
    ? Number.parseFloat(listings[0].price)
    : valuation
      ? Number.parseFloat(valuation.fairPrice)
      : undefined;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-10 px-6 py-12">
      <Link
        href={`/collections/${token.collection?.id ?? ''}`}
        className="text-sm text-primary hover:underline"
      >
        ← Back to collection
      </Link>

      <div className="grid gap-8 lg:grid-cols-[320px,1fr]">
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-card/60">
          {token.imageUrl ? (
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
            <h1 className="text-3xl font-semibold text-white">
              {token.collection?.name ?? 'Unknown Collection'} · #{token.tokenId}
            </h1>
            <p className="text-sm text-slate-400">
              Owner: <span className="font-mono text-slate-300">{token.owner}</span>
            </p>
            <p className="text-xs text-slate-500">
              Metadata: <a href={token.metadataUri} className="text-primary hover:underline">{token.metadataUri}</a>
            </p>
          </div>

          <div className="space-y-3">
            {valuation ? (
              <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4 text-sm text-emerald-100">
                <p className="text-lg font-semibold text-emerald-200">
                  AI Fair Price · {valuation.fairPrice} ETH
                </p>
                <p className="mt-1 text-emerald-200/80">
                  Confidence {Math.round(valuation.confidence * 100)}%
                </p>
                <p className="mt-1 text-xs text-emerald-200/70">
                  Model {valuation.modelVersion}
                </p>
                <p className="mt-2 text-xs text-emerald-200/60">
                  Updated {formatDate(valuation.updatedAt)} · Cache{' '}
                  {valuation.expiresAt ? `valid until ${formatDate(valuation.expiresAt)}` : 'pending refresh'}
                </p>
                {featureEntries.length ? (
                  <div className="mt-3 grid grid-cols-1 gap-2 text-xs md:grid-cols-2">
                    {featureEntries.map(([name, value]) => (
                      <div
                        key={name}
                        className="rounded-lg border border-emerald-400/20 bg-emerald-500/5 px-3 py-2 text-emerald-200"
                      >
                        <p className="uppercase tracking-wide text-emerald-300/70">{name}</p>
                        <p className="text-sm font-semibold text-emerald-100">
                          {typeof value === 'number' ? value.toFixed(3) : value}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="rounded-2xl border border-white/10 bg-card/60 p-4 text-sm text-slate-300">
                AI valuation is not available for this token yet.
              </div>
            )}

            <RequestValuationButton tokenPk={token.id} />
          </div>

          {attributes.length ? (
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
                Attributes
              </h2>
              <div className="mt-3 grid grid-cols-1 gap-2 text-sm text-slate-200 md:grid-cols-2">
                {attributes.map(([key, value]) => (
                  <div key={key} className="rounded-lg border border-white/10 bg-card/60 px-3 py-2">
                    <p className="text-xs uppercase text-slate-400">{key}</p>
                    <p className="font-medium">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-white">Similar NFTs</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {similarTokens.map((item) => (
            <Link
              key={`${item.tokenPk}-${item.score}`}
              href={`/tokens/${item.tokenPk}`}
              className="group overflow-hidden rounded-2xl border border-white/10 bg-card/60 shadow transition hover:border-primary/60"
            >
              <div className="h-40 w-full bg-black/20">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {item.token?.imageUrl ? (
                  <img
                    src={item.token.imageUrl}
                    alt={`Token ${item.token.tokenId}`}
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-slate-400">
                    Preview unavailable
                  </div>
                )}
              </div>
              <div className="space-y-2 p-4 text-sm text-slate-200">
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  Score {(item.score * 100).toFixed(1)}%
                </p>
                <p className="font-semibold text-white">
                  {item.token?.collection?.name ?? 'Unknown Collection'} · #{item.token?.tokenId ?? '—'}
                </p>
              </div>
            </Link>
          ))}
        </div>
        {!similarTokens.length && (
          <div className="rounded-2xl border border-white/10 bg-card/60 p-6 text-center text-sm text-slate-300">
            No similar NFTs available yet. Run a valuation refresh to warm the cache.
          </div>
        )}
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="space-y-3 rounded-2xl border border-white/10 bg-card/60 p-4 text-sm text-slate-200">
          <h2 className="text-lg font-semibold text-white">Fraud Monitoring</h2>
          {primaryFraudFlag ? (
            <div
              className={`rounded-xl border px-4 py-3 text-sm ${
                primaryFraudFlag.flag === 'block'
                  ? 'border-red-500/40 bg-red-500/10 text-red-200'
                  : primaryFraudFlag.flag === 'review'
                    ? 'border-yellow-500/40 bg-yellow-500/10 text-yellow-100'
                    : 'border-emerald-400/30 bg-emerald-500/10 text-emerald-100'
              }`}
            >
              <p className="text-xs uppercase tracking-wide">{primaryFraudFlag.flag}</p>
              <p className="text-base font-semibold">
                Risk score {(primaryFraudFlag.score * 100).toFixed(1)}%
              </p>
              <p className="mt-1 text-xs opacity-80">{primaryFraudFlag.reason}</p>
              <p className="mt-2 text-[10px] opacity-60">
                Recorded {formatDate(primaryFraudFlag.createdAt)}
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-white/10 bg-card/50 p-4 text-xs text-slate-300">
              No open fraud flags. Keep monitoring when listings or metadata change.
            </div>
          )}
        </div>
        <RequestFraudScoreButton
          entityId={token.id}
          entityType="TOKEN"
          suggestedPrice={suggestedPrice}
          suspiciousMetadata={!token.imageUrl}
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-white">Active Listings</h2>
        <div className="space-y-3">
          {listings.map((listing) => (
            <div
              key={listing.id}
              className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-card/60 px-5 py-4 text-sm text-slate-200"
            >
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">{listing.type}</p>
                <p className="text-white">{listing.price} ETH</p>
                <p className="text-xs text-slate-400">
                  Ends {formatDate(listing.endTs)} · Status {listing.status}
                </p>
              </div>
              <Link
                href={`/listings/${listing.id}`}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/80"
              >
                View listing
              </Link>
            </div>
          ))}
        </div>
        {!listings.length && (
          <div className="rounded-2xl border border-white/10 bg-card/60 p-6 text-center text-sm text-slate-300">
            No live listings for this token. Create a listing from the creator dashboard or wait for
            indexers to ingest activity.
          </div>
        )}
      </section>

      <ListTokenForm tokenPk={token.id} />
      <BundleComposer bundleTokenPk={token.id} />
    </div>
  );
}
