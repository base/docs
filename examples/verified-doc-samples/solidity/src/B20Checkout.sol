// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {IB20} from "base-std/interfaces/IB20.sol";

contract B20Checkout {
    error OrderAlreadyPaid(bytes32 orderId);

    IB20 public immutable token;
    address public immutable merchant;
    mapping(bytes32 => bool) public paid;

    constructor(IB20 token_, address merchant_) {
        token = token_;
        merchant = merchant_;
    }

    // docs:start b20-accept-solidity
    function pay(bytes32 orderId, uint256 amount) external {
        if (paid[orderId]) revert OrderAlreadyPaid(orderId);
        paid[orderId] = true;
        bool transferred = token.transferFromWithMemo(msg.sender, merchant, amount, orderId);
        require(transferred, "B20 transfer failed");
    }
    // docs:end b20-accept-solidity
}
