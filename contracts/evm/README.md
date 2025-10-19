# EVM Contracts

Foundry workspace containing the LayerZero-enabled ONFT implementation and marketplace modules.

## Structure

- `CrossChainNFT.sol` – LayerZero ONFT721 with trusted remotes, lock/mint or burn/mint bridge modes.
- `Marketplace.sol` – fixed price, English/Dutch auctions, bundle escrow and royalty enforcement.
- `BundleComposer.sol` – helper to aggregate bundle orders before settlement.
- `WormholeBridgeAdapter.sol` – lightweight adapter emitting Wormhole-style bridge events.

## Getting Started

```bash
pnpm i
forge install foundry-rs/forge-std --no-commit
forge install OpenZeppelin/openzeppelin-contracts --no-commit
forge install LayerZero-Labs/solidity-examples --no-commit
```

Set env for RPC URLs in `.env` or use `foundry.toml`.

Run checks:

```bash
forge fmt
forge build
forge test
```

### Tests

- `test/Marketplace.t.sol` exercises fixed sale buy-now, English auction lifecycle and overbid withdrawals.
- `test/CrossChainNFT.t.sol` covers minting, metadata, trusted remote configuration and bridge mode toggles.

### Deployment

Scripts are provided in `script/` for Foundry:

- `DeployMarketplace.s.sol` – deploy the marketplace contract.
- `DeployCrossChainNFT.s.sol` – deploy the ONFT; expects environment variables:
  - `ONFT_OWNER` – address that will own the contract.
  - `LZ_ENDPOINT` – LayerZero endpoint address for the source chain.
  - `ONFT_NAME`, `ONFT_SYMBOL`, `ONFT_BASE_URI`.
- `ConfigureTrustedRemote.s.sol` – configure trusted remotes for ONFT instances once both ends are deployed.
- `DeployWormholeBridge.s.sol` – deploy the Wormhole bridge adapter (`WORMHOLE_ADMIN`).

Run with:

```bash
forge script script/DeployMarketplace.s.sol --rpc-url $RPC_URL --broadcast --verify
forge script script/DeployCrossChainNFT.s.sol --rpc-url $RPC_URL --broadcast --verify
# Example trusted remote configuration (LayerZero)
forge script script/ConfigureTrustedRemote.s.sol \
  --sig "setTrusted(address,uint32,bytes32,bool)" \
  $ONFT_LOCAL $REMOTE_EID 0x000000000000000000000000REMOTE_ONFT true \
  --rpc-url $RPC_URL --broadcast
forge script script/DeployWormholeBridge.s.sol --rpc-url $RPC_URL --broadcast
```
