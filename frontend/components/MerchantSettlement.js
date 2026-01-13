import { useState, useEffect } from "react";
import { ethers } from "ethers";
import styles from "@/styles/MerchantSettlement.module.css";

export default function MerchantSettlement({ address, contract }) {
  const [settlements, setSettlements] = useState([]);
  const [pendingSettlements, setPendingSettlements] = useState([]);
  const [claimedSettlements, setClaimedSettlements] = useState([]);
  const [stats, setStats] = useState({
    totalPending: "0",
    totalClaimed: "0",
    inflationCompensation: "0",
    baseAmount: "0",
  });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ text: "", type: "" });
  const [claimingId, setClaimingId] = useState(null);
  const [inflationRate, setInflationRate] = useState(15); // Default 15%

  useEffect(() => {
    if (contract && address) {
      fetchSettlements();
      const interval = setInterval(fetchSettlements, 15000);
      return () => clearInterval(interval);
    }
  }, [contract, address]);

  const fetchSettlements = async () => {
    try {
      setLoading(true);

      // Fetch all TokensSpent events for this merchant
      const currentBlock = await contract.runner.provider.getBlockNumber();
      const fromBlock = Math.max(0, currentBlock - 5000);

      const spentEvents = await contract.queryFilter(
        contract.filters.TokensSpent(null, address),
        fromBlock,
        currentBlock
      );

      // Process settlements
      const settlementList = [];
      let totalBase = 0;
      let totalInflation = 0;
      let totalPending = 0;
      let totalClaimed = 0;

      for (const event of spentEvents) {
        const baseAmount = parseFloat(ethers.formatEther(event.args.amount));
        const inflationAmount = baseAmount * (inflationRate / 100);
        const totalSettlement = baseAmount + inflationAmount;

        const settlement = {
          id: event.transactionHash + "-" + event.index,
          txHash: event.transactionHash,
          beneficiary: event.args.beneficiary,
          category: getCategoryName(event.args.category),
          baseAmount: baseAmount.toFixed(2),
          inflationRate: inflationRate,
          inflationCompensation: inflationAmount.toFixed(2),
          totalSettlement: totalSettlement.toFixed(2),
          description: event.args.description,
          timestamp: Number(event.args.timestamp) * 1000,
          claimed: Math.random() > 0.5, // TODO: Get actual claimed status from contract
          blockNumber: event.blockNumber,
        };

        settlementList.push(settlement);
        totalBase += baseAmount;
        totalInflation += inflationAmount;

        if (settlement.claimed) {
          totalClaimed += totalSettlement;
        } else {
          totalPending += totalSettlement;
        }
      }

      // Sort by timestamp (newest first)
      settlementList.sort((a, b) => b.timestamp - a.timestamp);

      setSettlements(settlementList);
      setPendingSettlements(settlementList.filter((s) => !s.claimed));
      setClaimedSettlements(settlementList.filter((s) => s.claimed));

      setStats({
        totalPending: totalPending.toFixed(2),
        totalClaimed: totalClaimed.toFixed(2),
        inflationCompensation: totalInflation.toFixed(2),
        baseAmount: totalBase.toFixed(2),
      });
    } catch (error) {
      console.error("Error fetching settlements:", error);
      showMessage("Failed to fetch settlement data", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleClaimSettlement = async (settlement) => {
    try {
      setClaimingId(settlement.id);
      showMessage("Processing settlement claim...", "info");

      // Get signer
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contractWithSigner = contract.connect(signer);

      // In a real implementation, you would call a claimSettlement function
      // For now, simulate the claim
      // const tx = await contractWithSigner.claimSettlement(settlement.txHash);
      // await tx.wait();

      // Simulate transaction
      await new Promise((resolve) => setTimeout(resolve, 2000));

      showMessage(
        `Successfully claimed ${settlement.totalSettlement} ETH settlement!`,
        "success"
      );
      fetchSettlements();
    } catch (error) {
      console.error("Error claiming settlement:", error);
      showMessage(error.message || "Failed to claim settlement", "error");
    } finally {
      setClaimingId(null);
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

  const showMessage = (text, type) => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: "", type: "" }), 5000);
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  if (loading && settlements.length === 0) {
    return <div className={styles.loading}>Loading settlements...</div>;
  }

  return (
    <div className={styles.dashboard}>
      <div className={styles.header}>
        <h2>💰 Merchant Settlement Dashboard</h2>
        <div className={styles.inflationBadge}>
          <span className={styles.inflationIcon}>📈</span>
          <span>Current Inflation Rate: {inflationRate}%</span>
        </div>
      </div>

      {message.text && (
        <div className={`${styles.message} ${styles[message.type]}`}>
          {message.text}
        </div>
      )}

      {/* Settlement Stats */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>⏳</div>
          <div className={styles.statContent}>
            <div className={styles.statLabel}>Pending Settlement</div>
            <div className={styles.statValue}>{stats.totalPending} ETH</div>
            <div className={styles.statSubtext}>
              {pendingSettlements.length} transactions
            </div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>✅</div>
          <div className={styles.statContent}>
            <div className={styles.statLabel}>Claimed Settlement</div>
            <div className={styles.statValue}>{stats.totalClaimed} ETH</div>
            <div className={styles.statSubtext}>
              {claimedSettlements.length} transactions
            </div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>💵</div>
          <div className={styles.statContent}>
            <div className={styles.statLabel}>Base Amount</div>
            <div className={styles.statValue}>{stats.baseAmount} RELIEF</div>
            <div className={styles.statSubtext}>From beneficiary payments</div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>📈</div>
          <div className={styles.statContent}>
            <div className={styles.statLabel}>Inflation Compensation</div>
            <div className={styles.statValue}>
              {stats.inflationCompensation} ETH
            </div>
            <div className={styles.statSubtext}>NGO covered amount</div>
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <div className={styles.infoBanner}>
        <div className={styles.bannerIcon}>🛡️</div>
        <div className={styles.bannerContent}>
          <h4>How Dynamic Settlement Works</h4>
          <p>
            <strong>Victims pay fixed Relief Units</strong> - They are protected
            from price inflation.
          </p>
          <p>
            <strong>You receive market price</strong> - Base amount + inflation
            compensation.
          </p>
          <p>
            <strong>NGO covers the difference</strong> - Inflation protection
            funded by donor reserves.
          </p>
        </div>
      </div>

      {/* Pending Settlements */}
      {pendingSettlements.length > 0 && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>
            ⏳ Pending Settlements ({pendingSettlements.length})
          </h3>
          <div className={styles.settlementList}>
            {pendingSettlements.map((settlement) => (
              <div key={settlement.id} className={styles.settlementCard}>
                <div className={styles.cardHeader}>
                  <div className={styles.categoryBadge}>
                    <span>{getCategoryIcon(settlement.category)}</span>
                    <span>{settlement.category}</span>
                  </div>
                  <div className={styles.settlementTotal}>
                    {settlement.totalSettlement} ETH
                  </div>
                </div>

                <div className={styles.cardBody}>
                  <div className={styles.settlementRow}>
                    <span className={styles.rowLabel}>Base Amount:</span>
                    <span className={styles.rowValue}>
                      {settlement.baseAmount} RELIEF
                    </span>
                  </div>
                  <div className={styles.settlementRow}>
                    <span className={styles.rowLabel}>
                      Inflation Rate ({settlement.inflationRate}%):
                    </span>
                    <span className={styles.rowValue}>
                      +{settlement.inflationCompensation} ETH
                    </span>
                  </div>
                  <div className={styles.divider}></div>
                  <div className={styles.settlementRow}>
                    <span className={styles.rowLabel}>
                      <strong>Total Settlement:</strong>
                    </span>
                    <span className={`${styles.rowValue} ${styles.highlight}`}>
                      <strong>{settlement.totalSettlement} ETH</strong>
                    </span>
                  </div>
                  <div className={styles.settlementDescription}>
                    {settlement.description}
                  </div>
                </div>

                <div className={styles.cardFooter}>
                  <div className={styles.settlementTime}>
                    {formatDate(settlement.timestamp)}
                  </div>
                  <button
                    className={styles.claimButton}
                    onClick={() => handleClaimSettlement(settlement)}
                    disabled={claimingId === settlement.id}
                  >
                    {claimingId === settlement.id
                      ? "Claiming..."
                      : "Claim Settlement"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Claimed Settlements */}
      {claimedSettlements.length > 0 && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>
            ✅ Claimed Settlements ({claimedSettlements.length})
          </h3>
          <div className={styles.settlementList}>
            {claimedSettlements.map((settlement) => (
              <div
                key={settlement.id}
                className={`${styles.settlementCard} ${styles.claimed}`}
              >
                <div className={styles.cardHeader}>
                  <div className={styles.categoryBadge}>
                    <span>{getCategoryIcon(settlement.category)}</span>
                    <span>{settlement.category}</span>
                  </div>
                  <div className={styles.settlementTotal}>
                    {settlement.totalSettlement} ETH
                  </div>
                </div>

                <div className={styles.cardBody}>
                  <div className={styles.settlementRow}>
                    <span className={styles.rowLabel}>Base Amount:</span>
                    <span className={styles.rowValue}>
                      {settlement.baseAmount} RELIEF
                    </span>
                  </div>
                  <div className={styles.settlementRow}>
                    <span className={styles.rowLabel}>
                      Inflation Compensation:
                    </span>
                    <span className={styles.rowValue}>
                      +{settlement.inflationCompensation} ETH
                    </span>
                  </div>
                  <div className={styles.settlementDescription}>
                    {settlement.description}
                  </div>
                </div>

                <div className={styles.cardFooter}>
                  <div className={styles.settlementTime}>
                    {formatDate(settlement.timestamp)}
                  </div>
                  <div className={styles.claimedBadge}>✅ Claimed</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {settlements.length === 0 && (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>💰</div>
          <h3>No Settlements Yet</h3>
          <p>Settlements will appear here after beneficiaries make payments.</p>
        </div>
      )}
    </div>
  );
}
