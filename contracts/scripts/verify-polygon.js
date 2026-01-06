#!/usr/bin/env node

/**
 * Verify Contract on PolygonScan
 *
 * Usage:
 *   node scripts/verify-polygon.js <contract_address>
 */

const hre = require("hardhat");

async function main() {
  const contractAddress = process.argv[2];

  if (!contractAddress) {
    console.error("❌ Error: Contract address required");
    console.log("\nUsage:");
    console.log("  node scripts/verify-polygon.js <contract_address>");
    process.exit(1);
  }

  console.log("\n🔍 Verifying contract on PolygonScan...");
  console.log("   Address:", contractAddress);

  try {
    await hre.run("verify:verify", {
      address: contractAddress,
      constructorArguments: [],
      network: "polygon",
    });

    console.log("\n✅ Contract verified successfully!");
    console.log(
      "   View at: https://polygonscan.com/address/" + contractAddress
    );
  } catch (error) {
    if (error.message.includes("Already Verified")) {
      console.log("\n✅ Contract already verified");
      console.log(
        "   View at: https://polygonscan.com/address/" + contractAddress
      );
    } else {
      console.error("\n❌ Verification failed:", error.message);
      console.log("\n💡 Make sure:");
      console.log("   1. ETHERSCAN_API_KEY is set in .env");
      console.log("   2. Contract is deployed on Polygon Mainnet");
      console.log("   3. Wait a few minutes after deployment");
      process.exit(1);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
