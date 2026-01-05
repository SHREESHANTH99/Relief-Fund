import { useState, useEffect } from "react";
import axios from "axios";
import styles from "@/styles/FundStats.module.css";

const FundStats = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchStats();
    // Refresh stats every 10 seconds
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const response = await axios.get(`${apiUrl}/api/fund/stats`);

      if (response.data.success) {
        setStats(response.data.data);
        setError(null);
      }
    } catch (err) {
      console.error("Error fetching fund stats:", err);
      setError("Unable to fetch stats. Make sure backend is running.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.statsContainer}>
        <h3>📊 Fund Statistics</h3>
        <div className={styles.loading}>Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.statsContainer}>
        <h3>📊 Fund Statistics</h3>
        <div className={styles.error}>{error}</div>
      </div>
    );
  }

  return (
    <div className={styles.statsContainer}>
      <h3>📊 Fund Statistics</h3>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Total Donations</div>
          <div className={styles.statValue}>
            {parseFloat(stats.fund.totalDonations).toFixed(4)} ETH
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statLabel}>Total Allocated</div>
          <div className={styles.statValue}>
            {parseFloat(stats.fund.totalAllocated).toFixed(4)} ETH
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statLabel}>Total Spent</div>
          <div className={styles.statValue}>
            {parseFloat(stats.fund.totalSpent).toFixed(4)} ETH
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statLabel}>Contract Balance</div>
          <div className={styles.statValue}>
            {parseFloat(stats.fund.balance).toFixed(4)} ETH
          </div>
        </div>
      </div>

      <div className={styles.rolesSection}>
        <h4>👥 User Roles</h4>
        <div className={styles.rolesGrid}>
          <div className={styles.roleItem}>
            <span className={styles.roleIcon}>👨‍💼</span>
            <span className={styles.roleName}>Admins</span>
            <span className={styles.roleCount}>{stats.roles.admins}</span>
          </div>
          <div className={styles.roleItem}>
            <span className={styles.roleIcon}>💝</span>
            <span className={styles.roleName}>Donors</span>
            <span className={styles.roleCount}>{stats.roles.donors}</span>
          </div>
          <div className={styles.roleItem}>
            <span className={styles.roleIcon}>🤝</span>
            <span className={styles.roleName}>Beneficiaries</span>
            <span className={styles.roleCount}>
              {stats.roles.beneficiaries}
            </span>
          </div>
          <div className={styles.roleItem}>
            <span className={styles.roleIcon}>🏪</span>
            <span className={styles.roleName}>Merchants</span>
            <span className={styles.roleCount}>{stats.roles.merchants}</span>
          </div>
        </div>
      </div>

      {stats.fund.paused && (
        <div className={styles.pausedBanner}>
          ⚠️ Contract is currently paused
        </div>
      )}
    </div>
  );
};

export default FundStats;
