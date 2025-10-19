// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Marketplace} from "../src/Marketplace.sol";

/// @notice Minimal deployment helper used with `forge script --sig "deploy(address)"`
contract DeployMarketplaceScript {
    function deploy(address admin) external returns (Marketplace) {
        return new Marketplace(admin);
    }
}
