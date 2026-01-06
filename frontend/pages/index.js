import Head from "next/head";
import { useState, useEffect } from "react";
import { ethers } from "ethers";
import WalletConnect from "@/components/WalletConnect";
import AdminDashboard from "@/components/AdminDashboard";
import BeneficiaryDashboard from "@/components/BeneficiaryDashboard";
import MerchantDashboard from "@/components/MerchantDashboard";
import Navbar from "@/components/Navbar";
import LandingNavbar from "@/components/LandingNavbar";
import styles from "@/styles/Home.module.css";

const RELIEF_TOKEN_ABI = [
  "function getUserInfo(address) view returns (uint8 role, bool isActive, uint256 registeredAt)",
  "function getBeneficiaryAccount(address) view returns (uint256, uint256, uint256, uint256, uint256, uint256, uint256, uint256, uint256, bool)",
  "function getMerchantProfile(address) view returns (uint8, string, bool, uint256)",
  "function getTokenStats() view returns (uint256, uint256, uint256, uint256)",
  "function getRoleStats() view returns (uint256, uint256, uint256, uint256)",
  "function assignRole(address, uint8) external",
  "function allocateTokens(address, uint256, uint256) external",
  "function registerMerchant(address, uint8, string) external",
  "function setUserLimits(address, uint256, uint256, uint256) external",
  "function spendTokens(address, uint256, string) external",
  "function setPINHash(address, bytes32) external",
  "function resetPIN(address, bytes32) external",
  "function authorizeRelayer(address, bool) external",
  "function addTrustedRelayer(address) external",
  "function relaySpendTokens(address, address, uint256, string, bytes32, uint256) external",
  "function getNonce(address) view returns (uint256)",
  "function userHasPIN(address) view returns (bool)",
  "function pinHashes(address) view returns (bytes32)",
  "function hasPIN(address) view returns (bool)",
  "function trustedRelayers(address) view returns (bool)",
  "function nonces(address) view returns (uint256)",
  "event TokensSpent(address indexed beneficiary, address indexed merchant, uint8 category, uint256 amount, string description, uint256 timestamp)",
  "event PINSet(address indexed user, uint256 timestamp)",
  "event PINReset(address indexed user, uint256 timestamp)",
  "event RelayerAuthorized(address indexed user, address indexed relayer, uint256 timestamp)",
  "event RelayedTransaction(address indexed user, address indexed merchant, uint256 amount, uint256 timestamp)",
];

export default function Home() {
  const [walletAddress, setWalletAddress] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showConnectModal, setShowConnectModal] = useState(false);

  // Restore wallet connection from localStorage on mount
  useEffect(() => {
    const savedAddress = localStorage.getItem("walletAddress");
    const savedRole = localStorage.getItem("userRole");
    if (savedAddress && savedRole) {
      setWalletAddress(savedAddress);
      setUserRole(savedRole);
    }
  }, []);

  useEffect(() => {
    if (walletAddress) {
      // Save to localStorage for persistence
      localStorage.setItem("walletAddress", walletAddress);
      initContract();
      fetchUserRole();
    }
  }, [walletAddress]);

  const initContract = async () => {
    try {
      const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
      console.log("🔍 Contract Address from env:", contractAddress);
      if (!contractAddress) {
        console.warn("Contract address not configured");
        return;
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const contractInstance = new ethers.Contract(
        contractAddress,
        RELIEF_TOKEN_ABI,
        provider
      );

      setContract(contractInstance);
      console.log("✅ Contract initialized successfully");
    } catch (err) {
      console.error("Error initializing contract:", err);
    }
  };

  const fetchUserRole = async () => {
    try {
      setLoading(true);
      const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
      console.log(
        "🔍 Fetching role for address:",
        walletAddress,
        "from contract:",
        contractAddress
      );

      if (!contractAddress) {
        console.error("❌ Contract address not configured!");
        return;
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const contractInstance = new ethers.Contract(
        contractAddress,
        RELIEF_TOKEN_ABI,
        provider
      );

      console.log("📞 Calling getUserInfo...");
      const userInfo = await contractInstance.getUserInfo(walletAddress);
      console.log("📋 User Info:", userInfo);

      const roleId = Number(userInfo[0]);

      const roleNames = ["None", "Admin", "Donor", "Beneficiary", "Merchant"];
      setUserRole(roleNames[roleId]);
      // Save role to localStorage for persistence
      localStorage.setItem("userRole", roleNames[roleId]);
      console.log("✅ Role set to:", roleNames[roleId]);
    } catch (err) {
      console.error("Error fetching user role:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>ReliefFund - Disaster Relief Platform</title>
        <meta
          name="description"
          content="Policy-Driven Transparent Disaster Relief Fund"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className={styles.container}>
        {walletAddress ? (
          <Navbar
            walletAddress={walletAddress}
            userRole={userRole}
            onDisconnect={() => {
              setWalletAddress(null);
              setUserRole(null);
              // Clear localStorage on disconnect
              localStorage.removeItem("walletAddress");
              localStorage.removeItem("userRole");
            }}
          />
        ) : (
          <LandingNavbar onConnectClick={() => setShowConnectModal(true)} />
        )}

        <main className={styles.main}>
          {walletAddress ? (
            <>
              {loading ? (
                <div className={styles.loading}>Loading your dashboard...</div>
              ) : userRole === "Admin" ? (
                <AdminDashboard address={walletAddress} contract={contract} />
              ) : userRole === "Beneficiary" ? (
                <BeneficiaryDashboard
                  address={walletAddress}
                  contract={contract}
                />
              ) : userRole === "Merchant" ? (
                <MerchantDashboard
                  address={walletAddress}
                  contract={contract}
                />
              ) : userRole === "None" ? (
                <div className={styles.statusCard}>
                  <h3>👤 No Role Assigned</h3>
                  <p>
                    Your wallet: {walletAddress.slice(0, 6)}...
                    {walletAddress.slice(-4)}
                  </p>
                  <p className={styles.info}>
                    Contact an admin to get assigned a role (Admin, Beneficiary,
                    or Merchant)
                  </p>
                </div>
              ) : userRole ? (
                <div className={styles.statusCard}>
                  <h3>🔄 Role: {userRole}</h3>
                  <p>
                    Your wallet: {walletAddress.slice(0, 6)}...
                    {walletAddress.slice(-4)}
                  </p>
                  <p className={styles.info}>
                    Dashboard for this role coming soon in next phase!
                  </p>
                </div>
              ) : (
                <div className={styles.statusCard}>
                  <h3>⏳ Loading Role...</h3>
                  <p>
                    Your wallet: {walletAddress.slice(0, 6)}...
                    {walletAddress.slice(-4)}
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className={styles.landingPage}>
              <div className={styles.heroSection}>
                <div className={styles.logoContainer}>
                  <span className={styles.logoIcon}>🌍</span>
                  <h1 className={styles.brandName}>ReliefFund</h1>
                </div>
                <p className={styles.tagline}>
                  Transparent Disaster Relief Platform
                </p>

                <div className={styles.ctaSection}>
                  <button
                    className={styles.primaryCTA}
                    onClick={() => setShowConnectModal(true)}
                  >
                    <span>🔗</span>
                    <span>Connect Wallet to Get Started</span>
                  </button>
                </div>
              </div>

              <div className={styles.featuresSection}>
                <h2 className={styles.featuresTitle}>
                  Powered by Blockchain Technology
                </h2>
                <div className={styles.featuresGrid}>
                  <div className={styles.featureCard}>
                    <div className={styles.featureIconBox}>
                      <span>🪙</span>
                    </div>
                    <h3>Stable Relief Token</h3>
                    <p>
                      1 Token = 1 Relief Unit (e.g., 1 meal) - No volatility
                    </p>
                  </div>
                  <div className={styles.featureCard}>
                    <div className={styles.featureIconBox}>
                      <span>🔒</span>
                    </div>
                    <h3>Per-User Token Caps</h3>
                    <p>Daily & weekly spending limits enforced on-chain</p>
                  </div>
                  <div className={styles.featureCard}>
                    <div className={styles.featureIconBox}>
                      <span>⏰</span>
                    </div>
                    <h3>Token Expiry</h3>
                    <p>Unspent tokens expire after set period</p>
                  </div>
                  <div className={styles.featureCard}>
                    <div className={styles.featureIconBox}>
                      <span>🏪</span>
                    </div>
                    <h3>Category-Restricted</h3>
                    <p>Valid only for Food, Medicine, Emergency supplies</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>

        {/* WalletConnect Modal */}
        {showConnectModal && (
          <div
            className={styles.modalOverlay}
            onClick={() => setShowConnectModal(false)}
          >
            <div
              className={styles.modalContent}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className={styles.modalClose}
                onClick={() => setShowConnectModal(false)}
              >
                ×
              </button>
              <WalletConnect
                onConnect={(address) => {
                  setWalletAddress(address);
                  setShowConnectModal(false);
                }}
                onDisconnect={() => {
                  setWalletAddress(null);
                  setUserRole(null);
                }}
              />
            </div>
          </div>
        )}
      </div>
    </>
  );
}
