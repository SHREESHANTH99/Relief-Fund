import { useState, useEffect } from "react";
import axios from "axios";
import styles from "@/styles/AdminOffline.module.css";

const AdminOfflineMonitoring = () => {
  const [summary, setSummary] = useState(null);
  const [ious, setIOUs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all, pending, settled

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000); // Refresh every 10s

    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";
      const response = await axios.get(`${apiUrl}/api/offline/all-ious`);

      if (response.data.success) {
        setIOUs(response.data.ious);
        setSummary(response.data.summary);
      }
    } catch (err) {
      console.error("Error fetching offline data:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredIOUs = ious.filter((iou) => {
    if (filter === "all") return true;
    if (filter === "pending") return iou.status === "pending";
    if (filter === "settled")
      return iou.status === "settled" || iou.status === "synced";
    return true;
  });

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

  const getSyncHealth = () => {
    if (!summary) return { status: "Unknown", color: "#6c757d" };

    const pendingRatio = summary.pending / summary.total;

    if (summary.total === 0)
      return { status: "No Data", color: "#6c757d", icon: "📊" };
    if (pendingRatio === 0)
      return { status: "Excellent", color: "#4caf50", icon: "✅" };
    if (pendingRatio < 0.3)
      return { status: "Good", color: "#8bc34a", icon: "👍" };
    if (pendingRatio < 0.7)
      return { status: "Fair", color: "#ffc107", icon: "⚠️" };
    return { status: "Needs Sync", color: "#f44336", icon: "🔴" };
  };

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p>Loading offline monitoring data...</p>
      </div>
    );
  }

  const health = getSyncHealth();

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h2>🌐 Offline Payment Monitoring</h2>
          <p className={styles.subtitle}>
            System-wide offline transaction tracking
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className={styles.summaryGrid}>
          <div className={styles.summaryCard}>
            <div className={styles.summaryIcon}>📝</div>
            <div className={styles.summaryInfo}>
              <div className={styles.summaryLabel}>Total Offline IOUs</div>
              <div className={styles.summaryValue}>{summary.total}</div>
            </div>
          </div>

          <div className={styles.summaryCard}>
            <div className={styles.summaryIcon}>⏳</div>
            <div className={styles.summaryInfo}>
              <div className={styles.summaryLabel}>Pending Sync</div>
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
              <div className={styles.summaryLabel}>Total Value</div>
              <div className={styles.summaryValue}>
                {summary.totalAmount.toFixed(2)}
              </div>
            </div>
          </div>

          <div className={styles.summaryCard}>
            <div className={styles.summaryIcon}>🏪</div>
            <div className={styles.summaryInfo}>
              <div className={styles.summaryLabel}>Active Merchants</div>
              <div className={styles.summaryValue}>{summary.merchantCount}</div>
            </div>
          </div>

          <div className={styles.summaryCard}>
            <div className={styles.summaryIcon}>👥</div>
            <div className={styles.summaryInfo}>
              <div className={styles.summaryLabel}>Beneficiaries</div>
              <div className={styles.summaryValue}>
                {summary.beneficiaryCount}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sync Health */}
      <div className={styles.healthCard} style={{ borderColor: health.color }}>
        <div className={styles.healthIcon}>{health.icon}</div>
        <div className={styles.healthInfo}>
          <div className={styles.healthLabel}>System Sync Health</div>
          <div className={styles.healthStatus} style={{ color: health.color }}>
            {health.status}
          </div>
        </div>
        {summary && summary.pending > 0 && (
          <div className={styles.healthDetails}>
            {summary.pending} IOUs waiting for merchants to sync
          </div>
        )}
      </div>

      {/* Filter Tabs */}
      <div className={styles.filters}>
        <button
          className={`${styles.filterTab} ${
            filter === "all" ? styles.active : ""
          }`}
          onClick={() => setFilter("all")}
        >
          All ({ious.length})
        </button>
        <button
          className={`${styles.filterTab} ${
            filter === "pending" ? styles.active : ""
          }`}
          onClick={() => setFilter("pending")}
        >
          Pending ({summary?.pending || 0})
        </button>
        <button
          className={`${styles.filterTab} ${
            filter === "settled" ? styles.active : ""
          }`}
          onClick={() => setFilter("settled")}
        >
          Settled ({summary?.settled || 0})
        </button>
      </div>

      {/* IOUs List */}
      <div className={styles.iousList}>
        {filteredIOUs.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>📭</div>
            <h4>No Offline Transactions</h4>
            <p>Offline payments will appear here when created</p>
          </div>
        ) : (
          <div className={styles.table}>
            <div className={styles.tableHeader}>
              <div>ID</div>
              <div>Merchant</div>
              <div>Beneficiary</div>
              <div>Amount</div>
              <div>Status</div>
              <div>Created</div>
              <div>Settled</div>
            </div>

            {filteredIOUs.map((iou) => (
              <div key={iou.id} className={styles.tableRow}>
                <div className={styles.iouId}>#{iou.id}</div>
                <div className={styles.address}>
                  {iou.merchant.slice(0, 6)}...{iou.merchant.slice(-4)}
                </div>
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

export default AdminOfflineMonitoring;
