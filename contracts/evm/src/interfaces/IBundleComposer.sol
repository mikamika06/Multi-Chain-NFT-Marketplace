// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

interface IBundleComposer {
    struct BundleItem {
        address tokenContract;
        uint256 tokenId;
        uint256 amount;
        bool is1155;
    }

    function ownerOf(uint256 bundleId) external view returns (address);

    function lockBundle(uint256 bundleId, address seller) external;

    function transferBundleTo(uint256 bundleId, address recipient) external;

    function returnBundleToSeller(uint256 bundleId) external;

    function getItems(uint256 bundleId) external view returns (BundleItem[] memory);
}
