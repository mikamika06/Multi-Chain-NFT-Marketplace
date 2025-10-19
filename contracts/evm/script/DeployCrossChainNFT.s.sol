// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script} from "forge-std/Script.sol";
import {CrossChainNFT} from "../src/CrossChainNFT.sol";

contract DeployCrossChainNFTScript is Script {
    function run() external returns (CrossChainNFT onft) {
        address owner = vm.envAddress("ONFT_OWNER");
        address lzEndpoint = vm.envAddress("LZ_ENDPOINT");
        string memory name = vm.envString("ONFT_NAME");
        string memory symbol = vm.envString("ONFT_SYMBOL");
        string memory baseURI = vm.envString("ONFT_BASE_URI");

        vm.startBroadcast(owner);
        onft = new CrossChainNFT(lzEndpoint, name, symbol, baseURI);
        vm.stopBroadcast();
    }
}
