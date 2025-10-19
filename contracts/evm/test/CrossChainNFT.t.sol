// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test} from "forge-std/Test.sol";
import {CrossChainNFT} from "../src/CrossChainNFT.sol";

contract CrossChainNFTTest is Test {
    CrossChainNFT internal onft;
    address internal owner = address(this);

    function setUp() public {
        onft = new CrossChainNFT(
            address(0x101),
            "XChainCollectible",
            "XCC",
            "https://metadata.example.com/"
        );
    }

    function testOwnerCanMintAndSetTokenUri() public {
        onft.mint(address(this), 1, "https://metadata.example.com/special.json");
        assertEq(onft.ownerOf(1), address(this));
        assertEq(onft.tokenURI(1), "https://metadata.example.com/special.json");

        onft.setTokenURI(1, "ipfs://cid-123");
        assertEq(onft.tokenURI(1), "ipfs://cid-123");
    }

    function testSetTrustedRemote() public {
        address remoteAddr = address(0xBEEF);
        onft.setTrustedRemote(40121, remoteAddr);

        bytes memory storedPath = onft.trustedRemoteLookup(40121);
        bytes memory expected = abi.encodePacked(remoteAddr, address(onft));
        assertEq(keccak256(storedPath), keccak256(expected));
    }

    function testConfigureBridgeMode() public {
        onft.configureBridgeMode(7, true);
        bool burnMint = onft.burnMintMode(7);
        assertTrue(burnMint);

        onft.configureBridgeMode(7, false);
        burnMint = onft.burnMintMode(7);
        assertFalse(burnMint);
    }

    function testOnlyOwnerCanMint() public {
        vm.prank(address(0xB0B));
        vm.expectRevert();
        onft.mint(address(0xB0B), 99, "");
    }

    function testUnauthorizedBridgeReverts() public {
        onft.mint(address(this), 5, "");
        vm.prank(address(0xC0FFEE));
        vm.expectRevert(CrossChainNFT.Unauthorized.selector);
        onft.bridge(102, address(0xC0FFEE), 5, bytes(""));
    }

    function testBridgeRequiresTrustedRemote() public {
        onft.mint(address(this), 42, "");
        vm.expectRevert(bytes("LzApp: destination chain is not a trusted source"));
        onft.bridge(1337, address(this), 42, bytes(""));
    }
}
