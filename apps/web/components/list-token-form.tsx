"use client";

import { useEffect, useState } from 'react';
import { GraphQLClient } from 'graphql-request';
import { useRouter } from 'next/navigation';
import {
  CREATE_FIXED_LISTING_MUTATION,
  CREATE_ENGLISH_AUCTION_MUTATION,
  CREATE_DUTCH_AUCTION_MUTATION,
} from '../lib/mutations';

type ListTokenFormProps = {
  tokenPk: string;
};

const listingOptions = [
  { label: 'Fixed Price', value: 'FIXED' },
  { label: 'English Auction', value: 'AUCTION_EN' },
  { label: 'Dutch Auction', value: 'AUCTION_DUTCH' },
];

const client = new GraphQLClient(
  '/api/graphql',  // Use Next.js API route proxy
  {
    credentials: 'include',
  },
);

export function ListTokenForm({ tokenPk }: ListTokenFormProps) {
  const router = useRouter();
  const [listingType, setListingType] = useState('FIXED');
  const [price, setPrice] = useState('1.0');
  const [durationHours, setDurationHours] = useState(168);
  const [reservePrice, setReservePrice] = useState('');
  const [dutchEndPrice, setDutchEndPrice] = useState('0.5');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (listingType === 'AUCTION_DUTCH') {
      setReservePrice('');
    }
  }, [listingType]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const start = new Date();
      const end = new Date(start.getTime() + durationHours * 60 * 60 * 1000);

      if (listingType === 'FIXED') {
        await client.request(CREATE_FIXED_LISTING_MUTATION, {
          tokenPk,
          price,
          startTs: start.toISOString(),
          endTs: end.toISOString(),
          reservePrice: reservePrice || null,
        });
      } else if (listingType === 'AUCTION_EN') {
        await client.request(CREATE_ENGLISH_AUCTION_MUTATION, {
          tokenPk,
          startPrice: price,
          reservePrice: reservePrice || null,
          startTs: start.toISOString(),
          endTs: end.toISOString(),
        });
      } else if (listingType === 'AUCTION_DUTCH') {
        await client.request(CREATE_DUTCH_AUCTION_MUTATION, {
          tokenPk,
          startPrice: price,
          endPrice: dutchEndPrice,
          startTs: start.toISOString(),
          endTs: end.toISOString(),
        });
      }

      setSuccessMessage('Listing created successfully.');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create listing.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="rounded-2xl border border-white/10 bg-card/60 p-6">
      <h2 className="text-lg font-semibold text-white">Create Listing</h2>
      <p className="mt-1 text-sm text-slate-400">
        Schedule a fixed sale or auction for this token. All values are denominated in ETH.
      </p>

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-slate-200" htmlFor="listingType">
            Listing Type
          </label>
          <select
            id="listingType"
            value={listingType}
            onChange={(event) => setListingType(event.target.value)}
            className="rounded-lg border border-white/10 bg-card/80 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-primary/60"
          >
            {listingOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-slate-200" htmlFor="price">
            {listingType === 'FIXED' ? 'Price (ETH)' : 'Start Price (ETH)'}
          </label>
          <input
            id="price"
            type="number"
            min="0"
            step="0.01"
            value={price}
            onChange={(event) => setPrice(event.target.value)}
            className="rounded-lg border border-white/10 bg-card/80 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-primary/60"
            required
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-slate-200" htmlFor="duration">
            Duration (hours)
          </label>
          <input
            id="duration"
            type="number"
            min="1"
            step="1"
            value={durationHours}
            onChange={(event) => setDurationHours(Number(event.target.value))}
            className="rounded-lg border border-white/10 bg-card/80 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-primary/60"
            required
          />
        </div>

        {listingType === 'AUCTION_DUTCH' ? (
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-slate-200" htmlFor="endPrice">
              End Price (ETH)
            </label>
            <input
              id="endPrice"
              type="number"
              min="0"
              step="0.01"
              value={dutchEndPrice}
              onChange={(event) => setDutchEndPrice(event.target.value)}
              className="rounded-lg border border-white/10 bg-card/80 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-primary/60"
              required
            />
          </div>
        ) : null}

        {listingType !== 'AUCTION_DUTCH' ? (
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-slate-200" htmlFor="reservePrice">
              {listingType === 'AUCTION_EN' ? 'Reserve Price (optional)' : 'Reserve Price (optional)'}
            </label>
            <input
              id="reservePrice"
              type="number"
              min="0"
              step="0.01"
              value={reservePrice}
              onChange={(event) => setReservePrice(event.target.value)}
              className="rounded-lg border border-white/10 bg-card/80 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-primary/60"
              disabled={listingType === 'AUCTION_DUTCH'}
            />
          </div>
        ) : null}

        {error ? (
          <div className="rounded-lg border border-red-400/40 bg-red-500/10 px-3 py-2 text-sm text-red-100">
            {error}
          </div>
        ) : null}

        {successMessage ? (
          <div className="rounded-lg border border-emerald-400/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
            {successMessage}
          </div>
        ) : null}

        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/80 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={submitting}
        >
          {submitting ? 'Creating…' : 'Create listing'}
        </button>
      </form>
    </section>
  );
}
