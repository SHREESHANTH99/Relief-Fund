const express = require("express");
const { ethers } = require("ethers");
const crypto = require("crypto");
require("dotenv").config();

const router = express.Router();

// In-memory PIN storage (in production, use database with encryption)
const pinStorage = new Map(); // address -> hashed PIN

/**
 * Hash PIN with user address as salt
 */
function hashPIN(pin, address) {
  return crypto
    .createHash("sha256")
    .update(pin + address.toLowerCase())
    .digest("hex");
}

/**
 * Convert hash to bytes32 for Solidity
 */
function hashToBytes32(hash) {
  return "0x" + hash;
}

/**
 * Set PIN for user
 * POST /api/auth/set-pin
 * Body: { address, pin }
 */
router.post("/set-pin", async (req, res) => {
  try {
    const { address, pin } = req.body;

    // Validate inputs
    if (!address || !ethers.isAddress(address)) {
      return res.status(400).json({ error: "Invalid address" });
    }

    if (!pin || !/^\d{4}$/.test(pin)) {
      return res.status(400).json({ error: "PIN must be 4 digits" });
    }

    // Hash and store PIN
    const hashedPIN = hashPIN(pin, address);
    pinStorage.set(address.toLowerCase(), hashedPIN);

    // Store PIN hash on-chain (admin call)
    const provider = new ethers.JsonRpcProvider(
      process.env.RPC_URL || "http://127.0.0.1:8545"
    );
    const relayerWallet = new ethers.Wallet(
      process.env.RELAYER_PRIVATE_KEY,
      provider
    );

    const contract = new ethers.Contract(
      process.env.CONTRACT_ADDRESS,
      [
        "function setPINHash(address _user, bytes32 _pinHash) external",
        "function hasPIN(address) view returns (bool)",
      ],
      relayerWallet
    );

    const pinHashBytes32 = hashToBytes32(hashedPIN);
    const tx = await contract.setPINHash(address, pinHashBytes32);
    await tx.wait();

    res.json({
      success: true,
      message: "PIN set successfully",
      txHash: tx.hash,
    });
  } catch (error) {
    console.error("Set PIN error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Verify PIN
 * POST /api/auth/verify-pin
 * Body: { address, pin }
 */
router.post("/verify-pin", async (req, res) => {
  try {
    const { address, pin } = req.body;

    // Validate inputs
    if (!address || !ethers.isAddress(address)) {
      return res.status(400).json({ error: "Invalid address" });
    }

    if (!pin || !/^\d{4}$/.test(pin)) {
      return res.status(400).json({ error: "Invalid PIN format" });
    }

    // Get stored hash
    const storedHash = pinStorage.get(address.toLowerCase());
    if (!storedHash) {
      return res.status(404).json({ error: "PIN not set for this user" });
    }

    // Verify PIN
    const enteredHash = hashPIN(pin, address);
    const isValid = storedHash === enteredHash;

    if (isValid) {
      res.json({ success: true, verified: true });
    } else {
      res.status(401).json({ error: "Invalid PIN" });
    }
  } catch (error) {
    console.error("Verify PIN error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Relayed payment - gasless transaction
 * POST /api/auth/relay-payment
 * Body: { beneficiary, merchant, amount, description, pin }
 */
router.post("/relay-payment", async (req, res) => {
  try {
    const { beneficiary, merchant, amount, description, pin } = req.body;

    // Validate inputs
    if (!beneficiary || !ethers.isAddress(beneficiary)) {
      return res.status(400).json({ error: "Invalid beneficiary address" });
    }

    if (!merchant || !ethers.isAddress(merchant)) {
      return res.status(400).json({ error: "Invalid merchant address" });
    }

    if (!amount || parseFloat(amount) <= 0) {
      return res.status(400).json({ error: "Invalid amount" });
    }

    if (!pin || !/^\d{4}$/.test(pin)) {
      return res.status(400).json({ error: "Invalid PIN" });
    }

    // Verify PIN
    const storedHash = pinStorage.get(beneficiary.toLowerCase());
    if (!storedHash) {
      return res.status(404).json({ error: "PIN not set" });
    }

    const enteredHash = hashPIN(pin, beneficiary);
    if (storedHash !== enteredHash) {
      return res.status(401).json({ error: "Invalid PIN" });
    }

    // Setup relayer
    const provider = new ethers.JsonRpcProvider(
      process.env.RPC_URL || "http://127.0.0.1:8545"
    );
    const relayerWallet = new ethers.Wallet(
      process.env.RELAYER_PRIVATE_KEY,
      provider
    );

    const contract = new ethers.Contract(
      process.env.CONTRACT_ADDRESS,
      [
        "function relaySpendTokens(address _user, address _merchant, uint256 _amount, string _description, bytes32 _pinHash, uint256 _nonce) external",
        "function getNonce(address _user) view returns (uint256)",
      ],
      relayerWallet
    );

    // Get user's nonce
    const nonce = await contract.getNonce(beneficiary);

    // Convert amount to wei
    const amountInWei = ethers.parseEther(amount.toString());

    // Hash PIN
    const pinHashBytes32 = hashToBytes32(enteredHash);

    // Submit relayed transaction
    const tx = await contract.relaySpendTokens(
      beneficiary,
      merchant,
      amountInWei,
      description || "Relayed payment",
      pinHashBytes32,
      nonce
    );

    await tx.wait();

    res.json({
      success: true,
      message: "Payment successful",
      txHash: tx.hash,
      gasUsed: "Hidden from user",
    });
  } catch (error) {
    console.error("Relay payment error:", error);
    res.status(500).json({
      error: error.message || "Payment failed",
    });
  }
});

/**
 * Check if user has PIN set
 * GET /api/auth/has-pin/:address
 */
router.get("/has-pin/:address", async (req, res) => {
  try {
    const { address } = req.params;

    if (!ethers.isAddress(address)) {
      return res.status(400).json({ error: "Invalid address" });
    }

    const hasPIN = pinStorage.has(address.toLowerCase());

    // Also check on-chain
    const provider = new ethers.JsonRpcProvider(
      process.env.RPC_URL || "http://127.0.0.1:8545"
    );
    const contract = new ethers.Contract(
      process.env.CONTRACT_ADDRESS,
      ["function userHasPIN(address _user) view returns (bool)"],
      provider
    );

    const onChainHasPIN = await contract.userHasPIN(address);

    res.json({
      hasPIN: hasPIN && onChainHasPIN,
      localStorage: hasPIN,
      onChain: onChainHasPIN,
    });
  } catch (error) {
    console.error("Check PIN error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Reset PIN (admin only)
 * POST /api/auth/reset-pin
 * Body: { address, adminKey }
 */
router.post("/reset-pin", async (req, res) => {
  try {
    const { address, adminKey } = req.body;

    // Simple admin key check (in production, use proper auth)
    if (adminKey !== process.env.ADMIN_API_KEY) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    if (!address || !ethers.isAddress(address)) {
      return res.status(400).json({ error: "Invalid address" });
    }

    // Remove from storage
    pinStorage.delete(address.toLowerCase());

    // Reset on-chain
    const provider = new ethers.JsonRpcProvider(
      process.env.RPC_URL || "http://127.0.0.1:8545"
    );
    const adminWallet = new ethers.Wallet(
      process.env.RELAYER_PRIVATE_KEY,
      provider
    );

    const contract = new ethers.Contract(
      process.env.CONTRACT_ADDRESS,
      ["function resetPIN(address _user) external"],
      adminWallet
    );

    const tx = await contract.resetPIN(address);
    await tx.wait();

    res.json({
      success: true,
      message: "PIN reset successfully",
      txHash: tx.hash,
    });
  } catch (error) {
    console.error("Reset PIN error:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
