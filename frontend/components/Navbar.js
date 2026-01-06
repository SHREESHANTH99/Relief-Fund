import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import styles from "@/styles/Navbar.module.css";

export default function Navbar({ walletAddress, userRole, onDisconnect }) {
  const router = useRouter();
  const [showMenu, setShowMenu] = useState(false);

  const roleColors = {
    Admin: "#e74c3c",
    Beneficiary: "#2c3e50",
    Merchant: "#27ae60",
    Donor: "#3498db",
  };

  const roleColor = roleColors[userRole] || "#6c757d";

  return (
    <nav className={styles.navbar}>
      <div className={styles.navContainer}>
        <Link href="/" className={styles.logo}>
          <span className={styles.logoIcon}>🌍</span>
          <span className={styles.logoText}>ReliefFund</span>
        </Link>

        <div className={styles.navRight}>
          <div
            className={styles.roleIndicator}
            style={{ borderColor: roleColor }}
          >
            <span
              className={styles.roleDot}
              style={{ background: roleColor }}
            ></span>
            <span className={styles.roleText}>{userRole}</span>
          </div>

          <div className={styles.profileMenu}>
            <button
              className={styles.profileButton}
              onClick={() => setShowMenu(!showMenu)}
            >
              <span className={styles.profileIcon}>👤</span>
              <span className={styles.profileAddress}>
                {walletAddress?.slice(0, 6)}...{walletAddress?.slice(-4)}
              </span>
              <span className={styles.dropdownArrow}>▼</span>
            </button>

            {showMenu && (
              <div className={styles.dropdownMenu}>
                <Link
                  href="/profile"
                  className={styles.menuItem}
                  onClick={() => setShowMenu(false)}
                >
                  <span>👤</span>
                  <span>Profile</span>
                </Link>
                <Link
                  href="/"
                  className={styles.menuItem}
                  onClick={() => setShowMenu(false)}
                >
                  <span>🏠</span>
                  <span>Dashboard</span>
                </Link>
                <div className={styles.menuDivider}></div>
                <button
                  className={styles.menuItem}
                  onClick={() => {
                    setShowMenu(false);
                    onDisconnect();
                  }}
                >
                  <span>🚪</span>
                  <span>Disconnect</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
