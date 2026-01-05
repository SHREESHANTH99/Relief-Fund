const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ReliefFund", function () {
  let reliefFund;
  let owner;
  let admin;
  let donor;
  let beneficiary;
  let merchant;

  beforeEach(async function () {
    [owner, admin, donor, beneficiary, merchant] = await ethers.getSigners();

    const ReliefFund = await ethers.getContractFactory("ReliefFund");
    reliefFund = await ReliefFund.deploy();
    await reliefFund.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await reliefFund.owner()).to.equal(owner.address);
    });

    it("Should initialize as not paused", async function () {
      expect(await reliefFund.paused()).to.equal(false);
    });

    it("Should assign Admin role to owner", async function () {
      const userInfo = await reliefFund.getUserInfo(owner.address);
      expect(userInfo[0]).to.equal(1); // Role.Admin
      expect(userInfo[1]).to.equal(true); // isActive
    });
  });

  describe("Role Management", function () {
    it("Should assign roles correctly", async function () {
      await reliefFund.assignRole(beneficiary.address, 3); // Role.Beneficiary

      const userInfo = await reliefFund.getUserInfo(beneficiary.address);
      expect(userInfo[0]).to.equal(3);
      expect(userInfo[1]).to.equal(true);
    });

    it("Should not allow non-admin to assign roles", async function () {
      await expect(
        reliefFund.connect(donor).assignRole(beneficiary.address, 3)
      ).to.be.revertedWith("Only admin can perform this action");
    });

    it("Should revoke roles correctly", async function () {
      await reliefFund.assignRole(beneficiary.address, 3);
      await reliefFund.revokeRole(beneficiary.address);

      const userInfo = await reliefFund.getUserInfo(beneficiary.address);
      expect(userInfo[0]).to.equal(0); // Role.None
      expect(userInfo[1]).to.equal(false); // not active
    });
  });

  describe("Donations", function () {
    it("Should accept donations", async function () {
      const donationAmount = ethers.parseEther("1.0");

      await expect(reliefFund.connect(donor).donate({ value: donationAmount }))
        .to.emit(reliefFund, "DonationReceived")
        .withArgs(donor.address, donationAmount, await time());

      expect(await reliefFund.totalDonations()).to.equal(donationAmount);
    });

    it("Should reject zero donations", async function () {
      await expect(
        reliefFund.connect(donor).donate({ value: 0 })
      ).to.be.revertedWith("Donation must be greater than 0");
    });
  });

  describe("Aid Allocation", function () {
    beforeEach(async function () {
      // Setup: add beneficiary and fund contract
      await reliefFund.assignRole(beneficiary.address, 3);
      await reliefFund
        .connect(donor)
        .donate({ value: ethers.parseEther("10.0") });
    });

    it("Should allow admin to allocate aid", async function () {
      const amount = ethers.parseEther("1.0");

      await expect(
        reliefFund.allocateAid(
          beneficiary.address,
          amount,
          "Emergency supplies"
        )
      ).to.emit(reliefFund, "AidAllocated");

      expect(await reliefFund.totalAllocated()).to.equal(amount);
    });

    it("Should not allow allocation to non-beneficiary", async function () {
      const amount = ethers.parseEther("1.0");

      await expect(
        reliefFund.allocateAid(donor.address, amount, "Test")
      ).to.be.revertedWith("Not a beneficiary");
    });
  });

  describe("Emergency Pause", function () {
    it("Should allow admin to pause", async function () {
      await reliefFund.pause();
      expect(await reliefFund.paused()).to.equal(true);
    });

    it("Should block operations when paused", async function () {
      await reliefFund.pause();

      await expect(
        reliefFund.connect(donor).donate({ value: ethers.parseEther("1.0") })
      ).to.be.revertedWith("Contract is paused");
    });

    it("Should allow admin to unpause", async function () {
      await reliefFund.pause();
      await reliefFund.unpause();
      expect(await reliefFund.paused()).to.equal(false);
    });
  });

  // Helper function
  async function time() {
    return (await ethers.provider.getBlock("latest")).timestamp;
  }
});
