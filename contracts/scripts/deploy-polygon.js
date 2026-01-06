#!/usr/bin/env node

/**
 * Deploy ReliefFund Contract to Polygon Mainnet
 *
 * Prerequisites:
 * 1. Set DEPLOYER_PRIVATE_KEY in contracts/.env
 * 2. Ensure deployer wallet has MATIC for gas (~5-10 MATIC)
 * 3. Verify RPC URL is set correctly
 *
 * Usage:
 *   node scripts/deploy-polygon.js
 */

const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("\n🚀 Deploying ReliefFund to Polygon Mainnet...\n");

  // Get deployer account
  const [deployer] = await hre.ethers.getSigners();
  const balance = await hre.ethers.provider.getBalance(deployer.address);

  console.log("📋 Deployment Details:");
  console.log("   Deployer:", deployer.address);
  console.log("   Balance:", hre.ethers.formatEther(balance), "MATIC");
  console.log("   Network:", (await hre.ethers.provider.getNetwork()).name);
  console.log(
    "   Chain ID:",
    (await hre.ethers.provider.getNetwork()).chainId.toString()
  );

  // Check balance
  const minBalance = hre.ethers.parseEther("5");
  if (balance < minBalance) {
    console.error("\n❌ Error: Insufficient MATIC balance");
    console.error("   Required: At least 5 MATIC");
    console.error("   Current:", hre.ethers.formatEther(balance), "MATIC");
    console.error("\n💡 Send MATIC to:", deployer.address);
    process.exit(1);
  }

  console.log("\n⏳ Deploying contract...");

  // Deploy contract
  const ReliefFund = await hre.ethers.getContractFactory("ReliefFund");
  const reliefFund = await ReliefFund.deploy();

  await reliefFund.waitForDeployment();
  const contractAddress = await reliefFund.getAddress();

  console.log("\n✅ Contract Deployed!");
  console.log("   Address:", contractAddress);

  // Save deployment info
  const deploymentInfo = {
    network: "polygon",
    chainId: 137,
    contractAddress: contractAddress,
    deployer: deployer.address,
    deployedAt: new Date().toISOString(),
    txHash: reliefFund.deploymentTransaction().hash,
  };

  const deploymentPath = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentPath)) {
    fs.mkdirSync(deploymentPath, { recursive: true });
  }

  fs.writeFileSync(
    path.join(deploymentPath, "polygon-mainnet.json"),
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log("\n💾 Deployment info saved to deployments/polygon-mainnet.json");

  // Wait for block confirmations before verification
  console.log("\n⏳ Waiting for 5 block confirmations...");
  await reliefFund.deploymentTransaction().wait(5);

  console.log("\n✅ Contract confirmed on-chain");

  // Verify contract on PolygonScan
  console.log("\n🔍 Verifying contract on PolygonScan...");
  try {
    await hre.run("verify:verify", {
      address: contractAddress,
      constructorArguments: [],
    });
    console.log("✅ Contract verified on PolygonScan!");
    console.log(
      "   View at: https://polygonscan.com/address/" + contractAddress
    );
  } catch (error) {
    if (error.message.includes("Already Verified")) {
      console.log("✅ Contract already verified on PolygonScan");
    } else {
      console.error("⚠️  Verification failed:", error.message);
      console.log("\n💡 You can verify manually later with:");
      console.log(`   npx hardhat verify --network polygon ${contractAddress}`);
    }
  }

  // Display next steps
  console.log("\n" + "=".repeat(60));
  console.log("🎉 DEPLOYMENT SUCCESSFUL!");
  console.log("=".repeat(60));
  console.log("\n📝 Next Steps:");
  console.log("\n1. Update Environment Variables:");
  console.log(`   Frontend: NEXT_PUBLIC_CONTRACT_ADDRESS=${contractAddress}`);
  console.log(`   Backend:  CONTRACT_ADDRESS=${contractAddress}`);
  console.log("\n2. Update RPC URLs:");
  console.log(
    "   Frontend: NEXT_PUBLIC_RPC_URL=https://polygon-mainnet.g.alchemy.com/v2/..."
  );
  console.log(
    "   Backend:  RPC_URL=https://polygon-mainnet.g.alchemy.com/v2/..."
  );
  console.log("\n3. Update Chain IDs:");
  console.log("   Frontend: NEXT_PUBLIC_CHAIN_ID=137");
  console.log("   Backend:  CHAIN_ID=137");
  console.log("\n4. Assign Admin Role:");
  console.log("   Run: node scripts/make-admin.js (update network to polygon)");
  console.log("\n5. Fund Backend Wallet:");
  console.log("   Send 10-20 MATIC to your backend relayer wallet for gas");
  console.log("\n6. Deploy Frontend & Backend:");
  console.log("   Follow DEPLOYMENT_GUIDE.md");
  console.log("\n📊 Contract Info:");
  console.log("   Address:", contractAddress);
  console.log("   Network: Polygon Mainnet");
  console.log("   Chain ID: 137");
  console.log(
    "   Explorer: https://polygonscan.com/address/" + contractAddress
  );
  console.log("   Deployer:", deployer.address);
  console.log("\n" + "=".repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Deployment failed:", error);
    process.exit(1);
  });
