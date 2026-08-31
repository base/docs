// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Script} from "forge-std/Script.sol";
import {StdPrecompiles} from "base-std/StdPrecompiles.sol";
import {IB20} from "base-std/interfaces/IB20.sol";
import {IB20Asset} from "base-std/interfaces/IB20Asset.sol";
import {IB20Factory} from "base-std/interfaces/IB20Factory.sol";
import {IPolicyRegistry} from "base-std/interfaces/IPolicyRegistry.sol";
import {B20Constants} from "base-std/lib/B20Constants.sol";
import {B20FactoryLib} from "base-std/lib/B20FactoryLib.sol";

contract B20Examples is Script {
    // docs:start stablecoin-create-solidity
    function createStablecoin(address admin) public returns (address token) {
        B20FactoryLib.B20RoleHolders memory holders = B20FactoryLib.B20RoleHolders({
            minter: admin,
            burner: admin,
            burnBlocker: admin,
            pauser: admin,
            unpauser: admin,
            metadataAdmin: admin
        });
        bytes[] memory roles = B20FactoryLib.buildRoleGrants(holders);
        bytes[] memory settings = new bytes[](1);
        settings[0] = B20FactoryLib.encodeUpdateSupplyCap(10_000_000e6);
        token = StdPrecompiles.B20_FACTORY.createB20(
            IB20Factory.B20Variant.STABLECOIN,
            keccak256("merchant-usd-v1"),
            B20FactoryLib.encodeStablecoinCreateParams("Merchant USD", "MUSD", admin, "USD"),
            B20FactoryLib.concat(roles, settings)
        );
    }
    // docs:end stablecoin-create-solidity

    // docs:start stablecoin-mint-solidity
    function mintStablecoin(address token, address holder) public {
        IB20(token).mint(holder, 1_000e6);
        require(IB20(token).balanceOf(holder) >= 1_000e6, "mint not recorded");
    }
    // docs:end stablecoin-mint-solidity

    // docs:start stablecoin-burn-solidity
    function burnStablecoin(address token) public {
        uint256 supplyBefore = IB20(token).totalSupply();
        IB20(token).burn(400e6);
        require(supplyBefore - IB20(token).totalSupply() == 400e6, "wrong supply change");
    }
    // docs:end stablecoin-burn-solidity

    // docs:start stablecoin-restrict-solidity
    function restrictStablecoin(address token, address admin, address[] memory holders) public returns (uint64 id) {
        id = StdPrecompiles.POLICY_REGISTRY.createPolicyWithAccounts(
            admin, IPolicyRegistry.PolicyType.ALLOWLIST, holders
        );
        IB20(token).updatePolicy(B20Constants.TRANSFER_SENDER_POLICY, id);
        IB20(token).updatePolicy(B20Constants.TRANSFER_RECEIVER_POLICY, id);
        require(IB20(token).policyId(B20Constants.TRANSFER_RECEIVER_POLICY) == id, "policy not bound");
    }
    // docs:end stablecoin-restrict-solidity

    // docs:start stablecoin-block-solidity
    function setBlocked(uint64 policyId, address holder, bool blocked) public {
        address[] memory accounts = new address[](1);
        accounts[0] = holder;
        StdPrecompiles.POLICY_REGISTRY.updateBlocklist(policyId, blocked, accounts);
        require(StdPrecompiles.POLICY_REGISTRY.isAuthorized(policyId, holder) != blocked, "wrong policy state");
    }
    // docs:end stablecoin-block-solidity

    // docs:start stablecoin-recover-solidity
    function recoverStablecoin(address token, address blocked, address replacement) public {
        IB20(token).burnBlocked(blocked, 50e6);
        IB20(token).mint(replacement, 50e6);
        require(IB20(token).balanceOf(replacement) >= 50e6, "replacement not funded");
    }
    // docs:end stablecoin-recover-solidity

    // docs:start stock-create-solidity
    function createStock(address admin) public returns (address token) {
        B20FactoryLib.B20AssetRoleHolders memory holders = B20FactoryLib.B20AssetRoleHolders({
            minter: admin,
            burner: admin,
            burnBlocker: admin,
            pauser: admin,
            unpauser: admin,
            metadataAdmin: admin,
            operator: admin
        });
        bytes[] memory settings = new bytes[](1);
        settings[0] = B20FactoryLib.encodeUpdateSupplyCap(1_000_000e6);
        token = StdPrecompiles.B20_FACTORY.createB20(
            IB20Factory.B20Variant.ASSET,
            keccak256("example-class-a-v1"),
            B20FactoryLib.encodeAssetCreateParams("Example Corp Class A", "EXM", admin, 6),
            B20FactoryLib.concat(B20FactoryLib.buildRoleGrants(holders), settings)
        );
    }
    // docs:end stock-create-solidity

    // docs:start stock-issue-solidity
    function issueShares(address token, address alice, address bob) public {
        address[] memory recipients = new address[](2);
        recipients[0] = alice;
        recipients[1] = bob;
        uint256[] memory amounts = new uint256[](2);
        amounts[0] = 600e6;
        amounts[1] = 400e6;
        IB20Asset(token).batchMint(recipients, amounts);
    }
    // docs:end stock-issue-solidity

    // docs:start stock-restrict-solidity
    function restrictStock(address token, address admin, address[] memory holders) public returns (uint64 id) {
        id = StdPrecompiles.POLICY_REGISTRY.createPolicyWithAccounts(
            admin, IPolicyRegistry.PolicyType.ALLOWLIST, holders
        );
        IB20(token).updatePolicy(B20Constants.MINT_RECEIVER_POLICY, id);
        IB20(token).updatePolicy(B20Constants.TRANSFER_SENDER_POLICY, id);
        IB20(token).updatePolicy(B20Constants.TRANSFER_RECEIVER_POLICY, id);
    }
    // docs:end stock-restrict-solidity

    // docs:start stock-cancel-solidity
    function cancelBlockedShares(address token, address holder) public {
        IB20(token).burnBlocked(holder, 100e6);
    }
    // docs:end stock-cancel-solidity

    // docs:start stock-dividend-solidity
    function announceDividend(address token, address[] memory recipients, uint256[] memory amounts) public {
        bytes[] memory calls = new bytes[](1);
        calls[0] = abi.encodeCall(IB20Asset.batchMint, (recipients, amounts));
        IB20Asset(token).announce(
            calls,
            "2026-stock-dividend-01",
            "Five-percent stock dividend",
            "https://example.com/corporate-actions/2026-01"
        );
        require(IB20Asset(token).isAnnouncementIdUsed("2026-stock-dividend-01"), "announcement missing");
    }
    // docs:end stock-dividend-solidity

    // docs:start stock-split-solidity
    function splitStock(address token, address holder) public returns (uint256 scaledBalance) {
        IB20Asset(token).updateMultiplier(2e18);
        require(IB20Asset(token).multiplier() == 2e18, "multiplier not updated");
        scaledBalance = IB20Asset(token).scaledBalanceOf(holder);
    }
    // docs:end stock-split-solidity
}
