pragma solidity ^0.8.13;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";


contract SaleDeposit is Ownable {
  using SafeMath for uint256;
  
  uint256 public price;
  uint256 public totalSlotsLimit;
  uint256 public maxQtyPerTransaction;

  uint256 public totalDepositedAmount; // tracks total deposit amount
  uint256 public totalBoughtQty; // tracks total qty bought
  mapping(address => uint256) public userQty; // Tracks total qty amounts for each user
  mapping(address => uint256) public userDepositedAmount; // Tracks deposited amounts for each user

  event Deposit (address indexed user, uint256 qty, uint256 amountSent);
  event Withdraw (address indexed sender, address recipient, uint256 amount);

  receive() external payable {
      revert("fallback payable not allowed");
  } 

  constructor(uint256 _price, uint256 _totalSlotsLimit, uint256 _maxQtyPerTransaction) {
    require(_price > 0, "price cannot be 0");
    require(_totalSlotsLimit > 0, "_totalSlotsLimit cannot be 0");
    require(_maxQtyPerTransaction > 0, "_maxQtyPerTransaction cannot be 0");

    price = _price;
    totalSlotsLimit = _totalSlotsLimit;
    maxQtyPerTransaction = _maxQtyPerTransaction;
  }

  /**
   * @param _totalQty total qty to deposit
   * @dev msg.value must be equal to price * _totalQty, otherwise it will revert
   */
  function deposit(uint256 _totalQty) external payable {
    require(_totalQty > 0, "totalQty must be greater than 0");
    require(_totalQty <= maxQtyPerTransaction, "totalQty exceeds limit per tx");
    require(totalBoughtQty + _totalQty <= totalSlotsLimit, "totalQty exceeds slot limit");
    require(msg.value == _totalQty.mul(price), "invalid value sent");
    
    userDepositedAmount[msg.sender] += msg.value;
    userQty[msg.sender] += _totalQty;

    totalBoughtQty += _totalQty;
    totalDepositedAmount += msg.value;

    emit Deposit(msg.sender, _totalQty, msg.value);
  }

  /**
   * Owner to withdraw the token from this contract (could be used to transfer the token to the 0 address)
   *
   * @param _recipient Recipient address, could be 0 address
   * @param _amount total amount to withdraw
   */
  function withdraw(address _recipient, uint256 _amount) external onlyOwner {
    require(_amount > 0, "Amount must be greater than 0");
    require(_amount <= address(this).balance, "Insufficient balance in the contract");
    
    payable(_recipient).transfer(_amount);
    
    emit Withdraw(msg.sender, _recipient, _amount);
  }
}