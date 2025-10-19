// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title WormholeBridgeAdapter
/// @notice Simplified adapter emitting events consumed by indexers to mirror Wormhole transfers.
contract WormholeBridgeAdapter is Ownable, IERC721Receiver {
    event WormholeTransferInitiated(
        address indexed sender,
        uint16 indexed dstChainId,
        address indexed token,
        uint256 tokenId,
        string uri
    );

    event WormholeTransferCompleted(
        uint16 indexed srcChainId,
        address indexed receiver,
        address indexed token,
        uint256 tokenId,
        string uri
    );

    mapping(address token => mapping(uint256 tokenId => address originalOwner)) public escrowOwner;

    function initiateTransfer(
        address token,
        uint256 tokenId,
        uint16 dstChainId,
        string calldata uri
    ) external {
        IERC721(token).transferFrom(msg.sender, address(this), tokenId);
        escrowOwner[token][tokenId] = msg.sender;
        emit WormholeTransferInitiated(msg.sender, dstChainId, token, tokenId, uri);
    }

    function completeTransfer(
        uint16 srcChainId,
        address receiver,
        address token,
        uint256 tokenId,
        string calldata uri
    ) external onlyOwner {
        address cachedOwner = escrowOwner[token][tokenId];
        if (cachedOwner != address(0)) {
            delete escrowOwner[token][tokenId];
        }
        IERC721(token).safeTransferFrom(address(this), receiver, tokenId);
        emit WormholeTransferCompleted(srcChainId, receiver, token, tokenId, uri);
    }

    function onERC721Received(
        address,
        address,
        uint256,
        bytes calldata
    ) external pure override returns (bytes4) {
        return IERC721Receiver.onERC721Received.selector;
    }
}
