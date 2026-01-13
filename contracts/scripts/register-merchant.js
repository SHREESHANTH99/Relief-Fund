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

  // Merchant address to register (use the second account from hardhat)
  const merchantAddress = hre.ethers.getAddress(
    "0x11e98832ee92c923d8ce8c32eb21573388575553"
  );

  console.log("\n🔍 Checking merchant address:", merchantAddress);

  // Check if merchant has role
  try {
    const user = await contract.users(merchantAddress);
    console.log("Current role:", user.role.toString()); // 0=None, 1=Admin, 2=Donor, 3=Beneficiary, 4=Merchant

    // Check if role is Merchant (4)
    if (user.role !== 4n) {
      console.log("\n❌ Error: Address does not have Merchant role");
      console.log("Please assign Merchant role first using assignRole()");
      return;
    }

    // Check if already registered
    const merchantProfile = await contract.merchants(merchantAddress);
    console.log("Merchant category:", merchantProfile.category.toString());
    console.log("Merchant verified:", merchantProfile.verified);
    console.log("Business name:", merchantProfile.businessName);

    if (!merchantProfile.verified || merchantProfile.businessName === "") {
      console.log("\n📝 Registering merchant...");
      const tx = await contract.registerMerchant(
        merchantAddress,
        2, // MerchantCategory: 2 = Medicine
        "HealthCare Pharmacy"
      );
      await tx.wait();
      console.log("✅ Merchant registered and verified");

      // Verify registration
      const updatedProfile = await contract.merchants(merchantAddress);
      console.log("\n✅ Updated merchant profile:");
      console.log("  - Business Name:", updatedProfile.businessName);
      console.log("  - Category:", updatedProfile.category.toString());
      console.log("  - Verified:", updatedProfile.verified);
    } else {
      console.log("\n✅ Merchant already registered and verified!");
    }
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
