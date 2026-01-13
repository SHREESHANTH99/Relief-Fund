const hre = require("hardhat");

async function main() {
  const [admin] = await hre.ethers.getSigners();

  console.log("Admin address:", admin.address);

  // Contract address from your local deployment
  const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  console.log("Contract address:", contractAddress);

  // Get contract instance
  const ReliefFund = await hre.ethers.getContractFactory("ReliefFund");
  const contract = ReliefFund.attach(contractAddress);

  // Beneficiary address to update
  const beneficiaryAddress = hre.ethers.getAddress(
    "0xaEd7bF1BF9Ed43104C4883937137f5C608f9Cb2e"
  );

  console.log("\n🔍 Checking beneficiary address:", beneficiaryAddress);

  try {
    // Check current limits
    const account = await contract.beneficiaries(beneficiaryAddress);
    console.log("\n📊 Current Limits:");
    console.log(
      "  - Max Allocation:",
      hre.ethers.formatEther(account.maxAllocation),
      "RELIEF"
    );
    console.log(
      "  - Daily Limit:",
      hre.ethers.formatEther(account.dailySpendLimit),
      "RELIEF"
    );
    console.log(
      "  - Weekly Limit:",
      hre.ethers.formatEther(account.weeklySpendLimit),
      "RELIEF"
    );
    console.log(
      "  - Daily Spent:",
      hre.ethers.formatEther(account.dailySpent),
      "RELIEF"
    );
    console.log(
      "  - Weekly Spent:",
      hre.ethers.formatEther(account.weeklySpent),
      "RELIEF"
    );

    // Update limits to allow more spending
    console.log("\n📝 Updating beneficiary limits...");
    const tx = await contract.setUserLimits(
      beneficiaryAddress,
      hre.ethers.parseEther("2000"), // Max allocation: 2000 tokens
      hre.ethers.parseEther("500"), // Daily limit: 500 tokens
      hre.ethers.parseEther("1500") // Weekly limit: 1500 tokens
    );
    await tx.wait();
    console.log("✅ Limits updated successfully");

    // Verify new limits
    const updatedAccount = await contract.beneficiaries(beneficiaryAddress);
    console.log("\n✅ New Limits:");
    console.log(
      "  - Max Allocation:",
      hre.ethers.formatEther(updatedAccount.maxAllocation),
      "RELIEF"
    );
    console.log(
      "  - Daily Limit:",
      hre.ethers.formatEther(updatedAccount.dailySpendLimit),
      "RELIEF"
    );
    console.log(
      "  - Weekly Limit:",
      hre.ethers.formatEther(updatedAccount.weeklySpendLimit),
      "RELIEF"
    );
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
