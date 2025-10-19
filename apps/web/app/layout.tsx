import '../styles/globals.css';
import { Providers } from '../components/providers';
import { Navigation } from '../components/navigation';
import type { ReactNode } from 'react';
import { AnalyticsBanner } from '../components/analytics-banner';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'XChain NFT Marketplace',
  description: 'Cross-chain NFT marketplace with auctions and AI tools',
};

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body className="bg-background text-slate-100">
        <Providers>
          <div className="min-h-screen flex flex-col">
            <header className="border-b border-white/5 bg-card/60 backdrop-blur">
              <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
                <div className="text-lg font-semibold tracking-tight">
                  XChain Marketplace
                </div>
                <div className="flex items-center gap-8">
                  <Navigation />
                  <AnalyticsBanner />
                </div>
              </div>
            </header>
            <main className="flex-1 bg-gradient-to-b from-white/5 to-transparent">
              {children}
            </main>
            <footer className="border-t border-white/5 bg-card/80 py-6 text-center text-xs text-slate-400">
              Cross-chain NFT marketplace
            </footer>
          </div>
        </Providers>
      </body>
    </html>
  );
}

