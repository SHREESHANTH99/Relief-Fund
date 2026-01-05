import { useState, useEffect } from "react";
import axios from "axios";
import styles from "@/styles/RoleDisplay.module.css";

const RoleDisplay = ({ address, onRoleLoaded }) => {
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (address) {
      fetchUserInfo();
    }
  }, [address]);

  const fetchUserInfo = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const response = await axios.get(`${apiUrl}/api/user/${address}`);

      if (response.data.success) {
        setUserInfo(response.data.data);
        onRoleLoaded(response.data.data.role);
      }
    } catch (err) {
      console.error("Error fetching user info:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className={styles.loading}>Loading user info...</div>;
  }

  if (!userInfo) {
    return null;
  }

  const getRoleIcon = (role) => {
    switch (role) {
      case "Admin":
        return "👨‍💼";
      case "Donor":
        return "💝";
      case "Beneficiary":
        return "🤝";
      case "Merchant":
        return "🏪";
      default:
        return "👤";
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case "Admin":
        return "#e74c3c";
      case "Donor":
        return "#3498db";
      case "Beneficiary":
        return "#2ecc71";
      case "Merchant":
        return "#f39c12";
      default:
        return "#95a5a6";
    }
  };

  return (
    <div className={styles.roleContainer}>
      <div
        className={styles.roleBadge}
        style={{ borderColor: getRoleColor(userInfo.role) }}
      >
        <span className={styles.roleIcon}>{getRoleIcon(userInfo.role)}</span>
        <div className={styles.roleInfo}>
          <div className={styles.roleLabel}>Your Role</div>
          <div
            className={styles.roleName}
            style={{ color: getRoleColor(userInfo.role) }}
          >
            {userInfo.role}
          </div>
        </div>
        <div className={styles.statusBadge}>
          {userInfo.isActive ? (
            <span className={styles.active}>● Active</span>
          ) : (
            <span className={styles.inactive}>● Inactive</span>
          )}
        </div>
      </div>

      {userInfo.role === "None" && (
        <div className={styles.noRoleMessage}>
          <p>No role assigned yet. Contact an admin to get started.</p>
        </div>
      )}
    </div>
  );
};

export default RoleDisplay;
