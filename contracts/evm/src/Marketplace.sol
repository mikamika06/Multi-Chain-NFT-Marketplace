// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IERC1155} from "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import {IERC2981} from "@openzeppelin/contracts/interfaces/IERC2981.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/security/Pausable.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {IBundleComposer} from "./interfaces/IBundleComposer.sol";

/// @title Marketplace
/// @notice Supports fixed sales, English/Dutch auctions, bundle settlements and royalty enforcement.
contract Marketplace is AccessControl, Pausable, ReentrancyGuard {
    enum ListingType {
        FIXED,
        AUCTION_ENGLISH,
        AUCTION_DUTCH,
        BUNDLE_FIXED
    }

    enum ListingStatus {
        NONE,
        ACTIVE,
        SETTLED,
        CANCELLED
    }

    struct Listing {
        ListingType listingType;
        ListingStatus status;
        address seller;
        address tokenContract;
        uint256 tokenId;
        uint256 amount;
        uint256 startPrice;
        uint256 endPrice;
        uint64 startTime;
        uint64 endTime;
        uint256 reservePrice;
        address currency;
        address highestBidder;
        uint256 highestBid;
    }

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant KEEPER_ROLE = keccak256("KEEPER_ROLE");

    struct AuctionConfig {
        uint64 extensionWindow;
        uint64 extensionDuration;
    }

    AuctionConfig public auctionConfig = AuctionConfig({extensionWindow: 5 minutes, extensionDuration: 2 minutes});

    /// @notice Minimum bid increment percentage expressed in basis points (e.g. 500 = 5%).
    uint256 public minBidIncrementBps = 500;
    /// @notice Optional minimum english auction duration in seconds (default 10 minutes).
    uint256 public minAuctionDuration = 10 minutes;

    mapping(bytes32 => Listing) public listings;
    mapping(address => uint256) public pendingWithdrawals;

    IBundleComposer public bundleComposer;

    event ListingCreated(
        bytes32 indexed listingId,
        address indexed seller,
        address indexed tokenContract,
        uint256 tokenId,
        ListingType listingType
    );
    event ListingCancelled(bytes32 indexed listingId);
    event SaleSettled(bytes32 indexed listingId, address indexed buyer, uint256 amount);
    event BidPlaced(bytes32 indexed listingId, address indexed bidder, uint256 amount);
    event BidWithdrawn(bytes32 indexed listingId, address indexed bidder, uint256 amount);
    event AuctionExtended(bytes32 indexed listingId, uint64 newEndTime);
    event BundleComposerUpdated(address indexed composer);

    constructor(address admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE, admin);
    }

    // -------------------------------------------------------------------------
    // Admin
    // -------------------------------------------------------------------------
    function getListing(bytes32 listingId) external view returns (Listing memory) {
        return listings[listingId];
    }

    function setMinBidIncrementBps(uint256 newValue) external onlyRole(ADMIN_ROLE) {
        require(newValue <= 2_000, "Too high");
        minBidIncrementBps = newValue;
    }

    function setMinAuctionDuration(uint256 newValue) external onlyRole(ADMIN_ROLE) {
        require(newValue >= 5 minutes, "Too short");
        minAuctionDuration = newValue;
    }

    function setBundleComposer(address composer) external onlyRole(ADMIN_ROLE) {
        bundleComposer = IBundleComposer(composer);
        emit BundleComposerUpdated(composer);
    }

    function setAuctionBidExtension(uint64 window, uint64 extension) external onlyRole(ADMIN_ROLE) {
        require(window <= 1 hours, "Window too large");
        require(extension <= 30 minutes, "Extension too large");
        auctionConfig = AuctionConfig({extensionWindow: window, extensionDuration: extension});
    }

    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }

    // -------------------------------------------------------------------------
    // Listing lifecycle
    // -------------------------------------------------------------------------

    function listFixed(
        bytes32 listingId,
        address tokenContract,
        uint256 tokenId,
        uint256 amount,
        uint256 price,
        uint64 startTime,
        uint64 endTime,
        address currency
    ) external whenNotPaused nonReentrant {
        _createListing(
            listingId,
            ListingType.FIXED,
            tokenContract,
            tokenId,
            amount,
            price,
            price,
            0,
            startTime,
            endTime,
            currency
        );
        _escrowAsset(msg.sender, tokenContract, tokenId, amount);
    }

    function listEnglishAuction(
        bytes32 listingId,
        address tokenContract,
        uint256 tokenId,
        uint256 amount,
        uint256 startPrice,
        uint256 reservePrice,
        uint64 startTime,
        uint64 endTime,
        address currency
    ) external whenNotPaused nonReentrant {
        require(endTime > startTime && endTime - startTime >= minAuctionDuration, "Duration");
        _createListing(
            listingId,
            ListingType.AUCTION_ENGLISH,
            tokenContract,
            tokenId,
            amount,
            startPrice,
            startPrice,
            reservePrice,
            startTime,
            endTime,
            currency
        );
        _escrowAsset(msg.sender, tokenContract, tokenId, amount);
    }

    function listDutchAuction(
        bytes32 listingId,
        address tokenContract,
        uint256 tokenId,
        uint256 amount,
        uint256 startPrice,
        uint256 endPrice,
        uint64 startTime,
        uint64 endTime,
        address currency
    ) external whenNotPaused nonReentrant {
        require(endPrice < startPrice, "End price must be lower");
        require(endTime > startTime, "Invalid time");
        _createListing(
            listingId,
            ListingType.AUCTION_DUTCH,
            tokenContract,
            tokenId,
            amount,
            startPrice,
            endPrice,
            0,
            startTime,
            endTime,
            currency
        );
        _escrowAsset(msg.sender, tokenContract, tokenId, amount);
    }

    function listBundleFixed(
        bytes32 listingId,
        uint256 bundleId,
        uint256 price,
        uint64 startTime,
        uint64 endTime,
        address currency
    ) external whenNotPaused nonReentrant {
        require(address(bundleComposer) != address(0), "Composer not set");
        require(bundleComposer.ownerOf(bundleId) == msg.sender, "Not bundle owner");
        bundleComposer.lockBundle(bundleId, msg.sender);
        _createListing(
            listingId,
            ListingType.BUNDLE_FIXED,
            address(bundleComposer),
            bundleId,
            1,
            price,
            price,
            0,
            startTime,
            endTime,
            currency
        );
    }

    function _createListing(
        bytes32 listingId,
        ListingType listingType,
        address tokenContract,
        uint256 tokenId,
        uint256 amount,
        uint256 startPrice,
        uint256 endPrice,
        uint256 reservePrice,
        uint64 startTime,
        uint64 endTime,
        address currency
    ) internal {
        require(listings[listingId].status == ListingStatus.NONE, "Listing exists");
        require(startPrice > 0, "Invalid price");
        require(endTime > startTime, "Invalid window");
        require(amount > 0, "Amount zero");

        listings[listingId] = Listing({
            listingType: listingType,
            status: ListingStatus.ACTIVE,
            seller: msg.sender,
            tokenContract: tokenContract,
            tokenId: tokenId,
            amount: amount,
            startPrice: startPrice,
            endPrice: endPrice,
            startTime: startTime,
            endTime: endTime,
            reservePrice: reservePrice,
            currency: currency,
            highestBidder: address(0),
            highestBid: 0
        });

        emit ListingCreated(listingId, msg.sender, tokenContract, tokenId, listingType);
    }

    function cancelListing(bytes32 listingId) external nonReentrant {
        Listing storage listing = listings[listingId];
        require(listing.status == ListingStatus.ACTIVE, "Inactive");
        require(msg.sender == listing.seller || hasRole(ADMIN_ROLE, msg.sender), "Not seller");

        listing.status = ListingStatus.CANCELLED;
        _releaseListingAsset(listing, listing.seller);

        // allow highest bidder to withdraw
        if (listing.highestBid > 0) {
            pendingWithdrawals[listing.highestBidder] += listing.highestBid;
            emit BidWithdrawn(listingId, listing.highestBidder, listing.highestBid);
        }

        emit ListingCancelled(listingId);
    }

    // -------------------------------------------------------------------------
    // Fixed sale + Dutch auction settlement
    // -------------------------------------------------------------------------

    function buyNow(bytes32 listingId) external payable nonReentrant whenNotPaused {
        Listing storage listing = listings[listingId];
        require(listing.status == ListingStatus.ACTIVE, "Inactive");
        require(
            listing.listingType == ListingType.FIXED
                || listing.listingType == ListingType.AUCTION_DUTCH
                || listing.listingType == ListingType.BUNDLE_FIXED,
            "Not buyable"
        );
        require(block.timestamp >= listing.startTime, "Not started");
        require(block.timestamp <= listing.endTime, "Expired");

        uint256 priceToPay = listing.listingType == ListingType.FIXED
            ? listing.startPrice
            : _currentDutchPrice(listing);

        _collectPayment(listing.currency, msg.sender, priceToPay);
        listing.status = ListingStatus.SETTLED;
        _distributeProceeds(listing, msg.sender, priceToPay);

        emit SaleSettled(listingId, msg.sender, priceToPay);
    }

    function _currentDutchPrice(Listing memory listing) internal view returns (uint256) {
        if (block.timestamp <= listing.startTime) {
            return listing.startPrice;
        }
        if (block.timestamp >= listing.endTime) {
            return listing.endPrice;
        }
        uint256 elapsed = block.timestamp - listing.startTime;
        uint256 duration = listing.endTime - listing.startTime;
        uint256 priceDiff = listing.startPrice - listing.endPrice;
        return listing.startPrice - ((priceDiff * elapsed) / duration);
    }

    // -------------------------------------------------------------------------
    // English auction flow
    // -------------------------------------------------------------------------

    function placeBid(bytes32 listingId) external payable whenNotPaused nonReentrant {
        Listing storage listing = listings[listingId];
        require(listing.status == ListingStatus.ACTIVE, "Inactive");
        require(listing.listingType == ListingType.AUCTION_ENGLISH, "Not auction");
        require(block.timestamp >= listing.startTime, "Not started");
        require(block.timestamp <= listing.endTime, "Ended");
        require(listing.currency == address(0), "ERC20 auction not enabled");

        uint256 minBid = listing.highestBid == 0
            ? listing.startPrice
            : listing.highestBid + ((listing.highestBid * minBidIncrementBps) / 10_000);
        require(msg.value >= minBid, "Bid too low");

        if (listing.highestBid > 0) {
            pendingWithdrawals[listing.highestBidder] += listing.highestBid;
        }

        listing.highestBidder = msg.sender;
        listing.highestBid = msg.value;

        if (
            auctionConfig.extensionWindow > 0
                && auctionConfig.extensionDuration > 0
                && listing.endTime > block.timestamp
                && listing.endTime - block.timestamp <= auctionConfig.extensionWindow
        ) {
            listing.endTime += auctionConfig.extensionDuration;
            emit AuctionExtended(listingId, listing.endTime);
        }

        emit BidPlaced(listingId, msg.sender, msg.value);
    }

    function settleAuction(bytes32 listingId) external nonReentrant {
        Listing storage listing = listings[listingId];
        require(listing.listingType == ListingType.AUCTION_ENGLISH, "Not auction");
        require(listing.status == ListingStatus.ACTIVE, "Inactive");
        require(block.timestamp > listing.endTime, "Not ended");

        require(
            listing.highestBid >= listing.reservePrice && listing.highestBid > 0,
            "Reserve not met"
        );

        listing.status = ListingStatus.SETTLED;
        _distributeProceeds(listing, listing.highestBidder, listing.highestBid);

        emit SaleSettled(listingId, listing.highestBidder, listing.highestBid);
    }

    function withdrawOverbid() external nonReentrant {
        uint256 amount = pendingWithdrawals[msg.sender];
        require(amount > 0, "Nothing to withdraw");
        pendingWithdrawals[msg.sender] = 0;
        (bool ok, ) = msg.sender.call{value: amount}("");
        require(ok, "Withdraw failed");
    }

    // -------------------------------------------------------------------------
    // Internal helpers
    // -------------------------------------------------------------------------

    function _escrowAsset(
        address from,
        address tokenContract,
        uint256 tokenId,
        uint256 amount
    ) internal {
        if (IERC165(tokenContract).supportsInterface(type(IERC1155).interfaceId)) {
            IERC1155(tokenContract).safeTransferFrom(from, address(this), tokenId, amount, "");
        } else {
            require(amount == 1, "ERC721 amount must be 1");
            IERC721(tokenContract).transferFrom(from, address(this), tokenId);
        }
    }

    function _releaseListingAsset(Listing storage listing, address to) internal {
        if (listing.listingType == ListingType.BUNDLE_FIXED) {
            require(address(bundleComposer) != address(0), "Composer missing");
            if (listing.status == ListingStatus.CANCELLED) {
                bundleComposer.returnBundleToSeller(listing.tokenId);
            } else {
                bundleComposer.transferBundleTo(listing.tokenId, to);
            }
        } else {
            _releaseAsset(to, listing.tokenContract, listing.tokenId, listing.amount);
        }
    }

    function _releaseAsset(
        address to,
        address tokenContract,
        uint256 tokenId,
        uint256 amount
    ) internal {
        if (IERC165(tokenContract).supportsInterface(type(IERC1155).interfaceId)) {
            IERC1155(tokenContract).safeTransferFrom(address(this), to, tokenId, amount, "");
        } else {
            IERC721(tokenContract).transferFrom(address(this), to, tokenId);
        }
    }

    function _collectPayment(address currency, address payer, uint256 amount) internal {
        if (currency == address(0)) {
            require(msg.value == amount, "Invalid ETH value");
        } else {
            revert("ERC20 payments not yet supported");
        }
    }

    function _distributeProceeds(
        Listing storage listing,
        address buyer,
        uint256 amountPaid
    ) internal {
        if (listing.currency == address(0) && msg.value > 0) {
            require(msg.value >= amountPaid, "Payment short");
        }

        (address royaltyReceiver, uint256 royaltyAmount) = listing.listingType ==
            ListingType.BUNDLE_FIXED
            ? (address(0), 0)
            : _royaltyInfo(listing, amountPaid);
        _releaseListingAsset(listing, buyer);

        if (royaltyReceiver != address(0) && royaltyAmount > 0) {
            _transferNative(royaltyReceiver, royaltyAmount);
            _transferNative(listing.seller, amountPaid - royaltyAmount);
        } else {
            _transferNative(listing.seller, amountPaid);
        }
    }

    function _transferNative(address to, uint256 amount) internal {
        (bool ok, ) = to.call{value: amount}("");
        require(ok, "Native transfer failed");
    }

    function _royaltyInfo(
        Listing storage listing,
        uint256 amount
    ) internal view returns (address, uint256) {
        if (!IERC165(listing.tokenContract).supportsInterface(type(IERC2981).interfaceId)) {
            return (address(0), 0);
        }
        return IERC2981(listing.tokenContract).royaltyInfo(listing.tokenId, amount);
    }

    // -------------------------------------------------------------------------
    // Required for receiving ERC1155 tokens
    // -------------------------------------------------------------------------

    function onERC1155Received(
        address,
        address,
        uint256,
        uint256,
        bytes calldata
    ) external pure returns (bytes4) {
        return this.onERC1155Received.selector;
    }

    function onERC1155BatchReceived(
        address,
        address,
        uint256[] calldata,
        uint256[] calldata,
        bytes calldata
    ) external pure returns (bytes4) {
        return this.onERC1155BatchReceived.selector;
    }
}
