import Link from 'next/link';

const features = [
  {
    title: 'Cross-Chain Listing',
    description:
      'Single listing syndicated across Ethereum, Polygon, Arbitrum, and Solana without token duplication.',
  },
  {
    title: 'AI Valuation & Similarity',
    description:
      'Gradient boosted pricing model and CLIP-powered similarity search guide creators and buyers.',
  },
  {
    title: 'Bridge Intelligence',
    description:
      'LayerZero OApp v2 and Wormhole adapters deliver deterministic NFT transfers and bid relays.',
  },
  {
    title: 'Royalty Enforcement',
    description:
      'EIP-2981 enforced in escrow and bundle flows; payouts settled no matter where the sale clears.',
  },
];

export default function Home() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-16 px-6 py-14">
      <section className="grid gap-6 lg:grid-cols-[3fr,2fr]">
        <div className="space-y-6">
          <p className="inline-flex rounded-full bg-white/10 px-4 py-1 text-sm uppercase tracking-wide text-slate-200">
            Multi-Chain NFT Marketplace
          </p>
          <h1 className="text-4xl font-bold leading-tight md:text-5xl">
            Launch, auction, and bridge NFT drops across chains with observability and AI at the
            core.
          </h1>
          <p className="max-w-2xl text-lg text-slate-300">
            A production-focused reference architecture featuring LayerZero ONFTs, Wormhole relay
            fallback, cross-chain bid routing, bundle royalty enforcement, and DevOps ready
            pipelines.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard"
              className="rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/80"
            >
              Open Live Dashboard
            </Link>
            <Link
              href="https://layerzero.network/"
              className="rounded-lg border border-white/20 px-5 py-3 text-sm font-semibold text-white transition hover:border-white/40"
            >
              LayerZero Docs
            </Link>
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-card/80 p-6">
          <h2 className="mb-3 text-lg font-semibold text-white">Bridge ETA</h2>
          <div className="space-y-3 text-sm text-slate-300">
            <div className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-3">
              <span>Ethereum → Polygon</span>
              <span className="font-semibold text-white">~87s</span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-3">
              <span>Polygon → Arbitrum</span>
              <span className="font-semibold text-white">~102s</span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-3">
              <span>Solana → Ethereum</span>
              <span className="font-semibold text-white">~128s</span>
            </div>
          </div>
        </div>
      </section>
      <section className="grid gap-6 md:grid-cols-2">
        {features.map((feature) => (
          <div
            key={feature.title}
            className="rounded-2xl border border-white/10 bg-card/70 p-6"
          >
            <h3 className="text-xl font-semibold text-white">{feature.title}</h3>
            <p className="mt-3 text-sm text-slate-300">{feature.description}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
