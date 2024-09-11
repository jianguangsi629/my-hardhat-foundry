// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.10;

// Uncomment this line to use console.log
import "hardhat/console.sol";

contract Lock {
    uint public unlockTime;
    address payable public owner;

    event Withdrawal(uint amount, uint when);

    constructor(uint _unlockTime) payable {
        console.log(_unlockTime); // 在 Hardhat 测试中输出 unlockTime

        require(block.timestamp < _unlockTime, "Unlock time should be in the future");

        unlockTime = _unlockTime;
        owner = payable(msg.sender);
    }

    function withdraw() public {
        // Uncomment this line, and the import of "hardhat/console.sol", to print a log in your terminal
        console.log("Unlock time is %o and block timestamp is %o", unlockTime, block.timestamp);

        require(block.timestamp >= unlockTime, "You can not withdraw yet");
        require(msg.sender == owner, "You aren not the owner");

        emit Withdrawal(address(this).balance, block.timestamp);

        owner.transfer(address(this).balance);
    }
}
