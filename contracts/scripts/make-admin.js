const { ethers } = require("hardhat");

async function main() {
  console.log("🔧 Making user an Admin...\n");

  const contractAddress = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";

  // Get contract
  const ReliefFund = await ethers.getContractFactory("ReliefFund");
  const contract = ReliefFund.attach(contractAddress);

  // User address to make admin
  const userAddress = "0xaEd7bF1BF9Ed43104C4883937137f5C608f9Cb2e";

  console.log(`📝 Assigning Admin role to: ${userAddress}`);
  let tx = await contract.assignRole(userAddress, 1); // 1 = Admin
  await tx.wait();
  console.log("✅ Admin role assigned!\n");

  // Verify
  const userInfo = await contract.getUserInfo(userAddress);
  const roleId = Number(userInfo[0]);
  const roleNames = ["None", "Admin", "Donor", "Beneficiary", "Merchant"];
  console.log(`✓ Current role: ${roleNames[roleId]}\n`);

  console.log(
    "🎉 Setup complete! Refresh your browser to see Admin Dashboard!"
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
