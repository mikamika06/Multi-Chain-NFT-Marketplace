"use client";

import { useState, useEffect } from 'react';
import { GraphQLClient } from 'graphql-request';
import { useRouter } from 'next/navigation';
import { TRANSFER_CROSS_CHAIN_MUTATION } from '../lib/mutations';
import { ALL_TOKENS_QUERY } from '../lib/api';

const client = new GraphQLClient(
  '/api/graphql',  // Use Next.js API route proxy
  {
    credentials: 'include',
  },
);

interface Token {
  id: string;
  tokenId: string;
  chainId: string;
  imageUrl?: string;
  collection?: {
    name: string;
  };
}

export function BridgeRequestForm() {
  const router = useRouter();
  const [tokens, setTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState(true);
  const [tokenPk, setTokenPk] = useState('');
  const [dstChain, setDstChain] = useState('');
  const [feeEstimate, setFeeEstimate] = useState('0');
  const [clientRequestId, setClientRequestId] = useState('');
  const [protocol, setProtocol] = useState('LAYERZERO');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchTokens = async () => {
      try {
        const data = await client.request<{ tokens: Token[] }>(ALL_TOKENS_QUERY);
        setTokens(data.tokens || []);
      } catch (err) {
        console.error('Failed to load tokens:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchTokens();
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setStatusMessage(null);

    try {
      await client.request(TRANSFER_CROSS_CHAIN_MUTATION, {
        tokenPk,
        dstChain,
        protocol,
        feeEstimate,
        clientRequestId: clientRequestId || undefined,
      });
      setStatusMessage('Bridge request registered. Track status below.');
      router.refresh();
      setTokenPk('');
      setDstChain('');
      setFeeEstimate('0');
      setClientRequestId('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to register bridge request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-2xl border border-white/10 bg-card/60 p-6"
    >
      <header>
        <h2 className="text-lg font-semibold text-white">New Transfer</h2>
        <p className="text-sm text-slate-300">
          Select token and destination chain
        </p>
      </header>

      <label className="flex flex-col gap-1 text-xs text-slate-400">
        Token to Bridge
        <select
          value={tokenPk}
          onChange={(event) => setTokenPk(event.target.value)}
          required
          disabled={loading}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-primary/60 disabled:opacity-50"
        >
          <option value="">
            {loading ? 'Loading tokens...' : 'Select a token...'}
          </option>
          {tokens.map((token) => (
            <option key={token.id} value={token.id}>
              {token.collection?.name || 'Unknown'} #{token.tokenId} (Chain: {token.chainId})
            </option>
          ))}
        </select>
        <span className="text-xs text-slate-500">
          Select a token from your collection
        </span>
      </label>

      <label className="flex flex-col gap-1 text-xs text-slate-400">
        Destination chain ID
        <select
          value={dstChain}
          onChange={(event) => setDstChain(event.target.value)}
          required
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-primary/60"
        >
          <option value="">Select destination chain...</option>
          <option value="1">Ethereum (1)</option>
          <option value="137">Polygon (137)</option>
          <option value="42161">Arbitrum (42161)</option>
          <option value="10">Optimism (10)</option>
          <option value="56">BSC (56)</option>
          <option value="43114">Avalanche (43114)</option>
        </select>
      </label>

      <label className="flex flex-col gap-1 text-xs text-slate-400">
        Protocol
        <select
          value={protocol}
          onChange={(event) => setProtocol(event.target.value)}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-primary/60"
        >
          <option value="LAYERZERO">LayerZero</option>
          <option value="WORMHOLE">Wormhole</option>
        </select>
      </label>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="flex flex-col gap-1 text-xs text-slate-400">
          Fee estimate (ETH)
          <input
            type="number"
            min="0"
            step="0.0001"
            value={feeEstimate}
            onChange={(event) => setFeeEstimate(event.target.value)}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-primary/60"
          />
        </label>

        <label className="flex flex-col gap-1 text-xs text-slate-400">
          Client request ID (optional)
          <input
            type="text"
            value={clientRequestId}
            onChange={(event) => setClientRequestId(event.target.value)}
            placeholder="bridge-request-001"
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-primary/60"
          />
        </label>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-100">
          {error}
        </div>
      ) : null}

      {statusMessage ? (
        <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-100">
          {statusMessage}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={submitting}
        className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/80 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? 'Submitting…' : 'Register Transfer'}
      </button>
    </form>
  );
}
