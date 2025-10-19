const productLanes = [
  {
    name: 'Marketplace Core',
    items: [
      'Unified buy now, English, and Dutch auctions',
      'Bundle settlement with forced royalty payout',
      'Permit based listings (EIP-712) and escrow fallback',
    ],
  },
  {
    name: 'Cross-Chain',
    items: [
      'LayerZero OApp v2 ONFT-721/1155 transfers',
      'Wormhole fallback relayer with fee calibration',
      'Bid relay workers with deterministic retries',
    ],
  },
  {
    name: 'AI & Anti-fraud',
    items: [
      'XGBoost pricing with rarity, trend, and sentiment features',
      'CLIP similarity embeddings with nearest neighbor search',
      'Hybrid heuristics + ML fraud scoring and auto-mitigations',
    ],
  },
  {
    name: 'Observability & DevOps',
    items: [
      'Prometheus SLOs for bridge latency and auction keepers',
      'Grafana dashboards, Loki logs, Sentry tracing',
      'GitHub Actions, Helm releases, blue/green deployment gates',
    ],
  },
];

export default function FeaturesPage() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-16">
      <header className="space-y-3">
        <h1 className="text-4xl font-semibold text-white">Capability Matrix</h1>
        <p className="text-sm text-slate-300">
          Built to map directly onto multi-chain NFT marketplace job requirements.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        {productLanes.map((lane) => (
          <section
            key={lane.name}
            className="rounded-2xl border border-white/10 bg-card/80 p-6"
          >
            <h2 className="text-lg font-semibold text-white">{lane.name}</h2>
            <ul className="mt-4 space-y-2 text-sm text-slate-300">
              {lane.items.map((item) => (
                <li key={item} className="leading-relaxed">
                  {item}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
