import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { QRCodeSVG } from "qrcode.react";
import axios from "axios";
import MerchantOfflineQueue from "./MerchantOfflineQueue";
import styles from "@/styles/MerchantDashboard.module.css";

const MerchantDashboard = ({ address, contract }) => {
  const [merchantProfile, setMerchantProfile] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("qr");

  const categoryNames = ["None", "Food", "Medicine", "Emergency"];

  useEffect(() => {
    if (address && contract) {
      fetchMerchantData();
      fetchTransactions();
      const interval = setInterval(() => {
        fetchMerchantData();
        fetchTransactions();
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [address, contract]);

  const fetchMerchantData = async () => {
    try {
      setLoading(true);

      // Fetch merchant profile from backend
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";
      const profileRes = await axios.get(`${apiUrl}/api/merchant/${address}`);

      // Backend returns { success, data } structure
      if (profileRes.data.success && profileRes.data.data) {
        setMerchantProfile(profileRes.data.data);
      } else {
        setMerchantProfile(null);
      }
    } catch (err) {
      console.error("Error fetching merchant data:", err);
      setMerchantProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async () => {
    try {
      if (!contract || !address) return;

      // Query TokensSpent events where merchant is the recipient
      const filter = contract.filters.TokensSpent(null, address);
      const events = await contract.queryFilter(filter, -5000);

      const txs = events.map((event) => ({
        beneficiary: event.args.beneficiary,
        merchant: event.args.merchant,
        category: event.args.category || 0,
        amount: ethers.formatEther(event.args.amount),
        description: event.args.description,
        timestamp: Number(event.args.timestamp),
        txHash: event.transactionHash,
      }));

      setTransactions(txs.reverse());
      console.log("✅ Fetched", txs.length, "merchant transactions");
    } catch (err) {
      console.error("Error fetching transactions:", err);
    }
  };

  const generatePaymentQR = () => {
    const qrData = {
      type: "merchant_payment",
      merchantAddress: address,
      merchantName: merchantProfile?.businessName || "Unknown Merchant",
      category: merchantProfile?.categoryId || 0,
      timestamp: Date.now(),
      network: "hardhat-local",
    };
    return JSON.stringify(qrData);
  };

  const formatDate = (timestamp) => {
    return new Date(Number(timestamp) * 1000).toLocaleString();
  };

  if (loading) {
    return <div className={styles.loading}>Loading merchant dashboard...</div>;
  }

  if (!merchantProfile) {
    return (
      <div className={styles.errorCard}>
        <h3>⚠️ Merchant Not Found</h3>
        <p>Your account is not registered as a merchant.</p>
      </div>
    );
  }

  return (
    <div className={styles.dashboard}>
      <div className={styles.header}>
        <h2>🏪 Merchant Dashboard</h2>
        <p className={styles.businessName}>{merchantProfile.businessName}</p>
        <span className={styles.categoryBadge}>
          {categoryNames[merchantProfile.categoryId]}
        </span>
      </div>

      {/* Summary Cards */}
      <div className={styles.summaryGrid}>
        <div className={styles.summaryCard}>
          <div className={styles.cardIcon}>💰</div>
          <div className={styles.cardContent}>
            <div className={styles.cardLabel}>Total Received</div>
            <div className={styles.cardValue}>
              {ethers.formatEther(merchantProfile.totalReceived || "0")} RELIEF
            </div>
          </div>
        </div>

        <div className={styles.summaryCard}>
          <div className={styles.cardIcon}>📊</div>
          <div className={styles.cardContent}>
            <div className={styles.cardLabel}>Total Transactions</div>
            <div className={styles.cardValue}>{transactions.length}</div>
          </div>
        </div>

        <div className={styles.summaryCard}>
          <div className={styles.cardIcon}>
            {merchantProfile.verified ? "✅" : "⏳"}
          </div>
          <div className={styles.cardContent}>
            <div className={styles.cardLabel}>Verification Status</div>
            <div className={styles.cardValue}>
              {merchantProfile.verified ? "Verified" : "Pending"}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === "qr" ? styles.active : ""}`}
          onClick={() => setActiveTab("qr")}
        >
          📱 Payment QR
        </button>
        <button
          className={`${styles.tab} ${
            activeTab === "history" ? styles.active : ""
          }`}
          onClick={() => setActiveTab("history")}
        >
          📜 Transaction History
        </button>
        <button
          className={`${styles.tab} ${
            activeTab === "offline" ? styles.active : ""
          }`}
          onClick={() => setActiveTab("offline")}
        >
          📦 Offline Queue
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "qr" && (
        <div className={styles.qrSection}>
          <div className={styles.qrCard}>
            <h3>🎯 Show this QR to Beneficiaries</h3>
            <p className={styles.qrInstruction}>
              Beneficiaries can scan this code to pay you instantly
            </p>

            <div className={styles.qrCodeWrapper}>
              <QRCodeSVG
                value={generatePaymentQR()}
                size={280}
                level="H"
                includeMargin={true}
                imageSettings={{
                  src: "/merchant-icon.png",
                  excavate: true,
                  width: 40,
                  height: 40,
                }}
              />
            </div>

            <div className={styles.qrInfo}>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Business Name:</span>
                <span className={styles.infoValue}>
                  {merchantProfile.businessName}
                </span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Category:</span>
                <span className={styles.infoValue}>
                  {categoryNames[merchantProfile.categoryId]}
                </span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Merchant ID:</span>
                <span className={styles.infoValue}>
                  {address.slice(0, 10)}...{address.slice(-8)}
                </span>
              </div>
            </div>

            <button
              className={styles.refreshButton}
              onClick={() => window.location.reload()}
            >
              🔄 Refresh QR
            </button>
          </div>
        </div>
      )}

      {activeTab === "history" && (
        <div className={styles.historySection}>
          <div className={styles.historyCard}>
            <h3>📜 Transaction History</h3>

            {transactions.length === 0 ? (
              <div className={styles.emptyState}>
                <p>No transactions yet</p>
                <p className={styles.emptyHint}>
                  Show your QR code to beneficiaries to receive payments
                </p>
              </div>
            ) : (
              <div className={styles.transactionList}>
                {transactions.map((tx, index) => (
                  <div key={index} className={styles.transactionItem}>
                    <div className={styles.txHeader}>
                      <span className={styles.txAmount}>
                        +{ethers.formatEther(tx.amount)} RELIEF
                      </span>
                      <span className={styles.txDate}>
                        {formatDate(tx.timestamp)}
                      </span>
                    </div>
                    <div className={styles.txDetails}>
                      <div className={styles.txRow}>
                        <span className={styles.txLabel}>From:</span>
                        <span className={styles.txValue}>
                          {tx.beneficiary?.slice(0, 10)}...
                          {tx.beneficiary?.slice(-8)}
                        </span>
                      </div>
                      {tx.description && (
                        <div className={styles.txRow}>
                          <span className={styles.txLabel}>Note:</span>
                          <span className={styles.txValue}>
                            {tx.description}
                          </span>
                        </div>
                      )}
                      <div className={styles.txRow}>
                        <span className={styles.txLabel}>Category:</span>
                        <span className={styles.txCategoryBadge}>
                          {categoryNames[tx.category || 0]}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Offline Queue Tab */}
      {activeTab === "offline" && (
        <MerchantOfflineQueue merchantAddress={address} contract={contract} />
      )}
    </div>
  );
};

export default MerchantDashboard;
