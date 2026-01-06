const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 Checking user status...\n");

  const contractAddress = "0x0165878A594ca255338adfa4d48449f69242Eb8F";

  const ReliefFund = await ethers.getContractFactory("ReliefFund");
  const contract = ReliefFund.attach(contractAddress);

  const userAddress = "0xaEd7bF1BF9Ed43104C4883937137f5C608f9Cb2e";

  // Check current role
  const userInfo = await contract.getUserInfo(userAddress);
  const roleId = Number(userInfo[0]);
  const roleNames = ["None", "Admin", "Donor", "Beneficiary", "Merchant"];

  console.log(`Current Role: ${roleNames[roleId]}`);
  console.log(`Is Active: ${userInfo[1]}`);

  if (roleId === 3 || roleId === 4) {
    // Beneficiary or Merchant
    console.log("\n💰 Allocating 100 tokens...");
    const amount = ethers.parseEther("100");
    const expiry = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;

    try {
      let tx = await contract.allocateTokens(userAddress, amount, expiry);
      await tx.wait();
      console.log("✅ Tokens allocated!");

      // Set limits
      console.log("\n⚙️ Setting spending limits...");
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
      console.log("✅ Limits set!");
    } catch (e) {
      console.log("Note:", e.message);
    }
  }

  // Check balance
  if (roleId === 3) {
    const account = await contract.getBeneficiaryAccount(userAddress);
    console.log(
      `\n📊 Your Balance: ${ethers.formatEther(account[2])} RELIEF tokens`
    );
  }

  console.log(
    "\n🎉 Done! Go to http://localhost:3000 and press Ctrl+Shift+R to hard refresh!"
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
