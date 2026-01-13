import { useState, useEffect } from "react";
import { ethers } from "ethers";
import styles from "@/styles/NGOFinance.module.css";

export default function NGOFinance({ address, contract }) {
  const [stats, setStats] = useState({
    totalInflationAbsorbed: "0",
    activeSettlements: 0,
    reserveBalance: "0",
    averageInflationRate: 0,
    totalSettlementsPaid: "0",
    pendingSettlements: "0",
  });
  const [settlements, setSettlements] = useState([]);
  const [categoryBreakdown, setCategoryBreakdown] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState("all"); // all, 30d, 7d

  useEffect(() => {
    if (contract && address) {
      fetchFinanceData();
      const interval = setInterval(fetchFinanceData, 20000);
      return () => clearInterval(interval);
    }
  }, [contract, address, timeFilter]);

  const fetchFinanceData = async () => {
    try {
      setLoading(true);

      const currentBlock = await contract.runner.provider.getBlockNumber();
      const fromBlock = Math.max(0, currentBlock - 10000);

      // Fetch all TokensSpent events (these need settlements)
      const spentEvents = await contract.queryFilter(
        contract.filters.TokensSpent(),
        fromBlock,
        currentBlock
      );

      // Fetch all DonationReceived events (reserve fund)
      const donationEvents = await contract.queryFilter(
        contract.filters.DonationReceived(),
        fromBlock,
        currentBlock
      );

      // Calculate time filter
      const now = Date.now();
      const filterTime =
        timeFilter === "30d"
          ? now - 30 * 24 * 60 * 60 * 1000
          : timeFilter === "7d"
          ? now - 7 * 24 * 60 * 60 * 1000
          : 0;

      // Process settlements with inflation
      const inflationRate = 15; // 15% inflation
      let totalInflation = 0;
      let totalBase = 0;
      let totalPending = 0;
      let totalPaid = 0;
      const settlementList = [];
      const categoryMap = {};

      for (const event of spentEvents) {
        const timestamp = Number(event.args.timestamp) * 1000;
        if (timestamp < filterTime) continue;

        const baseAmount = parseFloat(ethers.formatEther(event.args.amount));
        const inflationAmount = baseAmount * (inflationRate / 100);
        const totalSettlement = baseAmount + inflationAmount;
        const category = getCategoryName(event.args.category);

        const settlement = {
          id: event.transactionHash + "-" + event.index,
          merchant: event.args.merchant,
          category: category,
          baseAmount: baseAmount.toFixed(2),
          inflationAmount: inflationAmount.toFixed(2),
          totalSettlement: totalSettlement.toFixed(2),
          timestamp: timestamp,
          paid: Math.random() > 0.3, // TODO: Get actual status from contract
        };

        settlementList.push(settlement);
        totalInflation += inflationAmount;
        totalBase += baseAmount;

        if (settlement.paid) {
          totalPaid += totalSettlement;
        } else {
          totalPending += totalSettlement;
        }

        // Category breakdown
        if (!categoryMap[category]) {
          categoryMap[category] = {
            category,
            count: 0,
            baseAmount: 0,
            inflationAmount: 0,
          };
        }
        categoryMap[category].count++;
        categoryMap[category].baseAmount += baseAmount;
        categoryMap[category].inflationAmount += inflationAmount;
      }

      // Calculate reserve balance
      let reserveBalance = 0;
      for (const event of donationEvents) {
        reserveBalance += parseFloat(ethers.formatEther(event.args.amount));
      }

      // Sort settlements by timestamp (newest first)
      settlementList.sort((a, b) => b.timestamp - a.timestamp);

      // Category breakdown array
      const categoryArray = Object.values(categoryMap).map((cat) => ({
        ...cat,
        baseAmount: cat.baseAmount.toFixed(2),
        inflationAmount: cat.inflationAmount.toFixed(2),
        totalAmount: (cat.baseAmount + cat.inflationAmount).toFixed(2),
      }));

      setSettlements(settlementList);
      setCategoryBreakdown(categoryArray);

      setStats({
        totalInflationAbsorbed: totalInflation.toFixed(2),
        activeSettlements: settlementList.filter((s) => !s.paid).length,
        reserveBalance: reserveBalance.toFixed(2),
        averageInflationRate: inflationRate,
        totalSettlementsPaid: totalPaid.toFixed(2),
        pendingSettlements: totalPending.toFixed(2),
      });
    } catch (error) {
      console.error("Error fetching finance data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryName = (categoryId) => {
    const categories = ["Food", "Medicine", "Shelter", "Education", "Other"];
    return categories[Number(categoryId)] || "Unknown";
  };

  const getCategoryIcon = (category) => {
    const icons = {
      Food: "🍎",
      Medicine: "💊",
      Shelter: "🏠",
      Education: "📚",
      Other: "🛍️",
    };
    return icons[category] || "📦";
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  const getReserveHealthColor = () => {
    const reserve = parseFloat(stats.reserveBalance);
    const pending = parseFloat(stats.pendingSettlements);

    if (reserve > pending * 3) return "#27ae60"; // Healthy
    if (reserve > pending) return "#f39c12"; // Warning
    return "#e74c3c"; // Critical
  };

  if (loading && settlements.length === 0) {
    return <div className={styles.loading}>Loading finance data...</div>;
  }

  return (
    <div className={styles.dashboard}>
      <div className={styles.header}>
        <h2>🏦 NGO Finance Dashboard</h2>
        <div className={styles.timeFilters}>
          <button
            className={`${styles.filterButton} ${
              timeFilter === "all" ? styles.active : ""
            }`}
            onClick={() => setTimeFilter("all")}
          >
            All Time
          </button>
          <button
            className={`${styles.filterButton} ${
              timeFilter === "30d" ? styles.active : ""
            }`}
            onClick={() => setTimeFilter("30d")}
          >
            Last 30 Days
          </button>
          <button
            className={`${styles.filterButton} ${
              timeFilter === "7d" ? styles.active : ""
            }`}
            onClick={() => setTimeFilter("7d")}
          >
            Last 7 Days
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className={styles.metricsGrid}>
        <div className={styles.metricCard}>
          <div className={styles.metricIcon}>📈</div>
          <div className={styles.metricContent}>
            <div className={styles.metricLabel}>Inflation Absorbed</div>
            <div className={styles.metricValue}>
              {stats.totalInflationAbsorbed} ETH
            </div>
            <div className={styles.metricSubtext}>
              NGO covered amount at {stats.averageInflationRate}% rate
            </div>
          </div>
        </div>

        <div className={styles.metricCard}>
          <div
            className={styles.metricIcon}
            style={{ background: getReserveHealthColor() }}
          >
            💰
          </div>
          <div className={styles.metricContent}>
            <div className={styles.metricLabel}>Reserve Balance</div>
            <div className={styles.metricValue}>{stats.reserveBalance} ETH</div>
            <div className={styles.metricSubtext}>
              {parseFloat(stats.reserveBalance) >
              parseFloat(stats.pendingSettlements) * 2
                ? "✅ Healthy reserve"
                : "⚠️ Low reserve"}
            </div>
          </div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricIcon}>⏳</div>
          <div className={styles.metricContent}>
            <div className={styles.metricLabel}>Pending Settlements</div>
            <div className={styles.metricValue}>
              {stats.pendingSettlements} ETH
            </div>
            <div className={styles.metricSubtext}>
              {stats.activeSettlements} active settlements
            </div>
          </div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricIcon}>✅</div>
          <div className={styles.metricContent}>
            <div className={styles.metricLabel}>Settlements Paid</div>
            <div className={styles.metricValue}>
              {stats.totalSettlementsPaid} ETH
            </div>
            <div className={styles.metricSubtext}>
              {settlements.filter((s) => s.paid).length} transactions
            </div>
          </div>
        </div>
      </div>

      {/* Inflation Shield Explanation */}
      <div className={styles.explainerSection}>
        <div className={styles.explainerIcon}>🛡️</div>
        <div className={styles.explainerContent}>
          <h3>Inflation Shield in Action</h3>
          <div className={styles.explainerGrid}>
            <div className={styles.explainerCard}>
              <div className={styles.explainerStep}>1</div>
              <h4>Victim Pays Fixed Amount</h4>
              <p>
                Beneficiaries pay only the base Relief Token amount. They are
                protected from market price fluctuations.
              </p>
            </div>
            <div className={styles.explainerCard}>
              <div className={styles.explainerStep}>2</div>
              <h4>NGO Absorbs Inflation</h4>
              <p>
                The NGO covers the difference between fixed price and market
                price (currently {stats.averageInflationRate}%).
              </p>
            </div>
            <div className={styles.explainerCard}>
              <div className={styles.explainerStep}>3</div>
              <h4>Merchant Gets Market Price</h4>
              <p>
                Merchants receive full market value: base amount + inflation
                compensation from donor reserves.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Category-wise Breakdown */}
      {categoryBreakdown.length > 0 && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>
            📊 Inflation by Category ({timeFilter})
          </h3>
          <div className={styles.categoryGrid}>
            {categoryBreakdown.map((cat) => (
              <div key={cat.category} className={styles.categoryCard}>
                <div className={styles.categoryHeader}>
                  <span className={styles.categoryIcon}>
                    {getCategoryIcon(cat.category)}
                  </span>
                  <span className={styles.categoryName}>{cat.category}</span>
                </div>
                <div className={styles.categoryStats}>
                  <div className={styles.categoryStat}>
                    <span className={styles.categoryStatLabel}>
                      Transactions
                    </span>
                    <span className={styles.categoryStatValue}>
                      {cat.count}
                    </span>
                  </div>
                  <div className={styles.categoryStat}>
                    <span className={styles.categoryStatLabel}>
                      Base Amount
                    </span>
                    <span className={styles.categoryStatValue}>
                      {cat.baseAmount} RELIEF
                    </span>
                  </div>
                  <div className={styles.categoryStat}>
                    <span className={styles.categoryStatLabel}>
                      Inflation Cost
                    </span>
                    <span className={styles.categoryStatValue}>
                      {cat.inflationAmount} ETH
                    </span>
                  </div>
                  <div className={styles.categoryTotal}>
                    <span>Total Settlement</span>
                    <span>{cat.totalAmount} ETH</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Settlements */}
      {settlements.length > 0 && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>
            📜 Recent Settlements (Latest 10)
          </h3>
          <div className={styles.settlementsTable}>
            <div className={styles.tableHeader}>
              <div className={styles.tableCol}>Merchant</div>
              <div className={styles.tableCol}>Category</div>
              <div className={styles.tableCol}>Base</div>
              <div className={styles.tableCol}>Inflation</div>
              <div className={styles.tableCol}>Total</div>
              <div className={styles.tableCol}>Status</div>
              <div className={styles.tableCol}>Date</div>
            </div>
            {settlements.slice(0, 10).map((settlement) => (
              <div key={settlement.id} className={styles.tableRow}>
                <div className={styles.tableCol}>
                  {settlement.merchant.slice(0, 6)}...
                  {settlement.merchant.slice(-4)}
                </div>
                <div className={styles.tableCol}>
                  <span className={styles.categoryBadge}>
                    {getCategoryIcon(settlement.category)} {settlement.category}
                  </span>
                </div>
                <div className={styles.tableCol}>
                  {settlement.baseAmount} RELIEF
                </div>
                <div className={styles.tableCol}>
                  +{settlement.inflationAmount} ETH
                </div>
                <div className={styles.tableCol}>
                  <strong>{settlement.totalSettlement} ETH</strong>
                </div>
                <div className={styles.tableCol}>
                  {settlement.paid ? (
                    <span className={styles.statusPaid}>✅ Paid</span>
                  ) : (
                    <span className={styles.statusPending}>⏳ Pending</span>
                  )}
                </div>
                <div className={styles.tableCol}>
                  {formatDate(settlement.timestamp)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {settlements.length === 0 && (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>🏦</div>
          <h3>No Financial Data Yet</h3>
          <p>
            Settlement data will appear here after beneficiaries make purchases.
          </p>
        </div>
      )}
    </div>
  );
}
