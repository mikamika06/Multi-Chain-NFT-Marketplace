"use client";

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RainbowKitProvider, midnightTheme, getDefaultWallets } from '@rainbow-me/rainbowkit';
import '@rainbow-me/rainbowkit/styles.css';
import { ReactNode, useMemo } from 'react';
import { WagmiConfig, configureChains, createConfig } from 'wagmi';
import { arbitrum, mainnet, polygon, polygonMumbai, sepolia } from 'wagmi/chains';
import { jsonRpcProvider } from 'wagmi/providers/jsonRpc';

const projectId =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? 'demo-project-id';

const { chains, publicClient, webSocketPublicClient } = configureChains(
  [mainnet, polygon, arbitrum, sepolia, polygonMumbai],
  [
    jsonRpcProvider({
      rpc: (chain) => ({
        http: chain.rpcUrls.default.http[0],
      }),
    }),
  ],
);

const { connectors } = getDefaultWallets({
  appName: 'XChain Marketplace',
  projectId,
  chains,
});

const wagmiConfig = createConfig({
  autoConnect: true,
  connectors,
  publicClient,
  webSocketPublicClient,
});

const queryClient = new QueryClient();

type ProvidersProps = {
  children: ReactNode;
};

export function Providers({ children }: ProvidersProps) {
  const theme = useMemo(
    () =>
      midnightTheme({
        accentColor: '#4D5DFF',
      }),
    [],
  );

  return (
    <WagmiConfig config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider chains={chains} theme={theme}>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiConfig>
  );
}
