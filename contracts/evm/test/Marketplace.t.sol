// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Marketplace} from "../src/Marketplace.sol";
import {BundleComposer} from "../src/BundleComposer.sol";
import {MockERC721} from "./mocks/MockERC721.sol";

interface Vm {
    function prank(address) external;
    function startPrank(address) external;
    function stopPrank() external;
    function deal(address, uint256) external;
    function warp(uint256) external;
}

Vm constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));

contract MarketplaceTest {
    Marketplace private marketplace;
    BundleComposer private bundleComposer;
    MockERC721 private nft;

    address private constant SELLER = address(0x1);
    address private constant BUYER = address(0x2);
    address private constant BIDDER1 = address(0x3);
    address private constant BIDDER2 = address(0x4);
    address private constant EXTRA = address(0x5);

    function testListFixedAndBuy() external {
        _resetBalances();
        _deploy();

        nft.mint(SELLER, 1);

        bytes32 listingId = keccak256("fixed");
        uint64 startTime = uint64(block.timestamp);
        uint64 endTime = startTime + 1 days;
        uint256 price = 1 ether;

        vm.startPrank(SELLER);
        nft.approve(address(marketplace), 1);
        marketplace.listFixed(
            listingId,
            address(nft),
            1,
            1,
            price,
            startTime,
            endTime,
            address(0)
        );
        vm.stopPrank();

        Marketplace.Listing memory listing = marketplace.getListing(listingId);
        _assertEq(uint256(listing.listingType), uint256(Marketplace.ListingType.FIXED), "type");
        _assertEq(uint256(listing.status), uint256(Marketplace.ListingStatus.ACTIVE), "status");
        _assertEq(listing.startPrice, price, "price");

        vm.deal(BUYER, 2 ether);
        vm.prank(BUYER);
        marketplace.buyNow{value: price}(listingId);

        _assertEq(nft.ownerOf(1), BUYER, "buyer owner");

        listing = marketplace.getListing(listingId);
        _assertEq(uint256(listing.status), uint256(Marketplace.ListingStatus.SETTLED), "settled");
        _assertEq(SELLER.balance, price, "seller paid");
    }

    function testEnglishAuctionFlow() external {
        _resetBalances();
        _deploy();

        nft.mint(SELLER, 10);
        uint64 startTime = uint64(block.timestamp + 1 hours);
        uint64 endTime = startTime + uint64(marketplace.minAuctionDuration()) + 1 minutes;
        uint256 startPrice = 1 ether;
        uint256 reservePrice = 1 ether;
        bytes32 listingId = keccak256("auction");

        vm.startPrank(SELLER);
        nft.approve(address(marketplace), 10);
        marketplace.listEnglishAuction(
            listingId,
            address(nft),
            10,
            1,
            startPrice,
            reservePrice,
            startTime,
            endTime,
            address(0)
        );
        vm.stopPrank();

        vm.warp(startTime + 1);

        vm.deal(BIDDER1, 2 ether);
        vm.prank(BIDDER1);
        marketplace.placeBid{value: startPrice}(listingId);

        // Second bidder raises the price
        vm.deal(BIDDER2, 3 ether);
        vm.prank(BIDDER2);
        marketplace.placeBid{value: 1.2 ether}(listingId);

        _assertEq(
            marketplace.pendingWithdrawals(BIDDER1),
            startPrice,
            "first bidder pending withdrawal"
        );

        vm.warp(endTime + 1);

        vm.prank(SELLER);
        marketplace.settleAuction(listingId);

        _assertEq(nft.ownerOf(10), BIDDER2, "winner owns NFT");
        _assertEq(SELLER.balance, 1.2 ether, "seller received proceeds");

        uint256 before = BIDDER1.balance;
        vm.prank(BIDDER1);
        marketplace.withdrawOverbid();
        _assertEq(BIDDER1.balance, before + startPrice, "withdrawn");
    }

    function testAuctionExtendsWhenBidNearEnd() external {
        _resetBalances();
        _deploy();

        nft.mint(SELLER, 33);
        uint64 startTime = uint64(block.timestamp + 10);
        uint64 endTime = startTime + 1 hours;
        bytes32 listingId = keccak256("extension");

        marketplace.setAuctionBidExtension(5 minutes, 10 minutes);

        (uint64 window, uint64 duration) = marketplace.auctionConfig();
        _assertEq(window, uint64(5 minutes), "window config");
        _assertEq(duration, uint64(10 minutes), "duration config");

        vm.startPrank(SELLER);
        nft.approve(address(marketplace), 33);
        marketplace.listEnglishAuction(
            listingId,
            address(nft),
            33,
            1,
            0.5 ether,
            0.4 ether,
            startTime,
            endTime,
            address(0)
        );
        vm.stopPrank();

        vm.deal(BIDDER1, 1 ether);
        vm.warp(startTime + 1);
        vm.prank(BIDDER1);
        marketplace.placeBid{value: 0.5 ether}(listingId);

        vm.deal(BIDDER2, 1 ether);
        vm.warp(endTime - 2 minutes);
        vm.prank(BIDDER2);
        marketplace.placeBid{value: 0.55 ether}(listingId);

        Marketplace.Listing memory listing = marketplace.getListing(listingId);
        _assertEq(
            listing.endTime,
            endTime + uint64(10 minutes),
            "auction should extend"
        );
    }

    function testBundleFixedListingBuyNow() external {
        _resetBalances();
        _deploy();

        nft.mint(SELLER, 100);
        nft.mint(SELLER, 101);

        BundleComposer.BundleItemInput[] memory items = new BundleComposer.BundleItemInput[](2);
        items[0] = BundleComposer.BundleItemInput({tokenContract: address(nft), tokenId: 100, amount: 1});
        items[1] = BundleComposer.BundleItemInput({tokenContract: address(nft), tokenId: 101, amount: 1});

        vm.startPrank(SELLER);
        nft.setApprovalForAll(address(bundleComposer), true);
        uint256 bundleId = bundleComposer.createBundle(items);

        bytes32 listingId = keccak256("bundle");
        uint64 startTime = uint64(block.timestamp);
        uint64 endTime = startTime + 2 days;
        marketplace.listBundleFixed(
            listingId,
            bundleId,
            2 ether,
            startTime,
            endTime,
            address(0)
        );
        vm.stopPrank();

        vm.deal(BUYER, 3 ether);
        vm.prank(BUYER);
        marketplace.buyNow{value: 2 ether}(listingId);

        _assertEq(nft.ownerOf(100), BUYER, "buyer received first");
        _assertEq(nft.ownerOf(101), BUYER, "buyer received second");
        _assertEq(SELLER.balance, 2 ether, "seller paid");
    }

    function _deploy() internal {
        marketplace = new Marketplace(address(this));
        bundleComposer = new BundleComposer(address(this));
        bundleComposer.grantRole(bundleComposer.MARKETPLACE_ROLE(), address(marketplace));
        marketplace.setBundleComposer(address(bundleComposer));
        nft = new MockERC721();
    }

    function _resetBalances() internal {
        vm.deal(SELLER, 0);
        vm.deal(BUYER, 0);
        vm.deal(BIDDER1, 0);
        vm.deal(BIDDER2, 0);
        vm.deal(EXTRA, 0);
    }

    function _assertEq(uint256 a, uint256 b, string memory err) internal pure {
        if (a != b) {
            revert(err);
        }
    }

    function _assertEq(address a, address b, string memory err) internal pure {
        if (a != b) {
            revert(err);
        }
    }
}
