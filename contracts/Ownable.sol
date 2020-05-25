pragma solidity >0.4.99 <0.7.0;

contract Ownable {
    // State variable
    address payable public owner;
    bool public paused;

    // Modifiers
    modifier onlyOwner() {
        require(msg.sender == owner, "This function can only be called by the contract owner");
        _;
    }
    modifier pausable {
        require(!paused, "The contract has been paused");
        _;
    }

    // constructor
    constructor() public {
        owner = msg.sender;
    }
}