"use client";

import Link from 'next/link';
import { useMemo } from 'react';

const metrics = [
  { label: 'Active Auctions', value: 128 },
  { label: 'Bridge Latency (p95)', value: '87s' },
  { label: 'AI Floor Delta', value: '-3.2%' },
];

export function AnalyticsBanner() {
  const snapshot = useMemo(
    () =>
      metrics.map((metric) => (
        <div key={metric.label} className="flex flex-col text-xs">
          <span className="text-slate-400">{metric.label}</span>
          <span className="font-semibold text-white">{metric.value}</span>
        </div>
      )),
    [],
  );

  return (
    <div className="flex items-center gap-4">
      <div className="hidden items-center gap-4 md:flex">{snapshot}</div>
      <Link
        href="/dashboard"
        className="rounded-full bg-white/10 px-4 py-1 text-xs font-semibold text-white transition hover:bg-white/20"
      >
        View Dashboard
      </Link>
    </div>
  );
}
