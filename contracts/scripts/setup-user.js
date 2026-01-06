const { ethers } = require("hardhat");

async function main() {
  console.log("🔧 Setting up roles and allocating tokens...\n");

  const contractAddress = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";

  // Get contract
  const ReliefFund = await ethers.getContractFactory("ReliefFund");
  const contract = ReliefFund.attach(contractAddress);

  // User address from MetaMask
  const userAddress = "0xaEd7bF1BF9Ed43104C4883937137f5C608f9Cb2e";

  // Check if user already has a role
  try {
    const userInfo = await contract.getUserInfo(userAddress);
    const roleId = Number(userInfo[0]);
    if (roleId === 0) {
      console.log(`📝 Assigning Beneficiary role to: ${userAddress}`);
      let tx = await contract.assignRole(userAddress, 3); // 3 = Beneficiary
      await tx.wait();
      console.log("✅ Role assigned!\n");
    } else {
      console.log(`✓ User already has role (ID: ${roleId})\n`);
    }
  } catch (e) {
    console.log("Error checking/assigning role:", e.message);
  }

  console.log("💰 Allocating 100 tokens...");
  const amount = ethers.parseEther("100");
  const expiry = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60; // 30 days
  tx = await contract.allocateTokens(userAddress, amount, expiry);
  await tx.wait();
  console.log("✅ Tokens allocated!\n");

  // Set spending limits
  console.log("⚙️ Setting spending limits...");
  const dailyLimit = ethers.parseEther("50");
  const weeklyLimit = ethers.parseEther("200");
  const maxAllocation = ethers.parseEther("100");
  tx = await contract.setUserLimits(
    userAddress,
    dailyLimit,
    weeklyLimit,
    maxAllocation
  );
  await tx.wait();
  console.log("✅ Limits set!\n");

  console.log(
    "🎉 Setup complete! Now refresh your browser at http://localhost:3000"
  );
  console.log("   You should see the purple gradient Beneficiary Dashboard!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
