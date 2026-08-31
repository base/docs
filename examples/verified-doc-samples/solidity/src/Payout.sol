// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

interface IERC20TransferFrom {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

contract Payout {
    error BatchAlreadyProcessed(bytes32 batchReference);
    error InvalidArrayLengths();
    error InvalidBasisPoints();
    error TooManyRecipients();

    uint256 public constant MAX_RECIPIENTS = 100;
    IERC20TransferFrom public immutable token;
    mapping(bytes32 => bool) public processed;

    event PayoutSent(bytes32 indexed batchReference, address indexed sender, address indexed recipient, uint256 amount);

    constructor(IERC20TransferFrom token_) {
        token = token_;
    }

    // docs:start payout-batch-solidity
    function sendPayouts(bytes32 batchId, address[] calldata recipients, uint256[] calldata amounts) external {
        if (processed[batchId]) revert BatchAlreadyProcessed(batchId);
        if (recipients.length == 0 || recipients.length != amounts.length) revert InvalidArrayLengths();
        if (recipients.length > MAX_RECIPIENTS) revert TooManyRecipients();
        processed[batchId] = true;

        for (uint256 i; i < recipients.length; ++i) {
            require(token.transferFrom(msg.sender, recipients[i], amounts[i]), "transfer failed");
            emit PayoutSent(batchId, msg.sender, recipients[i], amounts[i]);
        }
    }
    // docs:end payout-batch-solidity

    // docs:start split-payment-solidity
    function splitPayment(
        bytes32 splitId,
        uint256 amount,
        address[] calldata recipients,
        uint16[] calldata sharesBps,
        uint256 remainderRecipient
    ) external {
        if (processed[splitId]) revert BatchAlreadyProcessed(splitId);
        if (recipients.length == 0 || recipients.length != sharesBps.length) revert InvalidArrayLengths();
        if (recipients.length > MAX_RECIPIENTS || remainderRecipient >= recipients.length) revert TooManyRecipients();

        uint256 totalBps;
        uint256 distributed;
        uint256[] memory amounts = new uint256[](recipients.length);
        for (uint256 i; i < recipients.length; ++i) {
            totalBps += sharesBps[i];
            amounts[i] = amount * sharesBps[i] / 10_000;
            distributed += amounts[i];
        }
        if (totalBps != 10_000) revert InvalidBasisPoints();
        amounts[remainderRecipient] += amount - distributed;
        processed[splitId] = true;

        for (uint256 i; i < recipients.length; ++i) {
            require(token.transferFrom(msg.sender, recipients[i], amounts[i]), "transfer failed");
            emit PayoutSent(splitId, msg.sender, recipients[i], amounts[i]);
        }
    }
    // docs:end split-payment-solidity
}
