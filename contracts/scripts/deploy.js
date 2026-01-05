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
  const tokenStats = await reliefFund.getTokenStats();
  console.log("📊 Initial Token Statistics:");
  console.log(
    "   Tokens Minted:",
    hre.ethers.formatEther(tokenStats[0]),
    "RELIEF"
  );
  console.log(
    "   Tokens Expired:",
    hre.ethers.formatEther(tokenStats[1]),
    "RELIEF"
  );
  console.log(
    "   Tokens Active:",
    hre.ethers.formatEther(tokenStats[2]),
    "RELIEF"
  );
  console.log(
    "   ETH Donations:",
    hre.ethers.formatEther(tokenStats[3]),
    "ETH"
  );

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
