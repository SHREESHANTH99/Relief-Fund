import { useState, useEffect } from "react";
import { ethers } from "ethers";
import styles from "@/styles/PublicTransparencyDashboard.module.css";

const PublicTransparencyDashboard = ({ contract }) => {
  const [loading, setLoading] = useState(true);
  const [fundsData, setFundsData] = useState(null);
  const [categoryStats, setCategoryStats] = useState([]);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [donorStats, setDonorStats] = useState([]);
  const [timeFilter, setTimeFilter] = useState("all"); // all, 7d, 30d

  const categoryNames = ["None", "Food", "Medicine", "Emergency"];

  useEffect(() => {
    if (contract) {
      fetchTransparencyData();
      const interval = setInterval(fetchTransparencyData, 15000);
      return () => clearInterval(interval);
    }
  }, [contract, timeFilter]);

  const fetchTransparencyData = async () => {
    try {
      setLoading(true);

      // Fetch overall fund statistics
      const totalDonations = await contract.totalDonations();
      const totalMinted = await contract.totalTokensMinted();
      const beneficiaryCount = await contract.roleCount(3);
      const merchantCount = await contract.roleCount(4);

      setFundsData({
        totalDonationsETH: ethers.formatEther(totalDonations),
        totalTokensDistributed: ethers.formatEther(totalMinted),
        activeBeneficiaries: beneficiaryCount.toString(),
        verifiedMerchants: merchantCount.toString(),
      });

      // Fetch transaction events for category breakdown
      await fetchCategoryBreakdown();
      await fetchRecentTransactions();
      await fetchDonorBreakdown();
    } catch (err) {
      console.error("Error fetching transparency data:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategoryBreakdown = async () => {
    try {
      const provider = contract.runner.provider;
      const currentBlock = await provider.getBlockNumber();
      const fromBlock = Math.max(0, currentBlock - 5000);

      const filter = contract.filters.TokensSpent();
      const events = await contract.queryFilter(filter, fromBlock, "latest");

      // Group by category
      const categoryTotals = { 0: 0n, 1: 0n, 2: 0n, 3: 0n };
      const categoryCounts = { 0: 0, 1: 0, 2: 0, 3: 0 };

      events.forEach((event) => {
        const category = Number(event.args.category) || 0;
        categoryTotals[category] += event.args.amount;
        categoryCounts[category]++;
      });

      const stats = Object.keys(categoryTotals).map((cat) => ({
        category: categoryNames[cat],
        categoryId: cat,
        totalSpent: ethers.formatEther(categoryTotals[cat]),
        transactionCount: categoryCounts[cat],
        percentage:
          events.length > 0 ? (categoryCounts[cat] / events.length) * 100 : 0,
      }));

      setCategoryStats(stats.filter((s) => s.categoryId !== "0"));
    } catch (err) {
      console.error("Error fetching category breakdown:", err);
    }
  };

  const fetchRecentTransactions = async () => {
    try {
      const provider = contract.runner.provider;
      const currentBlock = await provider.getBlockNumber();
      const fromBlock = Math.max(0, currentBlock - 1000);

      const filter = contract.filters.TokensSpent();
      const events = await contract.queryFilter(filter, fromBlock, "latest");

      const transactions = events.map((event) => ({
        merchant: event.args.merchant,
        category: categoryNames[Number(event.args.category) || 0],
        amount: ethers.formatEther(event.args.amount),
        description: event.args.description,
        timestamp: Number(event.args.timestamp),
        txHash: event.transactionHash,
      }));

      // Apply time filter
      const now = Math.floor(Date.now() / 1000);
      const filtered = transactions.filter((tx) => {
        if (timeFilter === "7d") return now - tx.timestamp < 7 * 24 * 60 * 60;
        if (timeFilter === "30d") return now - tx.timestamp < 30 * 24 * 60 * 60;
        return true;
      });

      setRecentTransactions(filtered.reverse().slice(0, 50));
    } catch (err) {
      console.error("Error fetching transactions:", err);
    }
  };

  const fetchDonorBreakdown = async () => {
    try {
      const provider = contract.runner.provider;
      const currentBlock = await provider.getBlockNumber();
      const fromBlock = Math.max(0, currentBlock - 5000);

      const filter = contract.filters.DonationReceived();
      const events = await contract.queryFilter(filter, fromBlock, "latest");

      // Group by donor (anonymized)
      const donorMap = new Map();
      events.forEach((event) => {
        const donor = event.args.donor;
        const amount = event.args.amount;

        if (donorMap.has(donor)) {
          donorMap.set(donor, donorMap.get(donor) + amount);
        } else {
          donorMap.set(donor, amount);
        }
      });

      // Convert to array and sort
      const stats = Array.from(donorMap.entries())
        .map(([donor, amount]) => ({
          donorId: `${donor.slice(0, 6)}...${donor.slice(-4)}`, // Anonymized
          totalDonated: ethers.formatEther(amount),
          donationCount: events.filter((e) => e.args.donor === donor).length,
        }))
        .sort((a, b) => parseFloat(b.totalDonated) - parseFloat(a.totalDonated))
        .slice(0, 10);

      setDonorStats(stats);
    } catch (err) {
      console.error("Error fetching donor breakdown:", err);
    }
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  if (loading && !fundsData) {
    return <div className={styles.loading}>Loading transparency data...</div>;
  }

  return (
    <div className={styles.dashboard}>
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>🌐 Public Transparency Dashboard</h1>
          <p className={styles.subtitle}>
            Real-time view of relief fund allocation • Privacy-preserved
          </p>
        </div>

        <div className={styles.timeFilter}>
          <button
            className={`${styles.filterBtn} ${
              timeFilter === "all" ? styles.active : ""
            }`}
            onClick={() => setTimeFilter("all")}
          >
            All Time
          </button>
          <button
            className={`${styles.filterBtn} ${
              timeFilter === "30d" ? styles.active : ""
            }`}
            onClick={() => setTimeFilter("30d")}
          >
            Last 30 Days
          </button>
          <button
            className={`${styles.filterBtn} ${
              timeFilter === "7d" ? styles.active : ""
            }`}
            onClick={() => setTimeFilter("7d")}
          >
            Last 7 Days
          </button>
        </div>
      </div>

      {/* Funds In vs Out Overview */}
      <div className={styles.overviewSection}>
        <div className={styles.overviewCard}>
          <div className={styles.overviewIcon}>💰</div>
          <div className={styles.overviewContent}>
            <div className={styles.overviewLabel}>Total Funds Donated</div>
            <div className={styles.overviewValue}>
              {parseFloat(fundsData?.totalDonationsETH || 0).toFixed(4)} ETH
            </div>
          </div>
        </div>

        <div className={styles.overviewCard}>
          <div className={styles.overviewIcon}>🎁</div>
          <div className={styles.overviewContent}>
            <div className={styles.overviewLabel}>Tokens Distributed</div>
            <div className={styles.overviewValue}>
              {parseFloat(fundsData?.totalTokensDistributed || 0).toFixed(0)}{" "}
              RELIEF
            </div>
          </div>
        </div>

        <div className={styles.overviewCard}>
          <div className={styles.overviewIcon}>👥</div>
          <div className={styles.overviewContent}>
            <div className={styles.overviewLabel}>Verified Beneficiaries</div>
            <div className={styles.overviewValue}>
              {fundsData?.activeBeneficiaries || 0}
            </div>
          </div>
        </div>

        <div className={styles.overviewCard}>
          <div className={styles.overviewIcon}>🏪</div>
          <div className={styles.overviewContent}>
            <div className={styles.overviewLabel}>Verified Merchants</div>
            <div className={styles.overviewValue}>
              {fundsData?.verifiedMerchants || 0}
            </div>
          </div>
        </div>
      </div>

      {/* Category-wise Impact */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>📊 Category-wise Impact</h2>
        <div className={styles.categoryGrid}>
          {categoryStats.map((stat, index) => (
            <div key={index} className={styles.categoryCard}>
              <div className={styles.categoryHeader}>
                <span className={styles.categoryName}>{stat.category}</span>
                <span className={styles.categoryPercentage}>
                  {stat.percentage.toFixed(1)}%
                </span>
              </div>
              <div className={styles.categoryAmount}>
                {parseFloat(stat.totalSpent).toFixed(2)} RELIEF
              </div>
              <div className={styles.categoryTransactions}>
                {stat.transactionCount} transactions
              </div>
              <div className={styles.categoryBar}>
                <div
                  className={styles.categoryBarFill}
                  style={{ width: `${stat.percentage}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top Donors (Anonymized) */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>
          🏆 Top Contributors (Anonymized)
        </h2>
        <div className={styles.donorTable}>
          {donorStats.length === 0 ? (
            <div className={styles.emptyState}>No donations yet</div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Donor ID</th>
                  <th>Total Donated</th>
                  <th>Contributions</th>
                </tr>
              </thead>
              <tbody>
                {donorStats.map((donor, index) => (
                  <tr key={index}>
                    <td>
                      <span className={styles.rank}>#{index + 1}</span>
                    </td>
                    <td>
                      <span className={styles.donorId}>{donor.donorId}</span>
                    </td>
                    <td>
                      <strong>
                        {parseFloat(donor.totalDonated).toFixed(4)} ETH
                      </strong>
                    </td>
                    <td>{donor.donationCount} times</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Recent Transactions */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>📜 Recent Transactions</h2>
        <div className={styles.privacyNotice}>
          <span className={styles.lockIcon}>🔒</span>
          Beneficiary identities are protected. Only merchant and category
          information shown.
        </div>
        <div className={styles.transactionList}>
          {recentTransactions.length === 0 ? (
            <div className={styles.emptyState}>No transactions yet</div>
          ) : (
            recentTransactions.map((tx, index) => (
              <div key={index} className={styles.transactionItem}>
                <div className={styles.txIcon}>
                  {tx.category === "Food" && "🍽️"}
                  {tx.category === "Medicine" && "💊"}
                  {tx.category === "Emergency" && "🚨"}
                </div>
                <div className={styles.txDetails}>
                  <div className={styles.txCategory}>{tx.category}</div>
                  <div className={styles.txMerchant}>
                    Merchant: {tx.merchant.slice(0, 6)}...
                    {tx.merchant.slice(-4)}
                  </div>
                  <div className={styles.txDescription}>{tx.description}</div>
                </div>
                <div className={styles.txAmount}>
                  {parseFloat(tx.amount).toFixed(2)} RELIEF
                </div>
                <div className={styles.txDate}>{formatDate(tx.timestamp)}</div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Trust Indicators */}
      <div className={styles.trustSection}>
        <h2 className={styles.sectionTitle}>✅ Trust & Verification</h2>
        <div className={styles.trustGrid}>
          <div className={styles.trustCard}>
            <div className={styles.trustIcon}>🔐</div>
            <h3>Blockchain Verified</h3>
            <p>All transactions immutably recorded on-chain</p>
          </div>
          <div className={styles.trustCard}>
            <div className={styles.trustIcon}>👤</div>
            <h3>Privacy Protected</h3>
            <p>Beneficiary identities never revealed publicly</p>
          </div>
          <div className={styles.trustCard}>
            <div className={styles.trustIcon}>✓</div>
            <h3>NGO Verified</h3>
            <p>All beneficiaries verified before receiving aid</p>
          </div>
          <div className={styles.trustCard}>
            <div className={styles.trustIcon}>📊</div>
            <h3>100% Transparent</h3>
            <p>Track every token from donation to spending</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicTransparencyDashboard;
