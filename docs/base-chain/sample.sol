// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title SimpleVault
 * @dev A basic vault contract for Base L2 that allows users to deposit and withdraw ETH
 * @notice This demonstrates common patterns for Base L2 smart contracts
 */
contract SimpleVault {
    // State variables
    mapping(address => uint256) public balances;
    uint256 public totalDeposits;
    address public owner;
    bool public isPaused;
    
    // Events
    event Deposit(address indexed user, uint256 amount, uint256 timestamp);
    event Withdrawal(address indexed user, uint256 amount, uint256 timestamp);
    event EmergencyWithdraw(address indexed user, uint256 amount);
    event PauseToggled(bool isPaused);
    
    // Modifiers
    modifier onlyOwner() {
        require(msg.sender == owner, "Not authorized");
        _;
    }
    
    modifier whenNotPaused() {
        require(!isPaused, "Contract is paused");
        _;
    }
    
    // Constructor
    constructor() {
        owner = msg.sender;
        isPaused = false;
    }
    
    /**
     * @dev Deposit ETH into the vault
     * @notice Sends ETH to this function to deposit
     */
    function deposit() external payable whenNotPaused {
        require(msg.value > 0, "Deposit must be greater than 0");
        
        balances[msg.sender] += msg.value;
        totalDeposits += msg.value;
        
        emit Deposit(msg.sender, msg.value, block.timestamp);
    }
    
    /**
     * @dev Withdraw ETH from the vault
     * @param amount The amount to withdraw in wei
     */
    function withdraw(uint256 amount) external whenNotPaused {
        require(amount > 0, "Amount must be greater than 0");
        require(balances[msg.sender] >= amount, "Insufficient balance");
        require(address(this).balance >= amount, "Insufficient contract balance");
        
        balances[msg.sender] -= amount;
        totalDeposits -= amount;
        
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");
        
        emit Withdrawal(msg.sender, amount, block.timestamp);
    }
    
    /**
     * @dev Emergency withdraw - allows users to withdraw even when paused
     */
    function emergencyWithdraw() external {
        uint256 balance = balances[msg.sender];
        require(balance > 0, "No balance to withdraw");
        
        balances[msg.sender] = 0;
        totalDeposits -= balance;
        
        (bool success, ) = msg.sender.call{value: balance}("");
        require(success, "Transfer failed");
        
        emit EmergencyWithdraw(msg.sender, balance);
    }
    
    /**
     * @dev Get the balance of a specific user
     * @param user The address to check
     * @return The balance of the user
     */
    function getBalance(address user) external view returns (uint256) {
        return balances[user];
    }
    
    /**
     * @dev Get the contract's total ETH balance
     * @return The total ETH held by the contract
     */
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }
    
    /**
     * @dev Toggle pause state (owner only)
     */
    function togglePause() external onlyOwner {
        isPaused = !isPaused;
        emit PauseToggled(isPaused);
    }
    
    /**
     * @dev Transfer ownership (owner only)
     * @param newOwner The address of the new owner
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid address");
        owner = newOwner;
    }
    
    // Fallback function to receive ETH
    receive() external payable {
        balances[msg.sender] += msg.value;
        totalDeposits += msg.value;
        emit Deposit(msg.sender, msg.value, block.timestamp);
    }
}
