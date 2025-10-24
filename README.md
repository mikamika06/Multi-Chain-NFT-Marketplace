# Multi-Chain NFT Marketplace

A comprehensive cross-chain NFT marketplace supporting unified listings across Ethereum, Polygon, Arbitrum, and Solana networks. Features LayerZero/Wormhole bridges, AI-powered valuation, anti-fraud detection, and full observability.

## Features

- **Cross-Chain Trading**: Single listings visible across multiple networks without token duplication
- **Multiple Auction Types**: Fixed price, English auctions, Dutch auctions with anti-sniping
- **Bridge Integration**: LayerZero OApp v2 + Wormhole fallback for NFT transfers
- **Royalty Enforcement**: EIP-2981 compliant with automatic payouts in all scenarios
- **AI-Powered Services**: Price valuation, similarity search, and fraud detection
- **Bundle Sales**: Multi-token purchases with automatic royalty distribution

## Tech Stack

### Frontend
- **Next.js 14** with App Router and TypeScript
- **Wagmi v1** + **RainbowKit** for Web3 integration
- **shadcn/ui** + **Tailwind CSS** for styling
- **Zustand** + **React Query** for state management

### Backend
- **NestJS** with **Fastify** and **Apollo GraphQL**
- **PostgreSQL 16** with **Prisma ORM**
- **Redis 7** for caching and **BullMQ** for job queues
- **OpenSearch 2.x** for full-text search

### Smart Contracts
- **Solidity 0.8.26** with **Foundry** framework
- **LayerZero OApp v2** for cross-chain NFT transfers
- **Wormhole** bridge adapter as fallback
- **EIP-2981** royalty standard enforcement

### AI/ML
- **Python 3.11** with **FastAPI** microservice
- **XGBoost** for price valuation
- **sentence-transformers** + **CLIP** for similarity
- **scikit-learn** for fraud detection

## Key Features

### Cross-Chain NFT Trading
- Mint NFT on any supported chain (Ethereum, Polygon, Arbitrum, Solana)
- Create listings visible across all networks
- Buyers can purchase from any chain using LayerZero/Wormhole bridges

### Auction System
- **Fixed Price**: Immediate purchase listings
- **English Auctions**: Ascending bid auctions with anti-sniping
- **Dutch Auctions**: Descending price over time

### AI-Powered Services
- **Valuation Engine**: ML-based price predictions using rarity, sales history, and market trends
- **Similarity Search**: Find similar NFTs using CLIP image embeddings
- **Fraud Detection**: Automated flagging of suspicious listings and collections

### Bundle Sales
- Purchase multiple NFTs in a single transaction
- Automatic royalty distribution to creators
- Gas-optimized settlement process

## Quick Start

### Prerequisites
- Node.js 20+
- pnpm 8+
- Docker & Docker Compose
- Foundry (for smart contracts)

### Local Development

1. **Clone the repository**
```bash
git clone https://github.com/mikamika06/Multi-Chain-NFT-Marketplace.git
cd Multi-Chain-NFT-Marketplace
```

2. **Install dependencies**
```bash
pnpm install
```

3. **Start local blockchain**
```bash
anvil --host 0.0.0.0 --port 8545
```

4. **Deploy smart contracts**
```bash
cd contracts/evm
forge script script/DeployLocal.s.sol --rpc-url http://localhost:8545 --broadcast
```

5. **Start infrastructure services**
```bash
docker-compose up -d postgres redis opensearch
```

6. **Setup database**
```bash
cd apps/api
pnpm prisma migrate dev
pnpm prisma seed
```

7. **Start all services**
```bash
pnpm dev
```


##  Project Structure

```
├── apps/
│   ├── api/           # NestJS GraphQL API
│   └── web/           # Next.js frontend
├── contracts/
│   └── evm/           # Solidity contracts
├── services/
│   └── ai/            # Python AI microservice
├── infra/             # Kubernetes deployments
```

##  Core Contracts

### CrossChainNFT (LayerZero ONFT)
```solidity
contract CrossChainNFT is ONFT721 {
    function sendNFT(uint32 _dstEid, address _to, uint256 _tokenId) external payable;
    function setBridgeMode(uint256 _tokenId, bool _burnMint) external;
}
```

### Marketplace
```solidity
contract Marketplace {
    function createFixedListing(address nft, uint256 tokenId, uint256 price) external;
    function createEnglishAuction(/* params */) external;
    function createDutchAuction(/* params */) external;
    function executeBundleSale(BundleOrder[] calldata orders) external payable;
}
```
## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
