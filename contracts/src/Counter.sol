// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.10;

contract Counter {
    uint private count;
    address private _owner;

    function initialize(uint num) public {
        _owner = msg.sender;
        count = num;
    }

    function owner() public view returns (address) {
        return _owner;
    }

    // getter
    function getCounter() public view returns (uint) {
        return count;
    }

    //and it can add to a count
    function setNumber(uint256 _count) public {
        count = _count;
    }

    //and it can add to a count
    function increment() public {
        count = count + 1;
    }
}
