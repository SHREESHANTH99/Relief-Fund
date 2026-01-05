const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { ethers } = require("ethers");

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(",") || "http://localhost:3000",
    credentials: true,
  })
);
app.use(express.json());

// Blockchain connection
let provider;
let contract;
let isConnected = false;

// Contract ABI (Phase-1: Relief Token System)
const CONTRACT_ABI = [
  "function owner() view returns (address)",
  "function paused() view returns (bool)",
  "function totalDonations() view returns (uint256)",
  "function totalTokensMinted() view returns (uint256)",
  "function totalTokensExpired() view returns (uint256)",
  "function getUserInfo(address) view returns (uint8 role, bool isActive, uint256 registeredAt)",
  "function getBeneficiaryAccount(address) view returns (uint256 allocatedTokens, uint256 spentTokens, uint256 availableTokens, uint256 maxAllocation, uint256 dailySpendLimit, uint256 weeklySpendLimit, uint256 dailySpent, uint256 weeklySpent, uint256 expiryDate, bool isExpired)",
  "function getMerchantProfile(address) view returns (uint8 category, string businessName, bool verified, uint256 totalReceived)",
  "function getTokenStats() view returns (uint256 minted, uint256 expired, uint256 active, uint256 donations)",
  "function getRoleStats() view returns (uint256 admins, uint256 donors, uint256 beneficiaries, uint256 merchants)",
  "function getContractBalance() view returns (uint256)",
  "function getCategoryName(uint8) view returns (string)",
  "event DonationReceived(address indexed donor, uint256 amount, uint256 timestamp)",
  "event TokensAllocated(address indexed beneficiary, uint256 amount, uint256 expiryDate, uint256 timestamp)",
  "event TokensSpent(address indexed beneficiary, address indexed merchant, uint8 category, uint256 amount, string description, uint256 timestamp)",
  "event TokensExpired(address indexed beneficiary, uint256 amount, uint256 timestamp)",
  "event MerchantRegistered(address indexed merchant, uint8 category, string businessName, uint256 timestamp)",
  "event RoleAssigned(address indexed user, uint8 role, uint256 timestamp)",
  "event RoleRevoked(address indexed user, uint8 oldRole, uint256 timestamp)",
];

// Initialize blockchain connection
async function initBlockchain() {
  try {
    const RPC_URL = process.env.RPC_URL || "http://127.0.0.1:8545";
    const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;

    if (!CONTRACT_ADDRESS) {
      console.warn("⚠️  CONTRACT_ADDRESS not set in .env file");
      console.warn("   Deploy the contract first and update .env");
      return false;
    }

    provider = new ethers.JsonRpcProvider(RPC_URL);

    // Test connection
    const network = await provider.getNetwork();
    console.log("✅ Connected to blockchain");
    console.log("   Network:", network.name);
    console.log("   Chain ID:", network.chainId.toString());

    // Initialize contract
    contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);

    // Verify contract
    const owner = await contract.owner();
    console.log("✅ Contract connected");
    console.log("   Address:", CONTRACT_ADDRESS);
    console.log("   Owner:", owner);

    isConnected = true;
    return true;
  } catch (error) {
    console.error("❌ Blockchain connection failed:", error.message);
    return false;
  }
}

// ============= ROUTES =============

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    message: "ReliefFund Backend API",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    blockchain: {
      connected: isConnected,
      rpcUrl: process.env.RPC_URL || "http://127.0.0.1:8545",
      contractAddress: process.env.CONTRACT_ADDRESS || "Not configured",
    },
  });
});

// Get blockchain connection status
app.get("/api/blockchain/status", async (req, res) => {
  try {
    if (!isConnected) {
      return res.status(503).json({
        success: false,
        message: "Blockchain not connected",
      });
    }

    const network = await provider.getNetwork();
    const blockNumber = await provider.getBlockNumber();

    res.json({
      success: true,
      data: {
        connected: true,
        network: network.name,
        chainId: network.chainId.toString(),
        blockNumber: blockNumber,
        contractAddress: process.env.CONTRACT_ADDRESS,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching blockchain status",
      error: error.message,
    });
  }
});

// Get fund statistics
app.get("/api/fund/stats", async (req, res) => {
  try {
    if (!isConnected) {
      return res.status(503).json({
        success: false,
        message: "Blockchain not connected",
      });
    }

    const tokenStats = await contract.getTokenStats();
    const roleStats = await contract.getRoleStats();

    res.json({
      success: true,
      data: {
        tokens: {
          minted: ethers.formatEther(tokenStats[0]),
          expired: ethers.formatEther(tokenStats[1]),
          active: ethers.formatEther(tokenStats[2]),
          donations: ethers.formatEther(tokenStats[3]),
        },
        roles: {
          admins: roleStats[0].toString(),
          donors: roleStats[1].toString(),
          beneficiaries: roleStats[2].toString(),
          merchants: roleStats[3].toString(),
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching fund stats",
      error: error.message,
    });
  }
});

// Get user information
app.get("/api/user/:address", async (req, res) => {
  try {
    if (!isConnected) {
      return res.status(503).json({
        success: false,
        message: "Blockchain not connected",
      });
    }

    const { address } = req.params;

    if (!ethers.isAddress(address)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Ethereum address",
      });
    }

    const userInfo = await contract.getUserInfo(address);

    const roleNames = ["None", "Admin", "Donor", "Beneficiary", "Merchant"];

    res.json({
      success: true,
      data: {
        address: address,
        role: roleNames[Number(userInfo[0])],
        roleId: Number(userInfo[0]),
        isActive: userInfo[1],
        registeredAt: new Date(Number(userInfo[2]) * 1000).toISOString(),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching user info",
      error: error.message,
    });
  }
});

// Get beneficiary account details
app.get("/api/beneficiary/:address", async (req, res) => {
  try {
    if (!isConnected) {
      return res.status(503).json({
        success: false,
        message: "Blockchain not connected",
      });
    }

    const { address } = req.params;

    if (!ethers.isAddress(address)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Ethereum address",
      });
    }

    const account = await contract.getBeneficiaryAccount(address);

    res.json({
      success: true,
      data: {
        allocatedTokens: ethers.formatEther(account[0]),
        spentTokens: ethers.formatEther(account[1]),
        availableTokens: ethers.formatEther(account[2]),
        maxAllocation: ethers.formatEther(account[3]),
        dailySpendLimit: ethers.formatEther(account[4]),
        weeklySpendLimit: ethers.formatEther(account[5]),
        dailySpent: ethers.formatEther(account[6]),
        weeklySpent: ethers.formatEther(account[7]),
        expiryDate: Number(account[8]),
        isExpired: account[9],
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching beneficiary account",
      error: error.message,
    });
  }
});

// Get merchant profile
app.get("/api/merchant/:address", async (req, res) => {
  try {
    if (!isConnected) {
      return res.status(503).json({
        success: false,
        message: "Blockchain not connected",
      });
    }

    const { address } = req.params;

    if (!ethers.isAddress(address)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Ethereum address",
      });
    }

    const profile = await contract.getMerchantProfile(address);

    const categoryNames = ["None", "Food", "Medicine", "Emergency"];
    const categoryId = Number(profile[0]);

    res.json({
      success: true,
      data: {
        category: categoryNames[categoryId],
        categoryId: categoryId,
        businessName: profile[1],
        verified: profile[2],
        totalReceived: ethers.formatEther(profile[3]),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching merchant profile",
      error: error.message,
    });
  }
});

// Get contract events (last N events)
app.get("/api/events/:eventType", async (req, res) => {
  try {
    if (!isConnected) {
      return res.status(503).json({
        success: false,
        message: "Blockchain not connected",
      });
    }

    const { eventType } = req.params;
    const limit = parseInt(req.query.limit) || 10;

    const currentBlock = await provider.getBlockNumber();
    const fromBlock = Math.max(0, currentBlock - 10000); // Last 10000 blocks

    let events = [];

    switch (eventType) {
      case "donations":
        events = await contract.queryFilter(
          "DonationReceived",
          fromBlock,
          "latest"
        );
        break;
      case "allocations":
        events = await contract.queryFilter(
          "TokensAllocated",
          fromBlock,
          "latest"
        );
        break;
      case "spending":
        events = await contract.queryFilter("TokensSpent", fromBlock, "latest");
        break;
      case "expired":
        events = await contract.queryFilter(
          "TokensExpired",
          fromBlock,
          "latest"
        );
        break;
      case "merchants":
        events = await contract.queryFilter(
          "MerchantRegistered",
          fromBlock,
          "latest"
        );
        break;
      case "roles":
        const assigned = await contract.queryFilter(
          "RoleAssigned",
          fromBlock,
          "latest"
        );
        const revoked = await contract.queryFilter(
          "RoleRevoked",
          fromBlock,
          "latest"
        );
        events = [...assigned, ...revoked].sort(
          (a, b) => b.blockNumber - a.blockNumber
        );
        break;
      default:
        return res.status(400).json({
          success: false,
          message:
            "Invalid event type. Use: donations, allocations, spending, expired, merchants, or roles",
        });
    }

    const formattedEvents = events.slice(0, limit).map((event) => ({
      eventName: event.eventName,
      blockNumber: event.blockNumber,
      transactionHash: event.transactionHash,
      args: event.args.map((arg) => arg.toString()),
    }));

    res.json({
      success: true,
      data: {
        eventType,
        count: formattedEvents.length,
        events: formattedEvents,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching events",
      error: error.message,
    });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Endpoint not found",
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error("Server error:", err);
  res.status(500).json({
    success: false,
    message: "Internal server error",
    error: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

// Start server
async function startServer() {
  console.log("\n🚀 Starting ReliefFund Backend...\n");

  // Try to connect to blockchain
  await initBlockchain();

  app.listen(PORT, () => {
    console.log(`\n✅ Server running on http://localhost:${PORT}`);
    console.log(`📡 API endpoints:`);
    console.log(`   GET  /api/health`);
    console.log(`   GET  /api/blockchain/status`);
    console.log(`   GET  /api/fund/stats`);
    console.log(`   GET  /api/user/:address`);
    console.log(`   GET  /api/beneficiary/:address`);
    console.log(`   GET  /api/merchant/:address`);
    console.log(`   GET  /api/events/:eventType`);
    console.log("\n💡 Make sure Hardhat node is running on port 8545");
    console.log("💡 Update CONTRACT_ADDRESS in .env after deployment");
    console.log("\n🪙 Phase-1: Relief Token System Active\n");
  });
}

startServer();
