pragma solidity 0.8.17;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";


contract SaleDepositWhitelist is Ownable {
  uint256 public price;
  uint256 public totalSlotsLimit;
  uint256 public maxQtyPerTransaction;

  uint256 public totalDepositedAmount; // tracks total deposit amount
  uint256 public totalBoughtQty; // tracks total qty bought
  mapping(address => uint256) public userQty; // Tracks total qty amounts for each user
  mapping(address => uint256) public userDepositedAmount; // Tracks deposited amounts for each user
  bytes32 public merkleRoot;

  event Deposit (address indexed user, uint256 qty, uint256 amountSent);
  event Withdraw (address indexed sender, address recipient, uint256 amount);
  event SetMerkleRoot (address indexed sender, bytes32 oldMerkleRoot, bytes32 newMerkleRoot);

  modifier authorizeWhitelist(bytes32[] calldata proof) {
    require(
        checkWhitelisted(msg.sender, proof),
        "Unauthorized address for whitelist"
    );
    _;
  }

  receive() external payable {
      revert("fallback payable not allowed");
  } 

  constructor(uint256 _price, uint256 _totalSlotsLimit, uint256 _maxQtyPerTransaction, bytes32 _merkleRoot) {
    require(_price > 0, "price cannot be 0");
    require(_totalSlotsLimit > 0, "_totalSlotsLimit cannot be 0");
    require(_maxQtyPerTransaction > 0, "_maxQtyPerTransaction cannot be 0");

    price = _price;
    totalSlotsLimit = _totalSlotsLimit;
    maxQtyPerTransaction = _maxQtyPerTransaction;
    merkleRoot = _merkleRoot;
  }

  function renounceOwnership() public override onlyOwner {
    revert("renounceOwnership is disabled");
  }

  /**
   * @dev set merkle root
   * @param _merkleRoot new merkleRoot
   */
  function setMerkleRoot(bytes32 _merkleRoot) external onlyOwner {
    emit SetMerkleRoot(msg.sender, merkleRoot, _merkleRoot);
    merkleRoot = _merkleRoot;
  }

  /**
     * @dev Getter for the hash of the address.
     *
     * @param account The address to be checked.
     *
     * @return The hash of the address
     */
    function _leaf(address account) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(account));
    }

  /**
    * @dev Check if the particular address is whitelisted or not.
    *
    * @param account The address to be checked. 
    * @param proof The bytes32 array from the offchain whitelist address.
    *
    * @return true / false.
  */
  function checkWhitelisted(address account, bytes32[] memory proof)
        public
        view
        returns (bool)
    {
        bytes32 leaf = _leaf(account);
        return MerkleProof.verify(proof, merkleRoot, leaf);
    }

  /**
   * @param _totalQty total qty to deposit
   * @dev msg.value must be equal to price * _totalQty, otherwise it will revert
   */
  function deposit(uint256 _totalQty, bytes32[] calldata _proof) external payable authorizeWhitelist(_proof) {
    require(_totalQty > 0, "totalQty must be greater than 0");
    require(_totalQty <= maxQtyPerTransaction, "totalQty exceeds limit per tx");
    require(totalBoughtQty + _totalQty <= totalSlotsLimit, "totalQty exceeds slot limit");
    require(msg.value == _totalQty * price, "invalid value sent");
    
    userDepositedAmount[msg.sender] += msg.value;
    userQty[msg.sender] += _totalQty;

    totalBoughtQty += _totalQty;
    totalDepositedAmount += msg.value;

    emit Deposit(msg.sender, _totalQty, msg.value);
  }

  /**
   * Owner to withdraw the token from this contract
   *
   * @param _recipient Recipient address, could be 0 address
   * @param _amount total amount to withdraw
   */
  function withdraw(address _recipient, uint256 _amount) external onlyOwner {
    require(_recipient != address(0), "invalid recipient");
    require(_amount > 0, "Amount must be greater than 0");
    require(_amount <= address(this).balance, "Insufficient balance in the contract");
    
    payable(_recipient).transfer(_amount);
    
    emit Withdraw(msg.sender, _recipient, _amount);
  }
}