const express = require("express");
const router = express.Router();
const crypto = require("crypto");

// In-memory storage for offline IOUs (in production, use database)
let offlineIOUs = [];
let iouCounter = 0;

// Store offline IOU
router.post("/create-iou", async (req, res) => {
  try {
    const { beneficiary, merchant, amount, signature, timestamp, nonce } =
      req.body;

    // Validate required fields
    if (!beneficiary || !merchant || !amount || !signature) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields",
      });
    }

    // Create IOU record
    const iou = {
      id: ++iouCounter,
      beneficiary,
      merchant,
      amount,
      signature,
      timestamp: timestamp || Date.now(),
      nonce: nonce || 0,
      status: "pending", // pending, synced, settled, failed
      createdAt: Date.now(),
      syncedAt: null,
      settledAt: null,
    };

    offlineIOUs.push(iou);

    res.json({
      success: true,
      iou: {
        id: iou.id,
        status: iou.status,
      },
    });
  } catch (error) {
    console.error("Error creating IOU:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Get merchant's pending IOUs
router.get("/merchant/:address/ious", async (req, res) => {
  try {
    const merchantAddress = req.params.address.toLowerCase();

    const merchantIOUs = offlineIOUs.filter(
      (iou) => iou.merchant.toLowerCase() === merchantAddress
    );

    const summary = {
      total: merchantIOUs.length,
      pending: merchantIOUs.filter((iou) => iou.status === "pending").length,
      synced: merchantIOUs.filter((iou) => iou.status === "synced").length,
      settled: merchantIOUs.filter((iou) => iou.status === "settled").length,
      failed: merchantIOUs.filter((iou) => iou.status === "failed").length,
      totalAmount: merchantIOUs
        .filter((iou) => iou.status !== "failed")
        .reduce((sum, iou) => sum + parseFloat(iou.amount), 0),
    };

    res.json({
      success: true,
      ious: merchantIOUs,
      summary,
    });
  } catch (error) {
    console.error("Error fetching merchant IOUs:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Get all IOUs (admin)
router.get("/all-ious", async (req, res) => {
  try {
    const summary = {
      total: offlineIOUs.length,
      pending: offlineIOUs.filter((iou) => iou.status === "pending").length,
      synced: offlineIOUs.filter((iou) => iou.status === "synced").length,
      settled: offlineIOUs.filter((iou) => iou.status === "settled").length,
      failed: offlineIOUs.filter((iou) => iou.status === "failed").length,
      totalAmount: offlineIOUs
        .filter((iou) => iou.status !== "failed")
        .reduce((sum, iou) => sum + parseFloat(iou.amount), 0),
      merchantCount: new Set(offlineIOUs.map((iou) => iou.merchant)).size,
      beneficiaryCount: new Set(offlineIOUs.map((iou) => iou.beneficiary)).size,
    };

    res.json({
      success: true,
      ious: offlineIOUs,
      summary,
    });
  } catch (error) {
    console.error("Error fetching all IOUs:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Bulk sync IOUs to blockchain
router.post("/bulk-sync", async (req, res) => {
  try {
    const { merchantAddress, iouIds } = req.body;

    if (!merchantAddress || !iouIds || !Array.isArray(iouIds)) {
      return res.status(400).json({
        success: false,
        error: "Invalid request",
      });
    }

    // Mark IOUs as synced
    const syncedIOUs = [];
    iouIds.forEach((id) => {
      const iou = offlineIOUs.find((i) => i.id === id);
      if (iou && iou.merchant.toLowerCase() === merchantAddress.toLowerCase()) {
        iou.status = "synced";
        iou.syncedAt = Date.now();
        syncedIOUs.push(iou);
      }
    });

    res.json({
      success: true,
      syncedCount: syncedIOUs.length,
      ious: syncedIOUs,
    });
  } catch (error) {
    console.error("Error syncing IOUs:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Mark IOUs as settled (after blockchain confirmation)
router.post("/mark-settled", async (req, res) => {
  try {
    const { iouIds, txHash } = req.body;

    if (!iouIds || !Array.isArray(iouIds)) {
      return res.status(400).json({
        success: false,
        error: "Invalid request",
      });
    }

    const settledIOUs = [];
    iouIds.forEach((id) => {
      const iou = offlineIOUs.find((i) => i.id === id);
      if (iou) {
        iou.status = "settled";
        iou.settledAt = Date.now();
        iou.txHash = txHash;
        settledIOUs.push(iou);
      }
    });

    res.json({
      success: true,
      settledCount: settledIOUs.length,
    });
  } catch (error) {
    console.error("Error marking IOUs as settled:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Delete IOU (for testing/cleanup)
router.delete("/iou/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const index = offlineIOUs.findIndex((iou) => iou.id === id);

    if (index === -1) {
      return res.status(404).json({
        success: false,
        error: "IOU not found",
      });
    }

    offlineIOUs.splice(index, 1);

    res.json({
      success: true,
      message: "IOU deleted",
    });
  } catch (error) {
    console.error("Error deleting IOU:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;
