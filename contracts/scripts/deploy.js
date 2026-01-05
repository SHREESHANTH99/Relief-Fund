const hre = require("hardhat");

async function main() {
  console.log("🚀 Deploying ReliefFund contract...\n");

  // Get the contract factory
  const ReliefFund = await hre.ethers.getContractFactory("ReliefFund");

  // Deploy the contract
  const reliefFund = await ReliefFund.deploy();
  await reliefFund.waitForDeployment();

  const contractAddress = await reliefFund.getAddress();

  console.log("✅ ReliefFund deployed to:", contractAddress);
  console.log("📋 Chain ID:", hre.network.config.chainId);
  console.log("🌐 Network:", hre.network.name);

  // Get deployer info
  const [deployer] = await hre.ethers.getSigners();
  console.log("👤 Deployed by:", deployer.address);
  console.log(
    "💰 Deployer balance:",
    hre.ethers.formatEther(
      await hre.ethers.provider.getBalance(deployer.address)
    ),
    "ETH\n"
  );

  // Get initial contract state
  const stats = await reliefFund.getFundStats();
  console.log("📊 Initial Contract State:");
  console.log("   Total Donations:", hre.ethers.formatEther(stats[0]), "ETH");
  console.log("   Total Allocated:", hre.ethers.formatEther(stats[1]), "ETH");
  console.log("   Total Spent:", hre.ethers.formatEther(stats[2]), "ETH");
  console.log("   Contract Balance:", hre.ethers.formatEther(stats[3]), "ETH");
  console.log("   Paused:", stats[4]);

  const roleStats = await reliefFund.getRoleStats();
  console.log("\n👥 Role Statistics:");
  console.log("   Admins:", roleStats[0].toString());
  console.log("   Donors:", roleStats[1].toString());
  console.log("   Beneficiaries:", roleStats[2].toString());
  console.log("   Merchants:", roleStats[3].toString());

  // Save deployment info
  const fs = require("fs");
  const deploymentInfo = {
    contractAddress: contractAddress,
    chainId: hre.network.config.chainId,
    network: hre.network.name,
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
  };

  fs.writeFileSync(
    "./deployment.json",
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log("\n💾 Deployment info saved to deployment.json");
  console.log("\n✨ Deployment complete!\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
