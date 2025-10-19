// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script} from "forge-std/Script.sol";
import {CrossChainNFT} from "../src/CrossChainNFT.sol";

/// @notice Sets a trusted remote on a deployed CrossChainNFT instance.
/// Usage:
/// forge script script/ConfigureTrustedRemote.s.sol \
///   --sig "setTrusted(address,uint32,bytes32,bool)" \
///   0xLocalOnft 10109 0x000000000000000000000000RemoteOnft true \
///   --rpc-url $RPC_URL --broadcast
contract ConfigureTrustedRemoteScript is Script {
    function setTrusted(address onft, uint16 remoteEndpointId, address remoteAddress) external {
        vm.startBroadcast();
        CrossChainNFT(onft).setTrustedRemote(remoteEndpointId, remoteAddress);
        vm.stopBroadcast();
    }
}
