import Link from "next/link";
import styles from "@/styles/LandingNavbar.module.css";

export default function LandingNavbar({ onConnectClick }) {
  return (
    <nav className={styles.navbar}>
      <div className={styles.navContainer}>
        <Link href="/" className={styles.logo}>
          <span className={styles.logoIcon}>🌍</span>
          <span className={styles.logoText}>ReliefFund</span>
        </Link>

        <div className={styles.navLinks}>
          <Link href="/transparency" className={styles.navLink}>
            <span className={styles.linkIcon}>📊</span>
            <span>Transparency</span>
          </Link>

          <button className={styles.connectButton} onClick={onConnectClick}>
            <span className={styles.buttonIcon}>🔗</span>
            <span>Connect Wallet</span>
          </button>
        </div>
      </div>
    </nav>
  );
}
