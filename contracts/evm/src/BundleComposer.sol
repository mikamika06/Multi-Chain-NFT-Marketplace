// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import {IERC1155} from "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import {IERC1155Receiver} from "@openzeppelin/contracts/token/ERC1155/IERC1155Receiver.sol";
import {IBundleComposer} from "./interfaces/IBundleComposer.sol";

/// @notice Holds multiple NFT assets and releases them atomically when instructed by the marketplace.
contract BundleComposer is
    AccessControl,
    ReentrancyGuard,
    IERC721Receiver,
    IERC1155Receiver,
    IBundleComposer
{
    bytes32 public constant MARKETPLACE_ROLE = keccak256("MARKETPLACE_ROLE");

    struct Bundle {
        address owner;
        bool locked;
        address marketplace;
        BundleItem[] items;
    }

    uint256 private _nextBundleId = 1;
    mapping(uint256 => Bundle) private _bundles;

    event BundleCreated(uint256 indexed bundleId, address indexed owner, uint256 itemCount);
    event BundleLocked(uint256 indexed bundleId, address indexed marketplace);
    event BundleReleased(uint256 indexed bundleId, address indexed to);
    event BundleCancelled(uint256 indexed bundleId, address indexed owner);

    struct BundleItemInput {
        address tokenContract;
        uint256 tokenId;
        uint256 amount;
    }

    constructor(address admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
    }

    function createBundle(BundleItemInput[] calldata items) external nonReentrant returns (uint256 bundleId) {
        require(items.length > 0, "Empty bundle");
        bundleId = _nextBundleId++;

        Bundle storage bundle = _bundles[bundleId];
        bundle.owner = msg.sender;

        for (uint256 i = 0; i < items.length; i++) {
            BundleItemInput calldata input = items[i];
            require(input.tokenContract != address(0), "Invalid token");
            require(input.amount > 0, "Invalid amount");

            bool is1155 = IERC165(input.tokenContract).supportsInterface(type(IERC1155).interfaceId);
            if (is1155) {
                IERC1155(input.tokenContract).safeTransferFrom(
                    msg.sender,
                    address(this),
                    input.tokenId,
                    input.amount,
                    ""
                );
            } else {
                require(input.amount == 1, "ERC721 amount must be 1");
                IERC721(input.tokenContract).transferFrom(msg.sender, address(this), input.tokenId);
            }

            bundle.items.push(
                BundleItem({
                    tokenContract: input.tokenContract,
                    tokenId: input.tokenId,
                    amount: input.amount,
                    is1155: is1155
                })
            );
        }

        emit BundleCreated(bundleId, msg.sender, items.length);
    }

    function ownerOf(uint256 bundleId) external view returns (address) {
        return _bundles[bundleId].owner;
    }

    function lockBundle(uint256 bundleId, address seller) external onlyRole(MARKETPLACE_ROLE) {
        Bundle storage bundle = _bundles[bundleId];
        require(bundle.owner == seller, "Owner mismatch");
        require(!bundle.locked, "Already locked");
        bundle.locked = true;
        bundle.marketplace = msg.sender;
        emit BundleLocked(bundleId, msg.sender);
    }

    function transferBundleTo(uint256 bundleId, address recipient) external onlyRole(MARKETPLACE_ROLE) {
        Bundle storage bundle = _bundles[bundleId];
        require(bundle.locked, "Not locked");
        require(bundle.marketplace == msg.sender, "Invalid marketplace");
        bundle.locked = false;
        bundle.marketplace = address(0);
        bundle.owner = recipient;

        for (uint256 i = 0; i < bundle.items.length; i++) {
            _transferItem(bundle.items[i], recipient);
        }

        emit BundleReleased(bundleId, recipient);
    }

    function returnBundleToSeller(uint256 bundleId) external onlyRole(MARKETPLACE_ROLE) {
        Bundle storage bundle = _bundles[bundleId];
        require(bundle.locked, "Not locked");
        require(bundle.marketplace == msg.sender, "Invalid marketplace");
        bundle.locked = false;
        bundle.marketplace = address(0);
        address seller = bundle.owner;

        for (uint256 i = 0; i < bundle.items.length; i++) {
            _transferItem(bundle.items[i], seller);
        }

        emit BundleCancelled(bundleId, seller);
    }

    function getItems(uint256 bundleId) external view returns (BundleItem[] memory) {
        Bundle storage bundle = _bundles[bundleId];
        BundleItem[] memory items = new BundleItem[](bundle.items.length);
        for (uint256 i = 0; i < bundle.items.length; i++) {
            items[i] = bundle.items[i];
        }
        return items;
    }

    function supportsInterface(bytes4 interfaceId) public view virtual override(AccessControl, IERC165) returns (bool) {
        return
            interfaceId == type(IERC721Receiver).interfaceId ||
            interfaceId == type(IERC1155Receiver).interfaceId ||
            AccessControl.supportsInterface(interfaceId);
    }

    function onERC721Received(address, address, uint256, bytes calldata) external pure override returns (bytes4) {
        return IERC721Receiver.onERC721Received.selector;
    }

    function onERC1155Received(
        address,
        address,
        uint256,
        uint256,
        bytes calldata
    ) external pure override returns (bytes4) {
        return IERC1155Receiver.onERC1155Received.selector;
    }

    function onERC1155BatchReceived(
        address,
        address,
        uint256[] calldata,
        uint256[] calldata,
        bytes calldata
    ) external pure override returns (bytes4) {
        return IERC1155Receiver.onERC1155BatchReceived.selector;
    }

    function _transferItem(BundleItem memory item, address to) internal {
        if (item.is1155) {
            IERC1155(item.tokenContract).safeTransferFrom(address(this), to, item.tokenId, item.amount, "");
        } else {
            IERC721(item.tokenContract).transferFrom(address(this), to, item.tokenId);
        }
    }
}
