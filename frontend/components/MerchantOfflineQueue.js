import { useState, useEffect } from "react";
import { ethers } from "ethers";
import axios from "axios";
import styles from "@/styles/MerchantOffline.module.css";

const MerchantOfflineQueue = ({ merchantAddress, contract }) => {
  const [ious, setIOUs] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    fetchIOUs();
    const interval = setInterval(fetchIOUs, 10000); // Refresh every 10s

    // Listen for online/offline events
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      clearInterval(interval);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [merchantAddress]);

  const fetchIOUs = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";
      const response = await axios.get(
        `${apiUrl}/api/offline/merchant/${merchantAddress}/ious`
      );

      if (response.data.success) {
        setIOUs(response.data.ious);
        setSummary(response.data.summary);
      }
    } catch (err) {
      console.error("Error fetching IOUs:", err);
    }
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: "", text: "" }), 5000);
  };

  const handleBulkSync = async () => {
    try {
      setSyncing(true);

      // Get pending IOUs
      const pendingIOUs = ious.filter((iou) => iou.status === "pending");

      if (pendingIOUs.length === 0) {
        showMessage("info", "No pending IOUs to sync");
        return;
      }

      // Mark as synced in backend
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";
      const syncResponse = await axios.post(`${apiUrl}/api/offline/bulk-sync`, {
        merchantAddress,
        iouIds: pendingIOUs.map((iou) => iou.id),
      });

      if (!syncResponse.data.success) {
        throw new Error("Failed to sync IOUs");
      }

      showMessage(
        "info",
        `Syncing ${pendingIOUs.length} IOUs to blockchain...`
      );

      // Settle on blockchain
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contractWithSigner = contract.connect(signer);

      // Process each IOU
      for (const iou of pendingIOUs) {
        try {
          // Verify signature and settle
          const tx = await contractWithSigner.relaySpendTokens(
            iou.beneficiary,
            iou.merchant,
            ethers.parseEther(iou.amount),
            `Offline IOU #${iou.id}`,
            iou.signature,
            iou.nonce
          );

          await tx.wait();

          // Mark as settled
          const apiUrl =
            process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";
          await axios.post(`${apiUrl}/api/offline/mark-settled`, {
            iouIds: [iou.id],
            txHash: tx.hash,
          });
        } catch (err) {
          console.error(`Error settling IOU ${iou.id}:`, err);
        }
      }

      showMessage(
        "success",
        `✅ Successfully synced ${pendingIOUs.length} IOUs!`
      );
      fetchIOUs();
    } catch (err) {
      console.error("Error syncing IOUs:", err);
      showMessage("error", err.message || "Failed to sync IOUs");
    } finally {
      setSyncing(false);
    }
  };

  const handleCreateOfflinePayment = async () => {
    try {
      setLoading(true);

      const amount = prompt("Enter amount:");
      if (!amount) return;

      const beneficiaryAddress = prompt("Enter beneficiary address:");
      if (!beneficiaryAddress) return;

      // Create mock signature (in real app, this would come from beneficiary's device/NFC)
      const message = `Pay ${amount} tokens to ${merchantAddress}`;
      const signature = ethers.keccak256(ethers.toUtf8Bytes(message));

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";
      const response = await axios.post(`${apiUrl}/api/offline/create-iou`, {
        beneficiary: beneficiaryAddress,
        merchant: merchantAddress,
        amount,
        signature,
        timestamp: Date.now(),
        nonce: Date.now(),
      });

      if (response.data.success) {
        showMessage("success", "✅ Offline payment recorded!");
        fetchIOUs();
      }
    } catch (err) {
      console.error("Error creating offline payment:", err);
      showMessage("error", "Failed to create offline payment");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: { label: "Pending", color: "#ffc107" },
      synced: { label: "Synced", color: "#2196f3" },
      settled: { label: "Settled", color: "#4caf50" },
      failed: { label: "Failed", color: "#f44336" },
    };

    const badge = badges[status] || badges.pending;

    return (
      <span className={styles.statusBadge} style={{ background: badge.color }}>
        {badge.label}
      </span>
    );
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h2>📦 Offline Payment Queue</h2>
          <p className={styles.subtitle}>
            Store-and-forward payments when offline
          </p>
        </div>
        <div className={styles.connectionStatus}>
          <div
            className={`${styles.statusIndicator} ${
              isOnline ? styles.online : styles.offline
            }`}
          >
            <span className={styles.statusDot}></span>
            <span>{isOnline ? "Online" : "Offline"}</span>
          </div>
        </div>
      </div>

      {message.text && (
        <div className={`${styles.message} ${styles[message.type]}`}>
          {message.text}
        </div>
      )}

      {/* Summary Cards */}
      {summary && (
        <div className={styles.summaryGrid}>
          <div className={styles.summaryCard}>
            <div className={styles.summaryIcon}>📝</div>
            <div className={styles.summaryInfo}>
              <div className={styles.summaryLabel}>Total IOUs</div>
              <div className={styles.summaryValue}>{summary.total}</div>
            </div>
          </div>

          <div className={styles.summaryCard}>
            <div className={styles.summaryIcon}>⏳</div>
            <div className={styles.summaryInfo}>
              <div className={styles.summaryLabel}>Pending</div>
              <div className={styles.summaryValue}>{summary.pending}</div>
            </div>
          </div>

          <div className={styles.summaryCard}>
            <div className={styles.summaryIcon}>✅</div>
            <div className={styles.summaryInfo}>
              <div className={styles.summaryLabel}>Settled</div>
              <div className={styles.summaryValue}>{summary.settled}</div>
            </div>
          </div>

          <div className={styles.summaryCard}>
            <div className={styles.summaryIcon}>💰</div>
            <div className={styles.summaryInfo}>
              <div className={styles.summaryLabel}>Total Amount</div>
              <div className={styles.summaryValue}>
                {summary.totalAmount.toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className={styles.actions}>
        <button
          className={styles.createButton}
          onClick={handleCreateOfflinePayment}
          disabled={loading}
        >
          <span>➕</span>
          <span>Create Offline Payment</span>
        </button>

        <button
          className={styles.syncButton}
          onClick={handleBulkSync}
          disabled={syncing || summary?.pending === 0 || !isOnline}
        >
          <span>🔄</span>
          <span>
            {syncing
              ? "Syncing..."
              : `Sync ${summary?.pending || 0} Pending IOUs`}
          </span>
        </button>
      </div>

      {/* IOUs List */}
      <div className={styles.iousList}>
        <h3>IOU Records</h3>

        {ious.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>📭</div>
            <h4>No Offline Payments</h4>
            <p>Offline payments will appear here when created</p>
          </div>
        ) : (
          <div className={styles.table}>
            <div className={styles.tableHeader}>
              <div>ID</div>
              <div>Beneficiary</div>
              <div>Amount</div>
              <div>Status</div>
              <div>Created</div>
              <div>Settled</div>
            </div>

            {ious.map((iou) => (
              <div key={iou.id} className={styles.tableRow}>
                <div className={styles.iouId}>#{iou.id}</div>
                <div className={styles.address}>
                  {iou.beneficiary.slice(0, 6)}...{iou.beneficiary.slice(-4)}
                </div>
                <div className={styles.amount}>
                  {parseFloat(iou.amount).toFixed(2)} RELIEF
                </div>
                <div>{getStatusBadge(iou.status)}</div>
                <div className={styles.timestamp}>
                  {formatDate(iou.createdAt)}
                </div>
                <div className={styles.timestamp}>
                  {iou.settledAt ? formatDate(iou.settledAt) : "-"}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MerchantOfflineQueue;
