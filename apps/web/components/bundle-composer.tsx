"use client";

import { useState } from 'react';
import { GraphQLClient } from 'graphql-request';
import { useRouter } from 'next/navigation';
import { CREATE_BUNDLE_LISTING_MUTATION } from '../lib/mutations';

type BundleItemDraft = {
  tokenPk: string;
  quantity: number;
};

type BundleComposerProps = {
  bundleTokenPk: string;
};

const graphqlClient = new GraphQLClient(
  '/api/graphql',  // Use Next.js API route proxy
);

export function BundleComposer({ bundleTokenPk }: BundleComposerProps) {
  const router = useRouter();
  const [price, setPrice] = useState('1.5');
  const [durationHours, setDurationHours] = useState(168);
  const [items, setItems] = useState<BundleItemDraft[]>([{ tokenPk: '', quantity: 1 }]);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleItemChange = (index: number, field: keyof BundleItemDraft, value: string) => {
    setItems((prev) => {
      const clone = [...prev];
      clone[index] = {
        ...clone[index],
        [field]: field === 'quantity' ? Number(value) : value,
      } as BundleItemDraft;
      return clone;
    });
  };

  const addItem = () => {
    setItems((prev) => [...prev, { tokenPk: '', quantity: 1 }]);
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);
    setError(null);

    try {
      const start = new Date();
      const end = new Date(start.getTime() + durationHours * 60 * 60 * 1000);

      await graphqlClient.request(CREATE_BUNDLE_LISTING_MUTATION, {
        bundleTokenPk,
        price,
        startTs: start.toISOString(),
        endTs: end.toISOString(),
        items: items.map((item) => ({ tokenPk: item.tokenPk, quantity: item.quantity })),
      });

      setMessage('Bundle listing created. Await keeper execution.');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create bundle listing.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="rounded-2xl border border-white/10 bg-card/60 p-6">
      <h2 className="text-lg font-semibold text-white">Bundle Composer</h2>
      <p className="mt-1 text-sm text-slate-300">
        Group multiple tokens into a single escrowed listing. A relayer will mint or release the
        bundle token to the buyer once the sale is settled on-chain.
      </p>

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-slate-200" htmlFor="bundlePrice">
            Bundle Price (ETH)
          </label>
          <input
            id="bundlePrice"
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
          <label className="text-sm font-semibold text-slate-200" htmlFor="bundleDuration">
            Duration (hours)
          </label>
          <input
            id="bundleDuration"
            type="number"
            min="1"
            step="1"
            value={durationHours}
            onChange={(event) => setDurationHours(Number(event.target.value))}
            className="rounded-lg border border-white/10 bg-card/80 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-primary/60"
            required
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Bundle Items</h3>
            <button
              type="button"
              onClick={addItem}
              className="rounded-lg border border-primary/50 px-3 py-1 text-xs font-medium text-primary transition hover:bg-primary/10"
            >
              Add token
            </button>
          </div>

          <div className="space-y-3">
            {items.map((item, index) => (
              <div
                key={`${item.tokenPk}-${index}`}
                className="grid gap-3 rounded-xl border border-white/10 bg-card/70 p-4 md:grid-cols-[1fr,120px,40px]"
              >
                <label className="flex flex-col gap-1 text-xs text-slate-300">
                  Token primary key
                  <input
                    type="text"
                    value={item.tokenPk}
                    onChange={(event) => handleItemChange(index, 'tokenPk', event.target.value)}
                    placeholder="token-uuid"
                    required
                    className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-primary/60"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs text-slate-300">
                  Quantity
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={item.quantity}
                    onChange={(event) => handleItemChange(index, 'quantity', event.target.value)}
                    className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-primary/60"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  className="self-end rounded-lg border border-red-400/40 px-3 py-2 text-xs font-semibold text-red-200 transition hover:bg-red-500/10"
                  disabled={items.length === 1}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>

        {message ? (
          <p className="rounded-lg border border-emerald-400/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-100">
            {message}
          </p>
        ) : null}

        {error ? (
          <p className="rounded-lg border border-red-400/40 bg-red-500/10 px-3 py-2 text-xs text-red-100">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/80 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? 'Composing…' : 'Create bundle listing'}
        </button>
      </form>
    </section>
  );
}
