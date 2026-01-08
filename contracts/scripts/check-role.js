const hre = require("hardhat");

async function main() {
  const address = process.argv[2] || process.env.CHECK_ADDRESS;

  if (!address) {
    console.log(
      "Usage: npx hardhat run scripts/check-role.js --network localhost <address>"
    );
    process.exit(1);
  }

  console.log(`🔍 Checking role for address: ${address}\n`);

  // Get contract
  const contractAddress =
    process.env.CONTRACT_ADDRESS ||
    "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  const ReliefFund = await hre.ethers.getContractFactory("ReliefFund");
  const contract = ReliefFund.attach(contractAddress);

  // Get user info
  const userInfo = await contract.getUserInfo(address);

  const roleNames = ["None", "Admin", "Donor", "Beneficiary", "Merchant"];
  const roleId = Number(userInfo[0]);
  const isActive = userInfo[1];
  const registeredAt = Number(userInfo[2]);

  console.log("📋 User Information:");
  console.log("   Address:", address);
  console.log("   Role:", roleNames[roleId], `(ID: ${roleId})`);
  console.log("   Active:", isActive);
  console.log("   Registered:", new Date(registeredAt * 1000).toLocaleString());

  if (roleId === 0) {
    console.log(
      "\n✅ This address has no role assigned. You can assign Merchant role."
    );
  } else {
    console.log(`\n⚠️  This address already has role: ${roleNames[roleId]}`);
    console.log("   You cannot change roles once assigned.");
    console.log("   Options:");
    console.log("   1. Use a different address for Merchant");
    console.log("   2. Deploy a new contract with role change capability");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
