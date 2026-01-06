const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  const recipientAddress = "0xaEd7bF1BF9Ed43104C4883937137f5C608f9Cb2e";

  console.log("💸 Sending ETH...");
  console.log(`   From: ${deployer.address}`);
  console.log(`   To: ${recipientAddress}`);

  const tx = await deployer.sendTransaction({
    to: recipientAddress,
    value: hre.ethers.parseEther("10"),
  });

  await tx.wait();

  console.log("✅ Successfully sent 10 ETH!");
  console.log(`   Transaction hash: ${tx.hash}`);

  // Check balance
  const balance = await hre.ethers.provider.getBalance(recipientAddress);
  console.log(`💰 Recipient balance: ${hre.ethers.formatEther(balance)} ETH`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
