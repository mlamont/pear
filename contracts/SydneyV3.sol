// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.4.0
pragma solidity ^0.8.27;

import "./Sydney.sol";

contract SydneyV3 is Sydney {
    function version() public pure returns (string memory) {
        return "version 3, yar";
    }
}
