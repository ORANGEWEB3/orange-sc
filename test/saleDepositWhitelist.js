const { constants } = require("@openzeppelin/test-helpers");
const { expect } = require("chai");
const { BigNumber } = require("ethers");
const { ethers } = require("hardhat");
const keccak256 = require("keccak256");
const { MerkleTree } = require("merkletreejs");

const provider = waffle.provider;

const whitelistAddresses = async function(depositContract, whitelistedAddresses) {
  const leafNodes = whitelistedAddresses.map(addr => keccak256(addr));
  const merkleTree = new MerkleTree(leafNodes, keccak256, {sortPairs: true});
  const rootHash = merkleTree.getRoot();
  const completeRootHash = '0x' + rootHash.toString('hex');

  if(whitelistedAddresses.length > 0) {
    const proof = merkleTree.getHexProof(keccak256(whitelistedAddresses[0]));
    expect(await depositContract.checkWhitelisted(whitelistedAddresses[0], proof)).to.equal(false);
  
    await depositContract.setMerkleRoot(completeRootHash);
    expect(await depositContract.merkleRoot()).to.equal(completeRootHash);
  
    expect(await depositContract.checkWhitelisted(whitelistedAddresses[0], proof)).to.equal(true);
  } else {
    await depositContract.setMerkleRoot(ethers.constants.HashZero);
  }

  return merkleTree;
}

const getWhitelistProof = async function (merkleTree, address) {
  return merkleTree.getHexProof(keccak256(address));
}

describe("Presale Deposit", function () {
  let rfoxDeposit, token;
  const price = ethers.utils.parseUnits("1", 18);
  const maxQtyPerTx = 10;
  const totalSlotsLimit = 100;
  let merkleTree, bobProof, ownerProof, merkleRoot;

  beforeEach(async () => {
    [owner, bob, jane, sara] = await ethers.getSigners();

    const MockToken = await ethers.getContractFactory("MockERC20");
    token = await MockToken.deploy();
    await token.deployed();

    const RFOXDepositFactory = await ethers.getContractFactory(
      "SaleDepositWhitelist"
    );

    rfoxDeposit = await RFOXDepositFactory.deploy(price, totalSlotsLimit, maxQtyPerTx, ethers.constants.HashZero);
    await rfoxDeposit.deployed();

    merkleTree = await whitelistAddresses(rfoxDeposit, [bob.address, owner.address]);
    bobProof = await getWhitelistProof(merkleTree, bob.address);
    ownerProof = await getWhitelistProof(merkleTree, owner.address);
    merkleRoot = merkleTree.getRoot();
  });

  it("correct merkleTree", async function () {
    expect(await rfoxDeposit.merkleRoot()).to.be.equal('0x'+merkleRoot.toString('hex'));
  });

  it("correct owner address", async function () {
    expect(await rfoxDeposit.owner()).to.be.equal(owner.address);
  });

  it("renounceOwnership should fail if called by non-owner", async function() {
    await expect(rfoxDeposit.connect(jane).renounceOwnership()).to.be.revertedWith("Ownable: caller is not the owner");
  })

  it("renounceOwnership should fail even if called by owner", async function() {
    await expect(rfoxDeposit.renounceOwnership()).to.be.revertedWith("renounceOwnership is disabled");
  })

  it("should revert deposit for 0 qty", async function () {
    await expect(rfoxDeposit.deposit(0, ownerProof)).to.be.revertedWith("totalQty must be greater than 0");
  });

  it("should revert if totalQty exceeds maxQtyPerTransaction", async function () {
    await expect(rfoxDeposit.deposit(maxQtyPerTx+1, ownerProof)).to.be.revertedWith("totalQty exceeds limit per tx");
  });

  it("should revert if value sent is not valid", async function () {
    let value = ethers.utils.parseUnits("1", 18);
    await expect(rfoxDeposit.deposit(maxQtyPerTx, ownerProof,  {value: value})).to.be.revertedWith("invalid value sent");
  });

  it("should revert if address is not whitelisted", async function () {
    let value = ethers.utils.parseUnits("1", 18);
    await expect(rfoxDeposit.connect(bob).deposit(1, ownerProof,  {value: value})).to.be.revertedWith("Unauthorized address for whitelist");

    const saraProof = await getWhitelistProof(merkleTree, sara.address);
    await expect(rfoxDeposit.connect(sara).deposit(1, saraProof,  {value: value})).to.be.revertedWith("Unauthorized address for whitelist");
  });

  it("should successfully deposit with max qty per tx", async function () {
    let qty = maxQtyPerTx;
    let value = BigNumber.from(price).mul(BigNumber.from(qty));

    const initialUserDepositedAmount = await rfoxDeposit.userDepositedAmount(bob.address);
    const initialUserQty = await rfoxDeposit.userQty(bob.address);
    const initialTotalBoughtQty = await rfoxDeposit.totalBoughtQty();
    const initialTotalDepositedAmount = await rfoxDeposit.totalDepositedAmount();

    const initialDepositContractBalance = await provider.getBalance(rfoxDeposit.address);
    await rfoxDeposit.connect(bob).deposit(qty, bobProof, {value: value});

    const latestUserDepositedAmount = await rfoxDeposit.userDepositedAmount(bob.address);
    const latestUserQty = await rfoxDeposit.userQty(bob.address);
    const latestTotalBoughtQty = await rfoxDeposit.totalBoughtQty();
    const latestTotalDepositedAmount = await rfoxDeposit.totalDepositedAmount();
    const latestDepositContractBalance = await provider.getBalance(rfoxDeposit.address);

    expect(initialUserDepositedAmount.add(value).toString()).to.equal(latestUserDepositedAmount.toString())
    expect(initialUserQty.add(qty).toString()).to.equal(latestUserQty.toString())

    expect(initialTotalBoughtQty.add(qty).toString()).to.equal(latestTotalBoughtQty.toString())
    expect(initialTotalDepositedAmount.add(value).toString()).to.equal(latestTotalDepositedAmount.toString())

    /** Check contract balance */
    expect(initialDepositContractBalance.add(value).toString()).to.equal(latestDepositContractBalance.toString())
  });
    

  it("should successfully deposit with less than maxQtyPerTx", async function () {
    let qty = maxQtyPerTx/2;
    let value = BigNumber.from(price).mul(BigNumber.from(qty));

    const initialUserDepositedAmount = await rfoxDeposit.userDepositedAmount(bob.address);
    const initialUserQty = await rfoxDeposit.userQty(bob.address);
    const initialTotalBoughtQty = await rfoxDeposit.totalBoughtQty();
    const initialTotalDepositedAmount = await rfoxDeposit.totalDepositedAmount();

    const initialDepositContractBalance = await provider.getBalance(rfoxDeposit.address);
    await rfoxDeposit.connect(bob).deposit(qty, bobProof, {value: value});

    const latestUserDepositedAmount = await rfoxDeposit.userDepositedAmount(bob.address);
    const latestUserQty = await rfoxDeposit.userQty(bob.address);
    const latestTotalBoughtQty = await rfoxDeposit.totalBoughtQty();
    const latestTotalDepositedAmount = await rfoxDeposit.totalDepositedAmount();
    const latestDepositContractBalance = await provider.getBalance(rfoxDeposit.address);

    expect(initialUserDepositedAmount.add(value).toString()).to.equal(latestUserDepositedAmount.toString())
    expect(initialUserQty.add(qty).toString()).to.equal(latestUserQty.toString())

    expect(initialTotalBoughtQty.add(qty).toString()).to.equal(latestTotalBoughtQty.toString())
    expect(initialTotalDepositedAmount.add(value).toString()).to.equal(latestTotalDepositedAmount.toString())

    /** Check contract balance */
    expect(initialDepositContractBalance.add(value).toString()).to.equal(latestDepositContractBalance.toString())
  });

  it("should revert if maxSlotsLimit has been reached ", async function () {
    let qty = maxQtyPerTx;
    let value = BigNumber.from(price).mul(BigNumber.from(qty));
    for(let i = 0; i < 10; i++) {  
      const initialUserDepositedAmount = await rfoxDeposit.userDepositedAmount(bob.address);
      const initialUserQty = await rfoxDeposit.userQty(bob.address);
      const initialTotalBoughtQty = await rfoxDeposit.totalBoughtQty();
      const initialTotalDepositedAmount = await rfoxDeposit.totalDepositedAmount();
  
      const initialDepositContractBalance = await provider.getBalance(rfoxDeposit.address);
      await rfoxDeposit.connect(bob).deposit(qty, bobProof, {value: value});
  
      const latestUserDepositedAmount = await rfoxDeposit.userDepositedAmount(bob.address);
      const latestUserQty = await rfoxDeposit.userQty(bob.address);
      const latestTotalBoughtQty = await rfoxDeposit.totalBoughtQty();
      const latestTotalDepositedAmount = await rfoxDeposit.totalDepositedAmount();
      const latestDepositContractBalance = await provider.getBalance(rfoxDeposit.address);
  
      expect(initialUserDepositedAmount.add(value).toString()).to.equal(latestUserDepositedAmount.toString())
      expect(initialUserQty.add(qty).toString()).to.equal(latestUserQty.toString())
  
      expect(initialTotalBoughtQty.add(qty).toString()).to.equal(latestTotalBoughtQty.toString())
      expect(initialTotalDepositedAmount.add(value).toString()).to.equal(latestTotalDepositedAmount.toString())
  
      /** Check contract balance */
      expect(initialDepositContractBalance.add(value).toString()).to.equal(latestDepositContractBalance.toString())
    }

    await expect(rfoxDeposit.connect(bob).deposit(1, bobProof, {value: BigNumber.from(price)})).to.be.revertedWith("totalQty exceeds slot limit");
  });

  it("should revert withdrawal if called by non-owner account", async function () {
    let qty = maxQtyPerTx;
    let value = BigNumber.from(price).mul(BigNumber.from(qty));
    let iterations = 10;
    for(let i = 0; i < iterations; i++) {  
      const initialUserDepositedAmount = await rfoxDeposit.userDepositedAmount(bob.address);
      const initialUserQty = await rfoxDeposit.userQty(bob.address);
      const initialTotalBoughtQty = await rfoxDeposit.totalBoughtQty();
      const initialTotalDepositedAmount = await rfoxDeposit.totalDepositedAmount();
  
      const initialDepositContractBalance = await provider.getBalance(rfoxDeposit.address);
      await rfoxDeposit.connect(bob).deposit(qty, bobProof, {value: value});
  
      const latestUserDepositedAmount = await rfoxDeposit.userDepositedAmount(bob.address);
      const latestUserQty = await rfoxDeposit.userQty(bob.address);
      const latestTotalBoughtQty = await rfoxDeposit.totalBoughtQty();
      const latestTotalDepositedAmount = await rfoxDeposit.totalDepositedAmount();
      const latestDepositContractBalance = await provider.getBalance(rfoxDeposit.address);
  
      expect(initialUserDepositedAmount.add(value).toString()).to.equal(latestUserDepositedAmount.toString())
      expect(initialUserQty.add(qty).toString()).to.equal(latestUserQty.toString())
  
      expect(initialTotalBoughtQty.add(qty).toString()).to.equal(latestTotalBoughtQty.toString())
      expect(initialTotalDepositedAmount.add(value).toString()).to.equal(latestTotalDepositedAmount.toString())
  
      /** Check contract balance */
      expect(initialDepositContractBalance.add(value).toString()).to.equal(latestDepositContractBalance.toString())
    }

    const amountWithdrawal = value.mul(BigNumber.from(iterations));
    await expect(rfoxDeposit.connect(bob).withdraw(jane.address, amountWithdrawal)).to.be.revertedWith("Ownable: caller is not the owner");
  });

  it("should revert withdrawal if tried to withdraw 0 amount", async function () {
    let qty = maxQtyPerTx;
    let value = BigNumber.from(price).mul(BigNumber.from(qty));
    let iterations = 10;
    for(let i = 0; i < iterations; i++) {  
      const initialUserDepositedAmount = await rfoxDeposit.userDepositedAmount(bob.address);
      const initialUserQty = await rfoxDeposit.userQty(bob.address);
      const initialTotalBoughtQty = await rfoxDeposit.totalBoughtQty();
      const initialTotalDepositedAmount = await rfoxDeposit.totalDepositedAmount();
  
      const initialDepositContractBalance = await provider.getBalance(rfoxDeposit.address);
      await rfoxDeposit.connect(bob).deposit(qty, bobProof, {value: value});
  
      const latestUserDepositedAmount = await rfoxDeposit.userDepositedAmount(bob.address);
      const latestUserQty = await rfoxDeposit.userQty(bob.address);
      const latestTotalBoughtQty = await rfoxDeposit.totalBoughtQty();
      const latestTotalDepositedAmount = await rfoxDeposit.totalDepositedAmount();
      const latestDepositContractBalance = await provider.getBalance(rfoxDeposit.address);
  
      expect(initialUserDepositedAmount.add(value).toString()).to.equal(latestUserDepositedAmount.toString())
      expect(initialUserQty.add(qty).toString()).to.equal(latestUserQty.toString())
  
      expect(initialTotalBoughtQty.add(qty).toString()).to.equal(latestTotalBoughtQty.toString())
      expect(initialTotalDepositedAmount.add(value).toString()).to.equal(latestTotalDepositedAmount.toString())
  
      /** Check contract balance */
      expect(initialDepositContractBalance.add(value).toString()).to.equal(latestDepositContractBalance.toString())
    }

    await expect(rfoxDeposit.connect(owner).withdraw(jane.address, 0)).to.be.revertedWith("Amount must be greater than 0");
  });

  it("should revert withdrawal if tried to withdraw more than the balance", async function () {
    let qty = maxQtyPerTx;
    let value = BigNumber.from(price).mul(BigNumber.from(qty));
    let iterations = 10;
    for(let i = 0; i < iterations; i++) {  
      const initialUserDepositedAmount = await rfoxDeposit.userDepositedAmount(bob.address);
      const initialUserQty = await rfoxDeposit.userQty(bob.address);
      const initialTotalBoughtQty = await rfoxDeposit.totalBoughtQty();
      const initialTotalDepositedAmount = await rfoxDeposit.totalDepositedAmount();
  
      const initialDepositContractBalance = await provider.getBalance(rfoxDeposit.address);
      await rfoxDeposit.connect(bob).deposit(qty, bobProof, {value: value});
  
      const latestUserDepositedAmount = await rfoxDeposit.userDepositedAmount(bob.address);
      const latestUserQty = await rfoxDeposit.userQty(bob.address);
      const latestTotalBoughtQty = await rfoxDeposit.totalBoughtQty();
      const latestTotalDepositedAmount = await rfoxDeposit.totalDepositedAmount();
      const latestDepositContractBalance = await provider.getBalance(rfoxDeposit.address);
  
      expect(initialUserDepositedAmount.add(value).toString()).to.equal(latestUserDepositedAmount.toString())
      expect(initialUserQty.add(qty).toString()).to.equal(latestUserQty.toString())
  
      expect(initialTotalBoughtQty.add(qty).toString()).to.equal(latestTotalBoughtQty.toString())
      expect(initialTotalDepositedAmount.add(value).toString()).to.equal(latestTotalDepositedAmount.toString())
  
      /** Check contract balance */
      expect(initialDepositContractBalance.add(value).toString()).to.equal(latestDepositContractBalance.toString())
    }

    const amountWithdrawal = await provider.getBalance(rfoxDeposit.address);
    await expect(rfoxDeposit.connect(owner).withdraw(jane.address, BigNumber.from(amountWithdrawal).add(1))).to.be.revertedWith("Insufficient balance in the contract");
  });

  it("should revert withdrawal if tried to withdraw to zero address as recipient", async function () {
    let qty = maxQtyPerTx;
    let value = BigNumber.from(price).mul(BigNumber.from(qty));
    let iterations = 10;
    for(let i = 0; i < iterations; i++) {  
      await rfoxDeposit.connect(bob).deposit(qty, bobProof, {value: value});
    }

    const amountWithdrawal = value.mul(BigNumber.from(iterations));
    await expect(rfoxDeposit.connect(owner).withdraw(ethers.constants.AddressZero, amountWithdrawal)).to.be.revertedWith("invalid recipient");
  });

  it("should successfully withdraw", async function () {
    let qty = maxQtyPerTx;
    let value = BigNumber.from(price).mul(BigNumber.from(qty));
    let iterations = 10;
    for(let i = 0; i < iterations; i++) {  
      const initialUserDepositedAmount = await rfoxDeposit.userDepositedAmount(bob.address);
      const initialUserQty = await rfoxDeposit.userQty(bob.address);
      const initialTotalBoughtQty = await rfoxDeposit.totalBoughtQty();
      const initialTotalDepositedAmount = await rfoxDeposit.totalDepositedAmount();
  
      const initialDepositContractBalance = await provider.getBalance(rfoxDeposit.address);
      await rfoxDeposit.connect(bob).deposit(qty, bobProof, {value: value});
  
      const latestUserDepositedAmount = await rfoxDeposit.userDepositedAmount(bob.address);
      const latestUserQty = await rfoxDeposit.userQty(bob.address);
      const latestTotalBoughtQty = await rfoxDeposit.totalBoughtQty();
      const latestTotalDepositedAmount = await rfoxDeposit.totalDepositedAmount();
      const latestDepositContractBalance = await provider.getBalance(rfoxDeposit.address);
  
      expect(initialUserDepositedAmount.add(value).toString()).to.equal(latestUserDepositedAmount.toString())
      expect(initialUserQty.add(qty).toString()).to.equal(latestUserQty.toString())
  
      expect(initialTotalBoughtQty.add(qty).toString()).to.equal(latestTotalBoughtQty.toString())
      expect(initialTotalDepositedAmount.add(value).toString()).to.equal(latestTotalDepositedAmount.toString())
  
      /** Check contract balance */
      expect(initialDepositContractBalance.add(value).toString()).to.equal(latestDepositContractBalance.toString())
    }

    const amountWithdrawal = value.mul(BigNumber.from(iterations));
    const initialRecipientBalance = await provider.getBalance(jane.address);
    await rfoxDeposit.connect(owner).withdraw(jane.address, amountWithdrawal);
    const latestRecipientBalance = await provider.getBalance(jane.address);

    expect(initialRecipientBalance.add(amountWithdrawal).toString()).to.equal(latestRecipientBalance.toString());
    
  });
});