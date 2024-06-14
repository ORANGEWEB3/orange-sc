pragma solidity 0.8.17;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract BridgeDeposit is Ownable {
  using SafeERC20 for IERC20;
  address public token;
  uint256 public totalDepositedAmounts;
  mapping(address => uint256) public depositedAmounts; // Tracks deposited amounts for each user

  event Deposit (address indexed user, uint256 amount);
  event Burned (address indexed sender, uint256 amount);

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
   * Owner to burn the token from this contract (send to 0x1 address - inaccessible address)
   *
   * @param _amount total amount to withdraw
   */
  function burn( uint256 _amount) external onlyOwner {
    require(_amount > 0, "Amount must be greater than 0");
    IERC20 _token = IERC20(token);
    // transfer to the inaccessible address
    _token.safeTransfer(address(0x1), _amount);
    
    emit Burned(msg.sender, _amount);
  }
}