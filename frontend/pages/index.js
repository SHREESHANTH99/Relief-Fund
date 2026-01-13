import Head from "next/head";
import { useState, useEffect } from "react";
import { ethers } from "ethers";
import WalletConnect from "@/components/WalletConnect";
import AdminDashboard from "@/components/AdminDashboard";
import BeneficiaryDashboard from "@/components/BeneficiaryDashboard";
import MerchantDashboard from "@/components/MerchantDashboard";
import DonorDashboard from "@/components/DonorDashboard";
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
  "function donate() external payable",
  "function totalDonations() view returns (uint256)",
  "function totalTokensMinted() view returns (uint256)",
  "function roleCount(uint8) view returns (uint256)",
  "event TokensSpent(address indexed beneficiary, address indexed merchant, uint8 category, uint256 amount, string description, uint256 timestamp)",
  "event PINSet(address indexed user, uint256 timestamp)",
  "event PINReset(address indexed user, uint256 timestamp)",
  "event RelayerAuthorized(address indexed user, address indexed relayer, uint256 timestamp)",
  "event RelayedTransaction(address indexed user, address indexed merchant, uint256 amount, uint256 timestamp)",
  "event DonationReceived(address indexed donor, uint256 amount, uint256 timestamp)",
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
              ) : userRole === "Donor" ? (
                <DonorDashboard address={walletAddress} contract={contract} />
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
                <div className={styles.heroContent}>
                  <div className={styles.heroBadge}>
                    <span className={styles.badgeIcon}>✨</span>
                    <span>Blockchain-Powered Relief</span>
                  </div>

                  <h1 className={styles.heroTitle}>
                    Disaster Relief <br />
                    <span className={styles.gradientText}>
                      Transparent & Fair
                    </span>
                  </h1>

                  <p className={styles.heroDescription}>
                    Empowering communities with blockchain technology. Protect
                    victims from inflation, ensure transparent fund
                    distribution, and track every donation with complete
                    accountability.
                  </p>

                  <div className={styles.heroButtons}>
                    <button
                      className={styles.primaryButton}
                      onClick={() => setShowConnectModal(true)}
                    >
                      <span className={styles.buttonIcon}>🚀</span>
                      <span>Get Started</span>
                    </button>
                    <a href="/transparency" className={styles.secondaryButton}>
                      <span className={styles.buttonIcon}>📊</span>
                      <span>View Transparency</span>
                    </a>
                  </div>

                  <div className={styles.statsRow}>
                    <div className={styles.statItem}>
                      <div className={styles.statValue}>100%</div>
                      <div className={styles.statLabel}>Transparent</div>
                    </div>
                    <div className={styles.statDivider}></div>
                    <div className={styles.statItem}>
                      <div className={styles.statValue}>0%</div>
                      <div className={styles.statLabel}>Corruption</div>
                    </div>
                    <div className={styles.statDivider}></div>
                    <div className={styles.statItem}>
                      <div className={styles.statValue}>∞</div>
                      <div className={styles.statLabel}>Impact</div>
                    </div>
                  </div>
                </div>

                <div className={styles.heroVisual}>
                  <div className={styles.floatingCard}>
                    <div className={styles.cardIcon}>🌍</div>
                    <div className={styles.cardContent}>
                      <div className={styles.cardTitle}>Relief Tokens</div>
                      <div className={styles.cardValue}>Secure & Stable</div>
                    </div>
                  </div>

                  <div
                    className={styles.floatingCard}
                    style={{ animationDelay: "0.2s" }}
                  >
                    <div className={styles.cardIcon}>🛡️</div>
                    <div className={styles.cardContent}>
                      <div className={styles.cardTitle}>Inflation Shield</div>
                      <div className={styles.cardValue}>Price Protection</div>
                    </div>
                  </div>

                  <div
                    className={styles.floatingCard}
                    style={{ animationDelay: "0.4s" }}
                  >
                    <div className={styles.cardIcon}>🔗</div>
                    <div className={styles.cardContent}>
                      <div className={styles.cardTitle}>Blockchain</div>
                      <div className={styles.cardValue}>Immutable Records</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className={styles.featuresSection}>
                <div className={styles.sectionHeader}>
                  <h2 className={styles.sectionTitle}>
                    Built for Real-World Impact
                  </h2>
                  <p className={styles.sectionSubtitle}>
                    Advanced features designed to protect vulnerable communities
                  </p>
                </div>

                <div className={styles.featuresGrid}>
                  <div className={styles.featureCard}>
                    <div className={styles.featureIcon}>🪙</div>
                    <h3 className={styles.featureTitle}>
                      Stable Relief Tokens
                    </h3>
                    <p className={styles.featureDescription}>
                      1 Token = 1 Relief Unit. No volatility, no speculation.
                      Just reliable support when it's needed most.
                    </p>
                    <div className={styles.featureFooter}>
                      <span className={styles.featureTag}>Non-Volatile</span>
                      <span className={styles.featureTag}>Capped</span>
                    </div>
                  </div>

                  <div className={styles.featureCard}>
                    <div className={styles.featureIcon}>🛡️</div>
                    <h3 className={styles.featureTitle}>
                      Inflation Protection
                    </h3>
                    <p className={styles.featureDescription}>
                      Victims pay fixed prices. Merchants receive market rates.
                      NGO absorbs inflation—protecting the vulnerable.
                    </p>
                    <div className={styles.featureFooter}>
                      <span className={styles.featureTag}>Dynamic</span>
                      <span className={styles.featureTag}>Fair</span>
                    </div>
                  </div>

                  <div className={styles.featureCard}>
                    <div className={styles.featureIcon}>📱</div>
                    <h3 className={styles.featureTitle}>QR & PIN Payments</h3>
                    <p className={styles.featureDescription}>
                      Simple, secure payments with 4-digit PIN. No complex
                      wallets. Works offline with store-and-forward technology.
                    </p>
                    <div className={styles.featureFooter}>
                      <span className={styles.featureTag}>Gasless</span>
                      <span className={styles.featureTag}>Offline</span>
                    </div>
                  </div>

                  <div className={styles.featureCard}>
                    <div className={styles.featureIcon}>🔒</div>
                    <h3 className={styles.featureTitle}>Privacy First</h3>
                    <p className={styles.featureDescription}>
                      Beneficiary identities hidden. Only merchants and
                      categories visible. Full transparency without compromising
                      privacy.
                    </p>
                    <div className={styles.featureFooter}>
                      <span className={styles.featureTag}>Private</span>
                      <span className={styles.featureTag}>Secure</span>
                    </div>
                  </div>

                  <div className={styles.featureCard}>
                    <div className={styles.featureIcon}>⏰</div>
                    <h3 className={styles.featureTitle}>Smart Expiry</h3>
                    <p className={styles.featureDescription}>
                      Tokens expire after set period. Daily and weekly spending
                      limits. Prevents hoarding and ensures fair distribution.
                    </p>
                    <div className={styles.featureFooter}>
                      <span className={styles.featureTag}>Time-Bound</span>
                      <span className={styles.featureTag}>Limited</span>
                    </div>
                  </div>

                  <div className={styles.featureCard}>
                    <div className={styles.featureIcon}>📊</div>
                    <h3 className={styles.featureTitle}>Public Transparency</h3>
                    <p className={styles.featureDescription}>
                      Every donation tracked. Every transaction visible.
                      Complete accountability with real-time reporting.
                    </p>
                    <div className={styles.featureFooter}>
                      <span className={styles.featureTag}>Auditable</span>
                      <span className={styles.featureTag}>Real-Time</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className={styles.ctaSection}>
                <div className={styles.ctaCard}>
                  <h2 className={styles.ctaTitle}>
                    Ready to Make a Difference?
                  </h2>
                  <p className={styles.ctaDescription}>
                    Join the revolution in disaster relief. Connect your wallet
                    to donate, receive aid, or participate as a verified
                    merchant.
                  </p>
                  <button
                    className={styles.ctaButton}
                    onClick={() => setShowConnectModal(true)}
                  >
                    <span>Connect Wallet Now</span>
                    <span className={styles.ctaArrow}>→</span>
                  </button>
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
