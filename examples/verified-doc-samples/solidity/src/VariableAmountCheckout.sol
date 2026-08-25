// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

interface IERC20PermitToken {
    function permit(
        address owner,
        address spender,
        uint256 value,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external;

    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

contract VariableAmountCheckout {
    error AmountExceedsMaximum();
    error NotMerchant();
    error OrderAlreadyCaptured(bytes32 orderId);

    IERC20PermitToken public immutable token;
    address public immutable merchant;
    mapping(bytes32 => bool) public captured;

    event PaymentCaptured(bytes32 indexed orderId, address indexed payer, uint256 amount, uint256 authorizedMaximum);

    constructor(IERC20PermitToken token_, address merchant_) {
        token = token_;
        merchant = merchant_;
    }

    // docs:start variable-amount-checkout-solidity
    function capture(
        bytes32 orderId,
        address payer,
        uint256 actualAmount,
        uint256 authorizedMaximum,
        uint256 permitDeadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        if (msg.sender != merchant) revert NotMerchant();
        if (captured[orderId]) revert OrderAlreadyCaptured(orderId);
        if (actualAmount > authorizedMaximum) revert AmountExceedsMaximum();
        captured[orderId] = true;

        token.permit(payer, address(this), authorizedMaximum, permitDeadline, v, r, s);
        require(token.transferFrom(payer, merchant, actualAmount), "transfer failed");
        emit PaymentCaptured(orderId, payer, actualAmount, authorizedMaximum);
    }
    // docs:end variable-amount-checkout-solidity
}
