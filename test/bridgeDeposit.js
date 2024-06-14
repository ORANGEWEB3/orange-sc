const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Bridge Deposit=", function () {
  let rfoxDeposit, token;
  let trashAddress = "0x0000000000000000000000000000000000000001"

  beforeEach(async () => {
    [owner, bob, jane, sara] = await ethers.getSigners();

    const MockToken = await ethers.getContractFactory("MockERC20");
    token = await MockToken.deploy();
    await token.deployed();

    const RFOXDepositFactory = await ethers.getContractFactory(
      "BridgeDeposit"
    );
    rfoxDeposit = await RFOXDepositFactory.deploy(token.address);
    await rfoxDeposit.deployed();
  });

  it("correct token address", async function () {
    expect(await rfoxDeposit.token()).to.be.equal(token.address);
  });

  it("correct owner address", async function () {
    expect(await rfoxDeposit.owner()).to.be.equal(owner.address);
  });

  it("should revert deposit for 0 amount", async function () {
    await expect(rfoxDeposit.deposit(0)).to.be.revertedWith("Amount must be greater than 0");
  });

  it("should revert deposit if has not approved the token", async function () {
    await expect(rfoxDeposit.deposit(100)).to.be.revertedWith("ERC20: insufficient allowance'");
  });

  it("should successfully deposit", async function () {
    const amount = 100;
    await token.connect(owner).approve(rfoxDeposit.address, amount);

    const initialOwnerBalance = await token.balanceOf(owner.address);
    const initialDepositContractBalance = await token.balanceOf(rfoxDeposit.address);

    await rfoxDeposit.connect(owner).deposit(amount);

    const latestOwnerBalance = await token.balanceOf(owner.address);
    const latestDepositContractBalance = await token.balanceOf(rfoxDeposit.address);
    const userDepositBalance = await rfoxDeposit.depositedAmounts(owner.address);
    const totalDepositBalance = await rfoxDeposit.totalDepositedAmounts();

    expect(initialDepositContractBalance.add(amount).toString()).to.equal(latestDepositContractBalance.toString())
    expect(latestOwnerBalance.add(amount).toString()).to.equal(initialOwnerBalance.toString())

    expect(userDepositBalance.toString()).to.equal(totalDepositBalance.toString())
    expect(userDepositBalance.toString()).to.equal(amount.toString())
  });

  it("should successfully deposit multiple", async function () {
    const amount = 100;
    await token.connect(owner).approve(rfoxDeposit.address, amount);
    await rfoxDeposit.connect(owner).deposit(amount);

    const firstUserDepositBalance = await rfoxDeposit.depositedAmounts(owner.address);
    const firstTotalDepositBalance = await rfoxDeposit.totalDepositedAmounts();

    expect(firstUserDepositBalance.toString()).to.equal(firstTotalDepositBalance.toString())
    expect(firstUserDepositBalance.toString()).to.equal(amount.toString())

    const amount2 = 400;
    await token.connect(owner).approve(rfoxDeposit.address, amount2);
    await rfoxDeposit.connect(owner).deposit(amount2);

    const lastUserDepositBalance = await rfoxDeposit.depositedAmounts(owner.address);
    const lastTotalDepositBalance = await rfoxDeposit.totalDepositedAmounts();

    expect(lastUserDepositBalance.toString()).to.equal(lastTotalDepositBalance.toString())
    expect(lastUserDepositBalance.sub(firstUserDepositBalance).toString()).to.equal(amount2.toString())
    expect(lastTotalDepositBalance.sub(firstTotalDepositBalance).toString()).to.equal(amount2.toString())
  });

  it("should revert to call withdraw from non-authorized address", async function () {
    const amount = 100;
    await token.connect(owner).approve(rfoxDeposit.address, amount);
    await rfoxDeposit.connect(owner).deposit(amount);

    const userDepositBalance = await rfoxDeposit.depositedAmounts(owner.address);
    const totalDepositBalance = await rfoxDeposit.totalDepositedAmounts();

    expect(userDepositBalance.toString()).to.equal(totalDepositBalance.toString())
    expect(userDepositBalance.toString()).to.equal(amount.toString())

    await expect(rfoxDeposit.connect(bob).burn(amount)).to.be.revertedWith("Ownable: caller is not the owner");
  });

  it("should revert to call withdraw with 0 amount", async function () {
    const amount = 100;
    await token.connect(owner).approve(rfoxDeposit.address, amount);
    await rfoxDeposit.connect(owner).deposit(amount);

    const userDepositBalance = await rfoxDeposit.depositedAmounts(owner.address);
    const totalDepositBalance = await rfoxDeposit.totalDepositedAmounts();

    expect(userDepositBalance.toString()).to.equal(totalDepositBalance.toString())
    expect(userDepositBalance.toString()).to.equal(amount.toString())

    await expect(rfoxDeposit.connect(owner).burn(0)).to.be.revertedWith("Amount must be greater than 0");
  });

  it("should revert to call withdraw with exceeds balance", async function () {
    const amount = 100;
    await token.connect(owner).approve(rfoxDeposit.address, amount);
    await rfoxDeposit.connect(owner).deposit(amount);

    const userDepositBalance = await rfoxDeposit.depositedAmounts(owner.address);
    const totalDepositBalance = await rfoxDeposit.totalDepositedAmounts();

    expect(userDepositBalance.toString()).to.equal(totalDepositBalance.toString())
    expect(userDepositBalance.toString()).to.equal(amount.toString())

    await expect(rfoxDeposit.connect(owner).burn(amount * 2)).to.be.revertedWith("ERC20: transfer amount exceeds balance");
  });

  it("should successfully withdraw token", async function () {
    const amount = 100;
    await token.connect(owner).approve(rfoxDeposit.address, amount);
    await rfoxDeposit.connect(owner).deposit(amount);

    const userDepositBalance = await rfoxDeposit.depositedAmounts(owner.address);
    const totalDepositBalance = await rfoxDeposit.totalDepositedAmounts();

    expect(userDepositBalance.toString()).to.equal(totalDepositBalance.toString())
    expect(userDepositBalance.toString()).to.equal(amount.toString())

    const initialRecipientBalance = await token.balanceOf(trashAddress);
    const initialDepositContractBalance = await token.balanceOf(rfoxDeposit.address);
    await rfoxDeposit.connect(owner).burn(amount);

    const latestRecipientBalance = await token.balanceOf(trashAddress);
    const latestDepositContractBalance = await token.balanceOf(rfoxDeposit.address);

    expect(latestDepositContractBalance.add(amount).toString()).to.equal(initialDepositContractBalance.toString())
    expect(initialRecipientBalance.add(amount).toString()).to.equal(latestRecipientBalance.toString())
  });
});