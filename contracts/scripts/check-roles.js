const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 Checking user role...\n");

  const contractAddress = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";

  // Get contract
  const ReliefFund = await ethers.getContractFactory("ReliefFund");
  const contract = ReliefFund.attach(contractAddress);

  // User addresses
  const userAddress = "0xaEd7bF1BF9Ed43104C4883937137f5C608f9Cb2e";
  const deployerAddress = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";

  const roleNames = ["None", "Admin", "Donor", "Beneficiary", "Merchant"];

  // Check user
  const userInfo = await contract.getUserInfo(userAddress);
  const userRoleId = Number(userInfo[0]);
  console.log(`👤 User (${userAddress}):`);
  console.log(`   Role: ${roleNames[userRoleId]}\n`);

  // Check deployer
  const deployerInfo = await contract.getUserInfo(deployerAddress);
  const deployerRoleId = Number(deployerInfo[0]);
  console.log(`👨‍💼 Deployer (${deployerAddress}):`);
  console.log(`   Role: ${roleNames[deployerRoleId]}\n`);

  console.log("\n💡 To access Admin Dashboard:");
  console.log(
    "   1. Connect with deployer address: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
  );
  console.log("   2. Use Hardhat Account #0 in MetaMask");
  console.log(
    "   3. Or use the 'Assign Role' feature to make another address admin\n"
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
