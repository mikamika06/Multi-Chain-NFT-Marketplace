// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {ONFT721} from "layerzero/token/onft721/ONFT721.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

/// @title CrossChainNFT
/// @notice LayerZero ONFT that supports lock/mint and burn/mint bridging modes with URI propagation.
contract CrossChainNFT is ONFT721 {
    using Strings for uint256;

    string private baseTokenURI;
    mapping(uint256 tokenId => string tokenUri) private tokenURIs;
    mapping(uint256 tokenId => bool) public burnMintMode;

    error Unauthorized();

    event BridgeModeUpdated(uint256 indexed tokenId, bool burnMint);
    event BridgeInitiated(
        address indexed sender,
        uint16 indexed dstChainId,
        address indexed to,
        uint256 tokenId,
        bool burnMint,
        string uri,
        bytes adapterParams
    );
    event BridgeReceived(
        uint16 indexed srcChainId,
        address indexed to,
        uint256 tokenId,
        bool burnMint,
        string uri
    );

    uint256 public constant DEFAULT_MIN_GAS = 200_000;

    constructor(
        address endpoint_,
        string memory name_,
        string memory symbol_,
        string memory baseTokenURI_
    ) ONFT721(name_, symbol_, DEFAULT_MIN_GAS, endpoint_) {
        baseTokenURI = baseTokenURI_;
    }

    // -------------------------------------------------------------------------
    // Mint / metadata configuration
    // -------------------------------------------------------------------------

    function mint(address to, uint256 tokenId, string calldata uri) external onlyOwner {
        _mint(to, tokenId);
        if (bytes(uri).length > 0) {
            tokenURIs[tokenId] = uri;
        }
    }

    function setBaseTokenURI(string calldata newBaseURI) external onlyOwner {
        baseTokenURI = newBaseURI;
    }

    function setTokenURI(uint256 tokenId, string calldata newTokenURI) external onlyOwner {
        tokenURIs[tokenId] = newTokenURI;
    }

    function configureBridgeMode(uint256 tokenId, bool burnMint) external onlyOwner {
        burnMintMode[tokenId] = burnMint;
        emit BridgeModeUpdated(tokenId, burnMint);
    }

    /// @notice Helper to expose the underlying LZ trusted remote setter.
    function setTrustedRemote(uint16 dstChainId, address remote) external onlyOwner {
        bytes memory path = abi.encodePacked(remote, address(this));
        trustedRemoteLookup[dstChainId] = path;
        emit SetTrustedRemoteAddress(dstChainId, path);
    }

    // -------------------------------------------------------------------------
    // LayerZero bridge logic
    // -------------------------------------------------------------------------

    function bridge(uint16 dstChainId, address to, uint256 tokenId, bytes calldata adapterParams) public payable {
        if (_msgSender() != ownerOf(tokenId)) {
            revert Unauthorized();
        }

        bytes memory payload = abi.encode(to, tokenId, tokenURI(tokenId));
        bool burnMint = burnMintMode[tokenId];

        emit BridgeInitiated(_msgSender(), dstChainId, to, tokenId, burnMint, tokenURI(tokenId), adapterParams);

        if (burnMint) {
            _burn(tokenId);
            _lzSend(dstChainId, payload, refundAddress(), address(0), adapterParams, msg.value);
        } else {
            _debitFrom(_msgSender(), dstChainId, abi.encodePacked(to), tokenId);
            _lzSend(dstChainId, payload, refundAddress(), address(0), adapterParams, msg.value);
        }
    }

    function sendNFT(uint16 dstChainId, address to, uint256 tokenId, bytes calldata opts) public payable {
        bridge(dstChainId, to, tokenId, opts);
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        string memory explicitTokenUri = tokenURIs[tokenId];
        if (bytes(explicitTokenUri).length > 0) {
            return explicitTokenUri;
        }
        return string.concat(baseTokenURI, tokenId.toString());
    }

    function refundAddress() internal view returns (address payable) {
        return payable(_msgSender());
    }

    function _nonblockingLzReceive(
        uint16 srcChainId,
        bytes memory,
        uint64,
        bytes memory payload
    ) internal override {
        (address to, uint256 tokenId, string memory uri) = abi.decode(payload, (address, uint256, string));

        bool burnMint = burnMintMode[tokenId];

        if (burnMint) {
            if (!_exists(tokenId)) {
                _mint(to, tokenId);
            } else {
                _safeTransfer(address(this), to, tokenId, "");
            }
        } else {
            _creditTo(srcChainId, to, tokenId);
        }

        if (bytes(uri).length > 0) {
            tokenURIs[tokenId] = uri;
        }

        emit BridgeReceived(srcChainId, to, tokenId, burnMint, uri);
    }
}
