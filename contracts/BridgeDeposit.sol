pragma solidity 0.8.17;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract BridgeDeposit is Ownable {
  using SafeERC20 for IERC20;
  address public token;
  uint256 public totalDepositedAmounts;
  mapping(address => uint256) public depositedAmounts; // Tracks deposited amounts for each user

  event Deposit (address indexed user, uint256 amount);
  event Withdraw (address indexed sender, address recipient, uint256 amount);

  constructor(address _token) {
    require(_token != address(0), "invalid token address");

    token = _token;
  }

  /**
   * @param _amount deposited amount
   * @dev users are required to do token approval to this contract before execute this function
   */
  function deposit(uint256 _amount) external {
    require(_amount > 0, "Amount must be greater than 0");
    
    // Transfer tokens from the user to this contract
    IERC20 _token = IERC20(token);
    _token.safeTransferFrom(msg.sender, address(this), _amount);

    depositedAmounts[msg.sender] += _amount;
    totalDepositedAmounts += _amount;

    emit Deposit(msg.sender, _amount);
  }

  /**
   * Owner to withdraw the token from this contract (could be used to transfer the token to the 0 address - to burn the token)
   *
   * @param _recipient Recipient address, could be 0 address
   * @param _amount total amount to withdraw
   */
  function withdraw(address _recipient, uint256 _amount) external onlyOwner {
    require(_amount > 0, "Amount must be greater than 0");
    IERC20 _token = IERC20(token);
    _token.safeTransfer(_recipient, _amount);
    
    emit Withdraw(msg.sender, _recipient, _amount);
  }
}