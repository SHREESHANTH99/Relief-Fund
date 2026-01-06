import Head from "next/head";
import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { useRouter } from "next/router";
import Navbar from "@/components/Navbar";
import styles from "@/styles/Profile.module.css";

const RELIEF_TOKEN_ABI = [
  "function getUserInfo(address) view returns (uint8 role, bool isActive, uint256 registeredAt)",
  "function getBeneficiaryAccount(address) view returns (uint256, uint256, uint256, uint256, uint256, uint256, uint256, uint256, uint256, bool)",
  "function userHasPIN(address) view returns (bool)",
];

export default function Profile() {
  const router = useRouter();
  const [walletAddress, setWalletAddress] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [balance, setBalance] = useState("0");
  const [tokenBalance, setTokenBalance] = useState("0");
  const [hasPIN, setHasPIN] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkWalletConnection();
  }, []);

  const checkWalletConnection = async () => {
    try {
      // First, try to restore from localStorage
      const savedAddress = localStorage.getItem("walletAddress");
      const savedRole = localStorage.getItem("userRole");

      if (typeof window.ethereum === "undefined") {
        router.push("/");
        return;
      }

      const accounts = await window.ethereum.request({
        method: "eth_accounts",
      });

      if (accounts.length === 0) {
        router.push("/");
        return;
      }

      const address = accounts[0];
      setWalletAddress(address);

      // Use saved role if available for faster display
      if (savedRole && savedAddress === address) {
        setUserRole(savedRole);
      }

      await fetchUserData(address);
    } catch (err) {
      console.error("Error checking wallet:", err);
      router.push("/");
    }
  };

  const fetchUserData = async (address) => {
    try {
      setLoading(true);

      // Get ETH balance
      const provider = new ethers.BrowserProvider(window.ethereum);
      const ethBalance = await provider.getBalance(address);
      setBalance(ethers.formatEther(ethBalance));

      // Get contract data
      const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
      if (!contractAddress) {
        setLoading(false);
        return;
      }

      const contract = new ethers.Contract(
        contractAddress,
        RELIEF_TOKEN_ABI,
        provider
      );

      // Get user role
      const userInfo = await contract.getUserInfo(address);
      const roleId = Number(userInfo[0]);
      const roleNames = ["None", "Admin", "Donor", "Beneficiary", "Merchant"];
      setUserRole(roleNames[roleId]);

      // Get beneficiary token balance if applicable
      if (roleId === 3) {
        const beneficiaryData = await contract.getBeneficiaryAccount(address);
        setTokenBalance(ethers.formatEther(beneficiaryData[0]));

        // Check PIN status
        const pinStatus = await contract.userHasPIN(address);
        setHasPIN(pinStatus);
      }
    } catch (err) {
      console.error("Error fetching user data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      setWalletAddress(null);
      setUserRole(null);
      // Clear localStorage on disconnect
      localStorage.removeItem("walletAddress");
      localStorage.removeItem("userRole");
      router.push("/");
    } catch (err) {
      console.error("Error disconnecting:", err);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}></div>
        <p>Loading profile...</p>
      </div>
    );
  }

  if (!walletAddress) {
    return null;
  }

  const roleColors = {
    Admin: "#e74c3c",
    Beneficiary: "#2c3e50",
    Merchant: "#27ae60",
    Donor: "#3498db",
  };

  const roleColor = roleColors[userRole] || "#6c757d";

  return (
    <>
      <Head>
        <title>Profile - ReliefFund</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className={styles.pageContainer}>
        <Navbar
          walletAddress={walletAddress}
          userRole={userRole}
          onDisconnect={handleDisconnect}
        />

        <main className={styles.mainContent}>
          <div className={styles.profileContainer}>
            <div className={styles.profileHeader}>
              <div className={styles.avatarSection}>
                <div className={styles.avatar}>
                  <span>👤</span>
                </div>
                <div className={styles.headerInfo}>
                  <h1>Account Profile</h1>
                  <div
                    className={styles.roleBadge}
                    style={{ background: roleColor }}
                  >
                    {userRole}
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.infoGrid}>
              {/* Wallet Address Card */}
              <div className={styles.infoCard}>
                <div className={styles.cardHeader}>
                  <h3>Wallet Address</h3>
                  <span className={styles.cardIcon}>🔑</span>
                </div>
                <div className={styles.cardContent}>
                  <div className={styles.addressDisplay}>
                    <code className={styles.addressCode}>{walletAddress}</code>
                    <button
                      className={styles.copyButton}
                      onClick={() => copyToClipboard(walletAddress)}
                      title="Copy address"
                    >
                      📋
                    </button>
                  </div>
                </div>
              </div>

              {/* ETH Balance Card */}
              <div className={styles.infoCard}>
                <div className={styles.cardHeader}>
                  <h3>ETH Balance</h3>
                  <span className={styles.cardIcon}>⚡</span>
                </div>
                <div className={styles.cardContent}>
                  <div className={styles.balanceAmount}>
                    {parseFloat(balance).toFixed(4)}{" "}
                    <span className={styles.unit}>ETH</span>
                  </div>
                  <p className={styles.balanceLabel}>Available for gas fees</p>
                </div>
              </div>

              {/* Token Balance Card (if Beneficiary) */}
              {userRole === "Beneficiary" && (
                <div className={styles.infoCard}>
                  <div className={styles.cardHeader}>
                    <h3>Token Balance</h3>
                    <span className={styles.cardIcon}>🪙</span>
                  </div>
                  <div className={styles.cardContent}>
                    <div className={styles.balanceAmount}>
                      {parseFloat(tokenBalance).toFixed(2)}{" "}
                      <span className={styles.unit}>RELIEF</span>
                    </div>
                    <p className={styles.balanceLabel}>
                      Relief tokens available
                    </p>
                  </div>
                </div>
              )}

              {/* PIN Status Card (if Beneficiary) */}
              {userRole === "Beneficiary" && (
                <div className={styles.infoCard}>
                  <div className={styles.cardHeader}>
                    <h3>Security PIN</h3>
                    <span className={styles.cardIcon}>🔐</span>
                  </div>
                  <div className={styles.cardContent}>
                    <div className={styles.statusBadge}>
                      <span
                        className={styles.statusDot}
                        style={{
                          background: hasPIN ? "#27ae60" : "#e74c3c",
                        }}
                      ></span>
                      <span className={styles.statusText}>
                        {hasPIN ? "PIN Configured" : "PIN Not Set"}
                      </span>
                    </div>
                    <p className={styles.balanceLabel}>
                      {hasPIN
                        ? "Your transactions are secured"
                        : "Set up PIN for gasless payments"}
                    </p>
                  </div>
                </div>
              )}

              {/* Account Status Card */}
              <div className={styles.infoCard}>
                <div className={styles.cardHeader}>
                  <h3>Account Status</h3>
                  <span className={styles.cardIcon}>✓</span>
                </div>
                <div className={styles.cardContent}>
                  <div className={styles.statusBadge}>
                    <span
                      className={styles.statusDot}
                      style={{ background: "#27ae60" }}
                    ></span>
                    <span className={styles.statusText}>Active</span>
                  </div>
                  <p className={styles.balanceLabel}>
                    Connected to local network
                  </p>
                </div>
              </div>
            </div>

            <div className={styles.actionsSection}>
              <button
                className={styles.actionButton}
                onClick={() => router.push("/")}
              >
                <span>🏠</span>
                <span>Back to Dashboard</span>
              </button>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
