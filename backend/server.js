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

// Contract ABI (minimal for Phase-1)
const CONTRACT_ABI = [
  "function owner() view returns (address)",
  "function paused() view returns (bool)",
  "function totalDonations() view returns (uint256)",
  "function totalAllocated() view returns (uint256)",
  "function totalSpent() view returns (uint256)",
  "function getUserInfo(address) view returns (uint8 role, bool isActive, uint256 registeredAt)",
  "function getFundStats() view returns (uint256 donations, uint256 allocated, uint256 spent, uint256 balance, bool isPaused)",
  "function getRoleStats() view returns (uint256 admins, uint256 donors, uint256 beneficiaries, uint256 merchants)",
  "function getContractBalance() view returns (uint256)",
  "event DonationReceived(address indexed donor, uint256 amount, uint256 timestamp)",
  "event AidAllocated(address indexed beneficiary, uint256 amount, string reason, uint256 timestamp)",
  "event AidSpent(address indexed beneficiary, address indexed merchant, uint256 amount, string description, uint256 timestamp)",
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

    const stats = await contract.getFundStats();
    const roleStats = await contract.getRoleStats();

    res.json({
      success: true,
      data: {
        fund: {
          totalDonations: ethers.formatEther(stats[0]),
          totalAllocated: ethers.formatEther(stats[1]),
          totalSpent: ethers.formatEther(stats[2]),
          balance: ethers.formatEther(stats[3]),
          paused: stats[4],
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
          "AidAllocated",
          fromBlock,
          "latest"
        );
        break;
      case "spending":
        events = await contract.queryFilter("AidSpent", fromBlock, "latest");
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
            "Invalid event type. Use: donations, allocations, spending, or roles",
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
    console.log(`   GET  /api/events/:eventType`);
    console.log("\n💡 Make sure Hardhat node is running on port 8545");
    console.log("💡 Update CONTRACT_ADDRESS in .env after deployment\n");
  });
}

startServer();
