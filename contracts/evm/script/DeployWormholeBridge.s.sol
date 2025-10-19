// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script} from "forge-std/Script.sol";
import {WormholeBridgeAdapter} from "../src/WormholeBridgeAdapter.sol";

contract DeployWormholeBridgeScript is Script {
    function run() external returns (WormholeBridgeAdapter adapter) {
        address admin = vm.envAddress("WORMHOLE_ADMIN");

        vm.startBroadcast(admin);
        adapter = new WormholeBridgeAdapter();
        adapter.transferOwnership(admin);
        vm.stopBroadcast();
    }
}
