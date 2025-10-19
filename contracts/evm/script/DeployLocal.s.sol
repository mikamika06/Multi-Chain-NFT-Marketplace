// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {Marketplace} from "../src/Marketplace.sol";
import {CrossChainNFT} from "../src/CrossChainNFT.sol";
import {BundleComposer} from "../src/BundleComposer.sol";
import {WormholeBridgeAdapter} from "../src/WormholeBridgeAdapter.sol";

/// @notice Full deployment script for local testing
contract DeployLocalScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        // Mock addresses for local testing
        address lzEndpoint = deployer; // Mock LayerZero endpoint
        
        vm.startBroadcast(deployerPrivateKey);
        
        // 1. Deploy Marketplace
        Marketplace marketplace = new Marketplace(deployer);
        console.log("Marketplace deployed at:", address(marketplace));
        
        // 2. Deploy CrossChainNFT (ONFT)
        CrossChainNFT onft = new CrossChainNFT(
            lzEndpoint,
            "XChain NFT",
            "XNFT",
            "https://api.xchain-marketplace.com/metadata/"
        );
        console.log("CrossChainNFT deployed at:", address(onft));
        
        // 3. Deploy BundleComposer
        BundleComposer bundleComposer = new BundleComposer(address(marketplace));
        console.log("BundleComposer deployed at:", address(bundleComposer));
        
        // 4. Deploy WormholeBridgeAdapter (inherits Ownable, deployer becomes owner)
        WormholeBridgeAdapter wormholeBridge = new WormholeBridgeAdapter();
        console.log("WormholeBridgeAdapter deployed at:", address(wormholeBridge));
        
        vm.stopBroadcast();
        
        // Log deployment summary
        console.log("\n=== DEPLOYMENT SUMMARY ===");
        console.log("Network: Local (Anvil)");
        console.log("Deployer:", deployer);
        console.log("\nContracts:");
        console.log("1. Marketplace:", address(marketplace));
        console.log("2. CrossChainNFT (ONFT):", address(onft));
        console.log("3. BundleComposer:", address(bundleComposer));
        console.log("4. WormholeBridgeAdapter:", address(wormholeBridge));
        console.log("\nCopy these addresses to docker-compose.yml and .env files");
    }
}
