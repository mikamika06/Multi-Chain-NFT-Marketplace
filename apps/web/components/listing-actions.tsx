"use client";

import { useState } from 'react';
import { GraphQLClient } from 'graphql-request';
import { useRouter } from 'next/navigation';
import {
  PLACE_BID_MUTATION,
  BUY_NOW_MUTATION,
  WITHDRAW_OVERBID_MUTATION,
} from '../lib/mutations';

type ListingActionsProps = {
  listingId: string;
  listingType: string;
  currentPrice: string;
  chainId: string;
  bundleItems?: Array<{ tokenPk: string; quantity: number }>;
};

const client = new GraphQLClient(
  '/api/graphql',  // Use Next.js API route proxy
  {
    credentials: 'include',
  },
);

export function ListingActions({
  listingId,
  listingType,
  currentPrice,
  chainId,
  bundleItems = [],
}: ListingActionsProps) {
  const router = useRouter();

  const [bidAmount, setBidAmount] = useState(currentPrice);
  const [bidder, setBidder] = useState('');
  const [buyer, setBuyer] = useState('');
  const [buyAmount, setBuyAmount] = useState(currentPrice);
  const [withdrawBidder, setWithdrawBidder] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const showBidForm = listingType === 'AUCTION_EN';
  const showBuyNowForm =
    listingType === 'FIXED' || listingType === 'AUCTION_DUTCH' || listingType === 'BUNDLE';

  const handleBid = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoadingAction('bid');
    setError(null);
    setMessage(null);

    try {
      await client.request(PLACE_BID_MUTATION, {
        listingId,
        bidder,
        amount: bidAmount,
        chainId,
      });
      setMessage('Bid submitted successfully.');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit bid.');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleBuyNow = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoadingAction('buy');
    setError(null);
    setMessage(null);

    try {
      await client.request(BUY_NOW_MUTATION, {
        listingId,
        buyer,
        amount: buyAmount,
        chainId,
      });
      setMessage('Purchase captured. Listing marked as sold.');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to execute buy now.');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleWithdraw = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoadingAction('withdraw');
    setError(null);
    setMessage(null);

    try {
      await client.request(WITHDRAW_OVERBID_MUTATION, {
        listingId,
        bidder: withdrawBidder,
      });
      setMessage('Overbid withdrawal marked in system.');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to withdraw overbid.');
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <section className="flex flex-col gap-6 rounded-2xl border border-white/10 bg-card/60 p-6">
      <header>
        <h2 className="text-lg font-semibold text-white">Actions</h2>
        <p className="text-sm text-slate-300">
          Submit on-chain intents which the relayer or keeper will execute against the smart
          contracts.
        </p>
        {listingType === 'BUNDLE' && bundleItems.length ? (
          <p className="mt-2 text-xs text-slate-400">
            Bundle contains {bundleItems.length} items. Purchase will transfer every token in the set.
          </p>
        ) : null}
      </header>

      {showBidForm && (
        <form onSubmit={handleBid} className="space-y-3 rounded-xl border border-white/10 bg-card/70 p-4">
          <h3 className="text-sm font-semibold text-white">Place Bid</h3>
          <label className="flex flex-col gap-1 text-xs text-slate-300">
            Bidder (wallet)
            <input
              type="text"
              value={bidder}
              onChange={(event) => setBidder(event.target.value)}
              placeholder="0x..."
              required
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-primary/60"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-slate-300">
            Bid Amount (ETH)
            <input
              type="number"
              min="0"
              step="0.01"
              value={bidAmount}
              onChange={(event) => setBidAmount(event.target.value)}
              required
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-primary/60"
            />
          </label>
          <button
            type="submit"
            disabled={loadingAction === 'bid'}
            className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/80 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loadingAction === 'bid' ? 'Submitting…' : 'Place Bid'}
          </button>
        </form>
      )}

      {showBuyNowForm && (
        <form
          onSubmit={handleBuyNow}
          className="space-y-3 rounded-xl border border-white/10 bg-card/70 p-4"
        >
          <h3 className="text-sm font-semibold text-white">Buy Now</h3>
          <label className="flex flex-col gap-1 text-xs text-slate-300">
            Buyer (wallet)
            <input
              type="text"
              value={buyer}
              onChange={(event) => setBuyer(event.target.value)}
              placeholder="0x..."
              required
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-primary/60"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-slate-300">
            Amount (ETH)
            <input
              type="number"
              min="0"
              step="0.01"
              value={buyAmount}
              onChange={(event) => setBuyAmount(event.target.value)}
              required
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-primary/60"
            />
          </label>
          <button
            type="submit"
            disabled={loadingAction === 'buy'}
            className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/80 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loadingAction === 'buy' ? 'Processing…' : 'Buy Now'}
          </button>
        </form>
      )}

      <form
        onSubmit={handleWithdraw}
        className="space-y-3 rounded-xl border border-white/10 bg-card/70 p-4"
      >
        <h3 className="text-sm font-semibold text-white">Withdraw Overbid</h3>
        <p className="text-xs text-slate-400">
          Mark overbid funds as withdrawn for a bidder. Use after refunds have been processed.
        </p>
        <label className="flex flex-col gap-1 text-xs text-slate-300">
          Bidder (wallet)
          <input
            type="text"
            value={withdrawBidder}
            onChange={(event) => setWithdrawBidder(event.target.value)}
            placeholder="0x..."
            required
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-primary/60"
          />
        </label>
        <button
          type="submit"
          disabled={loadingAction === 'withdraw'}
          className="inline-flex items-center justify-center rounded-lg border border-white/20 px-4 py-2 text-sm font-semibold text-white transition hover:border-white/40 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loadingAction === 'withdraw' ? 'Updating…' : 'Mark withdrawn'}
        </button>
      </form>

      {error ? (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-100">
          {error}
        </div>
      ) : null}

      {message ? (
        <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-100">
          {message}
        </div>
      ) : null}
    </section>
  );
}
