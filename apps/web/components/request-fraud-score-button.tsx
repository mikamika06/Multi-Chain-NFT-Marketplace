"use client";

import { useMemo, useState } from 'react';
import { GraphQLClient } from 'graphql-request';
import { REQUEST_FRAUD_SCORE_MUTATION } from '../lib/mutations';

const client = new GraphQLClient(
  '/api/graphql',  // Use Next.js API route proxy
  {
    credentials: 'include',
  },
);

type RequestFraudScoreButtonProps = {
  entityId: string;
  entityType: 'COLLECTION' | 'LISTING' | 'TOKEN' | 'USER';
  suggestedPrice?: number;
  duplicateTxCount?: number;
  suspiciousMetadata?: boolean;
};

export function RequestFraudScoreButton({
  entityId,
  entityType,
  suggestedPrice,
  duplicateTxCount,
  suspiciousMetadata,
}: RequestFraudScoreButtonProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const computedDuplicateCount = useMemo(() => duplicateTxCount ?? 0, [duplicateTxCount]);

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      await client.request(REQUEST_FRAUD_SCORE_MUTATION, {
        entityType,
        entityId,
        price: suggestedPrice ?? null,
        duplicateTxCount: computedDuplicateCount,
        suspiciousMetadata: suspiciousMetadata ?? null,
        clientRequestId: `fraud-${entityType}-${entityId}-${Date.now()}`,
      });
      setMessage('Fraud risk evaluation queued. Refresh to see new flags.');
    } catch (err) {
      const fallback = err instanceof Error ? err.message : 'Unable to request fraud score.';
      setError(fallback);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-2 rounded-xl border border-white/10 bg-card/70 p-4 text-sm text-slate-200">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-semibold text-white">Run Fraud Check</p>
          <p className="text-xs text-slate-400">
            Scores entity risk using the AI service and appends the result to moderation queues.
          </p>
        </div>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className="rounded-lg bg-red-500/80 px-3 py-2 text-xs font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {submitting ? 'Submitting…' : 'Request review'}
        </button>
      </div>
      {message ? <p className="text-xs text-emerald-300">{message}</p> : null}
      {error ? <p className="text-xs text-red-300">{error}</p> : null}
    </div>
  );
}
