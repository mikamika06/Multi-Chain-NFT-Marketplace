"use client";

import { useState } from 'react';
import { GraphQLClient } from 'graphql-request';
import { REQUEST_VALUATION_MUTATION } from '../lib/mutations';

const graphqlClient = new GraphQLClient(
  '/api/graphql',  // Use Next.js API route proxy
);

type RequestValuationButtonProps = {
  tokenPk: string;
};

export function RequestValuationButton({ tokenPk }: RequestValuationButtonProps) {
  const [forceRefresh, setForceRefresh] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      await graphqlClient.request(REQUEST_VALUATION_MUTATION, {
        tokenPk,
        forceRefresh,
        clientRequestId: `valuation-${tokenPk}-${Date.now()}`,
      });
      setMessage('Valuation request sent. Refresh shortly to see updated figures.');
    } catch (err) {
      const fallback = err instanceof Error ? err.message : 'Unable to request valuation.';
      setError(fallback);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-2 rounded-xl border border-white/10 bg-card/70 p-4 text-sm text-slate-200">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-semibold text-white">Refresh AI Valuation</p>
          <p className="text-xs text-slate-400">
            Trigger the FastAPI service to recompute price guidance for this token.
          </p>
        </div>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition hover:bg-primary/80 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {submitting ? 'Requesting…' : 'Request valuation'}
        </button>
      </div>
      <label className="flex items-center gap-2 text-xs text-slate-300">
        <input
          type="checkbox"
          checked={forceRefresh}
          onChange={() => setForceRefresh((value) => !value)}
          className="h-3 w-3 rounded border-white/20 bg-transparent"
        />
        Force refresh even if cache is warm
      </label>
      {message ? (
        <p className="text-xs text-emerald-300">{message}</p>
      ) : null}
      {error ? (
        <p className="text-xs text-red-300">{error}</p>
      ) : null}
    </div>
  );
}
