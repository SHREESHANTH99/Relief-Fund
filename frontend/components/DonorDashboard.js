import { useState, useEffect } from "react";
import { ethers } from "ethers";
import axios from "axios";
import Link from "next/link";
import styles from "@/styles/DonorDashboard.module.css";

const DonorDashboard = ({ address, contract }) => {
  const [donorStats, setDonorStats] = useState(null);
  const [systemStats, setSystemStats] = useState(null);
  const [donations, setDonations] = useState([]);
  const [impactTrail, setImpactTrail] = useState([]);
  const [loading, setLoading] = useState(true);
  const [donationAmount, setDonationAmount] = useState("");
  const [showDonateModal, setShowDonateModal] = useState(false);
  const [donating, setDonating] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [activeTab, setActiveTab] = useState("overview"); // overview, trail, impact

  useEffect(() => {
    if (address && contract) {
      fetchDonorData();
      fetchSystemStats();
      fetchDonations();
      fetchImpactTrail();
      const interval = setInterval(() => {
        fetchDonorData();
        fetchSystemStats();
        fetchDonations();
        fetchImpactTrail();
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [address, contract]);

  const fetchDonorData = async () => {
    try {
      setLoading(true);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";

      try {
        const response = await axios.get(`${apiUrl}/api/donor/${address}`, {
          timeout: 3000, // 3 second timeout
        });

        if (response.data.success) {
          setDonorStats(response.data.data);
          return;
        }
      } catch (apiError) {
        console.warn(
          "API fetch failed, falling back to contract data:",
          apiError.message
        );
      }

      // Fallback: Calculate from blockchain events directly
      if (contract && address) {
        const filter = contract.filters.DonationReceived(address);
        const provider = contract.runner.provider;
        const currentBlock = await provider.getBlockNumber();
        const fromBlock = Math.max(0, currentBlock - 1000);
        const events = await contract.queryFilter(filter, fromBlock, "latest");

        let totalDonated = 0n;
        events.forEach((event) => {
          totalDonated += event.args.amount;
        });

        setDonorStats({
          totalDonated: ethers.formatEther(totalDonated),
          donationCount: events.length,
        });
      }
    } catch (err) {
      console.error("Error fetching donor data:", err);
      // Set empty stats to prevent undefined errors
      setDonorStats({
        totalDonated: "0",
        donationCount: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchSystemStats = async () => {
    try {
      // Fetch system-wide statistics from contract
      const totalDonations = await contract.totalDonations();
      const totalMinted = await contract.totalTokensMinted();
      const adminCount = await contract.roleCount(1); // Admin
      const beneficiaryCount = await contract.roleCount(3); // Beneficiary
      const merchantCount = await contract.roleCount(4); // Merchant

      setSystemStats({
        totalDonations: ethers.formatEther(totalDonations),
        totalTokensMinted: ethers.formatEther(totalMinted),
        beneficiaryCount: beneficiaryCount.toString(),
        merchantCount: merchantCount.toString(),
      });
    } catch (err) {
      console.error("Error fetching system stats:", err);
    }
  };

  const fetchDonations = async () => {
    try {
      if (!contract || !address) return;

      const filter = contract.filters.DonationReceived(address);
      const provider = contract.runner.provider;
      const currentBlock = await provider.getBlockNumber();
      const fromBlock = Math.max(0, currentBlock - 1000);
      const events = await contract.queryFilter(filter, fromBlock, "latest");

      const donationList = events.map((event) => ({
        amount: ethers.formatEther(event.args.amount),
        timestamp: Number(event.args.timestamp),
        txHash: event.transactionHash,
      }));

      setDonations(donationList.reverse());
      console.log("✅ Fetched", donationList.length, "donations");
    } catch (err) {
      console.error("Error fetching donations:", err);
      setDonations([]);
    }
  };

  const fetchImpactTrail = async () => {
    try {
      if (!contract || !address) return;

      // Fetch all TokensSpent events to trace impact
      const provider = contract.runner.provider;
      const currentBlock = await provider.getBlockNumber();
      const fromBlock = Math.max(0, currentBlock - 2000);

      const filter = contract.filters.TokensSpent();
      const events = await contract.queryFilter(filter, fromBlock, "latest");

      const categoryNames = ["None", "Food", "Medicine", "Emergency"];
      const trail = events.map((event) => ({
        category: categoryNames[Number(event.args.category) || 0],
        amount: ethers.formatEther(event.args.amount),
        merchant: event.args.merchant,
        description: event.args.description,
        timestamp: Number(event.args.timestamp),
        txHash: event.transactionHash,
      }));

      setImpactTrail(trail.reverse());
    } catch (err) {
      console.error("Error fetching impact trail:", err);
      setImpactTrail([]);
    }
  };

  const handleDonate = async () => {
    if (!donationAmount || parseFloat(donationAmount) <= 0) {
      showMessage("error", "Please enter a valid donation amount");
      return;
    }

    try {
      setDonating(true);
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contractWithSigner = contract.connect(signer);

      const amountInWei = ethers.parseEther(donationAmount);

      const tx = await contractWithSigner.donate({ value: amountInWei });
      await tx.wait();

      showMessage(
        "success",
        `✅ Donation of ${donationAmount} ETH successful!`
      );
      setDonationAmount("");
      setShowDonateModal(false);

      // Refresh data
      await fetchDonorData();
      await fetchSystemStats();
      await fetchDonations();
    } catch (err) {
      console.error("Donation error:", err);
      showMessage("error", err.message || "Donation failed");
    } finally {
      setDonating(false);
    }
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: "", text: "" }), 5000);
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  if (loading && !donorStats) {
    return <div className={styles.loading}>Loading donor dashboard...</div>;
  }

  return (
    <div className={styles.dashboard}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h2>💝 Donor Dashboard</h2>
          <p className={styles.walletAddress}>
            <span className={styles.addressLabel}>Wallet:</span>
            <code>
              {address?.slice(0, 8)}...{address?.slice(-6)}
            </code>
          </p>
        </div>
        <div className={styles.headerActions}>
          <Link href="/profile" className={styles.profileLink}>
            <span>👤</span>
            <span>Profile</span>
          </Link>
          <button
            className={styles.donateButton}
            onClick={() => setShowDonateModal(true)}
          >
            ➕ Make Donation
          </button>
        </div>
      </div>

      {message.text && (
        <div className={`${styles.message} ${styles[message.type]}`}>
          {message.text}
        </div>
      )}

      {/* Tab Navigation */}
      <div className={styles.tabNavigation}>
        <button
          className={`${styles.tabButton} ${
            activeTab === "overview" ? styles.activeTab : ""
          }`}
          onClick={() => setActiveTab("overview")}
        >
          📊 Overview
        </button>
        <button
          className={`${styles.tabButton} ${
            activeTab === "trail" ? styles.activeTab : ""
          }`}
          onClick={() => setActiveTab("trail")}
        >
          🔍 Impact Trail
        </button>
        <button
          className={`${styles.tabButton} ${
            activeTab === "impact" ? styles.activeTab : ""
          }`}
          onClick={() => setActiveTab("impact")}
        >
          🌟 Proof of Impact
        </button>
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <>
          {/* Personal Stats */}
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statIcon}>💰</div>
              <div className={styles.statContent}>
                <div className={styles.statLabel}>Total Donated</div>
                <div className={styles.statValue}>
                  {donorStats?.totalDonated || "0"} ETH
                </div>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statIcon}>📊</div>
              <div className={styles.statContent}>
                <div className={styles.statLabel}>Total Donations</div>
                <div className={styles.statValue}>{donations.length}</div>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statIcon}>🎁</div>
              <div className={styles.statContent}>
                <div className={styles.statLabel}>Last Donation</div>
                <div className={styles.statValue}>
                  {donations[0]
                    ? `${parseFloat(donations[0].amount).toFixed(4)} ETH`
                    : "No donations yet"}
                </div>
              </div>
            </div>
          </div>

          {/* System Impact Stats */}
          {systemStats && (
            <div className={styles.impactSection}>
              <h3 className={styles.sectionTitle}>🌟 System Impact</h3>
              <div className={styles.impactGrid}>
                <div className={styles.impactCard}>
                  <div className={styles.impactValue}>
                    {parseFloat(systemStats.totalDonations).toFixed(2)} ETH
                  </div>
                  <div className={styles.impactLabel}>
                    Total System Donations
                  </div>
                </div>

                <div className={styles.impactCard}>
                  <div className={styles.impactValue}>
                    {parseFloat(systemStats.totalTokensMinted).toFixed(0)}
                  </div>
                  <div className={styles.impactLabel}>Relief Tokens Minted</div>
                </div>

                <div className={styles.impactCard}>
                  <div className={styles.impactValue}>
                    {systemStats.beneficiaryCount}
                  </div>
                  <div className={styles.impactLabel}>Active Beneficiaries</div>
                </div>

                <div className={styles.impactCard}>
                  <div className={styles.impactValue}>
                    {systemStats.merchantCount}
                  </div>
                  <div className={styles.impactLabel}>Registered Merchants</div>
                </div>
              </div>
            </div>
          )}

          {/* Donation History */}
          <div className={styles.historySection}>
            <h3 className={styles.sectionTitle}>📜 Donation History</h3>
            {donations.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>💸</div>
                <p>
                  No donations yet. Make your first donation to support the
                  relief fund!
                </p>
              </div>
            ) : (
              <div className={styles.donationList}>
                {donations.map((donation, index) => (
                  <div key={index} className={styles.donationItem}>
                    <div className={styles.donationIcon}>💝</div>
                    <div className={styles.donationDetails}>
                      <div className={styles.donationAmount}>
                        {parseFloat(donation.amount).toFixed(4)} ETH
                      </div>
                      <div className={styles.donationDate}>
                        {formatDate(donation.timestamp)}
                      </div>
                    </div>
                    <a
                      href={`https://etherscan.io/tx/${donation.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.txLink}
                    >
                      View Tx
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Impact Trail Tab */}
      {activeTab === "trail" && (
        <div className={styles.trailSection}>
          <div className={styles.privacyBanner}>
            🔒 This shows where your donations went while protecting beneficiary
            identities
          </div>

          {impactTrail.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>🔍</div>
              <p>
                No impact trail yet. Your donations will appear here once
                beneficiaries start spending.
              </p>
            </div>
          ) : (
            <div className={styles.trailList}>
              {impactTrail.map((item, index) => (
                <div key={index} className={styles.trailItem}>
                  <div className={styles.trailHeader}>
                    <span className={styles.trailCategory}>
                      {item.category}
                    </span>
                    <span className={styles.trailAmount}>
                      {item.amount} RELIEF
                    </span>
                  </div>
                  <div className={styles.trailBody}>
                    <div className={styles.trailMerchant}>
                      🏪 {item.merchant.slice(0, 6)}...{item.merchant.slice(-4)}
                    </div>
                    <div className={styles.trailDescription}>
                      {item.description}
                    </div>
                  </div>
                  <div className={styles.trailFooter}>
                    <span className={styles.trailTime}>
                      {formatDate(item.timestamp)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Proof of Impact Tab */}
      {activeTab === "impact" && (
        <div className={styles.impactProofSection}>
          <h3 className={styles.sectionTitle}>📊 Category-wise Impact</h3>

          {impactTrail.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>🌟</div>
              <p>
                Impact data will appear here as your donations create change.
              </p>
            </div>
          ) : (
            <>
              <div className={styles.categoryBreakdown}>
                {Object.entries(
                  impactTrail.reduce((acc, item) => {
                    acc[item.category] =
                      (acc[item.category] || 0) + parseFloat(item.amount);
                    return acc;
                  }, {})
                ).map(([category, total]) => (
                  <div key={category} className={styles.categoryCard}>
                    <div className={styles.categoryIcon}>
                      {category === "Food"
                        ? "🍎"
                        : category === "Medicine"
                        ? "💊"
                        : category === "Shelter"
                        ? "🏠"
                        : category === "Education"
                        ? "📚"
                        : "🛍️"}
                    </div>
                    <div className={styles.categoryDetails}>
                      <div className={styles.categoryName}>{category}</div>
                      <div className={styles.categoryTotal}>
                        {total.toFixed(2)} RELIEF
                      </div>
                      <div className={styles.categoryCount}>
                        {
                          impactTrail.filter((i) => i.category === category)
                            .length
                        }{" "}
                        transactions
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className={styles.impactSummary}>
                <h4>📈 Your Impact Summary</h4>
                <div className={styles.summaryStats}>
                  <div className={styles.summaryItem}>
                    <span className={styles.summaryLabel}>Total Spent</span>
                    <span className={styles.summaryValue}>
                      {impactTrail
                        .reduce((sum, item) => sum + parseFloat(item.amount), 0)
                        .toFixed(2)}{" "}
                      RELIEF
                    </span>
                  </div>
                  <div className={styles.summaryItem}>
                    <span className={styles.summaryLabel}>
                      Merchants Helped
                    </span>
                    <span className={styles.summaryValue}>
                      {new Set(impactTrail.map((item) => item.merchant)).size}
                    </span>
                  </div>
                  <div className={styles.summaryItem}>
                    <span className={styles.summaryLabel}>
                      Categories Covered
                    </span>
                    <span className={styles.summaryValue}>
                      {new Set(impactTrail.map((item) => item.category)).size}
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Donation Modal */}
      {showDonateModal && (
        <div
          className={styles.modalOverlay}
          onClick={() => setShowDonateModal(false)}
        >
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>💝 Make a Donation</h3>
              <button
                className={styles.closeButton}
                onClick={() => setShowDonateModal(false)}
              >
                ✕
              </button>
            </div>

            <div className={styles.modalBody}>
              <p className={styles.modalDescription}>
                Your donation will be converted to Relief Tokens and distributed
                to beneficiaries in need.
              </p>

              <div className={styles.formGroup}>
                <label className={styles.label}>Amount (ETH)</label>
                <input
                  type="number"
                  className={styles.input}
                  value={donationAmount}
                  onChange={(e) => setDonationAmount(e.target.value)}
                  placeholder="0.1"
                  step="0.01"
                  min="0"
                  autoFocus
                  disabled={donating}
                />
              </div>

              <button
                className={styles.submitButton}
                onClick={handleDonate}
                disabled={donating}
              >
                {donating ? "Processing..." : "Donate Now"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DonorDashboard;
